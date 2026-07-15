import React, {
    useEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";

let loaderPromise = null;

function loadModelViewer() {
    if (loaderPromise) return loaderPromise;

    loaderPromise = new Promise((resolve, reject) => {
        if (
            window.customElements &&
            window.customElements.get("model-viewer")
        ) {
            resolve();
            return;
        }

        const s = document.createElement("script");
        s.type = "module";

        // Official model-viewer CDN
        s.src = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";

        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load model-viewer"));

        document.head.appendChild(s);
    });

    return loaderPromise;
}

const ModelViewer = forwardRef(function ModelViewer(
    {
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
    },
    forwardedRef
) {
    const [ready, setReady] = useState(false);
    const ref = useRef(null);

    // Expose <model-viewer> to parent components
    useImperativeHandle(forwardedRef, () => ({
        activateAR() {
            if (ref.current?.activateAR) {
                ref.current.activateAR();
            }
        },
    }));

    useEffect(() => {
        loadModelViewer()
            .then(() => setReady(true))
            .catch(() => setReady(false));
    }, []);

    useEffect(() => {
        if (!ready || !ref.current) return;

        const mv = ref.current;

        const onStatus = (e) => console.log("AR Status:", e.detail);
        const onTracking = (e) => console.log("AR Tracking:", e.detail);

        mv.addEventListener("ar-status", onStatus);
        mv.addEventListener("ar-tracking", onTracking);

        return () => {
            mv.removeEventListener("ar-status", onStatus);
            mv.removeEventListener("ar-tracking", onTracking);
        };
    }, [ready]);

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

    return React.createElement(
        "model-viewer",
        {
            ref,

            src,
            "ios-src": iosSrc,
            poster,
            alt,

            // AR Attributes
            ar: ar ? true : undefined,
            "ar-modes": "webxr scene-viewer quick-look",
            "ar-scale": "fixed", // CRITICAL: Locks food size to 1:1 real-world scale
            "ar-placement": "floor", // CRITICAL: Forces placement on a flat surface like a table

            "camera-controls": cameraControls ? true : undefined,
            "auto-rotate": autoRotate ? true : undefined,

            // Lighting & Shadows
            "shadow-intensity": "1",
            "shadow-softness": "1", // Softer, more realistic table shadows
            "environment-image": "neutral",
            exposure: "1.1",

            loading: "eager",
            reveal: "auto",

            className,

            style: {
                width: "100%",
                height: "100%",
                background: "transparent",
                ...style,
            },

            "data-testid": "model-viewer",

            ...rest,
        },
        
        // 1. Hide the default AR button (we use our custom one in the parent UI)
        React.createElement("div", { slot: "ar-button", style: { display: "none" } }),

        // 2. Custom WebXR Scanning Prompt (Visible on Android during surface scan)
        React.createElement(
            "div",
            { 
                slot: "interaction-prompt", 
                className: "absolute inset-0 flex items-center justify-center pointer-events-none" 
            },
            React.createElement(
                "div",
                {
                    className: "bg-black/80 text-white px-6 py-3 rounded-full font-bold text-sm backdrop-blur border border-white/20 animate-pulse"
                },
                "Move phone slowly to scan the table..."
            )
        )
    );
});

export default ModelViewer;