<!-- ./src/modules/onthisday/OnThisDayModule.svelte -->

<!-- ./src/modules/onthisday/OnThisDayModule.svelte -->

<script>
    import dayjs from 'dayjs';
    import './onthisday_styles.css';

    export let animationspeed = 1; // Default animation speed
    export let updateInterval = 3600; // Default update interval (in seconds)
    export let maxWidth = '400px'; // Default max width for the module
    export let textSize = 'xsmall'; // Default text size for the module

    let events = null;
    let title = null;
    let currentDay = dayjs().format('MMMM D'); // Track the current day (without leading zero in day)

    const EVENTS_STORAGE_KEY = 'onThisDayEvents';
    const TITLE_STORAGE_KEY = 'onThisDayTitle';
    const DATE_STORAGE_KEY = 'onThisDayDate';

    // Regex to match events that start with a 4-digit year followed by a description
    const yearEventRegex = /^\d{4}\s*\u2013/;

    // Function to save events and title to localStorage
    function saveEventsToLocalStorage() {
        try {
            localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
            localStorage.setItem(TITLE_STORAGE_KEY, title);
            localStorage.setItem(DATE_STORAGE_KEY, currentDay);
        } catch (error) {
            console.error('Error saving events to localStorage:', error);
        }
    }

    // Function to load events and title from localStorage
    function loadEventsFromLocalStorage() {
        try {
            const savedDate = localStorage.getItem(DATE_STORAGE_KEY);
            if (savedDate === currentDay) {
                events = JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY));
                title = localStorage.getItem(TITLE_STORAGE_KEY);
            }
        } catch (error) {
            console.error('Error loading events from localStorage:', error);
        }
    }

    // Function to fetch and parse "On This Day" events from Wikipedia
    async function loadEvents() {
        try {
            // Ensure day format without leading zero
            const month = dayjs().format('MMMM');
            const day = dayjs().format('D'); // Remove leading zero from day
            const wikiUrl = `https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries/${month}_${day}`;
            const proxyUrl = `http://localhost:8080/proxy?url=${encodeURIComponent(wikiUrl)}`;

            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                console.error("Failed to fetch events:", response.status, response.statusText);
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            
            const eventElements = doc.querySelectorAll('.mw-parser-output > ul > li');
            events = Array.from(eventElements)
                .map(el => el.textContent.trim())
                .filter(event => yearEventRegex.test(event))
                .slice(0, 6);

            title = `On This Day • ${currentDay}`;
            saveEventsToLocalStorage(); // Save fetched events to localStorage
        } catch (error) {
            console.error('Error loading events:', error);
        }
    }

    // Function to check if the day has changed and update events accordingly
    function checkDayChange() {
        const today = dayjs().format('MMMM D');
        if (today !== currentDay) {
            currentDay = today;
            loadEvents(); // Reload events for the new day
        }
    }

    // Load events from localStorage initially
    loadEventsFromLocalStorage();

    // Fetch new events if not already loaded
    if (!events) {
        loadEvents();
    }

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
