import os
import urllib.request
import cv2
import numpy as np

os.makedirs("sample_videos", exist_ok=True)

# Sample food images from Unsplash
samples = [
    {
        "name": "sample_burger_dish.mp4",
        "url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=85",
        "title": "Gourmet Cheeseburger"
    },
    {
        "name": "sample_pizza_dish.mp4",
        "url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85",
        "title": "Woodfired Pizza"
    },
    {
        "name": "sample_cheesecake_dish.mp4",
        "url": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=85",
        "title": "Berry Cheesecake"
    }
]

for item in samples:
    print(f"Creating {item['name']} for {item['title']}...")
    tmp_img_path = os.path.join("sample_videos", "temp.jpg")
    urllib.request.urlretrieve(item["url"], tmp_img_path)
    
    img = cv2.imread(tmp_img_path)
    h, w, _ = img.shape
    
    # Target 720p 30fps video for 4 seconds (120 frames)
    out_w, out_h = 720, 720
    out_path = os.path.join("sample_videos", item["name"])
    
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(out_path, fourcc, 30.0, (out_w, out_h))
    
    total_frames = 120
    for i in range(total_frames):
        # Orbit / subtle camera pan & zoom
        angle = (i / total_frames) * 360.0
        scale = 1.0 + 0.15 * np.sin((i / total_frames) * np.pi)
        
        # Center crop and rotate slightly to simulate smooth turntable
        M = cv2.getRotationMatrix2D((w / 2, h / 2), np.sin(i / total_frames * 2 * np.pi) * 8.0, scale)
        frame = cv2.warpAffine(img, M, (w, h))
        
        # Crop center to 720x720
        start_x = max(0, (w - out_w) // 2)
        start_y = max(0, (h - out_h) // 2)
        cropped = frame[start_y:start_y+out_h, start_x:start_x+out_w]
        if cropped.shape[0] != out_h or cropped.shape[1] != out_w:
            cropped = cv2.resize(frame, (out_w, out_h))
            
        out.write(cropped)
        
    out.release()
    if os.path.exists(tmp_img_path):
        os.remove(tmp_img_path)
        
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"[OK] Created {out_path} ({size_mb:.2f} MB)")

print("\nAll sample videos generated in sample_videos/!")
