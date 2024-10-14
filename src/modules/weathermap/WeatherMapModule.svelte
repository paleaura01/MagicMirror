<script>
    import { onMount } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './weathermap_styles.css';
    import dayjs from 'dayjs';

    // Import marker icons
    import markerRed from './pics/marker-icon-red.png';
    import markerBlue from './pics/marker-icon-blue.png';
    import markerGreen from './pics/marker-icon-green.png';
    import markerShadow from './pics/marker-shadow.png';

    const markerIcons = {
        red: markerRed,
        blue: markerBlue,
        green: markerGreen,
    };

    export let config;

    let mapDiv;
    let map;
    let radarLayer;
    let radarLayers = [];
    const updateInterval = 150000; // 2.5 minutes in milliseconds
    let apiCallInProgress = false;
    let animationTimeoutId;
    let intervalId;

    // Determine if it is day or night based on current time
    function isDaytime() {
        const currentHour = dayjs().hour();
        return currentHour >= 6 && currentHour < 18;
    }

    // Get appropriate radar color based on day or night
    function getRadarColor() {
        return isDaytime() ? config.dayRadarColor : config.nightRadarColor;
    }

    // Clear all radar layers and animation timeouts before adding new data
    function resetRadarLayers() {
        console.log("Resetting radar layers...");

        radarLayers.forEach(layer => {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        radarLayers = [];

        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }

        console.log("Radar layers and animations cleared.");
    }

    // Function to add weather layers with logging and animation
    async function addWeatherLayers() {
        if (apiCallInProgress) {
            console.log("API call already in progress. Skipping new request.");
            return;
        }

        console.log("Fetching RainViewer weather data...");
        apiCallInProgress = true;

        try {
            const apiUrl = 'http://localhost:8080/proxy?url=' + encodeURIComponent('https://api.rainviewer.com/public/weather-maps.json');
            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.error("Failed to fetch RainViewer data. Status:", response.status);
                apiCallInProgress = false;
                return;
            }

            const data = await response.json();
            if (data.radar.past.length > 0) {
                const radarTimestamps = data.radar.past.map(frame => frame.time);
                const tileSize = 256;

                function updateRadarLayer(timestamp) {
                    resetRadarLayers();

                    const radarColor = getRadarColor();
                    const radarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;

                    radarLayer = L.tileLayer(radarUrlTemplate, {
                        tileSize: tileSize,
                        opacity: 1.0,
                        zIndex: 1100,
                        maxZoom: config.zoom,
                        errorTileUrl: './pics/error-tile.png',
                    }).on('tileerror', (error) => {
                        console.error('Radar tile failed to load:', error);
                    });

                    radarLayer.addTo(map);
                    radarLayers.push(radarLayer);
                    console.log(`Radar layer added for timestamp: ${timestamp}`);
                }

                function animateRadar() {
                    let frameIndex = 0;

                    function showNextFrame() {
                        const timestamp = radarTimestamps[frameIndex];
                        updateRadarLayer(timestamp);

                        let delay = config.animationSpeedMs;
                        if (frameIndex === 0) {
                            delay += config.extraDelayCurrentFrameMs;
                        } else if (frameIndex === radarTimestamps.length - 1) {
                            delay += config.extraDelayLastFrameMs;
                        }

                        frameIndex = (frameIndex + 1) % radarTimestamps.length;
                        animationTimeoutId = setTimeout(showNextFrame, delay);
                    }

                    showNextFrame();
                }

                console.log("Starting radar animation...");
                animateRadar();
            } else {
                console.warn("No radar data available.");
            }

            apiCallInProgress = false;
        } catch (error) {
            console.error("Error fetching radar data:", error);
            apiCallInProgress = false;
        }
    }

    // Add marker to the map
    function addMarkers() {
        if (config.markers && config.markers.length > 0) {
            config.markers.forEach(marker => {
                const iconUrl = markerIcons[marker.color] || markerRed;

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
    }

    onMount(() => {
        try {
            if (mapDiv && config) {
                console.log("Initializing map...");

                map = L.map(mapDiv, {
                    center: [config.mapPositions[0].lat, config.mapPositions[0].lng],
                    zoom: config.zoom || 10,
                    attributionControl: false,
                    zoomControl: false,
                    layers: [
                        L.tileLayer(isDaytime() ? config.dayMapUrl : config.nightMapUrl, {
                            maxZoom: 18,
                            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
                        }),
                    ],
                });

                console.log("Map initialized. Adding weather layers...");

                addWeatherLayers();
                addMarkers(); // Add the marker after the map is initialized

                if (intervalId) {
                    clearInterval(intervalId);
                }

                intervalId = setInterval(() => {
                    console.log("Updating radar data...");
                    addWeatherLayers();
                }, updateInterval);
            } else {
                console.error("Map div or configuration is missing.");
            }
        } catch (error) {
            console.error("Error during onMount:", error);
        }
    });
</script>

<!-- Map Container -->
<div bind:this={mapDiv} class="rain-map-wrapper" style="height: {config.mapHeight}; width: {config.mapWidth};"></div>
