<script>
  import './clock_styles.css'
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';

  // Props for customization
  export let displayType = "digital"; // "digital", "analog", or "both"
  export let timeFormat = 12; // 12 or 24-hour format
  export let showDate = true;
  export let showSeconds = true;
  export let analogFace = "face-001"; // Use the face-001 as default
  export let analogSize = "200px";

  let time = dayjs();
  let date = dayjs();
  let svgFace = ""; // Store the SVG as a string here

  onMount(() => {
    const interval = setInterval(() => {
      time = dayjs();  // Update the time every second using dayjs
    }, showSeconds ? 1000 : 60000);

    // Load the selected SVG face
    loadSVG(analogFace);

    return () => clearInterval(interval);  // Clear the interval when the component is destroyed
  });

  // Function to dynamically load the SVG based on the selected analogFace
  const loadSVG = async (face) => {
    try {
      const response = await fetch(`/modules/clock/faces/${face}.svg`);
      if (response.ok) {
        svgFace = await response.text(); // Store the SVG content as string
      } else {
        console.error(`Error loading SVG: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching SVG:', error);
    }
  };

  // Function to format time (12-hour or 24-hour)
  const formatTime = (time) => {
    return timeFormat === 12 ? time.format("h:mm:ss A") : time.format("HH:mm:ss");
  };

  // Function to format the date
  const formatDate = (date) => {
    return date.format("dddd, MMMM D, YYYY");
  };
</script>

<!-- Adjusted layout with the clock first -->
<div class="clock-grid">
  {#if displayType === "analog" || displayType === "both"}
    <div class="clock-circle" style="width: {analogSize}; height: {analogSize};">
      <!-- Inject the loaded SVG here -->
      <div class="clock-face">
        {@html svgFace} <!-- This will insert the SVG dynamically -->
      </div>

      <!-- Clock hands -->
      <div class="clock-hour" style="transform: rotate({(time.hour() % 12) * 30 + time.minute() / 2}deg);"></div>
      <div class="clock-minute" style="transform: rotate({time.minute() * 6}deg);"></div>
      {#if showSeconds}
        <div class="clock-second" style="transform: rotate({time.second() * 6}deg);"></div>
      {/if}
    </div>
  {/if}

  {#if displayType === "digital" || displayType === "both"}
    <div class="digital-clock">
      {#if showDate}
        <div class="date">{formatDate(date)}</div>
      {/if}
      <div class="time">{formatTime(time)}</div>
    </div>
  {/if}
</div>
