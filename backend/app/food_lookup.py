"""
Matoppslag: alltid lokal DB først, deretter fallback Open Food Facts → Nutritionix → Edamam.
Ved treff i ekstern API lagres produktet permanent i lokal DB (caching).
"""
import os
import re
from typing import Any
from uuid import UUID

import httpx
from psycopg2.extras import RealDictCursor

from .database import get_connection, get_cursor

# Normaliser strekkode: fjern mellomrom, behold siffer
def _normalize_barcode(barcode: str | None) -> str | None:
    if not barcode or not isinstance(barcode, str):
        return None
    cleaned = re.sub(r"\s+", "", barcode).strip()
    return cleaned if cleaned and cleaned.isdigit() else None


def _row_to_product(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "name": r["name"],
        "barcode": r.get("barcode"),
        "source": r.get("source") or "local",
        "brand": r.get("brand"),
        "image_url": r.get("image_url"),
        "user_id": str(r["user_id"]) if r.get("user_id") else None,
        "kcal_per_100": float(r["kcal_per_100"]),
        "protein_per_100": float(r["protein_per_100"]),
        "carbs_per_100": float(r["carbs_per_100"]),
        "fat_per_100": float(r["fat_per_100"]),
    }


def find_by_barcode_local(barcode: str, user_id: UUID | None = None) -> dict | None:
    """Sjekk lokal database først (global + brukerens egne)."""
    b = _normalize_barcode(barcode)
    if not b:
        return None
    with get_connection() as conn:
        cur = get_cursor(conn)
        cur.execute(
            """
            SELECT id, name, barcode, source, brand, image_url, user_id,
                   kcal_per_100, protein_per_100, carbs_per_100, fat_per_100
            FROM food_products
            WHERE barcode = %s AND (user_id IS NULL OR user_id = %s)
            LIMIT 1
            """,
            (b, str(user_id) if user_id else None),
        )
        row = cur.fetchone()
    if not row:
        return None
    return _row_to_product(dict(row))


def _save_product(
    conn,
    *,
    name: str,
    barcode: str | None,
    source: str,
    brand: str | None = None,
    image_url: str | None = None,
    user_id: UUID | None = None,
    kcal_per_100: float,
    protein_per_100: float,
    carbs_per_100: float,
    fat_per_100: float,
) -> UUID:
    cur = get_cursor(conn)
    cur.execute(
        """
        INSERT INTO food_products
        (name, barcode, source, brand, image_url, user_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            name.strip()[:255],
            barcode[:20] if barcode else None,
            source[:30],
            (brand or "").strip()[:255] or None,
            (image_url or "").strip()[:2048] or None,
            str(user_id) if user_id else None,
            max(0, float(kcal_per_100)),
            max(0, float(protein_per_100)),
            max(0, float(carbs_per_100)),
            max(0, float(fat_per_100)),
        ),
    )
    return cur.fetchone()["id"]


# --- Open Food Facts (gratis, ingen API-nøkkel) ---
OFF_BASE = "https://world.openfoodfacts.net/api/v2/product"

def _fetch_openfoodfacts(barcode: str) -> dict | None:
    b = _normalize_barcode(barcode)
    if not b:
        return None
    url = f"{OFF_BASE}/{b}"
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(url, params={"fields": "product_name,brands,image_url,image_front_url,nutriments"})
            if r.status_code != 200:
                return None
            data = r.json()
            if data.get("status") != 1 or not data.get("product"):
                return None
            p = data["product"]
            nut = p.get("nutriments") or {}
            name = (p.get("product_name") or "").strip() or "Ukjent produkt"
            kcal = nut.get("energy-kcal_100g")
            if kcal is None:
                kj = nut.get("energy-kj_100g") or nut.get("energy_100g")
                if kj is not None:
                    kcal = float(kj) / 4.184
                else:
                    kcal = 0
            else:
                kcal = float(kcal)
            return {
                "name": name[:255],
                "barcode": b,
                "source": "openfoodfacts",
                "brand": (p.get("brands") or "").strip()[:255] or None,
                "image_url": (p.get("image_url") or p.get("image_front_url") or "").strip()[:2048] or None,
                "kcal_per_100": round(kcal, 2),
                "protein_per_100": round(float(nut.get("proteins_100g") or 0), 2),
                "carbs_per_100": round(float(nut.get("carbohydrates_100g") or 0), 2),
                "fat_per_100": round(float(nut.get("fat_100g") or 0), 2),
            }
    except Exception:
        return None


# --- Nutritionix (krever NUTRITIONIX_APP_ID og NUTRITIONIX_APP_KEY) ---
def _fetch_nutritionix(barcode: str) -> dict | None:
    app_id = os.getenv("NUTRITIONIX_APP_ID")
    app_key = os.getenv("NUTRITIONIX_APP_KEY")
    if not app_id or not app_key:
        return None
    b = _normalize_barcode(barcode)
    if not b:
        return None
    # Nutritionix v2: GET https://trackapi.nutritionix.com/v2/search/item?upc=...
    url = "https://trackapi.nutritionix.com/v2/search/item"
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(
                url,
                params={"upc": b},
                headers={"x-app-id": app_id, "x-app-key": app_key},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            # Response shape: can have foods list or single item
            items = data.get("foods") or data.get("common_foods") or []
            if isinstance(data.get("food"), dict):
                items = [data["food"]]
            if not items:
                return None
            item = items[0]
            # Per 100g: Nutritionix often gives per serving; we need to derive per 100g
            # nf_calories = per serving, serving_weight_grams = grams per serving
            nf = item.get("nf_nutrition") or item
            serving_g = item.get("serving_weight_grams") or nf.get("serving_weight_grams")
            if serving_g and float(serving_g) > 0:
                g = float(serving_g) / 100.0
                kcal = float(item.get("nf_calories") or nf.get("nf_calories") or 0) * (100.0 / float(serving_g))
                protein = float(item.get("nf_protein") or nf.get("nf_protein") or 0) * (100.0 / float(serving_g))
                carbs = float(item.get("nf_total_carbohydrate") or nf.get("nf_total_carbohydrate") or 0) * (100.0 / float(serving_g))
                fat = float(item.get("nf_total_fat") or nf.get("nf_total_fat") or 0) * (100.0 / float(serving_g))
            else:
                kcal = float(item.get("nf_calories") or 0)
                protein = float(item.get("nf_protein") or 0)
                carbs = float(item.get("nf_total_carbohydrate") or 0)
                fat = float(item.get("nf_total_fat") or 0)
                # Assume per 100g if no serving_weight
                if not serving_g:
                    # Some responses are per 100g already
                    pass
            name = (item.get("food_name") or item.get("foodName") or "").strip() or "Ukjent produkt"
            return {
                "name": name[:255],
                "barcode": b,
                "source": "nutritionix",
                "brand": (item.get("brand_name") or item.get("brandName") or "").strip()[:255] or None,
                "image_url": (item.get("photo", {}).get("thumb") if isinstance(item.get("photo"), dict) else None) or (item.get("image_url") or "").strip()[:2048] or None,
                "kcal_per_100": round(kcal, 2),
                "protein_per_100": round(protein, 2),
                "carbs_per_100": round(carbs, 2),
                "fat_per_100": round(fat, 2),
            }
    except Exception:
        return None


# --- Edamam Food Database (krever EDAMAM_FOOD_APP_ID og EDAMAM_FOOD_APP_KEY) ---
def _fetch_edamam(barcode: str) -> dict | None:
    app_id = os.getenv("EDAMAM_FOOD_APP_ID")
    app_key = os.getenv("EDAMAM_FOOD_APP_KEY")
    if not app_id or not app_key:
        return None
    b = _normalize_barcode(barcode)
    if not b:
        return None
    # Edamam: https://api.edamam.com/api/food-database/v2/parser?upc=...
    url = "https://api.edamam.com/api/food-database/v2/parser"
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.get(
                url,
                params={"upc": b, "app_id": app_id, "app_key": app_key},
            )
            if r.status_code != 200:
                return None
            data = r.json()
            hints = data.get("hints") or []
            if not hints:
                return None
            item = hints[0].get("food") or hints[0]
            # Edamam returns nutrients per 100g in food.nutrients
            nutrients = item.get("nutrients") or {}
            name = (item.get("label") or item.get("food", {}).get("label") if isinstance(item.get("food"), dict) else "" or "").strip() or "Ukjent produkt"
            return {
                "name": name[:255],
                "barcode": b,
                "source": "edamam",
                "brand": None,
                "image_url": (item.get("image") or "").strip()[:2048] or None,
                "kcal_per_100": round(float(nutrients.get("ENERC_KCAL") or 0), 2),
                "protein_per_100": round(float(nutrients.get("PROCNT") or 0), 2),
                "carbs_per_100": round(float(nutrients.get("CHOCDF") or 0), 2),
                "fat_per_100": round(float(nutrients.get("FAT") or 0), 2),
            }
    except Exception:
        return None


def lookup_by_barcode(barcode: str, user_id: UUID | None = None) -> dict | None:
    """
    Steg 1: Sjekk lokal DB. Steg 2: Open Food Facts. Steg 3: Nutritionix. Steg 4: Edamam.
    Ved treff i ekstern API lagres produktet i food_products og returneres.
    """
    # 1) Lokal database
    local = find_by_barcode_local(barcode, user_id)
    if local:
        return local

    b = _normalize_barcode(barcode)
    if not b:
        return None

    # 2) Open Food Facts
    off = _fetch_openfoodfacts(barcode)
    if off:
        with get_connection() as conn:
            try:
                pid = _save_product(conn, user_id=None, **off)
                cur = get_cursor(conn)
                cur.execute(
                    "SELECT id, name, barcode, source, brand, image_url, user_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100 FROM food_products WHERE id = %s",
                    (str(pid),),
                )
                row = cur.fetchone()
                return _row_to_product(dict(row)) if row else None
            except Exception:
                return find_by_barcode_local(barcode, user_id) or None

    # 3) Nutritionix
    nix = _fetch_nutritionix(barcode)
    if nix:
        with get_connection() as conn:
            try:
                pid = _save_product(conn, user_id=None, **nix)
                cur = get_cursor(conn)
                cur.execute(
                    "SELECT id, name, barcode, source, brand, image_url, user_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100 FROM food_products WHERE id = %s",
                    (str(pid),),
                )
                row = cur.fetchone()
                return _row_to_product(dict(row)) if row else None
            except Exception:
                return find_by_barcode_local(barcode, user_id) or None

    # 4) Edamam
    ed = _fetch_edamam(barcode)
    if ed:
        with get_connection() as conn:
            try:
                pid = _save_product(conn, user_id=None, **ed)
                cur = get_cursor(conn)
                cur.execute(
                    "SELECT id, name, barcode, source, brand, image_url, user_id, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100 FROM food_products WHERE id = %s",
                    (str(pid),),
                )
                row = cur.fetchone()
                return _row_to_product(dict(row)) if row else None
            except Exception:
                return find_by_barcode_local(barcode, user_id) or None

    return None
