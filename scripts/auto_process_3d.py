"""
Table.AR — Automated Video-to-3D Pipeline using Hugging Face (TripoSR)
---------------------------------------------------------------------
1. Downloads the uploaded dish video from your Table.AR backend.
2. Extracts a sharp, centered frame from the video using OpenCV.
3. Sends the frame to Hugging Face Free Cloud GPU (stabilityai/TripoSR).
4. Automatically removes background/table surface and synthesizes a 3D .glb mesh.
5. Uploads the generated .glb back to Table.AR, making it live on the diner menu in WebAR!
"""
import os
import sys
import cv2
import tempfile
import requests
from gradio_client import Client, handle_file
from dotenv import load_dotenv

sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

load_dotenv("backend/.env")

BACKEND_URL = os.environ.get("PUBLIC_BASE_URL", "https://tablear.onrender.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@tabler.ar")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")


def login_admin():
    """Authenticate with Table.AR as Super Admin to get access token."""
    print(f"Logging in to {BACKEND_URL} as {ADMIN_EMAIL}...")
    res = requests.post(
        f"{BACKEND_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15
    )
    if res.status_code != 200:
        raise RuntimeError(f"Login failed: {res.text}")
    token = res.json()["token"]
    print("[OK] Super Admin authenticated successfully!")
    return token


def get_pending_queue(token):
    """Fetch list of dishes waiting for 3D processing."""
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BACKEND_URL}/api/superadmin/queue", headers=headers, timeout=15)
    if res.status_code != 200:
        raise RuntimeError(f"Failed to fetch queue: {res.text}")
    return res.json()


def extract_keyframe(video_path, output_img_path):
    """Extract a sharp, centered frame at ~35% of the video duration."""
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        raise ValueError("Could not read frames from video.")

    target_frame = max(1, int(total_frames * 0.35))
    cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        raise ValueError("Failed to extract frame from video.")

    cv2.imwrite(output_img_path, frame)
    print(f"[OK] Extracted keyframe at frame {target_frame}/{total_frames} -> {output_img_path}")


def generate_glb_huggingface(image_path):
    """Call Hugging Face TripoSR Free GPU Space to generate .glb."""
    print("Connecting to stabilityai/TripoSR on Hugging Face...")
    client = Client("stabilityai/TripoSR")

    print("Step 1: Removing background and table...")
    preprocessed = client.predict(
        handle_file(image_path),
        True,
        0.85,
        api_name="/preprocess"
    )

    print("Step 2: Synthesizing 3D mesh (Hugging Face GPU)...")
    result = client.predict(
        handle_file(preprocessed),
        192,  # Good balance of resolution and speed
        api_name="/generate"
    )
    _, glb_path = result
    print(f"[OK] Generated .glb model successfully! ({os.path.getsize(glb_path) / 1024:.1f} KB)")
    return glb_path


def upload_glb(token, dish_id, glb_path):
    """Upload generated .glb back to Table.AR dish."""
    headers = {"Authorization": f"Bearer {token}"}
    with open(glb_path, "rb") as f:
        files = {"file": (f"dish-{dish_id}.glb", f, "model/gltf-binary")}
        res = requests.post(
            f"{BACKEND_URL}/api/superadmin/dishes/{dish_id}/upload-model",
            headers=headers,
            files=files,
            timeout=60
        )
    if res.status_code != 200:
        raise RuntimeError(f"Upload failed: {res.text}")
    print(f"[OK] 3D Model published! Dish is now LIVE in 1:1 WebAR on Diner Menu!")


def process_queue():
    token = login_admin()
    queue = get_pending_queue(token)
    print(f"\nFound {len(queue)} dishes pending 3D review in queue.")

    if not queue:
        print("Queue is empty. Nothing to process!")
        return

    with tempfile.TemporaryDirectory() as tmpdir:
        for dish in queue:
            print(f"\n==========================================")
            print(f"Processing: {dish['name']} (ID: {dish['id']})")
            video_url = dish.get("video_url")
            if not video_url:
                print(f"Skipping {dish['name']}: No video URL found.")
                continue

            # 1. Download video
            video_path = os.path.join(tmpdir, f"input_{dish['id']}.mp4")
            print(f"Downloading video from {video_url}...")
            r = requests.get(video_url, stream=True, timeout=60)
            if r.status_code != 200:
                print(f"Failed to download video ({r.status_code}), skipping.")
                continue
            with open(video_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)

            # 2. Extract keyframe
            frame_path = os.path.join(tmpdir, f"frame_{dish['id']}.jpg")
            try:
                extract_keyframe(video_path, frame_path)
            except Exception as e:
                print(f"Frame extraction failed: {e}")
                continue

            # 3. Generate .glb via Hugging Face
            try:
                glb_path = generate_glb_huggingface(frame_path)
            except Exception as e:
                print(f"Hugging Face 3D generation failed: {e}")
                continue

            # 4. Upload back to Table.AR
            try:
                upload_glb(token, dish["id"], glb_path)
            except Exception as e:
                print(f"Failed to upload .glb: {e}")


if __name__ == "__main__":
    process_queue()
