<script>
    import { onMount, onDestroy } from 'svelte';
    import './traffic_styles.css';

    // Accept props with coordinates as arrays of objects
    export let originCoords = [{ lat: 35.315931, lng: -81.344469 }];
    export let destinationCoords = [{ lat: 35.2716323, lng: -81.1396011 }];
    export let destinationTitle = "To Work";
    export let showSymbol = false;
    export let firstLine = "{duration} mins";

    let duration = null;
    let loading = true;
    let errorMessage = '';
    let timer;

    // Hardcoded access token for testing
    const accessToken = 'pk.eyJ1Ijoiam9zaHVhc2hlbHN3ZWxsIiwiYSI6ImNtMnd5NXF3cDBjY2cyam9vaGt2ZHExMjgifQ.7ExhB8uhIXRb3Z3yv7Wyyw';

    async function fetchCommuteTime() {
        // Extract coordinates from arrays
        const origin = originCoords[0];
        const destination = destinationCoords[0];

        console.log("Origin:", origin, "Destination:", destination);  // Debugging coordinates

        if (!origin || !destination || !accessToken) {
            errorMessage = "Missing configuration or access token";
            loading = false;
            return;
        }

        const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${accessToken}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("API Error: Unable to fetch data");

            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                duration = Math.round(data.routes[0].duration / 60); // Convert seconds to minutes
                errorMessage = '';
            } else {
                errorMessage = "No route found";
            }
        } catch (error) {
            errorMessage = error.message;
            console.error("TrafficModule Error:", error);
        } finally {
            loading = false;
        }
    }

    onMount(() => {
        fetchCommuteTime();
        timer = setInterval(fetchCommuteTime, 300000); // Refresh every 5 minutes
    });

    onDestroy(() => {
        clearInterval(timer);
    });
</script>

<div class="traffic-module">
    <h2 class="module-header">{destinationTitle}</h2>

    {#if loading}
        <p class="loading-text">Loading...</p>
    {:else if errorMessage}
        <p class="error">{errorMessage}</p>
    {:else}
        <div class="commute-info">
            {#if showSymbol}
                <i class="fa fa-car symbol"></i>
            {/if}
            <span class="duration-info">{firstLine.replace("{duration}", duration)}</span>
        </div>
    {/if}
</div>
