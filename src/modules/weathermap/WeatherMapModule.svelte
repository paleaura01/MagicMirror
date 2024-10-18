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
    let radarLayers = [];
    let satelliteLayers = [];
    let baseLayer; // Base map tile layer
    let baseRadarLayer; // Base radar layer
    let baseSatelliteLayer; // Base satellite layer
    const updateInterval = 180000; // 3 minutes in milliseconds
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

    // Add base map tile layer to the map
    function addBaseLayer() {
        const baseLayerUrl = getMapUrl(); // Use the day or night map URL
        baseLayer = L.tileLayer(baseLayerUrl, {
            tileSize: 256,
            opacity: 1.0,
            zIndex: 500, // Lower z-index to keep it under the other layers
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors',
        });
        baseLayer.addTo(map);
    }

    async function addWeatherLayers() {
        if (apiCallInProgress) {
            console.log("API call already in progress. Skipping new request.");
            return;
        }

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
            const tileSize = 256;

            // Filter frames to those that have both radar and satellite data
            const radarFrames = data.radar.past;
            const satelliteFrames = data.satellite.infrared;

            const frames = radarFrames.filter(radarFrame => {
                // Find matching satellite frame
                return satelliteFrames.some(satFrame => satFrame.time === radarFrame.time);
            });

            if (frames.length === 0) {
                console.warn("No frames with both radar and satellite data found.");
                apiCallInProgress = false;
                return;
            }

            // Create new layers without modifying current layers
            let newRadarLayers = [];
            let newSatelliteLayers = [];

            frames.forEach((frame, index) => {
                const timestamp = frame.time;
                const radarColor = getRadarColor();
                const radarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;

                const radarLayer = L.tileLayer(radarUrlTemplate, {
                    tileSize: tileSize,
                    opacity: 1, // Start with opacity 0
                    zIndex: 1100 + index, // Ensure layers stack correctly
                    maxZoom: config.zoom,
                    errorTileUrl: './pics/error-tile.png',
                });

                // Do not add to map yet
                newRadarLayers.push(radarLayer);

                // Now find the matching satellite frame
                const satelliteFrame = satelliteFrames.find(satFrame => satFrame.time === timestamp);

                if (satelliteFrame && satelliteFrame.path) {
                    const satelliteUrlTemplate = `https://tilecache.rainviewer.com/v2/satellite/${satelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;

                    const satelliteLayer = L.tileLayer(satelliteUrlTemplate, {
                        tileSize: tileSize,
                        opacity: 1, // Start hidden
                        zIndex: 1000 + index,
                        maxZoom: config.zoom,
                        errorTileUrl: './pics/error-tile.png',
                    });

                    // Do not add to map yet
                    newSatelliteLayers.push(satelliteLayer);
                } else {
                    console.warn(`No valid satellite data for timestamp: ${timestamp}`);
                    // To keep arrays aligned, we can push null
                    newSatelliteLayers.push(null);
                }
            });

            // Create base radar and satellite layers using the oldest available frame
            const baseFrame = frames[0]; // Oldest frame
            const baseTimestamp = baseFrame.time;
            const radarColor = getRadarColor();

            const baseRadarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${baseTimestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;
            if (baseRadarLayer) {
                map.removeLayer(baseRadarLayer);
            }
            baseRadarLayer = L.tileLayer(baseRadarUrlTemplate, {
                tileSize: tileSize,
                opacity: 1, // Adjust opacity as needed
                zIndex: 900, // Below animated layers
                maxZoom: config.zoom,
                errorTileUrl: './pics/error-tile.png',
            }).addTo(map);

            const baseSatelliteFrame = satelliteFrames.find(satFrame => satFrame.time === baseTimestamp);
            if (baseSatelliteFrame && baseSatelliteFrame.path) {
                const baseSatelliteUrlTemplate = `https://tilecache.rainviewer.com/v2/satellite/${baseSatelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;
                if (baseSatelliteLayer) {
                    map.removeLayer(baseSatelliteLayer);
                }
                baseSatelliteLayer = L.tileLayer(baseSatelliteUrlTemplate, {
                    tileSize: tileSize,
                    opacity: 0.4, // Adjust opacity as needed
                    zIndex: 800, // Below base radar layer
                    maxZoom: config.zoom,
                    errorTileUrl: './pics/error-tile.png',
                }).addTo(map);
            }

            // Once the new layers are ready, update the animation frames
            // Add new layers to the map
            newRadarLayers.forEach(layer => {
                layer.addTo(map);
            });
            newSatelliteLayers.forEach(layer => {
                if (layer) layer.addTo(map);
            });

            // Replace the old layers with the new ones
            // Remove old layers from the map
            radarLayers.forEach(layer => {
                if (map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });
            satelliteLayers.forEach(layer => {
                if (layer && map.hasLayer(layer)) {
                    map.removeLayer(layer);
                }
            });

            radarLayers = newRadarLayers;
            satelliteLayers = newSatelliteLayers;

            apiCallInProgress = false;
        } catch (error) {
            console.error("Error fetching radar data:", error);
            apiCallInProgress = false;
        }
    }

    function animateLayers() {
        if (radarLayers.length === 0) {
            console.error('No radar layers available for animation.');
            return;
        }

        let frameIndex = 0;

        function showNextFrame() {
            // Hide all radar layers
            radarLayers.forEach((layer) => {
                layer.setOpacity(0);
            });

            // Hide all satellite layers
            satelliteLayers.forEach((layer) => {
                if (layer) layer.setOpacity(0);
            });

            // Show the current radar layer
            const radarLayer = radarLayers[frameIndex];
            radarLayer.setOpacity(1); // Adjust opacity as needed

            // Show the corresponding satellite layer if available
            const satelliteLayer = satelliteLayers[frameIndex];
            if (satelliteLayer) {
                satelliteLayer.setOpacity(0.9); // Adjust opacity as needed
            }

            // Set a longer duration for each frame to make the animation slower
            let frameDuration = config.animationSpeedMs; // Adjust as needed

            // Add extra delay if it's the first or last frame
            if (frameIndex === 0) {
                frameDuration += config.extraDelayCurrentFrameMs;
            } else if (frameIndex === radarLayers.length - 1) {
                frameDuration += config.extraDelayLastFrameMs;
            }

            // Move to the next frame
            frameIndex = (frameIndex + 1) % radarLayers.length;
            animationTimeoutId = setTimeout(showNextFrame, frameDuration);
        }

        showNextFrame();
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

   onMount(async () => {
    try {
        if (mapDiv && config) {
            console.log("Initializing map...");

            map = L.map(mapDiv, {
                center: [config.mapPositions[0].lat, config.mapPositions[0].lng],
                zoom: config.zoom || 10,
                minZoom: 2, // Set minimum zoom level to allow zooming out
                maxZoom: config.zoom || 10, // Restrict maximum zoom to the initial zoom level
                attributionControl: false,
                zoomControl: false, // Disable the default zoom controls
                scrollWheelZoom: true, // Allow zooming with the scroll wheel
                doubleClickZoom: false, // Disable default double-click zoom
                touchZoom: true, // Enable touch zoom
                dragging: true, // Enable dragging
                boxZoom: true, // Enable box zoom
                keyboard: true, // Enable keyboard controls
            });

            // Add the base map tile layer
            addBaseLayer();

            // Add a custom double-click event to reset to the original center and zoom
            map.on('dblclick', () => {
                map.setView([config.mapPositions[0].lat, config.mapPositions[0].lng], config.zoom || 10);
            });

            // Add markers
            addMarkers();

            // Add weather layers and start the animation
            await addWeatherLayers();
            animateLayers();

            // Set interval to update weather layers every 3 minutes without interrupting the animation
            if (intervalId) {
                clearInterval(intervalId);
            }

            intervalId = setInterval(() => {
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
