"""Pluggable object storage for Tabler.AR — zero Emergent dependency.

Backends:
  - `local` (default) — Local filesystem. Great for dev, single-VPS deploys, or a
                        mounted persistent volume on Railway/Fly.io/Render.
  - `s3`              — Any S3-compatible provider: AWS S3, Cloudflare R2,
                        Backblaze B2, DigitalOcean Spaces, MinIO, Supabase Storage.

Select with `STORAGE_PROVIDER=local|s3`.
"""
import os
import logging

log = logging.getLogger("storage")

APP_NAME = os.environ.get("APP_NAME", "tabler-ar")
PROVIDER = os.environ.get("STORAGE_PROVIDER", "local").lower()
LOCAL_ROOT = os.environ.get("LOCAL_STORAGE_DIR", os.path.join(os.path.dirname(__file__), "uploads"))


# =========================================================
# Local filesystem backend
# =========================================================
def _local_full(path: str) -> str:
    # sanity: prevent absolute paths / directory escapes
    safe = path.replace("\\", "/").lstrip("/")
    if ".." in safe.split("/"):
        raise ValueError("invalid storage path")
    return os.path.join(LOCAL_ROOT, safe)


def _local_put(path: str, data: bytes, ctype: str) -> dict:
    full = _local_full(path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "wb") as f:
        f.write(data)
    return {"path": path, "size": len(data)}


def _local_get(path: str) -> tuple[bytes, str]:
    full = _local_full(path)
    with open(full, "rb") as f:
        return f.read(), "application/octet-stream"  # actual ctype comes from db.files


def _local_init() -> None:
    os.makedirs(LOCAL_ROOT, exist_ok=True)
    log.info("Local storage root: %s", LOCAL_ROOT)


# =========================================================
# S3-compatible backend (boto3)
# =========================================================
_s3_client = None


def _s3():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    import boto3

    if not os.environ.get("S3_BUCKET"):
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
    _s3().head_bucket(Bucket=_s3_bucket())


# =========================================================
# Public dispatch API
# =========================================================
def init_storage() -> None:
    if PROVIDER == "local":
        _local_init()
    elif PROVIDER == "s3":
        _s3_init()
    else:
        raise RuntimeError(f"Unknown STORAGE_PROVIDER={PROVIDER}. Use 'local' or 's3'.")
    log.info("Storage initialised (provider=%s)", PROVIDER)


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if PROVIDER == "s3":
        return _s3_put(path, data, content_type)
    return _local_put(path, data, content_type)


def get_object(path: str) -> tuple[bytes, str]:
    if PROVIDER == "s3":
        return _s3_get(path)
    return _local_get(path)


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
