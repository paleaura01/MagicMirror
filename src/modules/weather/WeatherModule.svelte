<script>
  import MeteoconsWindFill from './icons/MeteoconsWindFill.svelte';
  import MeteoconsHumidityFill from './icons/MeteoconsHumidityFill.svelte';
  import MeteoconsPollenGrassFill from './icons/MeteoconsPollenGrassFill.svelte';
  import MeteoconsPollenFlowerFill from './icons/MeteoconsPollenFlowerFill.svelte';
  import MeteoconsPollenTreeFill from './icons/MeteoconsPollenTreeFill.svelte';
  import MeteoconsPollenFill from './icons/MeteoconsPollenFill.svelte';
  import MeteoconsHurricaneFill from './icons/MeteoconsHurricaneFill.svelte';
  import MeteoconsWindOnshore from './icons/MeteoconsWindOnshore.svelte';
  import MeteoconsSunriseFill from './icons/MeteoconsSunriseFill.svelte';
  import MeteoconsMoonsetFill from './icons/MeteoconsMoonsetFill.svelte';
  import Fa6SolidArrowUp from './icons/Fa6SolidArrowUp.svelte';
  import { onMount, onDestroy } from 'svelte';
  import './weather_styles.css';
  import dayjs from 'dayjs';

  let weatherData = null;
  let airQualityData = { value: 'N/A', category: 'Unknown' };
  let pollenData = [];
  let displayedPollen = null;
  let error = null;
  let intervalId;
  let pollenIntervalId;
  let currentPollenIndex = 0;

  const pollenIcons = {
    Grass: MeteoconsPollenGrassFill,
    Tree: MeteoconsPollenTreeFill,
    Ragweed: MeteoconsPollenFlowerFill,
    Mold: MeteoconsPollenFill,
  };

  const basePath = '/src/modules/weather/animatedicons';

  // Simplified getWeatherIcon to use the description as-is
  function getWeatherIcon(description) {
    if (!description) return `${basePath}/Clear Skies.mp4`; // Fallback to default
    return `${basePath}/${description}.mp4`;
  }

  const convertToStandard = (value, fromUnit, toUnit) => {
    if (fromUnit === 'C' && toUnit === 'F') {
      return (value * 9) / 5 + 32;
    } else if (fromUnit === 'km/h' && toUnit === 'mi/h') {
      return value * 0.621371;
    }
    return value;
  };

  const fetchWeatherData = async () => {
    try {
      const response = await fetch('/src/meteoweatherData.json');
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      weatherData = {
        temperature: convertToStandard(data.temperature, 'C', 'F').toFixed(1),
        feelsLike: convertToStandard(data.feelsLike, 'C', 'F').toFixed(1),
        humidity: data.humidity,
        windSpeed: convertToStandard(data.windSpeed, 'km/h', 'mi/h').toFixed(1),
        windDirection: data.windDirection,
        weatherDescription: data.weatherDescription, // Use description as-is
        sunrise: dayjs(data.sunrise).format('h:mm A'),
        sunset: dayjs(data.sunset).format('h:mm A'),
        isHurricane: data.windSpeed >= 119, // 119 km/h ~ 74 mi/h
      };
    } catch (err) {
      error = `Weather error: ${err.message}`;
    }
  };

  const fetchPollenAQIData = async () => {
    try {
      const response = await fetch('/src/accuweatherData.json');
      if (!response.ok) throw new Error('Failed to fetch pollen and AQI');
      const data = await response.json();
      airQualityData = data.airQuality || { value: 'N/A', category: 'Unknown' };
      pollenData =
        data.pollenData?.map((item) => ({
          name: item.Name,
          category: item.Category || 'Unknown',
          icon: pollenIcons[item.Name],
        })) || [];

      // Set the initial pollen display
      if (pollenData.length > 0) {
        displayedPollen = pollenData[0];
      }
    } catch (err) {
      error = `Pollen/AQI error: ${err.message}`;
    }
  };

  const refreshData = async () => {
    await fetchWeatherData();
    await fetchPollenAQIData();
  };

  onMount(() => {
    refreshData();
    intervalId = setInterval(refreshData, 600000); // Refresh every 10 minutes

    // Rotate pollen display every 10 seconds
    pollenIntervalId = setInterval(() => {
      if (pollenData.length > 0) {
        currentPollenIndex = (currentPollenIndex + 1) % pollenData.length;
        displayedPollen = pollenData[currentPollenIndex];
      }
    }, 10000);
  });

  onDestroy(() => {
    clearInterval(intervalId);
    clearInterval(pollenIntervalId);
  });
</script>

<div class="weather">
  {#if error}
    <p>{error}</p>
  {:else if weatherData}
    <div class="top-info">
      <div class="left-column">
        <div class="pollen-info">
          {#if displayedPollen}
            <svelte:component this={displayedPollen.icon} class="symbol" />
            <div>{displayedPollen.name}: {displayedPollen.category}</div>
          {/if}
        </div>

        <div class="air-quality">
          <svelte:component this={MeteoconsWindOnshore} class="symbol" />
          AQI: {airQualityData.category} ({airQualityData.value})
        </div>
      </div>
    
      <div class="right-column">
        <div class="wind-info">
          {#if weatherData.isHurricane}
            <MeteoconsHurricaneFill class="symbol" />
            <div>Hurricane Winds: {weatherData.windSpeed} mi/h</div>
          {:else}
            <MeteoconsWindFill class="symbol" />
            <div>
              Wind: {weatherData.windSpeed} mi/h {weatherData.windDirection.compass}
              <span style="margin-left: 4px;">
                <Fa6SolidArrowUp style="transform: rotate({weatherData.windDirection.degrees}deg);" />
              </span>
            </div>
          {/if}
        </div>
        
        <div class="humidity-info">
          <MeteoconsHumidityFill class="symbol" />
          Humidity: {weatherData.humidity}%
        </div>
      </div>
  
      <div class="sunrise-sunset">
        <div class="sunrise">
          <MeteoconsSunriseFill class="symbol" />
          <span class="text">Sunrise: {weatherData.sunrise}</span>
        </div>
        <div class="sunset">
          <MeteoconsMoonsetFill class="symbol" />
          <span class="text">Sunset: {weatherData.sunset}</span>
        </div>
      </div>
    </div>
    
    <div class="current-weather">
      <video autoplay loop muted class="weather-icon">
        <source src={getWeatherIcon(weatherData.weatherDescription)} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div class="temperature">{weatherData.temperature}°F</div>
      <div class="feels-like">Feels Like: {weatherData.feelsLike}°F</div>
      <div class="description">{weatherData.weatherDescription}</div>
    </div>
  {:else}
    <p>Loading weather...</p>
  {/if}
</div>
