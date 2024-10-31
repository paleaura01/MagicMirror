<script>
    import { onMount } from 'svelte';
    import * as L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import './flightradar_styles.css';

    export let lat = 35.315931;
    export let lon = -81.344469;
    export let zoom = 5;
    export let mapHeight = '300px';
    export let mapWidth = '100%';
    export let units = 'imperial';
    export let updateInterval = 120000;
    export let noFlightsMessage = 'Currently no flights in the area.';
    export let dayMapUrl = "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png";
   
    export let showMap = "always";
    export let showTable = true;

    let map, mapDiv, flights = [];
    const iconUrl = 'https://cdn-icons-png.flaticon.com/512/3448/3448610.png';

    const fetchFlightData = async () => {
        console.log("Looking for flights…");

        try {
            const targetUrl = `https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=${lat - 0.5},${lat + 0.5},${lon - 0.5},${lon + 0.5}`;
            const apiUrl = `http://localhost:8080/proxy?url=${encodeURIComponent(targetUrl)}`;

            console.log("Fetching flight data from URL:", apiUrl);

            const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            
            console.log("Response status:", response.status);

            if (!response.ok) {
                console.error('Failed to fetch flight data from FlightRadar24.', response.statusText);
                return;
            }

            const data = await response.json();
            console.log("Flight data received:", data);

            flights = Object.values(data).filter(flight => Array.isArray(flight));
            if (flights.length === 0) {
                console.warn("No flights found in the specified area.");
            }
            updateMap(flights);
        } catch (error) {
            console.error('Error fetching flight data:', error);
        }
    };

    function updateMap(flights) {
        if (!map) return;

        map.eachLayer(layer => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });

        flights.forEach(flight => {
            const [icao, lat, lon, heading, altitude, speed, callsign] = flight;
            if (lat && lon) {
                const marker = L.marker([lat, lon], {
                    icon: L.icon({
                        iconUrl,
                        iconSize: [25, 25],
                        iconAnchor: [12, 12],
                        rotationAngle: heading || 0,
                    })
                }).addTo(map);

                marker.bindPopup(`
                    <div class="flight-popup"><strong>Flight:</strong> ${callsign || 'Unknown'}</div>
                    <div><strong>Altitude:</strong> ${units === 'metric' ? (altitude * 0.3048).toFixed() + ' m' : altitude + ' ft'}</div>
                    <div><strong>Speed:</strong> ${units === 'metric' ? (speed * 1.852).toFixed() + ' km/h' : speed + ' mph'}</div>
                `);
            }
        });
    }

    onMount(() => {
        if (mapDiv) {
            const mapTileUrl = dayMapUrl;
            map = L.map(mapDiv, {
                center: [lat, lon],
                zoom,
                minZoom: 2,
                maxZoom: 12,
                attributionControl: false,
                zoomControl: true
            });

            L.tileLayer(mapTileUrl, {
                maxZoom: 18,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            fetchFlightData();
            const intervalId = setInterval(fetchFlightData, updateInterval);

            return () => clearInterval(intervalId);
        }
    });
</script>

<div class="flight-module">
    <header class="module-header">
        <i class="fas fa-plane logo"></i>
        <span>Flights</span>
    </header>
  
    {#if showMap !== 'never'}
        <div class="flight-map-wrapper" bind:this={mapDiv} style="height: {mapHeight}; width: {mapWidth};"></div>
    {/if}
  
    {#if showTable}
        <div class="flight-list">
            {#if flights.length > 0}
                <table class="flight-table">
                    {#each flights as flight}
                        <tr>
                            <td>{flight.callsign || 'Unknown Flight'}</td>
                            <td>{flight[2] || 'Unknown Country'}</td>
                            <td>
                                {#if flight[11] > 0}
                                    <i class="fas fa-plane-departure"></i>
                                {:else if flight[11] < 0}
                                    <i class="fas fa-plane-arrival"></i>
                                {:else}
                                    <i class="fas fa-plane"></i>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </table>
            {:else}
                <div class="no-flights-message">{noFlightsMessage}</div>
            {/if}
        </div>
    {/if}
</div>
