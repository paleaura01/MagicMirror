<script>
    import { onMount } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './weathermap_styles.css';
    import dayjs from 'dayjs';
    import { sunriseSunsetStore } from '../../stores/weatherStore'; // Import the store

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
    let satelliteLayer;
    let radarLayers = [];
    let satelliteLayers = [];
    const updateInterval = 60000; // 1 minute in milliseconds
    let apiCallInProgress = false;
    let animationTimeoutId;
    let intervalId;
    let sunrise = null;
    let sunset = null;

    // Subscribe to sunrise and sunset times
    sunriseSunsetStore.subscribe(value => {
        sunrise = value.sunrise;
        sunset = value.sunset;
    });

    // Determine if it is day or night based on sunrise and sunset times
    function isDaytime() {
        const currentTime = dayjs();
        return sunrise && sunset && currentTime.isAfter(sunrise) && currentTime.isBefore(sunset);
    }

    // Get appropriate radar color based on day or night
    function getRadarColor() {
        return isDaytime() ? config.dayRadarColor : config.nightRadarColor;
    }

    // Get appropriate map URL based on day or night
    function getMapUrl() {
        return isDaytime() ? config.dayMapUrl : config.nightMapUrl;
    }

    // Clear all radar layers and animation timeouts before adding new data
    function resetRadarLayers() {
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
    }

    // Clear all satellite layers before adding new data
    function resetSatelliteLayers() {
        satelliteLayers.forEach(layer => {
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        satelliteLayers = [];
    }

    async function addWeatherLayers() {
        if (apiCallInProgress) {
            console.log("API call already in progress. Skipping new request.");
            return;
        }

        // Clear the radar and satellite layers before making a new API call
        resetRadarLayers();
        resetSatelliteLayers();

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
            const radarTimestamps = data.radar.past.map(frame => frame.time);
            const tileSize = 256;

            // Store satellite data paths to simplify validation
            const satellitePaths = data.satellite.infrared.map(frame => frame.time);

            function updateRadarLayer(timestamp) {
                resetRadarLayers();
                const radarColor = getRadarColor();
                const radarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;

                radarLayer = L.tileLayer(radarUrlTemplate, {
                    tileSize: tileSize,
                    opacity: 0.8,
                    zIndex: 1100,
                    maxZoom: config.zoom,
                    errorTileUrl: './pics/error-tile.png',
                }).on('tileerror', (error) => {
                    console.error('Radar tile failed to load:', error);
                });

                radarLayer.addTo(map);
                radarLayers.push(radarLayer);
            }

            function updateSatelliteLayer(timestamp) {
                const satelliteFrame = data.satellite.infrared.find(frame => frame.time === timestamp);

                if (!satelliteFrame || !satelliteFrame.path) {
                    console.warn(`No valid satellite data for timestamp: ${timestamp}`);
                    return;
                }

                const satelliteUrlTemplate = `https://tilecache.rainviewer.com/v2/satellite/${satelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;

                satelliteLayer = L.tileLayer(satelliteUrlTemplate, {
                    tileSize: tileSize,
                    opacity: 0.5,
                    zIndex: 1000,
                    maxZoom: config.zoom,
                    errorTileUrl: './pics/error-tile.png',
                }).on('tileerror', (error) => {
                    console.error('Satellite tile failed to load:', error);
                });

                satelliteLayer.addTo(map);
                satelliteLayers.push(satelliteLayer);
            }

            function animateLayers() {
                let frameIndex = 0;
                let attempts = 0;

                function showNextFrame() {
                    if (frameIndex >= radarTimestamps.length) {
                        frameIndex = 0; // Restart from the first frame
                    }

                    const timestamp = radarTimestamps[frameIndex];
                    // console.log(`Attempting to animate frame for timestamp: ${timestamp}`);

                    if (satellitePaths.includes(timestamp)) {
                        // console.log(`Animating radar and satellite for timestamp: ${timestamp}`);
                        updateRadarLayer(timestamp);
                        updateSatelliteLayer(timestamp);

                        let delay = config.animationSpeedMs;
                        if (frameIndex === 0) {
                            delay += config.extraDelayCurrentFrameMs;
                        } else if (frameIndex === radarTimestamps.length - 1) {
                            delay += config.extraDelayLastFrameMs;
                        }

                        frameIndex++;
                        attempts = 0; // Reset attempts on success
                        animationTimeoutId = setTimeout(showNextFrame, delay);
                    } else {
                        console.warn(`Skipping animation for timestamp: ${timestamp} due to missing satellite data.`);
                        frameIndex++;
                        attempts++;

                        // If all frames are skipped, stop animation
                        if (attempts >= radarTimestamps.length) {
                            console.error("All frames skipped due to missing satellite data.");
                            return;
                        }

                        showNextFrame(); // Try the next frame immediately
                    }
                }

                showNextFrame();
            }

            animateLayers();
            apiCallInProgress = false;
        } catch (error) {
            console.error("Error fetching radar data:", error);
            apiCallInProgress = false;
        }
    }

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
                        L.tileLayer(getMapUrl(), {
                            maxZoom: 18,
                            attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
                        }),
                    ],
                });

                // console.log("Map initialized. Adding weather layers...");
                addWeatherLayers();
                addMarkers();

                if (intervalId) {
                    clearInterval(intervalId);
                }

                intervalId = setInterval(() => {
                    // console.log("Updating radar data...");
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
