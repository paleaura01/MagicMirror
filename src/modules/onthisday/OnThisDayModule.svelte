<script>
    import './onthisday_styles.css'; 

    export let animationspeed = 1; // Default animation speed
    export let updateInterval = 3600; // Default update interval
    export let maxWidth = '400px'; // Default max width for the module
    export let textSize = 'xsmall'; // Default text size for the module

    let events = null;
    let title = null;

    // Regex to match events that start with a 4-digit year followed by a description
    const yearEventRegex = /^\d{4}\s*–/;

    // Function to fetch and parse "On This Day" events from Wikipedia
    async function loadEvents() {
        console.log("Fetching events from the server...");
        try {
            const response = await fetch(`http://localhost:8080/proxy?url=${encodeURIComponent('https://en.wikipedia.org/wiki/Wikipedia:On_this_day')}`);
            const html = await response.text(); // Fetch raw HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Extract the events using the same CSS selector logic
            const eventElements = doc.querySelectorAll('#mp-right ul li');
            events = Array.from(eventElements)
                .map(el => el.textContent.trim())
                .filter(event => yearEventRegex.test(event))
                .slice(0, 6); // Limit to 6 events
            title = 'On This Day';
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    // Call loadEvents on component mount
    loadEvents();

    // Set an interval to reload events based on the update interval
    setInterval(loadEvents, updateInterval * 1000);
</script>

<!-- Style the wrapper based on passed props -->
<div class="onthisday-container {textSize}" style="max-width: {maxWidth}; animation-duration: {animationspeed}s;">
    {#if title}
        <h2>{title}</h2>
    {/if}

    {#if events && events.length > 0}
        <ul>
            {#each events as event}
                <li>{event}</li>
            {/each}
        </ul>
    {:else}
        <p>No events found for today.</p>
    {/if}
</div>
