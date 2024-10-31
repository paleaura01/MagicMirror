<!-- ./src/modules/weather/WeatherModule.svelte -->

<script>
  import { onMount, onDestroy } from 'svelte';
  import dayjs from 'dayjs';
  import './weather_styles.css';
  import { sunriseSunsetStore } from '../../stores/weatherStore.js';
  import { modulesToReload } from '../../stores/reloadStore';

  let weatherData = null;
  let error = null;
  let reloadCount = 0;

  const lat = 35.2080;
  const lon = -81.3673;

  let sunrise = null;
  let sunset = null;


  const iconMap = {
  "0": { day: "/src/modules/weatherforecast/icons/32.png", night: "/src/modules/weatherforecast/icons/31.png" }, // Clear sky
  "1": { day: "/src/modules/weatherforecast/icons/34.png", night: "/src/modules/weatherforecast/icons/33.png" }, // Mainly clear
  "2": { day: "/src/modules/weatherforecast/icons/30.png", night: "/src/modules/weatherforecast/icons/29.png" }, // Partly cloudy
  "3": { day: "/src/modules/weatherforecast/icons/28.png", night: "/src/modules/weatherforecast/icons/27.png" }, // Overcast
  "45": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" }, // Fog
  "48": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" }, // Depositing rime fog
  "51": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },   // Light drizzle
  "53": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },   // Moderate drizzle
  "55": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },   // Dense drizzle
  "56": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },   // Light freezing drizzle
  "57": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },   // Dense freezing drizzle
  "61": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" }, // Slight rain
  "63": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Moderate rain
  "65": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Heavy rain
  "66": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" }, // Light freezing rain
  "67": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" }, // Heavy freezing rain
  "71": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" }, // Slight snowfall
  "73": { day: "/src/modules/weatherforecast/icons/16.png", night: "/src/modules/weatherforecast/icons/16.png" }, // Moderate snowfall
  "75": { day: "/src/modules/weatherforecast/icons/41.png", night: "/src/modules/weatherforecast/icons/41.png" }, // Heavy snowfall
  "77": { day: "/src/modules/weatherforecast/icons/13.png", night: "/src/modules/weatherforecast/icons/13.png" }, // Snow grains
  "80": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" }, // Slight rain showers
  "81": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Moderate rain showers
  "82": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Violent rain showers
  "85": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" }, // Slight snow showers
  "86": { day: "/src/modules/weatherforecast/icons/42.png", night: "/src/modules/weatherforecast/icons/42.png" }, // Heavy snow showers
  "95": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },   // Thunderstorm
  "96": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },   // Thunderstorm with slight hail
  "99": { day: "/src/modules/weatherforecast/icons/3.png", night: "/src/modules/weatherforecast/icons/3.png" },   // Thunderstorm with heavy hail
  "default": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" } // Default
};

 // Reload functionality
 const unsubscribe = modulesToReload.subscribe((state) => {
    if (state.WeatherModule !== reloadCount) {
      reloadCount = state.WeatherModule;
      // console.log(`[WeatherModule] Reload triggered at ${new Date().toLocaleTimeString()}`);
      reload();
    }
  });

  onDestroy(unsubscribe);

  async function reload() {
    console.log(`[WeatherModule] Reloading data at ${new Date().toLocaleTimeString()}`);
    await fetchWeatherData();
  }

  // Fetch weather data and update store with sunrise/sunset
  async function fetchWeatherData() {
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m&timezone=auto&daily=sunrise,sunset`);
      const data = await response.json();

      if (!data.current_weather || !data.hourly) {
        throw new Error("Weather data not available");
      }

      const tempCelsius = data.current_weather.temperature;
      const tempFahrenheit = (tempCelsius * 9 / 5) + 32;
      const windspeedMph = (data.current_weather.windspeed * 2.23694).toFixed(1);
      const currentHour = dayjs().format('YYYY-MM-DDTHH:00');
      const hourIndex = data.hourly.time.findIndex(time => time === currentHour);
      const humidity = hourIndex !== -1 ? `${data.hourly.relative_humidity_2m[hourIndex]}%` : "N/A";

      // Calculate "feels like" temperature
      const feelsLike = calculateFeelsLike(tempFahrenheit, windspeedMph, humidity);

      sunrise = data.daily.sunrise[0];
      sunset = data.daily.sunset[0];
      const isDay = isDaytime(sunrise, sunset);

      const weatherCode = data.current_weather.weathercode.toString();
      const icon = iconMap[weatherCode] ? (isDay ? iconMap[weatherCode].day : iconMap[weatherCode].night) : iconMap["default"].day;

      weatherData = {
        temperature: tempFahrenheit.toFixed(1),
        feelsLike: feelsLike.toFixed(1),
        windspeed: windspeedMph,
        humidity,
        windDirection: getCardinalDirection(data.current_weather.winddirection),
        sunrise: dayjs(sunrise).format('HH:mm'),
        sunset: dayjs(sunset).format('HH:mm'),
        weatherIcon: icon,
        description: getWeatherDescription(weatherCode),
        showSunrise: isBeforeSunrise(sunrise) || (!isDay && dayjs().isAfter(dayjs(sunset)))
      };

      sunriseSunsetStore.set({ sunrise: dayjs(sunrise), sunset: dayjs(sunset) });

    } catch (err) {
      error = err.message;
    }
  }

  // Utility functions
  function getCardinalDirection(angle) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(angle / 22.5) % 16];
  }

  function calculateFeelsLike(tempF, windSpeed, humidity) {
    if (humidity === "N/A") return tempF;
    if (tempF <= 50 && windSpeed > 3) return calculateWindChill(tempF, windSpeed);
    if (tempF >= 80 && humidity >= 40) return calculateHeatIndex(tempF, humidity);
    return tempF;
  }

  function calculateWindChill(tempF, windSpeed) {
    return 35.74 + 0.6215 * tempF - 35.75 * Math.pow(windSpeed, 0.16) + 0.4275 * tempF * Math.pow(windSpeed, 0.16);
  }

  function calculateHeatIndex(tempF, humidity) {
    return -42.379 + 2.04901523 * tempF + 10.14333127 * humidity - 0.22475541 * tempF * humidity + 0.00122874 * tempF * tempF * humidity + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
  }

  const getWeatherDescription = (code) => {
  const descriptions = {
    "0": "Clear Skies",
    "1": "Mainly Clear",
    "2": "Partly Cloudy",
    "3": "Overcast",
    "45": "Fog",
    "48": "Depositing Rime Fog",
    "51": "Light Drizzle",
    "53": "Moderate Drizzle",
    "55": "Dense Drizzle",
    "56": "Light Freezing Drizzle",
    "57": "Dense Freezing Drizzle",
    "61": "Slight Rain",
    "63": "Moderate Rain",
    "65": "Heavy Rain",
    "66": "Light Freezing Rain",
    "67": "Heavy Freezing Rain",
    "71": "Slight Snowfall",
    "73": "Moderate Snowfall",
    "75": "Heavy Snowfall",
    "77": "Snow Grains",
    "80": "Slight Rain Showers",
    "81": "Moderate Rain Showers",
    "82": "Violent Rain Showers",
    "85": "Slight Snow Showers",
    "86": "Heavy Snow Showers",
    "95": "Thunderstorm",
    "96": "Thunderstorm With Slight Hail",
    "99": "Thunderstorm With Heavy Hail",
    "default": "Unknown condition"
  };
  return descriptions[code] || descriptions["default"];
};


const isDaytime = (sunrise, sunset) => dayjs().isAfter(dayjs(sunrise)) && dayjs().isBefore(dayjs(sunset));
const isBeforeSunrise = (sunrise) => dayjs().isBefore(dayjs(sunrise));

onMount(async () => {
  await fetchWeatherData();
});

</script>

<div class="weather">
{#if error}
  <p>{error}</p>
{:else if weatherData}
  <div class="top-info">
    <span class="wind-info">
      <i class="wi wi-strong-wind"></i> {weatherData.windspeed} mph {weatherData.windDirection}
    </span>
    <span class="humidity-info">
      <i class="wi wi-humidity"></i> {weatherData.humidity}
    </span>
    <span class="sunrise-sunset">
      {#if weatherData.showSunrise}
        <i class="wi wi-sunrise"></i> {weatherData.sunrise}
      {:else}
        <i class="wi wi-sunset"></i> {weatherData.sunset}
      {/if}
    </span>
  </div>

  <div class="current-weather">
    <img src={weatherData.weatherIcon} alt="Weather Icon" class="weather-icon"/>
    <span class="temperature">{weatherData.temperature}°</span>
  </div>

  <div class="feels-like">
    {weatherData.description} - Feels like {weatherData.feelsLike}°
  </div>
{:else}
  <p>Loading weather...</p>
{/if}
</div>