<!-- ./src/modules/clock/ClockModule.svelte -->

<script>
  import { onMount } from 'svelte';
  import './clock_styles.css';
  import analogFaceSVG from './pics/face-009.svg';

  export let displayType = "both"; // "digital", "analog", or "both"
  export let timeFormat = 12; // 12 or 24-hour format
  export let showDate = true;
  export let showSeconds = true;

  let time = new Date();

  onMount(() => {
    const interval = setInterval(() => {
      time = new Date();  // Update the time every second
    }, showSeconds ? 1000 : 60000);

    return () => clearInterval(interval);
  });

  const padZero = (num) => num.toString().padStart(2, '0');

  // Function to format time (12-hour or 24-hour)
  const formatTime = (time) => {
    let hours = time.getHours();
    let minutes = time.getMinutes();
    let seconds = time.getSeconds();

    if (timeFormat === 12) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${hours}:${padZero(minutes)}:${padZero(seconds)} ${ampm}`;
    } else {
      return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }
  };

  const formatDate = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  };
</script>

<div class="clock-grid">
  {#if displayType === "analog" || displayType === "both"}
    <div class="clock-circle">
      <!-- Clock face -->
      <div class="clock-face">
        <img src={analogFaceSVG} alt="Analog Clock Face" />
      </div>

      <!-- Correct hour hand calculation -->
      <div
        class="clock-hour"
        style="transform: rotate({(time.getHours() % 12) * 30 + time.getMinutes() / 2}deg);"
      ></div>

      <!-- Minute hand with detailed logging of the rotation value -->
      <div
        class="clock-minute"
        style="transform: rotate({time.getMinutes() * 6}deg);"
      ></div>

      {#if showSeconds}
        <div
          class="clock-second"
          style="transform: rotate({time.getSeconds() * 6}deg);"
        ></div>
      {/if}
    </div>
  {/if}

  {#if displayType === "digital" || displayType === "both"}
    <div class="digital-clock">
      {#if showDate}
        <div class="date">{formatDate(time)}</div>
      {/if}

      <div class="time">
        <div class="hours-minutes">
          {formatTime(time).split(':')[0]}:{formatTime(time).split(':')[1]}
        </div>
        {#if showSeconds}
          <div class="seconds">
            {padZero(time.getSeconds())}
          </div>
        {/if}
        <div class="am-pm">
          {formatTime(time).split(' ')[1]}
        </div>
      </div>
    </div>
  {/if}
</div>
