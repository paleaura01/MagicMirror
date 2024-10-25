<script>
    import dayjs from 'dayjs';
    import './onthisday_styles.css';

    export let animationspeed = 1; // Default animation speed
    export let updateInterval = 3600; // Default update interval (in seconds)
    export let maxWidth = '400px'; // Default max width for the module
    export let textSize = 'xsmall'; // Default text size for the module

    let events = null;
    let title = null;
    let currentDay = dayjs().format('MMMM DD'); // Track the current day

    // Regex to match events that start with a 4-digit year followed by a description
    const yearEventRegex = /^\d{4}\s*–/;

    // Function to fetch and parse "On This Day" events from Wikipedia
    async function loadEvents() {
        console.log("Fetching today's events from Wikipedia...");
        try {
            // Correct Wikipedia URL format for selected anniversaries
            const wikiUrl = `https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries/${dayjs().format('MMMM_DD')}`;
            const response = await fetch(`http://localhost:8080/proxy?url=${encodeURIComponent(wikiUrl)}`);
            const html = await response.text(); // Fetch raw HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Adjusted CSS selector based on the screenshot you provided
            const eventElements = doc.querySelectorAll('.mw-parser-output > ul > li');
            events = Array.from(eventElements)
                .map(el => el.textContent.trim())
                .filter(event => yearEventRegex.test(event)) // Filter out invalid events
                .slice(0, 6); // Limit to 6 events

            // Set the title to include today's month and day with a round dot separator
            title = `On This Day • ${currentDay}`;
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    // Function to check if the day has changed and update events accordingly
    function checkDayChange() {
        const today = dayjs().format('MMMM DD');
        if (today !== currentDay) {
            currentDay = today;
            loadEvents(); // Reload events for the new day
        }
    }

    // Call loadEvents on component mount
    loadEvents();

    // Set an interval to reload events based on the update interval
    setInterval(loadEvents, updateInterval * 1000);

    // Set an interval to check if the day has changed
    setInterval(checkDayChange, 60000); // Check every minute
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
