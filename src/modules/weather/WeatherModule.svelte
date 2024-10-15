<!-- ./src/modules/weather/WeatherModule.svelte -->

<script>
  import { onMount } from 'svelte';
  import './weather_styles.css';
  let weatherData = null;
  let error = null;

  const lat = 35.2080; // Latitude for Kings Mountain
  const lon = -81.3673; // Longitude for Kings Mountain

  // Function to map weather codes to descriptions
  const weatherCodeToDescription = (code) => {
    const descriptions = {
      0: "Clear Skies",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing Rime Fog",
      51: "Drizzle: Light",
      61: "Rain: Slight",
      71: "Snow Fall: Slight",
      80: "Rain showers: Slight",
      95: "Thunderstorm",
      // Add more mappings as needed
    };

    return descriptions[code] || "Unknown condition";
  };

  onMount(async () => {
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const data = await response.json();

      if (!data.current_weather) {
        throw new Error("Weather data not available");
      }

      // Extract the current weather data and convert temperature to Fahrenheit
      const tempCelsius = data.current_weather.temperature;
      const tempFahrenheit = (tempCelsius * 9/5) + 32;

      weatherData = {
        condition: weatherCodeToDescription(data.current_weather.weathercode),
        temperature: tempFahrenheit.toFixed(1), // Limit to 1 decimal place
        windspeed: data.current_weather.windspeed,
      };
    } catch (err) {
      error = err.message;
    }
  });
</script>

<div class="weather">
  {#if error}
    <p>{error}</p>
  {:else if weatherData}
    <h2>Kings Mountain, NC</h2>
    <p>Condition: {weatherData.condition}</p>
    <p>Temperature: {weatherData.temperature}°F</p>
    <p>Wind Speed: {weatherData.windspeed} m/s</p>
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
