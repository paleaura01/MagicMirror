<script>
    import { onMount } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './weathermap_styles.css';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import { sunriseSunsetStore } from '../../stores/weatherStore';

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
    let apiCallInProgress = false, animationTimeoutId, intervalId;
    let sunrise = null, sunset = null;
    let previousIsDaytime = null;

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
        const baseLayerUrl = getMapUrl();
        if (baseLayer) map.removeLayer(baseLayer);
        baseLayer = L.tileLayer(baseLayerUrl, {
            tileSize: 256,
            opacity: 1.0,
            zIndex: 500,
            maxZoom: 18,
            attribution: '&copy; OpenStreetMap contributors',
        });
        baseLayer.addTo(map);
    }

    function addMarkers() {
        config.markers?.forEach(marker => {
            const iconUrl = markerIcons[marker.color] || markerRed;

            L.marker([marker.lat, marker.lng], {
                icon: L.icon({
                    iconUrl,
                    shadowUrl: markerShadow,
                    iconSize: [25, 41],
                    shadowSize: [41, 41],
                    iconAnchor: [12, 41],
                    shadowAnchor: [12, 41],
                    popupAnchor: [0, -41]
                })
            }).addTo(map);
        });
    }

    async function addWeatherLayers() {
        if (apiCallInProgress) return;

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

            radarLayers.forEach(layer => map.hasLayer(layer) && map.removeLayer(layer));
            satelliteLayers.forEach(layer => layer && map.hasLayer(layer) && map.removeLayer(layer));

            radarLayers = [];
            satelliteLayers = [];

            frames.forEach((frame, index) => {
                const timestamp = frame.time;
                const radarColor = getRadarColor();
                const radarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;

                const radarLayer = L.tileLayer(radarUrlTemplate, {
                    tileSize,
                    opacity: 0,
                    zIndex: 1100 + index,
                    maxZoom: config.zoom,
                    errorTileUrl: './pics/error-tile.png',
                    interactive: false // Set interactive to false
                }).addTo(map);
                radarLayers.push(radarLayer);

                const satelliteFrame = satelliteFrames.find(satFrame => satFrame.time === timestamp);
                if (satelliteFrame && satelliteFrame.path) {
                    const satelliteUrlTemplate = `https://tilecache.rainviewer.com/v2/satellite/${satelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;

                    const satelliteLayer = L.tileLayer(satelliteUrlTemplate, {
                        tileSize,
                        opacity: 0,
                        zIndex: 1000 + index,
                        maxZoom: config.zoom,
                        errorTileUrl: './pics/error-tile.png',
                        interactive: false // Set interactive to false
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
        const baseTimestamp = baseFrame.time;
        const radarColor = getRadarColor();

        if (baseRadarLayer) map.removeLayer(baseRadarLayer);
        if (baseSatelliteLayer) map.removeLayer(baseSatelliteLayer);

        const baseRadarUrlTemplate = `https://tilecache.rainviewer.com/v2/radar/${baseTimestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;
        baseRadarLayer = L.tileLayer(baseRadarUrlTemplate, {
            tileSize,
            opacity: 0.5,
            zIndex: 900,
            maxZoom: config.zoom,
            errorTileUrl: './pics/error-tile.png',
            interactive: false // Set interactive to false
        }).addTo(map);

        const baseSatelliteFrame = satelliteFrames.find(satFrame => satFrame.time === baseTimestamp);

        if (baseSatelliteFrame && baseSatelliteFrame.path) {
            const baseSatelliteUrlTemplate = `https://tilecache.rainviewer.com/v2/satellite/${baseSatelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;
            baseSatelliteLayer = L.tileLayer(baseSatelliteUrlTemplate, {
                tileSize,
                opacity: 0.3,
                zIndex: 800,
                maxZoom: config.zoom,
                errorTileUrl: './pics/error-tile.png',
                interactive: false // Set interactive to false
            }).addTo(map);
        }
    }

    function animateLayers() {
        if (!radarLayers.length) return;

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
            if (baseLayer) map.removeLayer(baseLayer);
            addBaseLayer();
            addWeatherLayers();
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
                    scrollWheelZoom: true,
                    doubleClickZoom: false,
                    touchZoom: true,
                    dragging: true,
                    boxZoom: true,
                    keyboard: true,
                });

                addBaseLayer();
                map.on('dblclick', () => map.setView([config.mapPositions[0].lat, config.mapPositions[0].lng], config.zoom || 10));
                addMarkers();
                await addWeatherLayers();
                animateLayers();

                if (intervalId) clearInterval(intervalId);
                intervalId = setInterval(() => addWeatherLayers(), updateInterval);
            }
        } catch (error) {
            console.error("Error during onMount:", error);
        }
    });
</script>

<div bind:this={mapDiv} class="rain-map-wrapper" style="height: {config.mapHeight}; width: {config.mapWidth};"></div>
