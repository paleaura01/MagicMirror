<!-- ./src/modules/traffic/TrafficModule.svelte -->


<script>
    import { onMount, onDestroy } from 'svelte';
    import './traffic_styles.css';
    import Fa6SolidCar from './icons/Fa6SolidCar.svelte'; // Import the car icon as a Svelte component

    // Accept an array of route configurations from props
    export let routes = [
        {
            originCoords: [{ lat: 35.315931, lng: -81.344469 }],
            destinationCoords: [{ lat: 35.2716323, lng: -81.1396011 }],
            destinationTitle: "To Caromont Medical Center"
        },
        {
            originCoords: [{ lat: 35.315931, lng: -81.344469 }],
            destinationCoords: [{ lat: 35.2018816, lng: -81.1352634 }],
            destinationTitle: "To Mom's House"
        }
    ];
    export let showSymbol = true;
    export let firstLine = "{duration} mins";

    let durations = []; // Array to store each route’s duration
    let loading = true;
    let errorMessages = []; // Array to store each route’s error message
    let timer;

    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    async function fetchCommuteTimes() {
        loading = true;
        durations = [];
        errorMessages = [];

        for (const route of routes) {
            const origin = route.originCoords[0];
            const destination = route.destinationCoords[0];

            if (!origin || !destination || !accessToken) {
                errorMessages.push(`Missing configuration or access token for ${route.destinationTitle}`);
                durations.push(null);
                continue;
            }

            const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${accessToken}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("API Error: Unable to fetch data");

                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    durations.push(Math.round(data.routes[0].duration / 60)); // Convert seconds to minutes
                    errorMessages.push('');
                } else {
                    durations.push(null);
                    errorMessages.push(`No route found for ${route.destinationTitle}`);
                }
            } catch (error) {
                durations.push(null);
                errorMessages.push(`Error for ${route.destinationTitle}: ${error.message}`);
                console.error("TrafficModule Error:", error);
            }
        }

        loading = false;
    }

    onMount(() => {
        fetchCommuteTimes();
        timer = setInterval(fetchCommuteTimes, 300000); // Refresh every 5 minutes
    });

    onDestroy(() => {
        clearInterval(timer);
    });
</script>

<div class="traffic-module">
    {#if loading}
        <p class="loading-text">Loading...</p>
    {:else}
        {#each routes as route, index}
            <div class="commute-info">
                {#if showSymbol}
                    <Fa6SolidCar class="symbol" /> <!-- Use the imported Fa6SolidCar component as an SVG icon -->
                {/if}
                <div class="time-info">
                    <span class="duration">
                        {#if durations[index] !== null}
                            {firstLine.replace("{duration}", durations[index])}
                        {:else}
                            <span class="error">{errorMessages[index]}</span>
                        {/if}
                    </span>
                    <span class="destination">{route.destinationTitle}</span>
                </div>
            </div>
        {/each}
    {/if}
</div>

