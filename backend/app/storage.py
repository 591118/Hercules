"""
Objektlagring (S3-kompatibel) – samme kode for lokal utvikling og produksjon.

Lokal:  MinIO (S3_ENDPOINT_URL satt) – f.eks. docker-compose med minio
Prod:   S3 / R2 / annen S3-kompatibel (S3_ENDPOINT_URL tom eller R2-endpoint)
        – konfigureres via miljøvariabler i Kubernetes (Secrets/ConfigMaps)
"""
import os
import uuid
from typing import BinaryIO

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# Miljøvariabler – samme navn som AWS SDK, så enkelt i K8s
S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "").strip() or None  # MinIO: http://minio:9000
S3_BUCKET = os.getenv("S3_BUCKET", "hercules")
S3_REGION = os.getenv("AWS_REGION", os.getenv("S3_REGION", "us-east-1"))
S3_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID", os.getenv("S3_ACCESS_KEY", ""))
S3_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", os.getenv("S3_SECRET_KEY", ""))
# Om lagring er aktiv (uten credentials kan vi skru av for ren lokal utvikling uten MinIO)
STORAGE_ENABLED = bool(S3_BUCKET and (S3_ACCESS_KEY or S3_ENDPOINT_URL))


def _client():
    if not STORAGE_ENABLED:
        return None
    kwargs = {
        "service_name": "s3",
        "region_name": S3_REGION,
        "config": Config(signature_version="s3v4"),
    }
    if S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = S3_ENDPOINT_URL
    if S3_ACCESS_KEY and S3_SECRET_KEY:
        kwargs["aws_access_key_id"] = S3_ACCESS_KEY
        kwargs["aws_secret_access_key"] = S3_SECRET_KEY
    return boto3.client(**kwargs)


def ensure_bucket(bucket: str | None = None) -> None:
    """Opprett bucket hvis den ikke finnes (MinIO / S3)."""
    if not STORAGE_ENABLED:
        return
    b = bucket or S3_BUCKET
    try:
        client = _client()
        client.head_bucket(Bucket=b)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            try:
                client.create_bucket(Bucket=b)
            except ClientError:
                pass
        else:
            raise


def upload_fileobj(
    file_obj: BinaryIO,
    key: str,
    content_type: str,
    *,
    bucket: str | None = None,
) -> str:
    """
    Last opp fil til bucket. Returnerer storage-nøkkel (key) som brukes i /api/media/<key>.
    """
    if not STORAGE_ENABLED:
        raise RuntimeError("Storage is not configured (S3_BUCKET / credentials)")
    b = bucket or S3_BUCKET
    ensure_bucket(b)
    client = _client()
    client.upload_fileobj(
        file_obj,
        b,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return key


def get_object_stream(key: str, *, bucket: str | None = None):
    """Hent objekt som stream – for GET /api/media."""
    if not STORAGE_ENABLED:
        return None
    b = bucket or S3_BUCKET
    try:
        resp = _client().get_object(Bucket=b, Key=key)
        return resp.get("Body")
    except ClientError:
        return None


def delete_object(key: str, *, bucket: str | None = None) -> bool:
    """Slett objekt (valgfritt)."""
    if not STORAGE_ENABLED:
        return False
    b = bucket or S3_BUCKET
    try:
        _client().delete_object(Bucket=b, Key=key)
        return True
    except ClientError:
        return False


def make_key(prefix: str, filename: str) -> str:
    """Lag unik key med prefix, f.eks. coach/<uuid>.jpg."""
    ext = os.path.splitext(filename)[1].lower() or ".bin"
    return f"{prefix.rstrip('/')}/{uuid.uuid4().hex}{ext}"
