import React, { useEffect, useRef, useState } from "react";

let loaderPromise = null;
function loadModelViewer() {
    if (loaderPromise) return loaderPromise;
    loaderPromise = new Promise((resolve, reject) => {
        if (window.customElements && window.customElements.get("model-viewer")) {
            resolve();
            return;
        }
        const s = document.createElement("script");
        s.type = "module";
        s.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load model-viewer"));
        document.head.appendChild(s);
    });
    return loaderPromise;
}

export default function ModelViewer({
    src,
    iosSrc,
    poster,
    alt = "3D dish preview",
    ar = true,
    autoRotate = true,
    cameraControls = true,
    className = "",
    style = {},
    ...rest
}) {
    const [ready, setReady] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        loadModelViewer().then(() => setReady(true)).catch(() => setReady(false));
    }, []);

    if (!ready) {
        return (
            <div
                className={`flex items-center justify-center bg-cream ${className}`}
                style={style}
                data-testid="model-viewer-loading"
            >
                <div className="text-xs uppercase tracking-widest text-gray-500 font-bold">
                    Booting 3D engine…
                </div>
            </div>
        );
    }

    return React.createElement("model-viewer", {
        ref,
        src,
        "ios-src": iosSrc,
        poster,
        alt,
        ar: ar ? "" : undefined,
        "ar-modes": "webxr scene-viewer quick-look",
        "auto-rotate": autoRotate ? "" : undefined,
        "camera-controls": cameraControls ? "" : undefined,
        "shadow-intensity": "1",
        "environment-image": "neutral",
        exposure: "1.1",
        loading: "eager",
        reveal: "auto",
        className,
        style: { width: "100%", height: "100%", background: "transparent", ...style },
        "data-testid": "model-viewer",
        ...rest,
    });
}
