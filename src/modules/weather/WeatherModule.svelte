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
  import { onMount, onDestroy } from 'svelte';
  import './weather_styles.css';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  let weatherData = null;
  let displayedPollen = null;
  let error = null;
  let intervalId;
  let pollenIntervalId;
  let currentPollenIndex = 0;

  const basePath = 'src/modules/weatherforecast/animatedicons';

  const pollenIcons = {
    Grass: MeteoconsPollenGrassFill,
    Tree: MeteoconsPollenTreeFill,
    Ragweed: MeteoconsPollenFlowerFill,
    Mold: MeteoconsPollenFill,
  };

  const weatherConditionsMap = {
    0: "Clear Skies.mp4",
    1: "Mostly Clear.mp4",
    2: "Partly Cloudy.mp4",
    3: "Overcast.mp4",
    45: "Fog.mp4",
    48: "Depositing Rime Fog.mp4",
    51: "Light Drizzle.mp4",
    53: "Moderate Drizzle.mp4",
    55: "Dense Drizzle.mp4",
    56: "Light Freezing Drizzle.mp4",
    57: "Dense Freezing Drizzle.mp4",
    61: "Slight Rain.mp4",
    63: "Moderate Rain.mp4",
    65: "Heavy Rain.mp4",
    66: "Light Freezing Rain.mp4",
    67: "Heavy Freezing Rain.mp4",
    71: "Slight Snow Fall.mp4",
    73: "Moderate Snow Fall.mp4",
    75: "Heavy Snow Fall.mp4",
    77: "Snow Grains.mp4",
    80: "Slight Rain Showers.mp4",
    81: "Moderate Rain Showers.mp4",
    82: "Violent Rain Showers.mp4",
    85: "Slight Snow Showers.mp4",
    86: "Heavy Snow Showers.mp4",
    95: "Thunderstorm.mp4",
    96: "Thunderstorm With Slight Hail.mp4",
    99: "Thunderstorm With Heavy Hail.mp4",
  };

  function getWeatherIcon(condition) {
    return `${basePath}/${weatherConditionsMap[condition] || weatherConditionsMap[0]}`;
  }

  function getPollenIcon(name) {
    return pollenIcons[name] || null;
  }

  function formatTime(timeString) {
    return dayjs(timeString).format('h:mm A');
  }

  async function fetchWeatherData() {
    try {
      const response = await fetch('/src/accuweatherData.json');

      if (!response.ok) {
        throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid content type, expected JSON');
      }

      const data = await response.json();
      if (!data) throw new Error('No data received');

      const { currentConditions, pollenData, airQuality, sunrise, sunset } = data;

      const windSpeed = currentConditions[0].Wind.Speed.Imperial.Value;
      const isHurricane = windSpeed >= 74;

      weatherData = {
        temperature: currentConditions[0].Temperature.Imperial.Value.toFixed(1),
        feelsLike: currentConditions[0].RealFeelTemperature.Imperial.Value.toFixed(1),
        windspeed: windSpeed.toFixed(1),
        windSpeedUnit: currentConditions[0].Wind.Speed.Imperial.Unit,
        humidity: currentConditions[0].RelativeHumidity,
        sunrise: formatTime(sunrise),
        sunset: formatTime(sunset),
        isHurricane,
        weatherIcon: isHurricane 
          ? '/src/modules/weatherforecast/icons/hurricane.png' 
          : getWeatherIcon(currentConditions[0].WeatherIcon),
        description: currentConditions[0].WeatherText,
        pollenDataArray: pollenData.map((pollen) => ({
          name: pollen.Name,
          category: mapPollenCategory(pollen.Name, pollen.Value),
          icon: getPollenIcon(pollen.Name),
        })),
        airQuality: {
          category: mapAirQualityCategory(airQuality.value),
          value: airQuality.value,
          icon: MeteoconsWindOnshore,
        },
      };
    } catch (err) {
      error = `Error fetching data: ${err.message}`;
    }
  }

  function mapPollenCategory(name, value) {
    const ranges = {
      Grass: [
        { category: 'Low', min: 0, max: 4.99 },
        { category: 'Moderate', min: 5, max: 19.99 },
        { category: 'High', min: 20, max: 199.99 },
        { category: 'Very High', min: 200, max: 299.99 },
        { category: 'Extreme', min: 300, max: 1000000 },
      ],
      Mold: [
        { category: 'Low', min: 0, max: 6499.99 },
        { category: 'Moderate', min: 6500, max: 12999.99 },
        { category: 'High', min: 13000, max: 49999.99 },
        { category: 'Very High', min: 50000, max: 64999.99 },
        { category: 'Extreme', min: 65000, max: 1000000 },
      ],
      Ragweed: [
        { category: 'Low', min: 0, max: 9.99 },
        { category: 'Moderate', min: 10, max: 49.99 },
        { category: 'High', min: 50, max: 499.99 },
        { category: 'Very High', min: 500, max: 649.99 },
        { category: 'Extreme', min: 650, max: 1000000 },
      ],
      Tree: [
        { category: 'Low', min: 0, max: 14.99 },
        { category: 'Moderate', min: 15, max: 89.99 },
        { category: 'High', min: 90, max: 1499.99 },
        { category: 'Very High', min: 1500, max: 2999.99 },
        { category: 'Extreme', min: 3000, max: 1000000 },
      ],
    };

    const categoryRanges = ranges[name];
    if (categoryRanges) {
      const category = categoryRanges.find((r) => value >= r.min && value <= r.max);
      return category ? category.category : 'Unknown';
    }
    return 'Unknown';
  }

  function mapAirQualityCategory(value) {
    const ranges = [
      { category: 'Good', min: 0, max: 50 },
      { category: 'Moderate', min: 51, max: 100 },
      { category: 'Unhealthy for Sensitive Groups', min: 101, max: 150 },
      { category: 'Unhealthy', min: 151, max: 200 },
      { category: 'Very Unhealthy', min: 201, max: 300 },
      { category: 'Hazardous', min: 301, max: 500 },
    ];

    const category = ranges.find((r) => value >= r.min && value <= r.max);
    return category ? category.category : 'Unknown';
  }

  $: if (weatherData && weatherData.pollenDataArray.length > 0) {
    displayedPollen = weatherData.pollenDataArray[currentPollenIndex];
  }

  onMount(() => {
    fetchWeatherData();
    intervalId = setInterval(fetchWeatherData, 600000);

    pollenIntervalId = setInterval(() => {
      if (weatherData && weatherData.pollenDataArray.length > 0) {
        currentPollenIndex = (currentPollenIndex + 1) % weatherData.pollenDataArray.length;
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
    <p>Error: {error}</p>
  {:else if weatherData}
    <div class="top-info">
      <div class="pollen-info">
        {#if displayedPollen}
          <svelte:component this={displayedPollen.icon} class="symbol" />
          <div>{displayedPollen.name}: {displayedPollen.category}</div>
        {/if}
      </div>

      <div class="air-quality">
        <svelte:component this={weatherData.airQuality.icon} class="symbol" />
        <div>AQI: {weatherData.airQuality.category} ({weatherData.airQuality.value})</div>
      </div>

      <div class="wind-info">
        {#if weatherData.isHurricane}
          <MeteoconsHurricaneFill class="symbol" />
          <div>Hurricane Winds: {weatherData.windspeed} {weatherData.windSpeedUnit}</div>
        {:else}
          <MeteoconsWindFill class="symbol" />
          <div>Wind: {weatherData.windspeed} {weatherData.windSpeedUnit}</div>
        {/if}
      </div>

      <div class="humidity-info">
        <MeteoconsHumidityFill class="symbol" />
        <div>Humidity: {weatherData.humidity}%</div>
      </div>

      <div class="sunrise-sunset">
        <div class="sunrise">
          <MeteoconsSunriseFill class="symbol" />
          <div>Sunrise: {weatherData.sunrise}</div>
        </div>
        <div class="sunset">
          <MeteoconsMoonsetFill class="symbol" />
          <div>Sunset: {weatherData.sunset}</div>
        </div>
      </div>
    </div>

    <div class="current-weather">
      <img src={weatherData.weatherIcon} alt="Weather Icon" class="weather-icon" />
      <div class="temperature">{weatherData.temperature}°F</div>
      <div class="feels-like">Feels Like: {weatherData.feelsLike}°F</div>
      <div class="description">{weatherData.description}</div>
    </div>
  {:else}
    <p>Loading weather...</p>
  {/if}
</div>

