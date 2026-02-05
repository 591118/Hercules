"""
Salgsdokumenter – norsk lov (5 år lagring).
Påkrevd: unikt fakturanummer, dato, selger navn/orgnr, kunde, beskrivelse, beløp, MVA, total, betalingsstatus.
Integrasjon med PowerOffice Go for automatisk bokføring.
"""
import os
from datetime import date
from uuid import UUID

from app.database import get_connection, get_cursor
from app.poweroffice import create_invoice_draft_from_sale

# Selger (selskap) – påkrevd på faktura
SELLER_NAME = os.getenv("SELLER_NAME", "Hercules").strip()
SELLER_ORG_NUMBER = os.getenv("SELLER_ORG_NUMBER", "").strip()


def _next_invoice_number() -> str:
    """Unikt fakturanummer: ÅR-NNNN (f.eks. 2025-0001)."""
    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute("SELECT nextval('invoice_number_seq')")
            seq = cur.fetchone()[0]
            y = date.today().year
            return f"{y}-{seq:04d}"
        finally:
            cur.close()


def create_sales_document(
    document_type: str,
    *,
    customer_id: UUID | None = None,
    customer_name: str | None = None,
    customer_email: str | None = None,
    customer_org_number: str | None = None,
    description: str,
    amount_ex_vat_ore: int,
    vat_ore: int,
    total_ore: int,
    currency: str = "NOK",
    payment_status: str = "paid",
    stripe_invoice_id: str | None = None,
    stripe_charge_id: str | None = None,
    stripe_payment_intent_id: str | None = None,
    stripe_pdf_url: str | None = None,
    external_reference: str | None = None,
    document_date: date | None = None,
) -> str | None:
    """
    Lagre salgsdokument i DB (lovpålagt) og send til PowerOffice Go hvis konfigurert.
    document_type: 'faktura' | 'kreditnota' | 'sluttfaktura'
    Returnerer invoice_number eller None ved feil.
    """
    doc_date = document_date or date.today()
    inv_no = _next_invoice_number()
    seller_name = SELLER_NAME or "Hercules"
    seller_org = SELLER_ORG_NUMBER or None

    with get_connection() as conn:
        cur = get_cursor(conn)
        try:
            cur.execute(
                """
                INSERT INTO sales_documents (
                    document_type, invoice_number, document_date,
                    seller_name, seller_org_number,
                    customer_id, customer_name, customer_email, customer_org_number,
                    description, amount_ex_vat_ore, vat_ore, total_ore, currency,
                    payment_status,
                    stripe_invoice_id, stripe_charge_id, stripe_payment_intent_id, stripe_pdf_url,
                    external_reference
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
                """,
                (
                    document_type,
                    inv_no,
                    doc_date,
                    seller_name,
                    seller_org,
                    str(customer_id) if customer_id else None,
                    customer_name,
                    customer_email,
                    customer_org_number,
                    description,
                    amount_ex_vat_ore,
                    vat_ore,
                    total_ore,
                    currency,
                    payment_status,
                    stripe_invoice_id,
                    stripe_charge_id,
                    stripe_payment_intent_id,
                    stripe_pdf_url,
                    external_reference,
                ),
            )
        except Exception:
            return None
        finally:
            cur.close()

    # PowerOffice: send ordre (fakturautkast)
    ext_ref = external_reference or f"hercules-{inv_no}"
    ok, po_id = create_invoice_draft_from_sale(
        customer_name=customer_name or customer_email or "",
        customer_email=customer_email or "",
        description=description,
        total_ore=total_ore,
        amount_ex_vat_ore=amount_ex_vat_ore,
        vat_ore=vat_ore,
        external_ref=ext_ref,
        customer_org_number=customer_org_number,
    )
    if ok and po_id:
        with get_connection() as conn:
            cur = get_cursor(conn)
            try:
                cur.execute(
                    """
                    UPDATE sales_documents
                    SET poweroffice_sent_at = NOW(), poweroffice_order_id = %s
                    WHERE invoice_number = %s
                    """,
                    (po_id, inv_no),
                )
            finally:
                cur.close()

    return inv_no


def create_from_stripe_invoice(invoice: dict) -> str | None:
    """
    Opprett salgsdokument fra Stripe invoice (event invoice.paid).
    invoice: Stripe Invoice object (from webhook).
    """
    lines = invoice.get("lines", {}).get("data", [])
    if not lines:
        return None
    total_ore = invoice.get("amount_paid") or 0  # Stripe: alltid i minste enhet (øre for NOK)
    currency = (invoice.get("currency") or "nok").upper()
    # Forenklet MVA: 25% inkl → amount_ex = total/1.25, vat = total - amount_ex
    amount_ex = int(total_ore / 1.25)
    vat_ore = total_ore - amount_ex
    desc = lines[0].get("description") or "Abonnement"
    if len(lines) > 1:
        desc = f"Abonnement ({len(lines)} linjer)"
    customer_email = invoice.get("customer_email")
    if not customer_email and invoice.get("customer"):
        customer_email = invoice.get("customer")
    return create_sales_document(
        document_type="faktura",
        customer_email=customer_email,
        customer_name=invoice.get("customer_name"),
        description=desc,
        amount_ex_vat_ore=amount_ex,
        vat_ore=vat_ore,
        total_ore=total_ore,
        currency=currency,
        payment_status="paid",
        stripe_invoice_id=invoice.get("id"),
        stripe_charge_id=invoice.get("charge"),
        stripe_pdf_url=invoice.get("invoice_pdf"),
        external_reference=invoice.get("id"),
    )


def create_from_stripe_charge(charge: dict, *, is_refund: bool = False) -> str | None:
    """
    Opprett salgsdokument fra Stripe Charge (f.eks. PaymentIntent-betaling eller charge.refunded).
    charge: Stripe Charge object. Ved refund: bruk charge med amount_refunded.
    """
    amount_ore = charge.get("amount", 0)  # Stripe: minste enhet (øre for NOK)
    if is_refund:
        amount_ore = -(charge.get("amount_refunded") or amount_ore)
    currency = (charge.get("currency") or "nok").upper()
    if amount_ore < 0:
        amount_ex = int(amount_ore / 1.25)
        vat_ore = amount_ore - amount_ex
        doc_type = "kreditnota"
    else:
        amount_ex = int(amount_ore / 1.25)
        vat_ore = amount_ore - amount_ex
        doc_type = "faktura"
    return create_sales_document(
        document_type=doc_type,
        customer_email=charge.get("billing_details", {}).get("email"),
        customer_name=charge.get("billing_details", {}).get("name"),
        description="Kreditnota – refusjon" if is_refund else "Abonnement",
        amount_ex_vat_ore=amount_ex,
        vat_ore=vat_ore,
        total_ore=amount_ore,
        currency=currency,
        payment_status="refunded" if is_refund else "paid",
        stripe_charge_id=charge.get("id"),
        external_reference=f"{charge.get('id')}-refund" if is_refund else charge.get("id"),
    )


def create_from_payment_success(
    user_id: UUID,
    customer_name: str | None,
    customer_email: str,
    total_ore: int,
    description: str,
    stripe_payment_intent_id: str | None = None,
    stripe_charge_id: str | None = None,
) -> str | None:
    """
    Opprett faktura ved vellykket betaling (vår egen charge i /api/me eller cron).
    MVA 25%: amount_ex = total/1.25, vat = total - amount_ex.
    """
    amount_ex = int(total_ore / 1.25)
    vat_ore = total_ore - amount_ex
    return create_sales_document(
        document_type="faktura",
        customer_id=user_id,
        customer_name=customer_name,
        customer_email=customer_email,
        description=description,
        amount_ex_vat_ore=amount_ex,
        vat_ore=vat_ore,
        total_ore=total_ore,
        currency="NOK",
        payment_status="paid",
        stripe_payment_intent_id=stripe_payment_intent_id,
        stripe_charge_id=stripe_charge_id,
        external_reference=stripe_payment_intent_id or stripe_charge_id or str(user_id),
    )
