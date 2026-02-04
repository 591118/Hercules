from uuid import UUID

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from app.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.database import get_connection, get_cursor

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


# --- Auth ---
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
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="E-post er allerede registrert")
            passord_hash = hash_password(body.password)
            cur.execute(
                """
                INSERT INTO users (email, passord_hash, rolle, navn)
                VALUES (%s, %s, 'kunde', %s)
                RETURNING id, email, rolle, navn
                """,
                (email, passord_hash, (body.navn or "").strip() or None),
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
                SELECT id, email, rolle, navn, coach_sokt, coach_godkjent
                FROM users WHERE id = %s
                """,
                (str(user_id),),
            )
            row = cur.fetchone()
        finally:
            cur.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    rolle = row["rolle"]
    kan_bytte_view = rolle == "admin" or (rolle == "kunde_og_coach" and row["coach_godkjent"])
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "rolle": row["rolle"],
        "navn": row["navn"] or row["email"],
        "coach_sokt": row["coach_sokt"],
        "coach_godkjent": row["coach_godkjent"],
        "kan_bytte_view": kan_bytte_view,
    }


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
