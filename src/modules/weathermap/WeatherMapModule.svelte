<script>
    import { onMount } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './weathermap_styles.css';

    // Import marker icons
    import markerRed from './pics/marker-icon-red.png';
    import markerBlue from './pics/marker-icon-blue.png';
    import markerGreen from './pics/marker-icon-green.png';
    import markerShadow from './pics/marker-shadow.png';

    // Map color to icons
    const markerIcons = {
        red: markerRed,
        blue: markerBlue,
        green: markerGreen,
    };

    export let config;

    let mapDiv;
    let map;
    let radarLayer;
    const updateInterval = 150000; // 2.5 minutes in milliseconds

    // Function to add weather layers with logging and animation
    async function addWeatherLayers() {
        console.log("Fetching RainViewer weather data...");

        try {
            const apiUrl = 'http://localhost:8080/proxy?url=' + encodeURIComponent('https://api.rainviewer.com/public/weather-maps.json');
            console.log("Fetching from proxy API URL:", apiUrl);

            const response = await fetch(apiUrl);
            console.log("Response received, status:", response.status);

            if (!response.ok) {
                console.error("Failed to fetch RainViewer data. Status:", response.status);
                return;
            }

            const data = await response.json();
            console.log("Weather data fetched:", data);

            if (data.radar.past.length > 0) {
                const radarTimestamps = data.radar.past.map(frame => frame.time); // Get all past radar timestamps
                const tileSize = 256;

                // Function to update the radar layer for animation
                function updateRadarLayer(timestamp) {
                    if (radarLayer) {
                        map.removeLayer(radarLayer);
                    }

                    const radarColor = config.radarColor || 8; // Use radarColor from config, default to 8 if not set

                    // Use the same zoom level as the map tile layer
                    const radarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;
                    radarLayer = L.tileLayer(radarUrlTemplate, {
                        tileSize: tileSize,
                        opacity: 1.0,
                        zIndex: 1100,
                        maxZoom: config.zoom, // Sync radar zoom level with map zoom level
                        errorTileUrl: './pics/error-tile.png',
                    }).on('tileerror', (error) => {
                        console.error('Radar tile failed to load:', {
                            url: radarUrlTemplate,
                            coords: error.coords,
                            details: error
                        });
                    }).on('tileloadstart', (event) => {
                        console.log("Radar tile load started:", event.coords);
                    }).on('tileload', (event) => {
                        console.log("Radar tile loaded successfully:", event.coords);
                    });

                    radarLayer.addTo(map);
                    console.log("Radar layer updated to timestamp:", timestamp);
                }

                // Function to animate radar frames
                function animateRadar() {
                    let frameIndex = 0;

                    function showNextFrame() {
                        const isLastFrame = frameIndex === radarTimestamps.length - 1;
                        const isFirstFrame = frameIndex === 0;
                        const timestamp = radarTimestamps[frameIndex];
                        updateRadarLayer(timestamp);

                        // Calculate delay for the current frame
                        let delay = config.animationSpeedMs;
                        if (isFirstFrame) {
                            delay += config.extraDelayCurrentFrameMs;
                        } else if (isLastFrame) {
                            delay += config.extraDelayLastFrameMs;
                        }

                        frameIndex = (frameIndex + 1) % radarTimestamps.length;  // Loop to the next frame

                        // Loop animation or stop after one loop
                        setTimeout(showNextFrame, delay);
                    }

                    showNextFrame();  // Start animation
                }

                console.log("Starting radar animation...");
                animateRadar();  // Start the radar animation
            } else {
                console.warn("No radar data available in the response.");
            }
        } catch (error) {
            console.error('Error fetching or parsing RainViewer API data:', error);
        }
    }

    onMount(() => {
        try {
            if (mapDiv && config) {
                console.log("Initializing Leaflet map...");

                map = L.map(mapDiv, {
                    center: [config.mapPositions[0].lat, config.mapPositions[0].lng],
                    zoom: config.zoom || 10, // Use the zoom level from config
                    attributionControl: false,
                    zoomControl: false, // Disable zoom control
                    layers: [
                        // Use mapUrl from config for the tile layer
                        L.tileLayer(config.mapUrl, {
                            maxZoom: 18,
                            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
                        }),
                    ],
                });

                console.log("Map initialized. Adding weather layers...");

                // Add weather layers (radar/satellite)
                addWeatherLayers();

                // Set an interval to update weather radar data every 2.5 minutes
                setInterval(() => {
                    console.log("Updating radar data...");
                    addWeatherLayers();  // Call the function every 2.5 minutes
                }, updateInterval);

                // Add markers with error handling
                if (config.markers && config.markers.length > 0) {
                    config.markers.forEach(marker => {
                        const iconUrl = markerIcons[marker.color] || markerRed;
                        console.log("Adding marker:", marker);

                        const markerInstance = L.marker([marker.lat, marker.lng], {
                            icon: L.icon({
                                iconUrl: iconUrl,
                                shadowUrl: markerShadow,
                                iconSize: [25, 41],
                                shadowSize: [41, 41],
                                iconAnchor: [12, 41],
                                shadowAnchor: [12, 41],
                                popupAnchor: [0, -41]
                            })
                        }).addTo(map);

                        markerInstance.on('add', () => {
                            console.log("Marker added:", marker);
                        }).on('error', (error) => {
                            console.error("Error adding marker:", marker, error);
                        });
                    });
                    console.log("All markers added to the map.");
                } else {
                    console.warn("No markers found in the configuration.");
                }
            } else {
                console.error("Map div or configuration is missing.");
            }
        } catch (error) {
            console.error("Error during onMount execution:", error);
        }
    });
</script>

<!-- Map Container -->
<div bind:this={mapDiv} class="rain-map-wrapper" style="height: {config.mapHeight}; width: {config.mapWidth};"></div>
