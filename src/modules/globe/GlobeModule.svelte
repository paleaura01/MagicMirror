<script>
    import { onMount, onDestroy } from "svelte";

    let globeContainer;
    let globe;
    let worldWindLoaded = false;
    const worldWindScriptUrl = "https://files.worldwind.arc.nasa.gov/artifactory/web/0.9.0/worldwind.min.js";

    // Load WorldWind script
    async function loadWorldWind() {
        return new Promise((resolve, reject) => {
            if (window.WorldWind) {
                worldWindLoaded = true;
                resolve();
                return;
            }

            const script = document.createElement("script");
            script.src = worldWindScriptUrl;
            script.onload = () => {
                console.log("[Debug] WorldWind script loaded successfully.");
                worldWindLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error("Failed to load WorldWind script."));
            document.body.appendChild(script);
        });
    }

    // Initialize the globe
    function initializeGlobe() {
        if (!globeContainer || !worldWindLoaded || !globeContainer.isConnected || !(globeContainer instanceof HTMLCanvasElement)) {
            console.error("[Error] Globe container is not available, WorldWind is not loaded, or globeContainer is not a valid canvas element.");
            return;
        }

        try {
            console.log("[Debug] Attempting to create WorldWind instance.");
            globe = new WorldWind.WorldWindow(globeContainer.id);

            globe.addLayer(new WorldWind.BMNGOneImageLayer());
            globe.addLayer(new WorldWind.BingAerialWithLabelsLayer());

            const placemarkLayer = new WorldWind.RenderableLayer("Placemarks");
            globe.addLayer(placemarkLayer);

            const placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
            placemarkAttributes.imageScale = 0.1;
            placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/pushpins/plain-red.png";

            const position = new WorldWind.Position(37.7749, -122.4194, 0);
            const placemark = new WorldWind.Placemark(position, false, placemarkAttributes);
            placemarkLayer.addRenderable(placemark);

            // Start animating the globe
            requestAnimationFrame(animate);
            console.log("[Debug] Globe initialized.");
        } catch (e) {
            console.error("[Error] Failed to initialize WorldWind:", e);
        }
    }

    // Animation loop
    function animate() {
        if (globe) {
            globe.redraw();
            requestAnimationFrame(animate);
        }
    }

    // Observe changes in the DOM
    function observeGlobeContainer() {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === "childList" && globeContainer && globeContainer.isConnected && globeContainer instanceof HTMLCanvasElement) {
                    console.log("[Debug] Globe container is now connected and is a canvas element.");
                    initializeGlobe();
                    observer.disconnect();
                    break;
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // onMount lifecycle function
    onMount(async () => {
        console.log("[Debug] onMount triggered. Loading WorldWind...");
        try {
            await loadWorldWind();

            // If globeContainer is not a canvas, create one
            if (!(globeContainer instanceof HTMLCanvasElement)) {
                const newCanvas = document.createElement("canvas");
                newCanvas.id = "globeCanvas";
                globeContainer.replaceWith(newCanvas);
                globeContainer = newCanvas;
                console.log("[Debug] Created a new canvas element for WorldWind.");
            }

            observeGlobeContainer(); // Use MutationObserver to detect when the globe container is available
        } catch (error) {
            console.error("[Error] Initialization failed:", error);
        }
    });

    // Clean up resources when the component is destroyed
    onDestroy(() => {
        if (globe) {
            globe.dispose();
            globe = null;
            console.log("[Debug] Globe disposed.");
        }
    });
</script>

<div bind:this={globeContainer} id="globeCanvas" class="globe-container"></div>

<style>
    .globe-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 100;
        pointer-events: none;
    }
</style>
