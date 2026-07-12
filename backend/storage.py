"""Emergent object storage client.

Handles video (source) and .glb/.usdz (final 3D model) uploads for the
human-in-the-loop video->3D pipeline.
"""
import os
import logging
import requests

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = os.environ.get("APP_NAME", "tabler-ar")

log = logging.getLogger("storage")

_storage_key: str | None = None


def _key() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    emergent_key = os.environ.get("EMERGENT_LLM_KEY")
    if not emergent_key:
        raise RuntimeError("EMERGENT_LLM_KEY missing")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": emergent_key}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _reset_key() -> None:
    global _storage_key
    _storage_key = None


def init_storage() -> None:
    """Call once at startup; raises on failure."""
    _key()
    log.info("Emergent object storage initialised")


def put_object(path: str, data: bytes, content_type: str) -> dict:
    def _do():
        return requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": _key(), "Content-Type": content_type},
            data=data,
            timeout=180,
        )
    resp = _do()
    if resp.status_code == 403:
        _reset_key()
        resp = _do()
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    def _do():
        return requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": _key()},
            timeout=180,
        )
    resp = _do()
    if resp.status_code == 403:
        _reset_key()
        resp = _do()
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


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
