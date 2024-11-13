<!-- ./src/modules/weathermap/WeatherMapModule.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './weathermap_styles.css';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import { sunriseSunsetStore } from '../../stores/weatherStore';
    import { modulesToReload } from '../../stores/reloadStore';
    
    dayjs.extend(utc);
    dayjs.extend(timezone);

    import markerRed from './pics/marker-icon-red.png';
    import markerBlue from './pics/marker-icon-blue.png';
    import markerGreen from './pics/marker-icon-green.png';
    import markerShadow from './pics/marker-shadow.png';

    const markerIcons = { red: markerRed, blue: markerBlue, green: markerGreen };

    export let config;
    
    let mapDiv, map;
    let radarLayers = [], satelliteLayers = [];
    let baseLayer, baseRadarLayer, baseSatelliteLayer;
    const updateInterval = 180000;
    let apiCallInProgress = false, animationTimeoutId = null, intervalId = null;
    let sunrise = null, sunset = null;
    let previousIsDaytime = null;
    let reloadCount = 0;
    let unsubscribe;

    let markerInstances = []; // Store marker instances

    function isDaytime() {
        const currentTime = dayjs();
        return sunrise && sunset && currentTime.isAfter(sunrise) && currentTime.isBefore(sunset);
    }

    function getRadarColor() {
        return isDaytime() ? config.dayRadarColor : config.nightRadarColor;
    }

    function getMapUrl() {
        return isDaytime() ? config.dayMapUrl : config.nightMapUrl;
    }

    function addBaseLayer() {
        if (!map) {
            console.error("Map is not initialized.");
            return;
        }
        const baseLayerUrl = getMapUrl();
        if (baseLayer && map.hasLayer(baseLayer)) {
            map.removeLayer(baseLayer);
            baseLayer = null;
        }
        baseLayer = L.tileLayer(baseLayerUrl, {
            tileSize: 256,
            opacity: 1.0,
            zIndex: 100, // Adjusted zIndex
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors',
        });
        baseLayer.addTo(map);
    }

    function addMarkers() {
        if (!map) {
            console.error("Map is not initialized.");
            return;
        }
        // Remove existing markers
        markerInstances.forEach(marker => map.removeLayer(marker));
        markerInstances = [];

        config.markers?.forEach(markerConfig => {
            const iconUrl = markerIcons[markerConfig.color] || markerRed;

            const markerInstance = L.marker([markerConfig.lat, markerConfig.lng], {
                icon: L.icon({
                    iconUrl,
                    shadowUrl: markerShadow,
                    iconSize: [25, 41],
                    shadowSize: [41, 41],
                    iconAnchor: [12, 41],
                    shadowAnchor: [12, 41],
                    popupAnchor: [0, -41]
                }),
                zIndexOffset: 1500, // Keep the marker on top
                interactive: true // Ensure marker is interactive
            }).addTo(map);

            // Event listener for resetting map position on marker click
            markerInstance.on('click', () => {
                map.setView([markerConfig.lat, markerConfig.lng], config.zoom || 10, {
                    animate: true
                });
            });

            markerInstances.push(markerInstance);
        });
    }

    async function addWeatherLayers() {
        if (!map || apiCallInProgress) {
            if (!map) console.error("Map is not initialized.");
            return;
        }

        apiCallInProgress = true;
        try {
            const apiUrl = 'http://localhost:8080/proxy?url=' + encodeURIComponent('https://api.rainviewer.com/public/weather-maps.json');
            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.error("Failed to fetch RainViewer data.");
                apiCallInProgress = false;
                return;
            }

            const data = await response.json();
            const tileSize = 256;
            const radarFrames = data.radar.past;
            const satelliteFrames = data.satellite.infrared;
            const frames = radarFrames.filter(radarFrame => satelliteFrames.some(satFrame => satFrame.time === radarFrame.time));

            if (!frames.length) {
                console.warn("No frames with both radar and satellite data found.");
                apiCallInProgress = false;
                return;
            }

            clearWeatherLayers();

            frames.forEach((frame, index) => {
                const timestamp = frame.time;
                const radarColor = getRadarColor();
                const radarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;

                const radarLayer = L.tileLayer(radarUrlTemplate, {
                    tileSize,
                    opacity: 0,
                    zIndex: 200 + index, // Lower zIndex value
                    pane: 'tilePane', // Ensure it's added to the correct pane
                    maxZoom: config.zoom,
                    errorTileUrl: './pics/error-tile.png',
                }).addTo(map);
                radarLayers.push(radarLayer);

                const satelliteFrame = satelliteFrames.find(satFrame => satFrame.time === timestamp);
                if (satelliteFrame && satelliteFrame.path) {
                    const satelliteUrlTemplate = `https://tilecache.rainviewer.com/v2/satellite/${satelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;

                    const satelliteLayer = L.tileLayer(satelliteUrlTemplate, {
                        tileSize,
                        opacity: 0,
                        zIndex: 100 + index, // Lower zIndex value
                        pane: 'tilePane', // Ensure it's added to the correct pane
                        maxZoom: config.zoom,
                        errorTileUrl: './pics/error-tile.png',
                    }).addTo(map);
                    satelliteLayers.push(satelliteLayer);
                } else {
                    satelliteLayers.push(null);
                }
            });

            updateBaseLayers(frames[0], tileSize, satelliteFrames);

            apiCallInProgress = false;
        } catch (error) {
            console.error("Error fetching radar data:", error);
            apiCallInProgress = false;
        }
    }

    function updateBaseLayers(baseFrame, tileSize, satelliteFrames) {
        if (!map) {
            console.error("Map is not initialized.");
            return;
        }

        const baseTimestamp = baseFrame.time;
        const radarColor = getRadarColor();

        if (baseRadarLayer && map.hasLayer(baseRadarLayer)) {
            map.removeLayer(baseRadarLayer);
            baseRadarLayer = null;
        }
        if (baseSatelliteLayer && map.hasLayer(baseSatelliteLayer)) {
            map.removeLayer(baseSatelliteLayer);
            baseSatelliteLayer = null;
        }

        const baseRadarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${baseTimestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;
        baseRadarLayer = L.tileLayer(baseRadarUrlTemplate, {
            tileSize,
            opacity: 0.5,
            zIndex: 200,
            pane: 'tilePane', // Ensure it's added to the correct pane
            maxZoom: config.zoom,
            errorTileUrl: './pics/error-tile.png',
        }).addTo(map);

        const baseSatelliteFrame = satelliteFrames.find(satFrame => satFrame.time === baseTimestamp);

        if (baseSatelliteFrame && baseSatelliteFrame.path) {
            const baseSatelliteUrlTemplate = `https://tilecache.rainviewer.com/v2/satellite/${baseSatelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;
            baseSatelliteLayer = L.tileLayer(baseSatelliteUrlTemplate, {
                tileSize,
                opacity: 1,
                zIndex: 100,
                pane: 'tilePane', // Ensure it's added to the correct pane
                maxZoom: config.zoom,
                errorTileUrl: './pics/error-tile.png',
            }).addTo(map);
        }
    }

    function animateLayers() {
        if (!radarLayers.length || !map) return;

        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }

        let frameIndex = 0;

        function showNextFrame() {
            radarLayers.forEach(layer => layer && layer.setOpacity(0));
            satelliteLayers.forEach(layer => layer && layer.setOpacity(0));

            const radarLayer = radarLayers[frameIndex];
            const satelliteLayer = satelliteLayers[frameIndex];

            if (radarLayer) radarLayer.setOpacity(1);
            if (satelliteLayer) satelliteLayer.setOpacity(0.9);

            let frameDuration = config.animationSpeedMs;
            if (frameIndex === 0) frameDuration += config.extraDelayCurrentFrameMs;
            if (frameIndex === radarLayers.length - 1) frameDuration += config.extraDelayLastFrameMs;

            frameIndex = (frameIndex + 1) % radarLayers.length;
            animationTimeoutId = setTimeout(showNextFrame, frameDuration);
        }
        showNextFrame();
    }

    function updateLayersForTimeOfDay() {
        if (map) {
            const currentUrl = getMapUrl();
            if (baseLayer && baseLayer._url !== currentUrl) {
                map.removeLayer(baseLayer);
                baseLayer = null;
                addBaseLayer();
            }
            addWeatherLayers();
        }
    }

    function clearWeatherLayers() {
        if (!map) {
            console.error("Map is not initialized.");
            return;
        }
        radarLayers.forEach(layer => map.hasLayer(layer) && map.removeLayer(layer));
        satelliteLayers.forEach(layer => layer && map.hasLayer(layer) && map.removeLayer(layer));
        radarLayers = [];
        satelliteLayers = [];
    }

    function clearAllLayers() {
        if (map) {
            map.eachLayer(layer => {
                map.removeLayer(layer);
            });
            radarLayers = [];
            satelliteLayers = [];
            baseLayer = null;
            baseRadarLayer = null;
            baseSatelliteLayer = null;
            markerInstances = [];
        }
    }

    sunriseSunsetStore.subscribe(value => {
        sunrise = dayjs(value.sunrise).tz();
        sunset = dayjs(value.sunset).tz();

        const currentIsDaytime = isDaytime();
        if (previousIsDaytime === null) {
            previousIsDaytime = currentIsDaytime;
        } else if (currentIsDaytime !== previousIsDaytime) {
            previousIsDaytime = currentIsDaytime;
            updateLayersForTimeOfDay();
        }
    });

    async function reload() {
        if (!map) {
            console.error("Map is not initialized; skipping reload.");
            return;
        }

        clearWeatherLayers();

        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }

        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }

        if (!baseLayer) {
            addBaseLayer();
        }

        // Markers are already added during initialization; no need to add them again
        await addWeatherLayers();
        animateLayers();

        intervalId = setInterval(() => addWeatherLayers(), updateInterval);
    }

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }
        if (map) {
            map.remove();
            map = null;
        }
    });

    onMount(async () => {
        try {
            if (mapDiv && config) {
                map = L.map(mapDiv, {
                    center: [config.mapPositions[0].lat, config.mapPositions[0].lng],
                    zoom: config.zoom || 10,
                    minZoom: 2,
                    maxZoom: config.zoom || 10,
                    attributionControl: false,
                    zoomControl: false,
                    scrollWheelZoom: true, // Enable scroll wheel zoom
                    doubleClickZoom: false, // Disable default double-click zoom
                    touchZoom: true, // Enable touch zoom
                    dragging: true, // Enable dragging
                    boxZoom: true,
                    keyboard: true,
                });

                addBaseLayer();
                addMarkers(); // Add markers once during initialization
                await addWeatherLayers();
                animateLayers();

                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
                intervalId = setInterval(() => addWeatherLayers(), updateInterval);

                // Cursor style adjustments
                mapDiv.style.cursor = 'grab';

                mapDiv.addEventListener('mousedown', () => {
                    mapDiv.style.cursor = 'grabbing';
                });

                mapDiv.addEventListener('mouseup', () => {
                    mapDiv.style.cursor = 'grab';
                });

                // Add double-click event listener to reset map position
                map.on('dblclick', () => {
                    const originalPosition = [config.mapPositions[0].lat, config.mapPositions[0].lng];
                    const originalZoom = config.zoom || 10;
                    map.setView(originalPosition, originalZoom, { animate: true });
                });

                unsubscribe = modulesToReload.subscribe((state) => {
                    if (state.WeatherMapModule !== reloadCount) {
                        reloadCount = state.WeatherMapModule;
                        reload();
                    }
                });
            }
        } catch (error) {
            console.error("Error during onMount:", error);
        }
    });
</script>

<div bind:this={mapDiv} class="rain-map-wrapper" style="height: {config.mapHeight}; width: {config.mapWidth};"></div>
