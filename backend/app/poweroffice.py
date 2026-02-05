"""
PowerOffice Go API client – OAuth 2.0 Client Credentials, Customers, Sales Orders (invoice drafts).
Docs: https://developer.poweroffice.net
Bruk: Faktura/kreditnota sendes til regnskap; automatisk bokføring ved å sende ordre til Go.
"""
import base64
import os
import time
from typing import Any

import httpx

# Miljøvariabler (per klient/instans)
POWEROFFICE_APP_KEY = os.getenv("POWEROFFICE_APP_KEY", "").strip()
POWEROFFICE_CLIENT_KEY = os.getenv("POWEROFFICE_CLIENT_KEY", "").strip()
POWEROFFICE_SUBSCRIPTION_KEY = os.getenv("POWEROFFICE_SUBSCRIPTION_KEY", "").strip()
POWEROFFICE_DEMO = os.getenv("POWEROFFICE_DEMO", "false").strip().lower() in ("1", "true", "yes")

BASE_OAUTH = "https://goapi.poweroffice.net/Demo/OAuth/Token" if POWEROFFICE_DEMO else "https://goapi.poweroffice.net/OAuth/Token"
BASE_API = "https://goapi.poweroffice.net/Demo/v2" if POWEROFFICE_DEMO else "https://goapi.poweroffice.net/v2"

_token: str | None = None
_token_expires_at: float = 0


def _is_configured() -> bool:
    return bool(POWEROFFICE_APP_KEY and POWEROFFICE_CLIENT_KEY and POWEROFFICE_SUBSCRIPTION_KEY)


def get_token() -> str | None:
    """Hent OAuth access token (cachet 20 min)."""
    global _token, _token_expires_at
    if not _is_configured():
        return None
    if _token and time.time() < _token_expires_at - 60:
        return _token
    basic = base64.b64encode(f"{POWEROFFICE_APP_KEY}:{POWEROFFICE_CLIENT_KEY}".encode()).decode()
    with httpx.Client() as client:
        r = client.post(
            BASE_OAUTH,
            headers={
                "Authorization": f"Basic {basic}",
                "Ocp-Apim-Subscription-Key": POWEROFFICE_SUBSCRIPTION_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=15.0,
        )
    if r.status_code != 200:
        return None
    data = r.json()
    _token = data.get("access_token")
    _token_expires_at = time.time() + (data.get("expires_in") or 1200)
    return _token


def _headers() -> dict[str, str]:
    token = get_token()
    if not token:
        return {}
    return {
        "Authorization": f"Bearer {token}",
        "Ocp-Apim-Subscription-Key": POWEROFFICE_SUBSCRIPTION_KEY,
        "Content-Type": "application/json",
    }


def ensure_customer(
    name: str,
    email: str,
    *,
    org_number: str | None = None,
    phone: str | None = None,
    external_id: str | None = None,
) -> int | None:
    """
    Finn eller opprett kunde i Go. Returnerer Go Customer Id eller None.
    Søker først på e-post; oppretter kun ved behov.
    """
    if not _is_configured():
        return None
    h = _headers()
    if not h:
        return None
    with httpx.Client() as client:
        try:
            search = client.get(
                f"{BASE_API}/Customer",
                headers=h,
                params={"$filter": f"Email eq '{email}'"},
                timeout=15.0,
            )
            if search.status_code == 200:
                data = search.json()
                if isinstance(data, list) and data:
                    return data[0].get("Id")
                if isinstance(data, dict) and data.get("value"):
                    return data["value"][0].get("Id")
        except Exception:
            pass
        payload: dict[str, Any] = {
            "Name": name or email,
            "Email": email,
            "IsPerson": True,
        }
        if org_number:
            payload["VatNumber"] = org_number
        if phone:
            payload["Phone"] = phone
        if external_id:
            payload["ExternalCode"] = external_id[:50]
        r = client.post(f"{BASE_API}/Customer", headers=h, json=payload, timeout=15.0)
    if r.status_code not in (200, 201):
        return None
    data = r.json()
    return data.get("Id")


def create_sales_order_draft(
    customer_go_id: int,
    lines: list[dict[str, Any]],
    external_import_reference: str,
    *,
    description: str | None = None,
) -> int | None:
    """
    Opprett ordre (fakturautkast) i Go. Linjer: [{"Description": "...", "Quantity": 1, "UnitPrice": 100.0}, ...].
    For kreditnota: bruk negativ Quantity. external_import_reference = unik ref (f.eks. stripe_invoice_xxx).
    """
    if not _is_configured():
        return None
    h = _headers()
    if not h:
        return None
    payload = {
        "CustomerId": customer_go_id,
        "ExternalImportReference": external_import_reference,
        "OrderLines": lines,
        "State": "Confirmed",
    }
    if description:
        payload["Note"] = description
    with httpx.Client() as client:
        r = client.post(f"{BASE_API}/Order", headers=h, json=payload, timeout=15.0)
    if r.status_code not in (200, 201):
        return None
    data = r.json()
    return data.get("Id")


def create_invoice_draft_from_sale(
    customer_name: str,
    customer_email: str,
    description: str,
    total_ore: int,
    amount_ex_vat_ore: int,
    vat_ore: int,
    external_ref: str,
    *,
    customer_org_number: str | None = None,
) -> tuple[bool, int | None]:
    """
    Enkel flyt: opprett/hent kunde, opprett ordre med én linje (beløp inkl MVA).
    Returnerer (success, poweroffice_order_id).
    """
    if not _is_configured():
        return False, None
    cid = ensure_customer(
        name=customer_name or customer_email,
        email=customer_email,
        org_number=customer_org_number,
        external_id=external_ref[:50] if external_ref else None,
    )
    if not cid:
        return False, None
    # Én linje: total i NOK (Go forventer typisk per enhet; vi sender 1 enhet = total)
    total_nok = total_ore / 100.0
    lines = [
        {
            "Description": description[:500] if description else "Abonnement",
            "Quantity": 1,
            "UnitPrice": total_nok,
        }
    ]
    oid = create_sales_order_draft(
        customer_go_id=cid,
        lines=lines,
        external_import_reference=external_ref,
        description=description,
    )
    return (oid is not None, oid)
