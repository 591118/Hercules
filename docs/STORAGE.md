# Objektlagring (MinIO lokalt → S3/R2 i prod)

Backend bruker **S3-kompatibel** objektlagring for bilder og video. Samme kode for lokal utvikling og produksjon; kun miljøvariabler endres.

## Lokal utvikling (Docker Compose)

- **MinIO** kjører som egen service; bucket `hercules` opprettes ved første opplasting.
- Backend får automatisk:
  - `S3_ENDPOINT_URL=http://minio:9000`
  - `S3_BUCKET=hercules`
  - `AWS_ACCESS_KEY_ID=minioadmin`
  - `AWS_SECRET_ACCESS_KEY=minioadmin`
  - `AWS_REGION=us-east-1`

## Produksjon (Kubernetes / annen host)

Sett følgende miljøvariabler for backend-containeren. Databasen og resten av appen kan stå andre steder (K8s, managed DB); kun disse styrer objektlagring.

| Variabel | Beskrivelse | Lokal (MinIO) | Prod (S3/R2) |
|----------|-------------|----------------|--------------|
| `S3_ENDPOINT_URL` | Endpoint for S3-kompatibel tjeneste | `http://minio:9000` | Tom (default S3) eller f.eks. R2: `https://<account>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | Bucket-navn | `hercules` | Din bucket |
| `AWS_ACCESS_KEY_ID` | Access key | `minioadmin` | IAM-user / R2 API-token |
| `AWS_SECRET_ACCESS_KEY` | Secret key | `minioadmin` | Tilsvarende secret |
| `AWS_REGION` | Region (noen tjenester krever det) | `us-east-1` | f.eks. `eu-north-1` eller R2-region |

### Eksempel Kubernetes Secret (prod)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hercules-backend-secrets
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:pass@db-host:5432/hercules"
  S3_BUCKET: "hercules-prod"
  AWS_ACCESS_KEY_ID: "<access-key>"
  AWS_SECRET_ACCESS_KEY: "<secret-key>"
  # S3_ENDPOINT_URL: ""   # tom = vanlig S3; eller R2-endpoint
  # AWS_REGION: "eu-north-1"
```

Sørg for at backend-poden monterer/henter disse som env (via `secretKeyRef` / `configMapKeyRef`).

### Hvis objektlagring ikke er satt

- `POST /api/upload` returnerer **503** (Upload er ikke konfigurert).
- `GET /api/media/<key>` returnerer **404**.  
Appen kan kjøre uten; coach_bilde og andre media-felt kan stå tomme eller bruke eksterne URL-er.

## API

- **POST /api/upload** – `multipart/form-data`: `file`, valgfri `prefix` (f.eks. `coach`). Returnerer `{ "url": "/api/media/...", "key": "..." }`.
- **GET /api/media/{path}** – Stream fil fra lagring (public lesing).

URL-en som lagres i DB (f.eks. `coach_bilde`) bør være full path: `/api/media/coach/abc123.jpg`. Frontend bruker API-base + denne path for å hente bildet.
