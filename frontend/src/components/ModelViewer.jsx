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
        s.src =
            "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";

        s.onload = () => resolve();
        s.onerror = () =>
            reject(new Error("Failed to load model-viewer"));

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

        const onStatus = (e) =>
            console.log("AR Status:", e.detail);

        const onTracking = (e) =>
            console.log("AR Tracking:", e.detail);

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

            ar: ar ? "" : undefined,
            "ar-modes": "webxr scene-viewer quick-look",
            
            // CRITICAL FIX: Lock the scale so food appears true-to-size on the table
            "ar-scale": "fixed", 

            "camera-controls": cameraControls ? "" : undefined,
            "auto-rotate": autoRotate ? "" : undefined,

            "shadow-intensity": "1",
            "shadow-softness": "1", // Added for softer, more realistic table shadows
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
        // CRITICAL FIX: Hide the default AR button by passing an invisible div into the ar-button slot
        React.createElement("div", { slot: "ar-button", style: { display: "none" } })
    );
});

export default ModelViewer;