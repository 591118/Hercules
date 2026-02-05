# Regnskap og salgsdokumenter (norsk lov)

Hercules lagrer salgsdokumenter i 5 år og kan sende dem til PowerOffice Go for automatisk bokføring.

## Påkrevd innhold (salgsdokument)

- Unikt fakturanummer
- Dato
- Selgers navn og orgnummer
- Kundens navn (eller identifikator)
- Beskrivelse av tjeneste
- Beløp (eks. MVA), MVA, totalbeløp
- Betalingsstatus

Dette lagres i tabellen `sales_documents`.

## Stripe → API → PowerOffice

1. **Stripe** håndterer betaling, faktura-PDF og kvittering.
2. **Ved betaling** (enten via webhook eller ved egen charge i appen) opprettes et salgsdokument og lagres i DB.
3. **PowerOffice Go** mottar ordre (fakturautkast) via API for bokføring.

## Stripe-webhooks

Sett `STRIPE_WEBHOOK_SECRET` og pek Stripe til:

```
POST https://<din-backend>/api/webhooks/stripe
```

**Hendelser som håndteres:**

| Event | Handling |
|-------|----------|
| `invoice.paid` | Opprett faktura + evt. send til PowerOffice |
| `customer.subscription.deleted` | Opprett sluttfaktura (siste faktura markeres) |
| `charge.refunded` | Opprett kreditnota |

I Stripe Dashboard: Developers → Webhooks → Add endpoint, velg disse tre events.

## PowerOffice Go

- **Dokumentasjon:** https://developer.poweroffice.net  
- **Auth:** OAuth 2.0 Client Credentials (Application key, Client key, Subscription key).

**Miljøvariabler:**

| Variabel | Beskrivelse |
|----------|-------------|
| `POWEROFFICE_APP_KEY` | Applikasjonsnøkkel (fra PowerOffice) |
| `POWEROFFICE_CLIENT_KEY` | Klientnøkkel (per Go-kunde) |
| `POWEROFFICE_SUBSCRIPTION_KEY` | Subscription key fra developer portal |
| `POWEROFFICE_DEMO` | `true` for demo-miljø |

Når disse er satt, sendes hvert nytt salgsdokument som en ordre (fakturautkast) til Go. Kunder opprettes/oppdateres ved behov.

## Selger (selskap)

| Variabel | Beskrivelse |
|----------|-------------|
| `SELLER_NAME` | Firmaets navn (på faktura) |
| `SELLER_ORG_NUMBER` | Orgnummer |

## Database

- **Database:** Alt skjema (users, kunde_coach, sales_documents, invoice_number_seq) ligger i `backend/db/init.sql`. Ved ny installasjon (f.eks. `docker compose up` med fersk volum) brukes init.sql automatisk.

## MVA

Abonnement til privatpersoner i Norge: 25 % MVA. Beløp lagres som øre (minste enhet).  
`amount_ex_vat_ore` og `vat_ore` beregnes automatisk (total / 1.25 og resten som MVA).
