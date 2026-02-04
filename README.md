# Hercules

**Hercules** er en helhetlig helse- og treningsplattform i en totalapp i stedet for mange separate løsninger. Appen samler kaloritracking, kosthold, trening, aktivitet, wearables og coach-kunde-samarbeid i en sømløs opplevelse.

Målet er å gi brukere full oversikt over helse og prestasjon, samtidig som sertifiserte coacher kan følge opp kunder på en trygg, kontrollert og samtykkebasert måte.

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
