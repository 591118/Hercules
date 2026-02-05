# Hercules

**Hercules** er en helhetlig helse- og treningsplattform i en totalapp i stedet for mange separate løsninger. Appen samler kaloritracking, kosthold, trening, aktivitet, wearables og coach-kunde-samarbeid i en sømløs opplevelse.

Målet er å gi brukere full oversikt over helse og prestasjon, samtidig som sertifiserte coacher kan følge opp kunder på en trygg, kontrollert og samtykkebasert måte.

---

## V1 – Kjør med Docker

Alt er dockerisert. Sentral bygging og kjøring (Docker må være startet):

```bash
docker compose up --build
```

- **Frontend:** http://localhost:8080  
- **Backend API:** http://localhost:8000 (docs: http://localhost:8000/docs)  
- **PostgreSQL:** localhost:5432 (bruker: hercules, passord: hercules, db: hercules)  
- **MinIO (bilder/video):** http://localhost:9000 (minioadmin / minioadmin) – S3-kompatibel objektlagring

**Innlogging (admin):** E-post `admin@hercules.no`, passord `admin123` (se kommentar i `backend/db/init.sql`).

**Innlogging feiler?** Hercules-backenden bruker **port 8000** og endepunktet **POST /api/auth/login**. Hvis du ser logg med port 5000 eller `/internal/users/auth-info` / `/login/user`, kjører du en annen app – sørg for at du er i Hercules-mappen og kjører `docker compose` der.

**Nullstille DB og få ny admin:**  
`docker compose down -v` (fjerner volum, så DB opprettes på nytt med init.sql)  
Deretter: `docker compose up --build`

### Betaling (signup – Kort, Vipps, PayPal)

- **Betaling forut for tilgang:** Kort, Vipps og PayPal aksepteres. Brukeren betaler i forkant og får tilgang; kan si opp når som helst.
- **1 uke gratis:** Ved kort: 7 dager gratis, deretter første trekk automatisk. Ved Vipps/PayPal: samme prinsipp (integrasjon kan legges til).
- **Ved betalingsfeil:** Systemet prøver på nytt én gang per uke og sender e-post. Siste mulighet er siste dag i måneden – deretter sperres kontoen inntil betaling er oppdatert.
- **Backend:** Sett `STRIPE_SECRET_KEY` for kort. Valgfri `CRON_SECRET`: kall `POST /api/cron/retry-payments` med `Authorization: Bearer <CRON_SECRET>` daglig for ukentlig retry og sperring siste dag i måneden.
- **Frontend:** Sett `VITE_STRIPE_PUBLISHABLE_KEY` for Stripe kortfelt ved signup.
- **Signup er ferdig:** Etter registrering logges brukeren automatisk inn og sendes til forsiden.

### Mobilapp (App Store og Google Play)

- Samme frontend bygges som **native app** med Capacitor (iOS og Android).
- I appen: **kun innlogging** – ingen registrering. Brukere opprettes på web (datamaskin), deretter logges de inn i appen.
- Bygg: `cd frontend && npm run cap:sync`, deretter `npm run cap:ios` / `npm run cap:android`. Se **docs/MOBILE.md** for full oppsett og utlevering til App Store og Google Play.

### Regnskap og salgsdokumenter (norsk lov)

- **Salgsdokumenter** lagres i 5 år (tabell `sales_documents`) med påkrevd innhold: fakturanummer, dato, selger/kunde, beløp, MVA, betalingsstatus.
- **Stripe-webhook:** Sett `STRIPE_WEBHOOK_SECRET` og pek Stripe til `POST /api/webhooks/stripe`. Håndterer `invoice.paid`, `customer.subscription.deleted`, `charge.refunded` (faktura, sluttfaktura, kreditnota).
- **PowerOffice Go:** Valgfri integrasjon. Sett `POWEROFFICE_APP_KEY`, `POWEROFFICE_CLIENT_KEY`, `POWEROFFICE_SUBSCRIPTION_KEY` (og evt. `POWEROFFICE_DEMO=true`). Ordre sendes automatisk som fakturautkast til Go.
- **Selger:** `SELLER_NAME`, `SELLER_ORG_NUMBER` (påkrevd på faktura).
- Se **docs/ACCOUNTING.md** for detaljer.

### Ernæring og matdatabase (strekkode-oppslag)

- **Lookup-flyt:** Alltid lokal database først → deretter **Open Food Facts** (gratis) → **Nutritionix** → **Edamam**. Ved treff i ekstern API lagres produktet permanent i din database (caching). Neste oppslag er instant og uten API-kostnad.
- **Strekkode kun i appen:** Strekkodesøk/skanning vises bare i **mobilappen** (iOS/Android). På web (PC) bruker man søk på matvare og «Legg til eget produkt». App og web deler samme data – brukeren får et komplett bilde uansett enhet.
- **Strekkode-API:** `GET /api/food/by-barcode?barcode=<EAN>`. I appen kan brukeren skanne eller skrive strekkode; ved «ikke funnet» kan de legge til egen matvare manuelt (i app eller på web).
- **Brukerens matvarer:** `POST /api/food` for manuell registrering (navn, valgfri strekkode/merke, næring per 100 g). Disse vises i søk sammen med global matdatabase.
- **Valgfrie API-nøkler (fallback):**  
  - **Nutritionix:** `NUTRITIONIX_APP_ID`, `NUTRITIONIX_APP_KEY` (øker dekningsgrad).  
  - **Edamam Food Database:** `EDAMAM_FOOD_APP_ID`, `EDAMAM_FOOD_APP_KEY` (tredje fallback).  
  Uten disse brukes kun Open Food Facts etter lokal DB.
- **Database:** Alt schema (matvarer med strekkode/source/brand, vekt per dag, osv.) ligger i `backend/db/init.sql`. Ny install: bruk `init.sql`. Har du en gammel DB uten disse tabellene/kolonnene, må du kjøre tilsvarende `ALTER TABLE` / `CREATE TABLE` manuelt eller nullstille med `docker compose down -v` og starte på nytt.

### Vekt og Analyse

- **Vekt** lagres dag for dag på Ernæring-siden (`/dashboard/calories`). Brukeren velger dato, skriver inn vekt og trykker «Lagre vekt». Samme dag kan overskrives ved ny registrering.
- **API:** `GET /api/weight?date=`, `POST /api/weight` (body: `date`, `weight_kg`), `GET /api/weight/history?from_date=&to_date=` for graf.
- **Analyse** (`/dashboard/analyse`): vektgraf over 30/90/365 dager. Infotips (spørsmålstegn) på Oppsummering-kortet forklarer lagring og linker til Analyse.
- **Integrasjoner** (`/dashboard/integrations`): side for å koble til Apple Health, Polar, Garmin m.fl. Skritt og aktivitet skal hentes automatisk når støtte er aktiv – foreløpig vises kildene som «Kommer snart». Integrasjoner ligger under Kunde Dashboard sammen med Kaloritelling, Trening, Analyse og Coach.

### Objektlagring (bilder / video)

- **Lokal:** MinIO kjører i Docker; backend bruker `S3_ENDPOINT_URL`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Filer serveres via `GET /api/media/<key>`.
- **Produksjon (Kubernetes):** Sett samme miljøvariabler mot egen S3/R2/Blob – ingen kodeendring. Se `docs/STORAGE.md` for env-liste og K8s-eksempel.

### Roller (3 stk)

| Rolle | Beskrivelse |
|-------|-------------|
| **admin** | Alle tilganger, kan bytte mellom views (kunde/coach/admin) |
| **kunde** | Kunde-view – logger mat, trening, ser egen oversikt |
| **kunde_og_coach** | Både kunde og coach – kan bytte mellom kunde- og coach-view |

Database init: `backend/db/init.sql` (tabell `users`, enum `user_role`).

### Repo-struktur V1

```
Hercules/
├── backend/          # Python FastAPI, Postgres
│   ├── app/          # main.py, database.py
│   ├── db/           # init.sql
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/         # React (Vite) + nginx
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Første del av appen - plan

Fase 1 fokuserer på kjernedatabaser og daglig oversikt:

- **Matdatabase** ? matvarer, næringsinnhold, søk og registrering
- **Brukerdatabase** ? brukere med roller: kunde, coach, admin
- **Treningsprogram-database** ? program med ukeplan, økter og øvelser
- **Øvelse-database** ? øvelser (styrke, kondisjon) som bygger program
- **Daglig oversikt** – alle dager samlet for trender (kalorier, trening, aktivitet, vekt)
- **Vektintegrasjon** – digital henting eller manuell inntasting
- **AI treningsprogram** – korte, generelle program (innkjøring m.m.) før coach-nivå
- **Digital tvilling** – skader/plager på figur, ukentlige bilder, utvikling over tid

---

## Databaser og datamodell

### Brukerdatabase (med roller)

| Felt | Type | Beskrivelse |
|------|------|-------------|
| id | UUID | Unik bruker-ID |
| email | string | E-post (unik) |
| passord_hash | string | Sikret hash |
| rolle | enum | kunde / coach / admin |
| navn | string | Visningsnavn |
| opprettet, oppdatert | timestamp | Tidsstempler |

**Roller:** Kunde (logger mat/trening, ser egen oversikt), Coach (ser kunder etter samtykke, oppretter program), Admin (full tilgang).

### Matdatabase

| Felt | Type |
|------|------|
| id | UUID |
| navn | string |
| kalorier_per_100g, protein_per_100g, karbohydrat_per_100g, fett_per_100g | decimal |
| enhet | string (g, stk, dl) |
| kilde | system / bruker / ekstern |

Matføring knyttes til bruker, dato og matvare/mengde.

### Øvelse-database

| Felt | Type |
|------|------|
| id | UUID |
| navn, beskrivelse | string, text |
| type | styrke / kondisjon / mobilitet |
| enhet | string |
| standard_set_reps | string (valgfri) |

### Treningsprogram-database

**Program:** id, navn, beskrivelse, opprettet_av, varighet_uker.

**Programøkt:** id, program_id, navn, rekkefolge.

**Programøkt_øvelse:** program_økt_id, øvelse_id, rekkefolge, sets, reps_min, reps_max, rest_sekunder.

### Daglig oversikt (trender)

En rad per bruker per dag: bruker_id, dato, kalorier_inn, protein_inn, karbo_inn, fett_inn, kalorier_mål, trening_minutter, økt_fullfort, **vekt** (digital eller manuell), notater (evt. skritt/wearables). Brukes til grafer og trender over tid.

---

## Funksjoner

### Kaloritracking og matf�ring
- Daglig registrering av kalorier og makron�ringsstoffer
- Historikk per dag / uke / m�ned
- Mål vs faktisk inntak
- Manuell registrering og eksterne datakilder

### Trening og aktiviteter
- Egne og coach-opprettede treningsprogram
- Logging av økter (styrke, kondisjon)
- Historikk på volum, intensitet og progresjon

### Coach-kunde
- Coach før innsyn i kundens historikk (etter samtykke)
- Begrenset eller full historikk
- Oppsett av treningsprogram og kostholdsstrategier
- Kunden styrer hva som deles og hvor lenge

### Dashboard
- Web-dashboard for brukere og coacher
- Visualisering av kalorier, aktivitet, trening og fremgang over tid

### Integrasjoner
- Strava, Oura, Polar, Garmin m.m.
- Aktivitet, puls, søvn, kaloriforbruk

### Vektintegrasjon
- **Digital:** Hente vekt automatisk fra kompatible vekter (Wi‑Fi/Bluetooth, apper fra produsent)
- **Manuell:** Inntasting av vekt direkte i appen
- Vekt inkluderes i daglig oversikt og trender (grafer over tid, mål vs. faktisk)

### AI – korte treningsprogram
- AI genererer **korte, generelle treningsprogram** (f.eks. innkjøring, oppvarming, grunnleggende styrke)
- Brukes **før** man går over til coach og mer detaljerte programmer
- Gir brukeren et lett tilgjengelig, generelt nivå uten at coach er nødvendig

### Digital tvilling
- **Egen side** der bruker kan bygge en visuell «digital tvilling» av seg selv
- **Skader og plager:** Legge inn ulike skader/plager (f.eks. overtråkk, skulder, kne) og markere dem på figuren
- **Ukentlige bilder:** Laste opp ukentlig bilde og knytte til dato – se utvikling over x uker (sammenligning, trender)
- **Figur-frontside:** Visning av hele mennesket som figur (front), slik at man ser oversikt over kropp og merking av plager/skader over tid

---

## Arkitektur

- **Backend:** Python ? API, auth, databehandling, integrasjoner, coach?kunde-tilgang
- **Frontend (web):** React ? dashboard, programoppsett, historikk, admin/coach-grensesnitt
- **Mobil:** iOS og Android ? daglig logging, trening, wearables, push

---

## Personvern og sikkerhet
- Samtykkebasert deling
- Granulær tilgangsstyring
- GDPR-fokusert design
- Sikker lagring av helsedata

---



















# First version Webapp from Lovable
# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)




CHATGPT for hvordan fungere:

Du prøver egentlig å designe en vekst- og prismodell som får deg til 200 000 betalende brukere og maksimerer inntekt uten å ødelegge veksten. Dette handler om psykologi, distribusjon og incentiver, ikke bare pris.

La oss bryte det ned strategisk.

1. Først: Nåværende scenario (slik du beskrev)

Pris:

Fullpris: 100 kr/mnd

Rabatt: 70 kr/mnd

Antall:

Gratis: 300 → 0 kr

Rabatt: 50 000 → 3 500 000 kr/mnd

Fullpris: 50 000 → 5 000 000 kr/mnd

Totalt nå:
8 500 000 kr/mnd

Mål:
200 000 betalende kunder
Du mangler: 100 000 kunder

2. Viktig prinsipp: Ikke alle skal betale fullpris

Hvis alle betaler 100 kr → vanskelig å vokse.

Store apper bruker alltid nivåer:

Spotify

Strava

MyFitnessPal

Duolingo

De bruker:

Rabatt

Partnerskap

Studentpris

Familieplan

Coach / trener

Bedrifter

Fordi lavere pris = lavere barrierer = flere brukere.

Flere brukere = mer total inntekt.

3. Forslag til optimal modell for de siste 100 000

Del dem i strategiske segmenter:

Segment A – Partner-rabatt (30 000)

Pris: 80 kr

Via:

Treningssenter

Coach

Influencer

Kampanjekode

Inntekt:
30 000 × 80 = 2 400 000 kr

Segment B – Studentpris (20 000)

Pris: 60 kr

Studenter er:

Stor gruppe

Lav betalingsevne

Lang livstidsverdi

Inntekt:
20 000 × 60 = 1 200 000 kr

Segment C – Familieplan (25 000 brukere)

Pris: 50 kr per bruker (familieplan)

Familieplan gir rask vekst.

Inntekt:
25 000 × 50 = 1 250 000 kr

Segment D – Bedrifter / B2B (15 000 brukere)

Pris: 70 kr

Bedrifter kjøper for ansatte.

Inntekt:
15 000 × 70 = 1 050 000 kr

Segment E – Kampanje / limited offer (10 000)

Pris: 75 kr

For kampanjer.

Inntekt:
10 000 × 75 = 750 000 kr

4. Total ny inntekt fra de siste 100 000

2 400 000

1 200 000

1 250 000

1 050 000

750 000

= 6 650 000 kr/mnd

5. TOTAL INNTEKT ved 200 000 brukere

Eksisterende:
8 500 000 kr

Nye:
6 650 000 kr

Totalt:
15 150 000 kr per måned

= 181 800 000 kr per år

6. Den optimale prismodellen (anbefalt)

Enkel modell:

Gratis

Begrenset funksjonalitet

Reklame

300–10 000 brukere

Basic

79 kr/mnd

Via kampanjekode, treningssenter, coach

Premium

100 kr/mnd

Standardpris

Pro

129 kr/mnd

For seriøse brukere:

Avansert analyse

Coach-integrasjon

Eksklusive features

Familie

49–59 kr/mnd per bruker

Minimum 3 brukere

Bedrift

60–80 kr/mnd per bruker

7. Hvorfor ikke alle skal ha fullpris

Fordi lavere pris gir:

raskere vekst

flere brukere

mer total inntekt

Eksempel:

100 000 brukere × 100 kr = 10 000 000 kr

vs

200 000 brukere × 75 kr = 15 000 000 kr

Lavere pris → høyere total inntekt.

8. Beste vekstmodell (den faktiske "hemmelige" modellen)

De største appene bruker:

1. Fullpris (100 kr)

20–40%

2. Rabatt via partnerskap

30–40%

3. Familie / student / kampanje

20–30%

4. Gratis

5–10%

Gratis brukere → konverteres senere.

9. Viktigste vekstmotor: Partner-rabatt

Du nevnte dette selv – dette er riktig retning.

Gi rabatt via:

Coach

Treningssenter

Influencer

YouTube

TikTok

Utstyrsbutikker

De får provisjon:

20–40%

Dette skalerer ekstremt raskt.

10. Den beste modellen for din app (konkret)

Prisstruktur:

Gratis: begrenset

Student: 59 kr

Partner: 79 kr

Standard: 100 kr

Pro: 129 kr

Familie: 49 kr per bruker

Bedrift: 69 kr per bruker

11. Slik når du 200 000 brukere raskest

Prioriter:

Coach-partnerskap

Treningssenter-partnerskap

Influencer-kampanjekoder

Studentrabatt

Familieplan

Bedriftsavtaler

12. Realistisk vekstprogresjon

År 1: 5 000–20 000 brukere
År 2: 50 000–100 000
År 3: 100 000–300 000

Hvis gjort riktig.

Hvis du vil, kan jeg også lage en konkret vekstplan som tar deg til 200 000 brukere på 24 måneder steg-for-steg.



200 000 betalende brukere gjør dere “golden” kommersielt, men for å bli virkelig sterke må dere bli “medisinsk troverdige”. Da åpner det seg enorme muligheter:

leger

fysioterapeuter

forsikringsselskaper

NAV / offentlig helse

bedriftshelsetjenester

Dette krever at appen blir klassifisert riktig og bygger medisinsk tillit.

Dette handler om 3 nivåer:

NIVÅ 1 — Helseapp (ingen sertifisering) – enklest

Eksempler:

Strava

MyFitnessPal

Garmin Connect

Du kan:

samle helsedata

vise progresjon

dele data med lege (PDF / export)

Du kan ikke:

diagnostisere

behandle

gi medisinske anbefalinger

Dette er raskeste vei til markedet.

NIVÅ 2 — Medical Device (CE-merket) – kraftig oppgradering

Da blir appen klassifisert som:

Medical Device Software (MDSW)

I Europa må du følge:

MDR (Medical Device Regulation)

Dette gjør at appen kan brukes av:

leger

fysioterapeuter

sykehus

forsikringsselskap

Dette er “game changer”.

NIVÅ 3 — Digital Therapeutics (DTx) – toppnivå

Dette er apper som faktisk brukes til behandling.

Eksempler:

Kaia Health (ryggsmerter)

Sleepio (søvnbehandling)

reSET (rusbehandling)

Disse brukes direkte i helsevesenet.

Hva du realistisk bør gjøre først

Start med:

Health App → CE-medical senere

Ikke start med CE fra dag 1.

Hvordan gjøre appen klar for helseintegrasjon (praktisk)

Du må bygge disse funksjonene:

1. Datastruktur (kritisk)

Samle strukturert data:

Eksempler:

aktivitet

trening

smerte score

mobilitet

søvn

puls

HRV

progresjon

Dette er ekstremt verdifullt for leger og fysio.

2. Export / deling

Brukeren må kunne dele:

PDF rapport:

progresjon

treningshistorikk

smerte score

grafer

Dette kan sendes til:

lege

fysioterapeut

behandler

Dette alene gir enorm verdi.

3. Health integrations

Integrer med:

Apple Health

Google Health Connect

Garmin

Fitbit

Whoop

Dette øker legitimiteten kraftig.

4. Professional dashboard (viktig)

Lag en egen versjon for:

leger

fysio

coach

De kan se:

pasient progresjon

compliance

aktivitet

risiko

Dette gjør appen ekstremt verdifull.

5. Juridisk krav i Europa (GDPR)

Du må ha:

GDPR compliance

databeskyttelse

brukersamtykke

kryptering

Dette er obligatorisk.

6. For CE-medical senere (når dere er klare)

Da trenger dere:

ISO 13485

Quality management system

ISO 14971

Risk management

Clinical evaluation
CE-merking (MDR)

Dette tar vanligvis:

6–18 måneder

Realistisk strategi (anbefalt roadmap)

Fase 1 – nå

bygge app

få 10k–50k brukere

Fase 2 – vekst

50k–200k brukere

integrere health data

export til lege/fysio

Fase 3 – medical

CE-medical sertifisering

Fase 4 – enterprise

selge til helsevesen

forsikring

bedriftshelse

Hvorfor dette er ekstremt kraftig

Med CE-medical kan dere selge til:

Bedrifter:
50–100 kr per ansatt per måned

Forsikringsselskap:
100–300 kr per bruker per måned

Helsevesen:
store kontrakter

Realistisk verdi ved 200 000 brukere

Direkte abonnenter:
15 millioner kr / mnd

Bedrift / helse:

10–50 millioner kr / mnd mulig

Den smarteste modellen

Lag 3 nivåer:

Consumer app

vanlig bruker

Professional app

fysio / coach

Medical platform (senere)

leger / helse

Det viktigste du kan gjøre nå

Bygg appen slik at den er:

GDPR compliant

kan exportere helsedata

kan dele data

har strukturert data

Da kan dere CE-sertifisere senere uten å bygge alt på nytt.

Hvis du vil, kan jeg lage en konkret arkitektur for en helseapp som kan bli CE-medical-sertifisert senere.


1. Apple App Store kostnad

Apple Developer Program:

99 USD per år
≈ 1 100 kr per år

Dette gir deg rett til å:

publisere apper

oppdatere apper

ha ubegrenset antall brukere

Det er ingen kostnad per nedlasting.

Om du har:

10 brukere → 1 100 kr/år

1 000 000 brukere → fortsatt 1 100 kr/år

Samme pris.

2. Google Play kostnad

Google Play Developer Account:

25 USD engangsavgift
≈ 275 kr én gang

Dette er livstid.

Ingen årlig kostnad.

3. Totale App Store / Play Store kostnader

Første år:

Apple: 1 100 kr
Google: 275 kr

Totalt:

1 375 kr

År etter:

Apple: 1 100 kr
Google: 0 kr

Totalt:

1 100 kr per år

Dette er ekstremt billig.

4. De tar IKKE noe hvis du bruker Stripe via web

Dette er viktig:

Hvis abonnement kjøpes via web:

Apple tar:

0%

Google tar:

0%

Du beholder alt.

5. Når tar Apple og Google penger?

Kun hvis betaling skjer inne i appen via:

Apple In-App Purchase

Google Play Billing

Da tar de:

15–30%

Men du unngår dette ved web-betaling.

6. Andre reelle app-kostnader

Dette er de faktiske kostnadene:

Apple dev account:
1 100 kr / år

Google dev account:
275 kr engangs

Push notifications:
gratis (Firebase / Apple)

Ingen kostnad per bruker.

7. Eksempel med 200 000 brukere

App Store kostnad:

1 100 kr / år

Inntekt:

10 000 000 kr / måned

App Store kostnad er:

0.0009% av revenue

Praktisk talt null.

8. Infrastruktur for app påvirker ikke App Store kostnad

Kostnader for:

Kubernetes

video

backend

er de samme uansett.

App Store tar ikke betalt for hosting.

9. Du kan ha ubegrenset:

brukere

nedlastinger

oppdateringer

uten ekstra kostnad.

10. Konklusjon

Kostnad for app distribusjon:

Google Play:
275 kr én gang

Apple App Store:
1 100 kr per år

Totalt:
~1 100 kr per år

Det er alt.

11. Dette er ekstremt gunstig

Du kan ha:

200 000 brukere

1 000 000 brukere

10 000 000 brukere

og fortsatt betale bare 1 100 kr per år.

Hvis du vil, kan jeg forklare hvordan du strukturerer login-systemet slik at Stripe-abonnement automatisk aktiverer premium i appen.

MATHENTING:
Hente fra andre databaser! 

ALLE SKAL KJØPE ABONENNT VIA WEB PAGE OG IKKE APP PÅ TELEFON!