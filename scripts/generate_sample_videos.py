"""
Table.AR — Test Video Generator & Dish Uploader
===============================================
Generates a realistic test walk-around MP4 video of a dish (or uses an existing video)
and uploads it to a specific dish in the Table.AR system for pipeline testing.

Usage:
  python scripts/generate_sample_videos.py --dish-id <DISH_ID>
  python scripts/generate_sample_videos.py --create-only --output test_dish.mp4
"""

import os
import sys
import argparse
import math
from pathlib import Path

import cv2
import numpy as np
import requests
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / "backend" / ".env")

DEFAULT_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "https://tablear.onrender.com")
DEMO_EMAIL = os.environ.get("DEMO_TENANT_EMAIL", "demo@spice.co")
DEMO_PASSWORD = os.environ.get("DEMO_TENANT_PASSWORD", "demo123")


def generate_synthetic_dish_video(output_path: Path, num_frames: int = 120, fps: int = 30) -> Path:
    """Generates a synthetic 360-degree rotating plate dish video."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    print(f"Generating synthetic 360° dish video ({num_frames} frames)...")

    for i in range(num_frames):
        angle = (i / num_frames) * 2 * math.pi
        frame = np.full((height, width, 3), (245, 245, 245), dtype=np.uint8)

        # Draw wooden table surface
        cv2.rectangle(frame, (0, 0), (width, height), (220, 230, 240), -1)

        # Draw plate with shadow
        cx, cy = width // 2, height // 2 + 30
        plate_w, plate_h = 180, 110
        cv2.ellipse(frame, (cx + 5, cy + 10), (plate_w, plate_h), 0, 0, 360, (180, 190, 200), -1)
        cv2.ellipse(frame, (cx, cy), (plate_w, plate_h), 0, 0, 360, (255, 255, 255), -1)
        cv2.ellipse(frame, (cx, cy), (plate_w - 20, plate_h - 15), 0, 0, 360, (240, 240, 245), 2)

        # Draw rotating food garnish
        for item_idx in range(6):
            item_angle = angle + (item_idx * math.pi / 3)
            ix = int(cx + math.cos(item_angle) * 70)
            iy = int(cy + math.sin(item_angle) * 40)
            cv2.circle(frame, (ix, iy), 18, (30, 120, 240), -1) # saffron / orange food
            cv2.circle(frame, (ix, iy), 14, (60, 180, 100), -1) # herb garnish

        # Draw centerpiece
        cv2.circle(frame, (cx, cy), 28, (40, 80, 200), -1)

        # Timestamp / watermark
        cv2.putText(frame, f"360 Scan Frame {i+1}/{num_frames}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (40, 40, 40), 2)

        out.write(frame)

    out.release()
    print(f"Sample video generated: {output_path} ({output_path.stat().st_size / 1024:.1f} KB)")
    return output_path


def upload_video_for_dish(base_url: str, dish_id: str, video_path: Path):
    """Uploads a video to a specific dish using tenant credentials."""
    login_url = f"{base_url.rstrip('/')}/api/auth/login"
    r = requests.post(login_url, json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    if r.status_code != 200:
        print("Tenant login failed:", r.text)
        return False

    token = r.json().get("token")
    upload_url = f"{base_url.rstrip('/')}/api/tenant/dishes/{dish_id}/upload-video"
    with open(video_path, "rb") as f:
        files = {"file": (video_path.name, f, "video/mp4")}
        headers = {"Authorization": f"Bearer {token}"}
        res = requests.post(upload_url, headers=headers, files=files)
        if res.status_code == 200:
            print("Video successfully uploaded for dish:", dish_id)
            print("Dish status is now: pending_review")
            return True
        else:
            print("Upload failed (HTTP", res.status_code, "):", res.text)
            return False


def main():
    parser = argparse.ArgumentParser(description="Generate sample video and test upload")
    parser.add_argument("--dish-id", type=str, help="Dish ID to upload the video to")
    parser.add_argument("--create-only", action="store_true", help="Only generate the MP4 without uploading")
    parser.add_argument("--output", type=str, default="sample_dish_walkaround.mp4", help="Output video file")
    parser.add_argument("--base-url", type=str, default=DEFAULT_BASE_URL)
    args = parser.parse_args()

    video_path = Path(args.output)
    generate_synthetic_dish_video(video_path)

    if args.create_only:
        return

    if args.dish_id:
        upload_video_for_dish(args.base_url, args.dish_id, video_path)
    else:
        print("\nTo upload this video to a dish, run:")
        print(f"python scripts/generate_sample_videos.py --dish-id <DISH_ID> --output {video_path}")


if __name__ == "__main__":
    main()
