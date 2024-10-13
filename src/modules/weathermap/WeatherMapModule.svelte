<script>
    import { onMount } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './weathermap_styles.css';

    export let config;
    let mapDiv;
    let map;
    let currentLayer = null;
    let radarFrames = [];
    let frameIndex = 0;
    let frameIntervals = [];
    let isPaused = false;

    // Function to add radar and satellite layers with frame-based animation
    async function addWeatherLayers() {
        console.log("Fetching RainViewer weather data...");

        try {
            const apiUrl = 'https://api.rainviewer.com/public/weather-maps.json';
            const response = await fetch(apiUrl);
            const data = await response.json();

            const host = data.host;

            // Store the radar frames (past data)
            if (data.radar.past.length > 0) {
                radarFrames = data.radar.past;
                console.log("Radar frames available:", radarFrames);

                // Start the radar frame animation
                advanceFrame();
            } else {
                console.warn("No radar data available.");
            }

            // Handle satellite layer (as static layer for now)
            if (data.satellite.infrared.length > 0) {
                const satelliteFrame = data.satellite.infrared[data.satellite.infrared.length - 1];
                const satellitePath = `/v2/satellite/${satelliteFrame.path}/256/{z}/{x}/{y}/0/0_0.png`;

                console.log("Satellite Path:", satellitePath);

                // Add satellite layer
                const satelliteLayer = L.tileLayer(`${host}${satellitePath}`, {
                    tileSize: 256,
                    opacity: 0.5,
                });

                satelliteLayer.addTo(map);

                satelliteLayer.on('tileload', (event) => {
                    console.log('Satellite tile loaded:', event.tile);
                });

                satelliteLayer.on('tileerror', (event) => {
                    console.error('Satellite tile failed to load:', event);
                });

                console.log("Satellite layer added to map.");
            } else {
                console.warn("No satellite data available.");
            }
        } catch (error) {
            console.error('Error fetching RainViewer API:', error);
        }
    }

    function loadFrame(frameIndex) {
        const host = "https://tilecache.rainviewer.com";
        const radarPath = `/v2/radar/${radarFrames[frameIndex].path}/256/{z}/{x}/{y}/1/1_0.png`;

        // Remove current layer if it exists
        if (currentLayer) {
            map.removeLayer(currentLayer);
        }

        // Add new radar layer
        currentLayer = L.tileLayer(`${host}${radarPath}`, {
            tileSize: 256,
            opacity: 0.6,
        }).addTo(map);

        currentLayer.on('tileload', (event) => {
            console.log('Radar tile loaded:', event.tile);
        });

        currentLayer.on('tileerror', (event) => {
            console.error('Radar tile failed to load:', event);
        });

        console.log("Radar layer updated for frame:", frameIndex);
    }

    function advanceFrame() {
        if (isPaused) return;

        // Load the current frame
        loadFrame(frameIndex);

        // Advance to the next frame
        frameIndex = (frameIndex + 1) % radarFrames.length;

        // Set the delay based on the config settings
        const delay = frameIndex === radarFrames.length - 1
            ? config.extraDelayLastFrameMs
            : config.animationSpeedMs;

        // Schedule the next frame
        frameIntervals.push(setTimeout(advanceFrame, delay));
    }

    function stopAnimation() {
        isPaused = true;
        frameIntervals.forEach(clearTimeout);
        frameIntervals = [];
    }

    onMount(() => {
        if (mapDiv && config) {
            console.log("Initializing Leaflet map...");

            map = L.map(mapDiv, {
                center: [config.mapPositions[0].lat, config.mapPositions[0].lng],
                zoom: config.zoom || 10,
                layers: [
                    L.tileLayer(config.mapUrl, {
                        maxZoom: 18,
                        attribution: '&copy; OpenStreetMap contributors',
                    }),
                ],
            });

            console.log("Map initialized. Adding weather layers...");

            // Add weather layers (radar/satellite)
            addWeatherLayers();
        }
    });
</script>

<!-- Map Container -->
<div bind:this={mapDiv} class="rain-map-wrapper" style="height: {config.mapHeight}; width: {config.mapWidth};"></div>
