import os
from calendar import monthrange
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from app.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.database import get_connection, get_cursor
from app.food_lookup import lookup_by_barcode
from app.storage import (
    STORAGE_ENABLED,
    get_object_stream,
    make_key,
    upload_fileobj,
)

app = FastAPI(title="Hercules API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# --- Schemas ---
class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    navn: str | None = None
    payment_method_id: str | None = None  # Stripe PM for kort
    payment_method_type: str | None = None  # "kort" | "vipps" | "paypal"


class SetRoleRequest(BaseModel):
    rolle: str  # 'admin' | 'kunde' | 'kunde_og_coach'


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> UUID | None:
    if not credentials or credentials.credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    try:
        return UUID(payload["sub"])
    except (ValueError, TypeError):
        return None


def require_admin(
    user_id: UUID | None = Depends(get_current_user_id),
) -> UUID:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                "SELECT rolle FROM users WHERE id = %s",
                (str(user_id),),
            )
            row = cur.fetchone()
            if not row or row["rolle"] != "admin":
                raise HTTPException(status_code=403, detail="Admin only")
            return user_id
        finally:
            cur.close()


def require_user(
    user_id: UUID | None = Depends(get_current_user_id),
) -> UUID:
    if user_id is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


# --- Stripe (første trekk – bruker opprettes kun ved godkjent betaling) ---
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_ENABLED = bool(STRIPE_SECRET_KEY)

PRIS_PER_MANED_KR = 100
PRIS_HALV_MANED_KR = 50


def _send_payment_failed_email(email: str, navn: str | None, is_final_block: bool = False) -> None:
    """Send email when payment fails. Log always; optionally send via SMTP if configured."""
    subject = "Hercules: Konto sperret – betaling mislyktes" if is_final_block else "Hercules: Betaling mislyktes – vi prøver igjen om en uke"
    body = (
        f"Hei {navn or 'bruker'}.\n\n"
        "Din betaling kunne ikke gjennomføres. "
        + (
            "Vi har nå sperret kontoen inntil betaling er oppdatert. Siste mulighet var siste dag i måneden.\n\n"
            "Du kan oppdatere betalingsmetode og låse opp kontoen ved å logge inn og fullføre betaling."
            if is_final_block
            else "Vi prøver på nytt automatisk om en uke, og sender deg e-post. Du kan si opp når som helst.\n\n"
            "Sørg for at betalingskortet har dekning, eller bytt til Vipps/PayPal i innstillinger."
        )
        + "\n\nMvh Hercules"
    )
    print(f"[EMAIL] To: {email} | {subject}\n{body[:200]}...")  # noqa: T201
    # TODO: wire to SMTP (e.g. SendGrid, AWS SES) via env


def _record_payment_failure(user_id: UUID, email: str, navn: str | None) -> None:
    """Record failed payment: set retry in 1 week and send email."""
    now = datetime.now(timezone.utc)
    next_retry = now + timedelta(days=7)
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                UPDATE users
                SET payment_failed_at = %s, payment_retry_count = payment_retry_count + 1,
                    next_payment_retry_at = %s, oppdatert = NOW()
                WHERE id = %s
                """,
                (now, next_retry, str(user_id)),
            )
        finally:
            cur.close()
    _send_payment_failed_email(email, navn, is_final_block=False)


def _first_payment_kr() -> int:
    now = datetime.now(timezone.utc)
    days_in_month = monthrange(now.year, now.month)[1]
    days_left = days_in_month - now.day
    current = PRIS_HALV_MANED_KR if days_left <= 15 else PRIS_PER_MANED_KR
    return current + PRIS_PER_MANED_KR


@app.post("/api/auth/login")
def login(body: LoginRequest):
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, email, passord_hash, rolle, navn
                FROM users WHERE email = %s
                """,
                (body.email.strip().lower(),),
            )
            row = cur.fetchone()
        finally:
            cur.close()
    if not row or not verify_password(body.password, row["passord_hash"]):
        raise HTTPException(status_code=401, detail="Ugyldig e-post eller passord")
    token = create_access_token({"sub": str(row["id"])})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(row["id"]),
            "email": row["email"],
            "rolle": row["rolle"],
            "navn": row["navn"] or row["email"],
        },
    }


@app.post("/api/auth/signup")
def signup(body: SignupRequest):
    email = body.email.strip().lower()
    trial_ends_at = None
    stripe_customer_id = None
    payment_method_type = (body.payment_method_type or "kort").strip().lower() or "kort"
    if payment_method_type not in ("kort", "vipps", "paypal"):
        payment_method_type = "kort"

    if STRIPE_ENABLED and payment_method_type == "kort":
        if not body.payment_method_id:
            raise HTTPException(
                status_code=400,
                detail="Registrer kort for 1 uke gratis. Etter prøveuken trekkes første betaling automatisk.",
            )
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
        try:
            customer = stripe.Customer.create(email=email)
            stripe.PaymentMethod.attach(
                body.payment_method_id,
                customer=customer.id,
            )
            stripe.Customer.modify(
                customer.id,
                invoice_settings={"default_payment_method": body.payment_method_id},
            )
            stripe_customer_id = customer.id
            trial_ends_at = datetime.now(timezone.utc) + timedelta(days=7)
        except stripe.error.CardError as e:
            raise HTTPException(status_code=402, detail=e.user_message or "Kortet ble avvist.")
        except Exception as e:
            raise HTTPException(status_code=400, detail="Kunne ikke registrere kort. Prøv igjen.")
    elif payment_method_type in ("vipps", "paypal"):
        trial_ends_at = datetime.now(timezone.utc) + timedelta(days=7)

    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="E-post er allerede registrert")
            passord_hash = hash_password(body.password)
            cur.execute(
                """
                INSERT INTO users (email, passord_hash, rolle, navn, trial_ends_at, stripe_customer_id, first_charge_done, payment_method_type)
                VALUES (%s, %s, 'kunde', %s, %s, %s, FALSE, %s)
                RETURNING id, email, rolle, navn
                """,
                (
                    email,
                    passord_hash,
                    (body.navn or "").strip() or None,
                    trial_ends_at,
                    stripe_customer_id,
                    payment_method_type if payment_method_type in ("vipps", "paypal", "kort") else None,
                ),
            )
            row = cur.fetchone()
        finally:
            cur.close()
    token = create_access_token({"sub": str(row["id"])})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(row["id"]),
            "email": row["email"],
            "rolle": row["rolle"],
            "navn": row["navn"] or row["email"],
        },
    }


@app.get("/api/me")
def me(user_id: UUID = Depends(require_user)):
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, email, rolle, navn, coach_sokt, coach_godkjent,
                       trial_ends_at, stripe_customer_id, first_charge_done,
                       account_blocked_at
                FROM users WHERE id = %s
                """,
                (str(user_id),),
            )
            row = cur.fetchone()
        finally:
            cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row.get("account_blocked_at"):
        raise HTTPException(
            status_code=403,
            detail="Kontoen er sperret fordi betaling mislyktes etter siste frist (siste dag i måneden). Oppdater betalingsmetode for å låse opp.",
        )
    rolle = row["rolle"]
    kan_bytte_view = rolle == "admin" or (rolle == "kunde_og_coach" and row["coach_godkjent"])

    # Etter trial (1 uke): utfør første trekk automatisk ved innlogging
    payment_required = False
    if STRIPE_ENABLED and row.get("trial_ends_at") and row.get("stripe_customer_id") and not row.get("first_charge_done"):
        trial_end = row["trial_ends_at"]
        if trial_end.tzinfo is None:
            trial_end = trial_end.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) >= trial_end:
            import stripe
            stripe.api_key = STRIPE_SECRET_KEY
            amount_ore = _first_payment_kr() * 100
            try:
                pi = stripe.PaymentIntent.create(
                    amount=amount_ore,
                    currency="nok",
                    customer=row["stripe_customer_id"],
                    off_session=True,
                    confirm=True,
                    metadata={"user_id": str(row["id"]), "type": "first_after_trial"},
                    expand=["latest_charge"],
                )
                if pi.status == "succeeded":
                    with get_connection() as conn2:
                        cur2 = get_cursor(conn2)
                        try:
                            cur2.execute(
                                "UPDATE users SET first_charge_done = TRUE, payment_failed_at = NULL, next_payment_retry_at = NULL, payment_retry_count = 0, oppdatert = NOW() WHERE id = %s",
                                (str(user_id),),
                            )
                        finally:
                            cur2.close()
                    try:
                        from app.sales_documents import create_from_payment_success
                        charge_id = pi.latest_charge.id if getattr(pi, "latest_charge", None) else None
                        create_from_payment_success(
                            user_id=user_id,
                            customer_name=row.get("navn"),
                            customer_email=row["email"],
                            total_ore=amount_ore,
                            description="Første betaling – abonnement (etter prøveuke)",
                            stripe_payment_intent_id=pi.id,
                            stripe_charge_id=charge_id,
                        )
                    except Exception:
                        pass
                elif pi.status == "requires_action":
                    payment_required = True
            except stripe.error.CardError:
                payment_required = True
                _record_payment_failure(user_id=user_id, email=row["email"], navn=row.get("navn"))
            except Exception:
                payment_required = True
                _record_payment_failure(user_id=user_id, email=row["email"], navn=row.get("navn"))

    return {
        "id": str(row["id"]),
        "email": row["email"],
        "rolle": row["rolle"],
        "navn": row["navn"] or row["email"],
        "coach_sokt": row["coach_sokt"],
        "coach_godkjent": row["coach_godkjent"],
        "kan_bytte_view": kan_bytte_view,
        "trial_ends_at": row["trial_ends_at"].isoformat() if row.get("trial_ends_at") else None,
        "first_charge_done": row.get("first_charge_done", False),
        "payment_required": payment_required,
    }


# --- Cron: ukentlig retry av mislykkede betalinger; siste dag i måneden = sperr konto ---
CRON_SECRET = os.getenv("CRON_SECRET", "").strip()


def _require_cron_secret(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> None:
    if not CRON_SECRET:
        raise HTTPException(status_code=501, detail="CRON_SECRET not configured")
    token = (credentials.credentials if credentials else None) or ""
    if token != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Invalid cron secret")


@app.post("/api/cron/retry-payments")
def retry_payments(_: None = Depends(_require_cron_secret)):
    """Run daily: retry failed payments; on last day of month, block account if still failing."""
    now = datetime.now(timezone.utc)
    today = now.date()
    days_in_month = monthrange(now.year, now.month)[1]
    is_last_day_of_month = today.day == days_in_month

    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, email, navn, stripe_customer_id
                FROM users
                WHERE next_payment_retry_at IS NOT NULL AND next_payment_retry_at <= %s
                  AND first_charge_done = FALSE AND account_blocked_at IS NULL
                  AND stripe_customer_id IS NOT NULL
                """,
                (now,),
            )
            rows = cur.fetchall()
        finally:
            cur.close()

    if not STRIPE_ENABLED or not rows:
        return {"ok": True, "retried": 0, "blocked": 0}

    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    amount_ore = _first_payment_kr() * 100
    succeeded = 0
    blocked = 0

    for row in rows:
        uid = row["id"]
        try:
            pi = stripe.PaymentIntent.create(
                amount=amount_ore,
                currency="nok",
                customer=row["stripe_customer_id"],
                off_session=True,
                confirm=True,
                metadata={"user_id": str(uid), "type": "retry_after_failure"},
                expand=["latest_charge"],
            )
            if pi.status == "succeeded":
                with get_connection() as conn2:
                    cur2 = get_cursor(conn2)
                    try:
                        cur2.execute(
                            "UPDATE users SET first_charge_done = TRUE, payment_failed_at = NULL, next_payment_retry_at = NULL, payment_retry_count = 0, oppdatert = NOW() WHERE id = %s",
                            (str(uid),),
                        )
                    finally:
                        cur2.close()
                try:
                    from app.sales_documents import create_from_payment_success
                    charge_id = pi.latest_charge.id if getattr(pi, "latest_charge", None) else None
                    create_from_payment_success(
                        user_id=uid,
                        customer_name=row.get("navn"),
                        customer_email=row["email"],
                        total_ore=amount_ore,
                        description="Betaling – abonnement (etter retry)",
                        stripe_payment_intent_id=pi.id,
                        stripe_charge_id=charge_id,
                    )
                except Exception:
                    pass
                succeeded += 1
                continue
        except stripe.error.CardError:
            pass
        except Exception:
            pass

        if is_last_day_of_month:
            with get_connection() as conn2:
                cur2 = get_cursor(conn2)
                try:
                    cur2.execute(
                        "UPDATE users SET account_blocked_at = %s, oppdatert = NOW() WHERE id = %s",
                        (now, str(uid)),
                    )
                finally:
                    cur2.close()
            _send_payment_failed_email(row["email"], row.get("navn"), is_final_block=True)
            blocked += 1
        else:
            next_retry = now + timedelta(days=7)
            with get_connection() as conn2:
                cur2 = get_cursor(conn2)
                try:
                    cur2.execute(
                        "UPDATE users SET payment_failed_at = %s, payment_retry_count = payment_retry_count + 1, next_payment_retry_at = %s, oppdatert = NOW() WHERE id = %s",
                        (now, next_retry, str(uid)),
                    )
                finally:
                    cur2.close()
            _send_payment_failed_email(row["email"], row.get("navn"), is_final_block=False)

    return {"ok": True, "processed": len(rows), "succeeded": succeeded, "blocked": blocked}


# --- Stripe webhooks: salgsdokumenter + PowerOffice (invoice.paid, subscription.deleted, charge.refunded) ---
@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Motta Stripe events; lagre salgsdokument og evt. send til PowerOffice."""
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=501, detail="STRIPE_WEBHOOK_SECRET not configured")
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    import stripe
    stripe.api_key = STRIPE_SECRET_KEY
    try:
        event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    from app import sales_documents as sd

    if event["type"] == "invoice.paid":
        inv = event["data"]["object"]
        sd.create_from_stripe_invoice(inv)
    elif event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]
        inv_id = sub.get("latest_invoice")
        if inv_id:
            try:
                inv = stripe.Invoice.retrieve(inv_id) if isinstance(inv_id, str) else inv_id
                inv_obj = inv if isinstance(inv, dict) else inv
                inv_no = sd.create_from_stripe_invoice(inv_obj)
                if inv_no:
                    with get_connection() as conn:
                        cur = get_cursor(conn)
                        try:
                            cur.execute(
                                "UPDATE sales_documents SET document_type = 'sluttfaktura' WHERE invoice_number = %s",
                                (inv_no,),
                            )
                        finally:
                            cur.close()
            except Exception:
                pass
    elif event["type"] == "charge.refunded":
        charge = event["data"]["object"]
        sd.create_from_stripe_charge(charge, is_refund=True)

    return {"received": True}


# --- Ernæring: matdatabase, oppskrifter, måltider ---
class FoodProductOut(BaseModel):
    id: str
    name: str
    barcode: str | None = None
    source: str | None = None
    brand: str | None = None
    image_url: str | None = None
    user_id: str | None = None
    kcal_per_100: float
    protein_per_100: float
    carbs_per_100: float
    fat_per_100: float


class UserFoodIn(BaseModel):
    """Brukerens egen matvare (manuell registrering)."""
    name: str
    barcode: str | None = None
    brand: str | None = None
    image_url: str | None = None
    kcal_per_100: float
    protein_per_100: float
    carbs_per_100: float
    fat_per_100: float


class RecipeIngredientIn(BaseModel):
    food_product_id: str
    grams: float


class RecipeIn(BaseModel):
    name: str
    description: str | None = None
    ingredients: list[RecipeIngredientIn]


class MealEntryProductIn(BaseModel):
    food_product_id: str
    amount_gram: float


class MealEntryRecipeIn(BaseModel):
    recipe_id: str
    portions: float = 1.0


class MealIn(BaseModel):
    log_date: str  # YYYY-MM-DD
    name: str | None = None
    time_slot: str | None = None  # HH:MM
    entries: list[MealEntryProductIn | MealEntryRecipeIn] = []


@app.get("/api/food-products", response_model=list[FoodProductOut])
def list_food_products(q: str = "", user_id: UUID = Depends(require_user)):
    """Søk i matdatabasen (global + brukerens egne matvarer)."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            if q.strip():
                cur.execute(
                    """
                    SELECT id, name, barcode, source, brand, image_url, user_id,
                           kcal_per_100, protein_per_100, carbs_per_100, fat_per_100
                    FROM food_products
                    WHERE (user_id IS NULL OR user_id = %s) AND LOWER(name) LIKE LOWER(%s)
                    ORDER BY name
                    LIMIT 50
                    """,
                    (str(user_id), f"%{q.strip()}%"),
                )
            else:
                cur.execute(
                    """
                    SELECT id, name, barcode, source, brand, image_url, user_id,
                           kcal_per_100, protein_per_100, carbs_per_100, fat_per_100
                    FROM food_products
                    WHERE user_id IS NULL OR user_id = %s
                    ORDER BY name
                    LIMIT 100
                    """,
                    (str(user_id),),
                )
            rows = cur.fetchall()
            return [
                {
                    "id": str(r["id"]),
                    "name": r["name"],
                    "barcode": r.get("barcode"),
                    "source": r.get("source"),
                    "brand": r.get("brand"),
                    "image_url": r.get("image_url"),
                    "user_id": str(r["user_id"]) if r.get("user_id") else None,
                    "kcal_per_100": float(r["kcal_per_100"]),
                    "protein_per_100": float(r["protein_per_100"]),
                    "carbs_per_100": float(r["carbs_per_100"]),
                    "fat_per_100": float(r["fat_per_100"]),
                }
                for r in rows
            ]
        finally:
            cur.close()


@app.get("/api/food/by-barcode", response_model=FoodProductOut | None)
def get_food_by_barcode(barcode: str = "", user_id: UUID = Depends(require_user)):
    """
    Oppslag på strekkode: lokal DB først, deretter Open Food Facts → Nutritionix → Edamam.
    Ved treff i ekstern API lagres produktet i databasen (caching).
    """
    if not (barcode or "").strip():
        raise HTTPException(status_code=400, detail="Strekkode mangler")
    product = lookup_by_barcode(barcode.strip(), user_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet. Du kan legge det inn manuelt.")
    return product


@app.post("/api/food", response_model=FoodProductOut)
def create_user_food(body: UserFoodIn, user_id: UUID = Depends(require_user)):
    """Registrer brukerens egen matvare (manuell registrering når strekkode ikke finnes)."""
    barcode = (body.barcode or "").strip() or None
    if barcode and len(barcode) > 20:
        barcode = barcode[:20]
    with get_connection() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """
            INSERT INTO food_products
            (name, barcode, source, brand, image_url, user_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100)
            VALUES (%s, %s, 'user', %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, name, barcode, source, brand, image_url, user_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100
            """,
            (
                body.name.strip()[:255],
                barcode,
                (body.brand or "").strip()[:255] or None,
                (body.image_url or "").strip()[:2048] or None,
                str(user_id),
                max(0, body.kcal_per_100),
                max(0, body.protein_per_100),
                max(0, body.carbs_per_100),
                max(0, body.fat_per_100),
            ),
        )
        r = cur.fetchone()
    return {
        "id": str(r["id"]),
        "name": r["name"],
        "barcode": r.get("barcode"),
        "source": r.get("source"),
        "brand": r.get("brand"),
        "image_url": r.get("image_url"),
        "user_id": str(r["user_id"]) if r.get("user_id") else None,
        "kcal_per_100": float(r["kcal_per_100"]),
        "protein_per_100": float(r["protein_per_100"]),
        "carbs_per_100": float(r["carbs_per_100"]),
        "fat_per_100": float(r["fat_per_100"]),
    }


def _recipe_totals(recipe_id: UUID) -> dict:
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT fp.kcal_per_100, fp.protein_per_100, fp.carbs_per_100, fp.fat_per_100, ri.grams
                FROM recipe_ingredients ri
                JOIN food_products fp ON fp.id = ri.food_product_id
                WHERE ri.recipe_id = %s
                """,
                (str(recipe_id),),
            )
            rows = cur.fetchall()
        finally:
            cur.close()
    k = p = c = f = 0
    for r in rows:
        g = float(r["grams"]) / 100.0
        k += float(r["kcal_per_100"]) * g
        p += float(r["protein_per_100"]) * g
        c += float(r["carbs_per_100"]) * g
        f += float(r["fat_per_100"]) * g
    return {"kcal": round(k, 1), "protein": round(p, 1), "carbs": round(c, 1), "fat": round(f, 1)}


@app.get("/api/recipes")
def list_recipes(user_id: UUID = Depends(require_user)):
    """Mine oppskrifter med beregnet total."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                "SELECT id, name, description, created_at FROM recipes WHERE user_id = %s ORDER BY name",
                (str(user_id),),
            )
            recipes = cur.fetchall()
        finally:
            cur.close()
    out = []
    for r in recipes:
        tot = _recipe_totals(UUID(str(r["id"])))
        out.append({
            "id": str(r["id"]),
            "name": r["name"],
            "description": r["description"],
            "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            "totals": tot,
        })
    return out


@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: UUID, user_id: UUID = Depends(require_user)):
    """Hent én oppskrift med ingredienser og totaler."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                "SELECT id, name, description, created_at FROM recipes WHERE id = %s AND user_id = %s",
                (str(recipe_id), str(user_id)),
            )
            r = cur.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail="Oppskrift ikke funnet")
            cur.execute(
                """
                SELECT ri.food_product_id, ri.grams, fp.name, fp.kcal_per_100, fp.protein_per_100, fp.carbs_per_100, fp.fat_per_100
                FROM recipe_ingredients ri
                JOIN food_products fp ON fp.id = ri.food_product_id
                WHERE ri.recipe_id = %s
                """,
                (str(recipe_id),),
            )
            ings = cur.fetchall()
        finally:
            cur.close()
    tot = _recipe_totals(recipe_id)
    return {
        "id": str(r["id"]),
        "name": r["name"],
        "description": r["description"],
        "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
        "ingredients": [
            {
                "food_product_id": str(i["food_product_id"]),
                "name": i["name"],
                "grams": float(i["grams"]),
                "kcal": round(float(i["kcal_per_100"]) * float(i["grams"]) / 100, 1),
                "protein": round(float(i["protein_per_100"]) * float(i["grams"]) / 100, 1),
                "carbs": round(float(i["carbs_per_100"]) * float(i["grams"]) / 100, 1),
                "fat": round(float(i["fat_per_100"]) * float(i["grams"]) / 100, 1),
            }
            for i in ings
        ],
        "totals": tot,
    }


@app.post("/api/recipes")
def create_recipe(body: RecipeIn, user_id: UUID = Depends(require_user)):
    """Opprett oppskrift med ingredienser."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                "INSERT INTO recipes (user_id, name, description) VALUES (%s, %s, %s) RETURNING id",
                (str(user_id), body.name.strip(), (body.description or "").strip() or None),
            )
            recipe_id = cur.fetchone()["id"]
            for ing in body.ingredients:
                cur.execute(
                    "INSERT INTO recipe_ingredients (recipe_id, food_product_id, grams) VALUES (%s, %s, %s)",
                    (str(recipe_id), ing.food_product_id, ing.grams),
                )
        finally:
            cur.close()
    return {"id": str(recipe_id), "totals": _recipe_totals(UUID(str(recipe_id)))}


@app.get("/api/meals")
def list_meals(date: str, user_id: UUID = Depends(require_user)):
    """Måltider for en gitt dag (log_date YYYY-MM-DD)."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                "SELECT id, log_date, name, time_slot, created_at FROM meals WHERE user_id = %s AND log_date = %s ORDER BY time_slot NULLS LAST, created_at",
                (str(user_id), date),
            )
            meals = cur.fetchall()
        finally:
            cur.close()
    result = []
    for m in meals:
        with get_connection() as conn2:
            cur2 = get_cursor(conn2)
            try:
                cur2.execute(
                    "SELECT id, food_product_id, recipe_id, amount_gram, portions FROM meal_entries WHERE meal_id = %s",
                    (str(m["id"]),),
                )
                entries = cur2.fetchall()
            finally:
                cur2.close()
        entries_with_nutrition = []
        for e in entries:
            if e["food_product_id"]:
                with get_connection() as conn3:
                    cur3 = get_cursor(conn3)
                    try:
                        cur3.execute(
                            "SELECT name, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100 FROM food_products WHERE id = %s",
                            (str(e["food_product_id"]),),
                        )
                        fp = cur3.fetchone()
                    finally:
                        cur3.close()
                g = float(e["amount_gram"]) / 100.0
                entries_with_nutrition.append({
                    "id": str(e["id"]),
                    "type": "product",
                    "food_product_id": str(e["food_product_id"]),
                    "name": fp["name"] if fp else "",
                    "amount_gram": float(e["amount_gram"]),
                    "kcal": round(float(fp["kcal_per_100"]) * g, 1) if fp else 0,
                    "protein": round(float(fp["protein_per_100"]) * g, 1) if fp else 0,
                    "carbs": round(float(fp["carbs_per_100"]) * g, 1) if fp else 0,
                    "fat": round(float(fp["fat_per_100"]) * g, 1) if fp else 0,
                })
            else:
                tot = _recipe_totals(UUID(str(e["recipe_id"])))
                with get_connection() as conn3:
                    cur3 = get_cursor(conn3)
                    try:
                        cur3.execute("SELECT name FROM recipes WHERE id = %s", (str(e["recipe_id"]),))
                        rec = cur3.fetchone()
                    finally:
                        cur3.close()
                por = float(e["portions"] or 1)
                entries_with_nutrition.append({
                    "id": str(e["id"]),
                    "type": "recipe",
                    "recipe_id": str(e["recipe_id"]),
                    "name": rec["name"] if rec else "",
                    "portions": por,
                    "kcal": round(tot["kcal"] * por, 1),
                    "protein": round(tot["protein"] * por, 1),
                    "carbs": round(tot["carbs"] * por, 1),
                    "fat": round(tot["fat"] * por, 1),
                })
        total_kcal = sum(x["kcal"] for x in entries_with_nutrition)
        total_p = sum(x["protein"] for x in entries_with_nutrition)
        total_c = sum(x["carbs"] for x in entries_with_nutrition)
        total_f = sum(x["fat"] for x in entries_with_nutrition)
        result.append({
            "id": str(m["id"]),
            "log_date": str(m["log_date"]),
            "name": m["name"],
            "time_slot": m["time_slot"].strftime("%H:%M") if m.get("time_slot") else None,
            "entries": entries_with_nutrition,
            "totals": {"kcal": total_kcal, "protein": total_p, "carbs": total_c, "fat": total_f},
        })
    return result


@app.post("/api/meals")
def create_meal(body: MealIn, user_id: UUID = Depends(require_user)):
    """Opprett måltid med valgfri tid og navn, og enten produkter (gram) eller oppskrifter (porsjoner)."""
    time_val = None
    if body.time_slot and body.time_slot.strip():
        try:
            from datetime import time as dt_time
            parts = body.time_slot.strip().split(":")
            time_val = dt_time(int(parts[0]), int(parts[1]) if len(parts) > 1 else 0)
        except Exception:
            pass
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                "INSERT INTO meals (user_id, log_date, name, time_slot) VALUES (%s, %s, %s, %s) RETURNING id",
                (str(user_id), body.log_date, (body.name or "").strip() or None, time_val),
            )
            meal_id = cur.fetchone()["id"]
            for e in body.entries:
                if getattr(e, "food_product_id", None) is not None:
                    cur.execute(
                        "INSERT INTO meal_entries (meal_id, food_product_id, amount_gram) VALUES (%s, %s, %s)",
                        (str(meal_id), e.food_product_id, e.amount_gram),
                    )
                elif getattr(e, "recipe_id", None) is not None:
                    cur.execute(
                        "INSERT INTO meal_entries (meal_id, recipe_id, portions) VALUES (%s, %s, %s)",
                        (str(meal_id), e.recipe_id, getattr(e, "portions", 1.0)),
                    )
        finally:
            cur.close()
    return {"id": str(meal_id)}


@app.delete("/api/meals/{meal_id}")
def delete_meal(meal_id: UUID, user_id: UUID = Depends(require_user)):
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute("DELETE FROM meals WHERE id = %s AND user_id = %s RETURNING id", (str(meal_id), str(user_id)))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Måltid ikke funnet")
        finally:
            cur.close()
    return {"ok": True}


# --- Vekt (dag for dag) ---
class WeightIn(BaseModel):
    date: str  # YYYY-MM-DD
    weight_kg: float


@app.get("/api/weight")
def get_weight(date: str, user_id: UUID = Depends(require_user)):
    """Hent vekt for én dag."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        cur.execute(
            "SELECT log_date, weight_kg FROM weight_entries WHERE user_id = %s AND log_date = %s",
            (str(user_id), date),
        )
        row = cur.fetchone()
    if not row:
        return {"date": date, "weight_kg": None}
    return {"date": str(row["log_date"]), "weight_kg": float(row["weight_kg"])}


@app.get("/api/weight/history")
def get_weight_history(
    from_date: str = "",  # YYYY-MM-DD
    to_date: str = "",
    user_id: UUID = Depends(require_user),
):
    """Historikk for vektgraf (fra–til)."""
    from datetime import timedelta
    today = datetime.now(timezone.utc).date()
    if not to_date:
        to_date = today.isoformat()
    if not from_date:
        from_date = (today - timedelta(days=365)).isoformat()
    with get_connection() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """
            SELECT log_date, weight_kg
            FROM weight_entries
            WHERE user_id = %s AND log_date >= %s AND log_date <= %s
            ORDER BY log_date
            """,
            (str(user_id), from_date, to_date),
        )
        rows = cur.fetchall()
    return [
        {"date": str(r["log_date"]), "weight_kg": float(r["weight_kg"])}
        for r in rows
    ]


@app.post("/api/weight")
def upsert_weight(body: WeightIn, user_id: UUID = Depends(require_user)):
    """Lagre eller oppdater vekt for en gitt dag."""
    weight_kg = round(float(body.weight_kg), 2)
    if weight_kg <= 0 or weight_kg > 500:
        raise HTTPException(status_code=400, detail="Ugyldig vekt")
    with get_connection() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """
            INSERT INTO weight_entries (user_id, log_date, weight_kg)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, log_date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg, created_at = NOW()
            """,
            (str(user_id), body.date, weight_kg),
        )
    return {"date": body.date, "weight_kg": weight_kg}


# --- Bruker: søk om coach (venter på admin-godkjenning) ---
@app.post("/api/me/request-coach")
def request_coach(user_id: UUID = Depends(require_user)):
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                UPDATE users SET coach_sokt = TRUE, oppdatert = NOW()
                WHERE id = %s AND coach_sokt = FALSE
                RETURNING id
                """,
                (str(user_id),),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail="Har allerede søkt om coach")
        finally:
            cur.close()
    return {"ok": True, "message": "Forespørsel sendt. Admin godkjenner."}


# --- Admin: coach godkjenning ---
@app.get("/api/admin/coach-requests")
def list_coach_requests(_admin_id: UUID = Depends(require_admin)):
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, email, navn, opprettet
                FROM users
                WHERE coach_sokt = TRUE AND coach_godkjent = FALSE
                ORDER BY opprettet DESC
                """
            )
            return cur.fetchall()
        finally:
            cur.close()


@app.post("/api/admin/coach-requests/{user_id}/approve")
def approve_coach_request(user_id: UUID, _admin_id: UUID = Depends(require_admin)):
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                UPDATE users
                SET rolle = 'kunde_og_coach', coach_godkjent = TRUE, oppdatert = NOW()
                WHERE id = %s AND coach_sokt = TRUE
                RETURNING id
                """,
                (str(user_id),),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Bruker eller forespørsel ikke funnet")
        finally:
            cur.close()


# --- Admin: gi admin-rolle (kun admin kan gi admin til andre) ---
@app.post("/api/admin/users/{user_id}/role")
def set_user_role(user_id: UUID, body: SetRoleRequest, _admin_id: UUID = Depends(require_admin)):
    if body.rolle not in ("admin", "kunde", "kunde_og_coach"):
        raise HTTPException(status_code=400, detail="Ugyldig rolle")
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                "UPDATE users SET rolle = %s, oppdatert = NOW() WHERE id = %s RETURNING id",
                (body.rolle, str(user_id)),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Bruker ikke funnet")
        finally:
            cur.close()
    return {"ok": True}


# --- Media / objektlagring (MinIO lokalt, S3/R2 i prod) ---
ALLOWED_UPLOAD_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
}
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


@app.post("/api/upload")
def upload_media(
    file: UploadFile = File(...),
    prefix: str = "media",
    user_id: UUID = Depends(require_user),
):
    """
    Last opp bilde eller video. Returnerer URL (path) som brukes i /api/media/...
    prefix kan f.eks. være 'coach' for coach-profilbilder.
    """
    if not STORAGE_ENABLED:
        raise HTTPException(status_code=503, detail="Upload er ikke konfigurert (S3/MinIO)")
    ct = file.content_type or ""
    if ct not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Ugyldig filtype. Tillatt: bilder (jpeg, png, gif, webp), video (mp4, webm)",
        )
    key = make_key(prefix, file.filename or "file")
    try:
        upload_fileobj(file.file, key, ct)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Opplasting feilet")
    url = f"/api/media/{key}"
    return {"url": url, "key": key}


def _media_type_from_path(path: str) -> str:
    ext = path.rsplit(".", 1)[-1].lower() if "." in path else ""
    mime = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "gif": "image/gif", "webp": "image/webp",
        "mp4": "video/mp4", "webm": "video/webm",
    }.get(ext, "application/octet-stream")
    return mime


@app.get("/api/media/{path:path}")
def serve_media(path: str):
    """Stream fil fra objektlagring (MinIO/S3). Public lesing."""
    if not STORAGE_ENABLED:
        raise HTTPException(status_code=404, detail="Media ikke tilgjengelig")
    stream = get_object_stream(path)
    if stream is None:
        raise HTTPException(status_code=404, detail="Fil ikke funnet")
    return StreamingResponse(stream, media_type=_media_type_from_path(path))


# --- Kunde: min coach / finn coach (valgfri programlengde) ---
def _parse_program_lengder(raw: str | None) -> list[int]:
    if not raw or not raw.strip():
        return [12]
    return [int(x.strip()) for x in raw.split(",") if x.strip().isdigit()] or [12]


class AssignCoachRequest(BaseModel):
    coach_id: str  # UUID
    lengde_uker: int | None = 12  # programlengde i uker (må være blant coach sine tilbud)


@app.get("/api/me/coach")
def get_my_coach(user_id: UUID = Depends(require_user)):
    """Returnerer kundens coach (aktiv eller siste). Program og logger tilhører alltid kunden."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT kc.id, kc.coach_id, kc.start_dato, kc.slutt_dato,
                       u.navn AS coach_navn, u.email AS coach_email,
                       u.coach_beskrivelse, u.coach_spesialiseringer, u.coach_bilde
                FROM kunde_coach kc
                JOIN users u ON u.id = kc.coach_id
                WHERE kc.kunde_id = %s
                ORDER BY kc.start_dato DESC
                LIMIT 1
                """,
                (str(user_id),),
            )
            row = cur.fetchone()
        finally:
            cur.close()
    if not row:
        return None
    now = datetime.now(timezone.utc)
    slutt = row["slutt_dato"]
    if slutt.tzinfo is None:
        slutt = slutt.replace(tzinfo=timezone.utc)
    har_tilgang = slutt > now
    return {
        "id": str(row["id"]),
        "coach_id": str(row["coach_id"]),
        "coach_navn": row["coach_navn"] or row["coach_email"],
        "coach_email": row["coach_email"],
        "coach_beskrivelse": row["coach_beskrivelse"] or "",
        "coach_spesialiseringer": (row["coach_spesialiseringer"] or "").strip(),
        "coach_bilde": row.get("coach_bilde"),
        "start_dato": row["start_dato"].isoformat() if row["start_dato"] else None,
        "slutt_dato": row["slutt_dato"].isoformat() if row["slutt_dato"] else None,
        "har_tilgang": har_tilgang,
    }


@app.get("/api/coaches")
def list_coaches(user_id: UUID = Depends(require_user)):
    """Liste over tilgjengelige coach (kunde_og_coach godkjent)."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, navn, email, coach_beskrivelse, coach_spesialiseringer, coach_bilde, coach_program_lengder
                FROM users
                WHERE rolle = 'kunde_og_coach' AND coach_godkjent = TRUE
                ORDER BY navn NULLS LAST, email
                """
            )
            rows = cur.fetchall()
        finally:
            cur.close()
    return [
        {
            "id": str(r["id"]),
            "navn": r["navn"] or r["email"],
            "email": r["email"],
            "coach_beskrivelse": r["coach_beskrivelse"] or "",
            "coach_spesialiseringer": (r["coach_spesialiseringer"] or "").strip(),
            "coach_bilde": r.get("coach_bilde"),
            "program_lengder": _parse_program_lengder(r.get("coach_program_lengder")),
        }
        for r in rows
    ]


@app.get("/api/coaches/{coach_id}")
def get_coach(coach_id: UUID, user_id: UUID = Depends(require_user)):
    """Enkelt coach – for egen coacheside med bilde og valg av programlengde."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, navn, email, coach_beskrivelse, coach_spesialiseringer, coach_bilde, coach_program_lengder
                FROM users
                WHERE id = %s AND rolle = 'kunde_og_coach' AND coach_godkjent = TRUE
                """,
                (str(coach_id),),
            )
            row = cur.fetchone()
        finally:
            cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="Coach ikke funnet")
    return {
        "id": str(row["id"]),
        "navn": row["navn"] or row["email"],
        "email": row["email"],
        "coach_beskrivelse": row["coach_beskrivelse"] or "",
        "coach_spesialiseringer": (row["coach_spesialiseringer"] or "").strip(),
        "coach_bilde": row.get("coach_bilde"),
        "program_lengder": _parse_program_lengder(row.get("coach_program_lengder")),
    }


@app.post("/api/me/coach")
def assign_coach(body: AssignCoachRequest, user_id: UUID = Depends(require_user)):
    """Kunde velger en coach og programlengde – full tilgang til appen i valgt periode."""
    coach_id: UUID
    try:
        coach_id = UUID(body.coach_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Ugyldig coach-id")
    lengde_uker = body.lengde_uker if body.lengde_uker is not None else 12
    if lengde_uker < 1 or lengde_uker > 52:
        raise HTTPException(status_code=400, detail="Programlengde må være mellom 1 og 52 uker")
    start = datetime.now(timezone.utc)
    slutt = start + timedelta(weeks=lengde_uker)
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, coach_program_lengder FROM users
                WHERE id = %s AND rolle = 'kunde_og_coach' AND coach_godkjent = TRUE
                """,
                (str(coach_id),),
            )
            coach_row = cur.fetchone()
            if not coach_row:
                raise HTTPException(status_code=404, detail="Coach ikke funnet eller ikke tilgjengelig")
            tillatte = _parse_program_lengder(coach_row.get("coach_program_lengder"))
            if lengde_uker not in tillatte:
                raise HTTPException(
                    status_code=400,
                    detail=f"Coachen tilbyr kun {', '.join(str(u) for u in tillatte)} uker. Velg en av disse.",
                )
            cur.execute(
                """
                SELECT id FROM kunde_coach
                WHERE kunde_id = %s AND slutt_dato > %s
                """,
                (str(user_id), start),
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Du har allerede en aktiv coach. Avslutt først for å velge ny.")
            cur.execute(
                """
                INSERT INTO kunde_coach (kunde_id, coach_id, start_dato, slutt_dato)
                VALUES (%s, %s, %s, %s)
                RETURNING id
                """,
                (str(user_id), str(coach_id), start, slutt),
            )
            cur.fetchone()
        finally:
            cur.close()
    return {
        "ok": True,
        "slutt_dato": slutt.isoformat(),
        "lengde_uker": lengde_uker,
        "message": f"Du har nå full tilgang til appen med coachen i {lengde_uker} uker.",
    }


@app.post("/api/me/coach/avslutt")
def avslutt_coach_tilgang(user_id: UUID = Depends(require_user)):
    """Avslutt nåværende coach-tilgang med én gang. Program og logger beholdes."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                UPDATE kunde_coach
                SET slutt_dato = NOW()
                WHERE kunde_id = %s AND slutt_dato > NOW()
                RETURNING id
                """,
                (str(user_id),),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail="Du har ingen aktiv coach-tilgang å avslutte.")
        finally:
            cur.close()
    return {"ok": True, "message": "Coach-tilgang avsluttet. Program og alt du har logget er fortsatt tilgjengelig."}


# --- Public / health ---
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/users")
def list_users():
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                SELECT id, email, rolle, navn, opprettet, oppdatert
                FROM users
                ORDER BY opprettet DESC
                """
            )
            return cur.fetchall()
        finally:
            cur.close()
