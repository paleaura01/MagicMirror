<script>
  import { onMount } from 'svelte';
  import './clock_styles.css';
  import dayjs from 'dayjs';
  import analogFaceSVG from './faces/face-009.svg';  // Directly import the SVG file

  // Props for customization
  export let displayType = "digital"; // "digital", "analog", or "both"
  export let timeFormat = 12; // 12 or 24-hour format
  export let showDate = true;
  export let showSeconds = true;

  let time = dayjs();
  let date = dayjs();

  onMount(() => {
    const interval = setInterval(() => {
      time = dayjs();  // Update the time every second using dayjs
    }, showSeconds ? 1000 : 60000);

    return () => clearInterval(interval);  // Clear the interval when the component is destroyed
  });

  // Function to format time (12-hour or 24-hour)
  const formatTime = (time) => {
    return timeFormat === 12 ? time.format("h:mm:ss A") : time.format("HH:mm:ss");
  };

  // Function to format the date
  const formatDate = (date) => {
    return date.format("dddd, MMMM D, YYYY");
  };
</script>

<div class="clock-grid">
  {#if displayType === "analog" || displayType === "both"}
    <div class="clock-circle">
      <!-- Directly render the imported SVG here -->
      <div class="clock-face">
        <img src={analogFaceSVG}  alt="analogFaceSVG" />
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
