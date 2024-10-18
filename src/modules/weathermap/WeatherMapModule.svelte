<script>
    import { onMount } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './weathermap_styles.css';
    import dayjs from 'dayjs';
    import isBetween from 'dayjs/plugin/isBetween'; // Import the isBetween plugin
    import { sunriseSunsetStore } from '../../stores/weatherStore';

    // Add the isBetween plugin to dayjs
    dayjs.extend(isBetween);

    import markerRed from './pics/marker-icon-red.png';
    import markerBlue from './pics/marker-icon-blue.png';
    import markerGreen from './pics/marker-icon-green.png';
    import markerShadow from './pics/marker-shadow.png';

    const markerIcons = { red: markerRed, blue: markerBlue, green: markerGreen };
    export let config;

    let mapDiv, map;
    let radarLayers = [], satelliteLayers = [];
    const updateInterval = 300000; // 5 minutes
    let apiCallInProgress = false, animationTimeoutId, intervalId;
    let sunrise = null, sunset = null;

    // Subscribe to sunrise and sunset times
    sunriseSunsetStore.subscribe(({ sunrise: sr, sunset: ss }) => { sunrise = sr; sunset = ss; });

    // Determine if it is day or night
    const isDaytime = () => sunrise && sunset && dayjs().isBetween(sunrise, sunset);

    // Get radar color and map URL based on time of day
    const getRadarColor = () => isDaytime() ? config.dayRadarColor : config.nightRadarColor;
    const getMapUrl = () => isDaytime() ? config.dayMapUrl : config.nightMapUrl;

    // Reset layers
    const resetLayers = (layers) => {
        layers.forEach(layer => { if (map.hasLayer(layer)) map.removeLayer(layer); });
        layers.length = 0;
    };

    async function addWeatherLayers() {
    if (apiCallInProgress) {
        console.log("API call already in progress. Skipping new request.");
        return;
    }

    apiCallInProgress = true;
    let maxRetries = 3; // Maximum number of retries to fetch all frames
    let delayBetweenRetries = 2000; // 2-second delay between retries

    try {
        let data = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const apiUrl = 'http://localhost:8080/proxy?url=' + 
                encodeURIComponent('https://api.rainviewer.com/public/weather-maps.json?frames=13');
            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.error(`Failed to fetch data (attempt ${attempt + 1}). Status:`, response.status);
                if (attempt < maxRetries - 1) {
                    console.log(`Retrying in ${delayBetweenRetries / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
                }
                continue;
            }

            data = await response.json();
            const radarFramesCount = data.radar.past.length;
            const satelliteFramesCount = data.satellite.infrared.length;

            if (radarFramesCount >= 13 && satelliteFramesCount >= 13) {
                console.log(`Successfully fetched data on attempt ${attempt + 1}`);
                break;
            } else if (attempt < maxRetries - 1) {
                console.log(`Fetched ${radarFramesCount} radar and ${satelliteFramesCount} satellite frames. Retrying in ${delayBetweenRetries / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenRetries));
            }
        }

        if (!data || data.radar.past.length < 13 || data.satellite.infrared.length < 13) {
            console.log(`Retrying in ${delayBetweenRetries / 1000} seconds...`); // Schedule another retry
            setTimeout(addWeatherLayers, delayBetweenRetries);
            return;
        }

        const tileSize = 256;
        const radarFrames = data.radar.past.slice(-13); // Get the last 13 radar frames
        const satelliteFrames = data.satellite.infrared.slice(-13); // Get the last 13 satellite frames

        console.log(`Total radar frames pulled: ${radarFrames.length}`);
        console.log(`Total satellite frames pulled: ${satelliteFrames.length}`);

        // Build frames array, aligning radar and satellite frames by timestamp
        const frames = [];
        const satelliteFramesMap = new Map();
        satelliteFrames.forEach(frame => satelliteFramesMap.set(frame.time, frame));

        radarFrames.forEach(radarFrame => {
            const timestamp = radarFrame.time;
            const satelliteFrame = satelliteFramesMap.get(timestamp) || null;
            frames.push({ radarFrame, satelliteFrame });
        });

        console.log(`Total frames prepared: ${frames.length}`);

        // Prepare new layers
        let newRadarLayers = [];
        let newSatelliteLayers = [];

        frames.forEach(({ radarFrame, satelliteFrame }) => {
            const timestamp = radarFrame.time;
            const radarColor = getRadarColor();
            const radarUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/${tileSize}/{z}/{x}/{y}/${radarColor}/1_0.png`;

            const radarLayer = L.tileLayer(radarUrl, {
                tileSize,
                opacity: 0,
                zIndex: 1100,
                maxZoom: config.zoom,
                errorTileUrl: './pics/error-tile.png',
            }).on('tileerror', error => console.error('Radar tile error:', error));

            radarLayer.addTo(map);
            newRadarLayers.push(radarLayer);

            // Add the corresponding satellite layer if available
            if (satelliteFrame && satelliteFrame.path) {
                const satelliteUrl = `https://tilecache.rainviewer.com/v2/satellite/${satelliteFrame.path}/${tileSize}/{z}/{x}/{y}/0/0_0.png`;

                const satelliteLayer = L.tileLayer(satelliteUrl, {
                    tileSize,
                    opacity: 0,
                    zIndex: 1000,
                    maxZoom: config.zoom,
                    errorTileUrl: './pics/error-tile.png',
                }).on('tileerror', error => console.error('Satellite tile error:', error));

                satelliteLayer.addTo(map);
                newSatelliteLayers.push(satelliteLayer);
            } else {
                newSatelliteLayers.push(null); // Add a null entry for alignment
            }
        });

        console.log(`New radar layers added: ${newRadarLayers.length}`);
        console.log(`New satellite layers added: ${newSatelliteLayers.length}`);

        // Replace old layers with new ones
        resetLayers(radarLayers);
        resetLayers(satelliteLayers);
        radarLayers = newRadarLayers;
        satelliteLayers = newSatelliteLayers;

        // Restart the animation with new layers
        if (animationTimeoutId) {
            clearTimeout(animationTimeoutId);
            animationTimeoutId = null;
        }
        animateLayers();

    } catch (error) {
        console.error("Error fetching data:", error);
        setTimeout(addWeatherLayers, delayBetweenRetries); // Retry in the background
    } finally {
        apiCallInProgress = false;
    }
}




    function animateLayers() {
        let frameIndex = 0;

        function showNextFrame() {
            // Hide all layers
            radarLayers.forEach(layer => layer && layer.setOpacity(0));
            satelliteLayers.forEach(layer => layer && layer.setOpacity(0));

            // Show current frame
            if (radarLayers[frameIndex]) {
                radarLayers[frameIndex].setOpacity(0.8);
            }

            if (satelliteLayers[frameIndex]) {
                satelliteLayers[frameIndex].setOpacity(0.5);
            }

            let delay = config.animationSpeedMs;
            if (frameIndex === 0) delay += config.extraDelayCurrentFrameMs;
            if (frameIndex === radarLayers.length - 1) delay += config.extraDelayLastFrameMs;

            frameIndex = (frameIndex + 1) % radarLayers.length;
            animationTimeoutId = setTimeout(showNextFrame, delay);
        }

        showNextFrame();
    }

    function addMarkers() {
        if (config.markers?.length) {
            config.markers.forEach(marker => {
                const iconUrl = markerIcons[marker.color] || markerRed;
                L.marker([marker.lat, marker.lng], {
                    icon: L.icon({
                        iconUrl,
                        shadowUrl: markerShadow,
                        iconSize: [25, 41],
                        shadowSize: [41, 41],
                        iconAnchor: [12, 41],
                        shadowAnchor: [12, 41],
                        popupAnchor: [0, -41],
                    }),
                }).addTo(map);
            });
        }
    }

    onMount(() => {
        if (mapDiv && config) {
            map = L.map(mapDiv, {
                center: [config.mapPositions[0].lat, config.mapPositions[0].lng],
                zoom: config.zoom || 10,
                attributionControl: false,
                zoomControl: false,
                doubleClickZoom: false,
                layers: [
                    L.tileLayer(getMapUrl(), {
                        maxZoom: 18,
                        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, ' +
                                     '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
                                     '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
                    }),
                ],
            });

            // Re-center map on double-click
            map.on('dblclick', () => {
                map.setView([config.mapPositions[0].lat, config.mapPositions[0].lng], config.zoom || 10);
            });

            // Start the initial animation with empty layers
            animateLayers();
            addWeatherLayers();
            addMarkers();

            if (intervalId) clearInterval(intervalId);
            intervalId = setInterval(addWeatherLayers, updateInterval);
        } else {
            console.error("Map div or configuration is missing.");
        }
    });
</script>

<!-- Map Container -->
<div bind:this={mapDiv} class="rain-map-wrapper" style="height: {config.mapHeight}; width: {config.mapWidth};"></div>
