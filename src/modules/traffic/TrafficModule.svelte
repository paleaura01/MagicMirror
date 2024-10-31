<script>
    import { onMount, onDestroy } from 'svelte';
    import './traffic_styles.css';
    import Fa6SolidCar from './icons/Fa6SolidCar.svelte';

    export let originCoords = []; // List of destinations with nested properties
    let durations = [];
    let loading = true;
    let errorMessage = '';
    let timer;

    const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    async function fetchCommuteTimes() {
        durations = []; // Reset durations array
        loading = true;

        // Loop through each destination object in originCoords
        for (const destination of originCoords) {
            const origin = destination.originCoords[0];
            const destinationCoords = destination.destinationCoords[0];

            if (!origin || !destinationCoords || !accessToken) {
                errorMessage = "Invalid coordinates or access token missing";
                continue;
            }

            const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.lng},${origin.lat};${destinationCoords.lng},${destinationCoords.lat}?access_token=${accessToken}`;

            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("API Error: Unable to fetch data");

                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    const duration = Math.round(data.routes[0].duration / 60); // Convert seconds to minutes
                    durations.push({ duration, destinationTitle: destination.destinationTitle });
                } else {
                    errorMessage = "No route found";
                }
            } catch (error) {
                errorMessage = error.message;
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
    {:else if errorMessage}
        <p class="error">{errorMessage}</p>
    {:else}
        {#each durations as { duration, destinationTitle }}
            <div class="commute-info">
                <Fa6SolidCar class="symbol" />
                <span class="duration">{duration} mins - {destinationTitle}</span>
            </div>
        {/each}
    {/if}
</div>