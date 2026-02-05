# Mobilapp (iOS og Android)

Hercules-frontenden er bygget slik at den samme koden kan kjøres som **web** og som **native app** (iOS/Android) via Capacitor.

## Oppførsel i mobilappen

- **Hjem-skjerm:** Kun logo og **«Logg inn»**-knapp. Ingen registrering.
- **Registrering:** Finnes ikke i appen. Brukere må opprette konto på **webappen** (datamaskin), deretter logge inn i appen med samme e-post og passord.
- **Etter innlogging:** Samme dashboard og funksjoner som på web (Kunde/Coach/Admin avhengig av rolle).

## Forutsetninger

- Node.js og npm installert
- **iOS:** macOS med Xcode (kun for å bygge til App Store / simulator)
- **Android:** Android Studio med SDK (for å bygge til Google Play / emulator)
- Apple Developer-konto (for App Store)
- Google Play Developer-konto (for Google Play)

## Første gangs oppsett

Fra `frontend/`:

```bash
cd frontend
npm install
npm run build
npx cap add ios      # kun på macOS
npx cap add android
npx cap sync
```

## Bygg og kjøring

### Synkronisere web-bygg til native prosjekter

Etter endringer i frontend-koden:

```bash
npm run cap:sync
```

eller manuelt:

```bash
npm run build
npx cap sync
```

### iOS (simulator eller enhet)

```bash
npm run cap:ios
```

Åpner Xcode med `ios/App/App.xcworkspace`. Derfra:

- Velg simulator eller tilkoblet iPhone
- Kjør (▶)
- For **App Store:** Product → Archive, deretter Distribute App

### Android (emulator eller enhet)

```bash
npm run cap:android
```

Åpner Android Studio med `android/`. Derfra:

- Velg emulator eller tilkoblet enhet
- Kjør (▶)
- For **Google Play:** Build → Generate Signed Bundle / APK

## API-URL i appen

Appen bruker samme API som web (Vite-miljø). For native build:

- **Utvikling:** Sett `VITE_API_URL` ved build til din backend (f.eks. `https://api.hercules.no` eller lokal URL ved testing).
- I produksjon bør backend være tilgjengelig på HTTPS; appen sender forespørsler dit.

Bygg med miljøvariabel:

```bash
VITE_API_URL=https://api.dindomene.no npm run build
npm run cap:sync
```

## App Store (Apple)

1. Opprett App ID og app i App Store Connect.
2. I Xcode: velg team og signering, sett Bundle ID til f.eks. `no.hercules.app`.
3. Bygg arkiv (Product → Archive).
4. Last opp til App Store Connect og send inn for gjennomgang.
5. Fyll ut metadata, personvern, osv. i App Store Connect.

## Google Play

1. Opprett app i Google Play Console.
2. I Android Studio: generer signert AAB (Android App Bundle).
3. Last opp AAB til Play Console.
4. Fyll ut listing, personvernpolitikk, innholdsvurdering, osv.

## Filstruktur etter `cap add`

- `frontend/ios/` – Xcode-prosjekt (iOS)
- `frontend/android/` – Android Studio-prosjekt (Android)
- `frontend/dist/` – bygget web-app (kopieres inn i native ved `cap sync`)

Capacitor-konfigurasjon: `frontend/capacitor.config.ts` (appId, appName, webDir).
