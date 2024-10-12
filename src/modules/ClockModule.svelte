<script>
  import { onMount } from 'svelte';

  let time = new Date().toLocaleTimeString();

  onMount(() => {
    const interval = setInterval(() => {
      time = new Date().toLocaleTimeString();
    }, 1000);

    return () => clearInterval(interval); // Clear the interval when component is destroyed
  });
</script>

<div class="clock">
  <h2>{time}</h2>
</div>

<style>
  .clock {
    font-size: 2em;
    text-align: center;
  }
</style>
