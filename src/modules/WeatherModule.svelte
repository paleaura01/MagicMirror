<script>
    import { onMount } from 'svelte';
  
    export let city = 'Gastonia'; // Add this line to define the prop
  
    let weatherData = null;
    let error = null;
  
    onMount(async () => {
      try {
        const response = await fetch(`https://wttr.in/${city}?format=%C+%t+%h`);
        const data = await response.text();
  
        if (data.includes("Unknown location")) {
          throw new Error("City not found");
        }
  
        weatherData = data.split(" ");
      } catch (err) {
        error = err.message;
      }
    });
  </script>
  
  <div class="weather">
    {#if error}
      <p>{error}</p>
    {:else if weatherData}
      <h2>Weather in {city}</h2>
      <p>Condition: {weatherData[0]}</p>
      <p>Temperature: {weatherData[1]}</p>
      <p>Humidity: {weatherData[2]}</p>
    {:else}
      <p>Loading weather...</p>
    {/if}
  </div>
  
  <style>
    .weather {
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      background-color: #f9f9f9;
      width: 250px;
    }
  </style>
  