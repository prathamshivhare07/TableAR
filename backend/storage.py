"""Pluggable object storage for Tabler.AR.

Backends:
  - `emergent` (default) — Emergent-managed object storage, works only inside Emergent.
  - `s3`                 — Any S3-compatible provider: AWS S3, Cloudflare R2,
                           Backblaze B2, MinIO, DigitalOcean Spaces, Supabase Storage.

Select the backend with the env var `STORAGE_PROVIDER=emergent|s3`.

For manual/self-hosted deployments, use `s3` and set:
  STORAGE_PROVIDER=s3
  S3_BUCKET=<bucket-name>
  S3_ENDPOINT_URL=<optional; omit for AWS S3, set for R2/MinIO/etc.>
  S3_REGION=us-east-1
  S3_ACCESS_KEY_ID=<...>
  S3_SECRET_ACCESS_KEY=<...>
  S3_PUBLIC_URL_BASE=<optional; e.g. https://cdn.example.com or R2 public URL>
"""
import os
import logging
import requests

log = logging.getLogger("storage")

APP_NAME = os.environ.get("APP_NAME", "tabler-ar")
PROVIDER = os.environ.get("STORAGE_PROVIDER", "emergent").lower()

# =========================================================
# Emergent backend
# =========================================================
_EMERGENT_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
_emergent_key: str | None = None


def _emergent_get_key() -> str:
    global _emergent_key
    if _emergent_key:
        return _emergent_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY missing (required for STORAGE_PROVIDER=emergent)")
    resp = requests.post(f"{_EMERGENT_URL}/init", json={"emergent_key": key}, timeout=30)
    resp.raise_for_status()
    _emergent_key = resp.json()["storage_key"]
    return _emergent_key


def _emergent_reset() -> None:
    global _emergent_key
    _emergent_key = None


def _emergent_put(path: str, data: bytes, ctype: str) -> dict:
    def _do():
        return requests.put(
            f"{_EMERGENT_URL}/objects/{path}",
            headers={"X-Storage-Key": _emergent_get_key(), "Content-Type": ctype},
            data=data,
            timeout=180,
        )
    r = _do()
    if r.status_code == 403:
        _emergent_reset()
        r = _do()
    r.raise_for_status()
    return r.json()


def _emergent_get(path: str) -> tuple[bytes, str]:
    def _do():
        return requests.get(
            f"{_EMERGENT_URL}/objects/{path}",
            headers={"X-Storage-Key": _emergent_get_key()},
            timeout=180,
        )
    r = _do()
    if r.status_code == 403:
        _emergent_reset()
        r = _do()
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


def _emergent_init() -> None:
    _emergent_get_key()


# =========================================================
# S3-compatible backend (boto3)
# =========================================================
_s3_client = None


def _s3():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    import boto3  # local import so users without boto3 aren't forced to install it

    bucket = os.environ.get("S3_BUCKET")
    if not bucket:
        raise RuntimeError("S3_BUCKET missing (required for STORAGE_PROVIDER=s3)")

    kwargs = {
        "aws_access_key_id": os.environ.get("S3_ACCESS_KEY_ID"),
        "aws_secret_access_key": os.environ.get("S3_SECRET_ACCESS_KEY"),
        "region_name": os.environ.get("S3_REGION", "us-east-1"),
    }
    endpoint = os.environ.get("S3_ENDPOINT_URL")
    if endpoint:
        kwargs["endpoint_url"] = endpoint

    _s3_client = boto3.client("s3", **kwargs)
    return _s3_client


def _s3_bucket() -> str:
    return os.environ["S3_BUCKET"]


def _s3_put(path: str, data: bytes, ctype: str) -> dict:
    _s3().put_object(Bucket=_s3_bucket(), Key=path, Body=data, ContentType=ctype)
    return {"path": path, "size": len(data)}


def _s3_get(path: str) -> tuple[bytes, str]:
    obj = _s3().get_object(Bucket=_s3_bucket(), Key=path)
    return obj["Body"].read(), obj.get("ContentType", "application/octet-stream")


def _s3_init() -> None:
    # Ping the bucket to fail fast on misconfiguration
    _s3().head_bucket(Bucket=_s3_bucket())


# =========================================================
# Public dispatch API
# =========================================================
def init_storage() -> None:
    """Call once at startup; raises on failure."""
    if PROVIDER == "emergent":
        _emergent_init()
    elif PROVIDER == "s3":
        _s3_init()
    else:
        raise RuntimeError(f"Unknown STORAGE_PROVIDER={PROVIDER}")
    log.info("Storage initialised (provider=%s)", PROVIDER)


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload bytes to storage. Returns dict with at least {"path": str, "size": int}."""
    if PROVIDER == "emergent":
        return _emergent_put(path, data, content_type)
    return _s3_put(path, data, content_type)


def get_object(path: str) -> tuple[bytes, str]:
    """Download bytes from storage. Returns (data, content_type)."""
    if PROVIDER == "emergent":
        return _emergent_get(path)
    return _s3_get(path)


MIME = {
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "webm": "video/webm",
    "glb": "model/gltf-binary",
    "usdz": "model/vnd.usdz+zip",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
}


def guess_mime(filename: str, fallback: str = "application/octet-stream") -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return MIME.get(ext, fallback)
