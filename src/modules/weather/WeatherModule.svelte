<!-- ./src/modules/weather/TrafficModule.svelte -->


<script>
  import { onMount, onDestroy } from 'svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';
  import './weather_styles.css';
  import { sunriseSunsetStore, isDaytimeStore, updateSunriseSunset, setModuleReady } from '../../stores/weatherStore.js';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  let weatherData = null;
  let error = null;
  const lat = 35.2080;
  const lon = -81.3673;
  const userTimezone = dayjs.tz.guess();
  let sunrise = null;
  let sunset = null;
  let previousIsDaytime = null;
  let isDaytime;
  let intervalId;

  const iconMap = {
    "0": { day: "/src/modules/weatherforecast/icons/32.png", night: "/src/modules/weatherforecast/icons/31.png" },
    "1": { day: "/src/modules/weatherforecast/icons/34.png", night: "/src/modules/weatherforecast/icons/33.png" },
    "2": { day: "/src/modules/weatherforecast/icons/30.png", night: "/src/modules/weatherforecast/icons/29.png" },
    "3": { day: "/src/modules/weatherforecast/icons/28.png", night: "/src/modules/weatherforecast/icons/27.png" },
    "45": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" },
    "48": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" },
    "51": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },
    "53": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },
    "55": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },
    "56": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },
    "57": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },
    "61": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" },
    "63": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
    "65": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
    "66": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" },
    "67": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" },
    "71": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" },
    "73": { day: "/src/modules/weatherforecast/icons/16.png", night: "/src/modules/weatherforecast/icons/16.png" },
    "75": { day: "/src/modules/weatherforecast/icons/41.png", night: "/src/modules/weatherforecast/icons/41.png" },
    "77": { day: "/src/modules/weatherforecast/icons/13.png", night: "/src/modules/weatherforecast/icons/13.png" },
    "80": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" },
    "81": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
    "82": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
    "85": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" },
    "86": { day: "/src/modules/weatherforecast/icons/42.png", night: "/src/modules/weatherforecast/icons/42.png" },
    "95": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },
    "96": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },
    "99": { day: "/src/modules/weatherforecast/icons/3.png", night: "/src/modules/weatherforecast/icons/3.png" },
    "default": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" }
  };

  isDaytimeStore.subscribe(value => {
    isDaytime = value;
    if (weatherData) {
      weatherData.weatherIcon = getWeatherIcon(weatherData.weatherCode);
    }
  });

  function getWeatherIcon(code) {
    return iconMap[code] ? (isDaytime ? iconMap[code].day : iconMap[code].night) : iconMap["default"][isDaytime ? "day" : "night"];
  }

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
      const humidity = `${data.hourly.relative_humidity_2m[0]}%`;

      if (data.daily.sunrise && data.daily.sunset) {
        sunrise = dayjs(data.daily.sunrise[0]).tz(userTimezone);
        sunset = dayjs(data.daily.sunset[0]).tz(userTimezone);
        updateSunriseSunset(sunrise, sunset);
      }

      const weatherCode = data.current_weather.weathercode.toString();
      weatherData = {
        temperature: tempFahrenheit.toFixed(1),
        windspeed: windspeedMph,
        humidity,
        sunrise: sunrise ? sunrise.format('HH:mm') : 'N/A',
        sunset: sunset ? sunset.format('HH:mm') : 'N/A',
        weatherIcon: getWeatherIcon(weatherCode),
        description: getWeatherDescription(weatherCode),
        weatherCode
      };
    } catch (err) {
      error = err.message;
      console.error("[WeatherModule] Error fetching weather data:", err);
    }
  }

  function getWeatherDescription(code) {
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
      "default": "Unknown Condition"
    };
    return descriptions[code] || descriptions["default"];
  }

  onMount(() => {
    fetchWeatherData(); // Initial fetch
    setModuleReady("WeatherModule");

    // Set up interval to fetch data every 10 minutes (600,000 milliseconds)
    intervalId = setInterval(fetchWeatherData, 600000);
  });

  onDestroy(() => {
    clearInterval(intervalId); // Clear the interval when the component is destroyed
  });
</script>

<div class="weather">
  {#if error}
    <p>{error}</p>
  {:else if weatherData}
    <div class="top-info">
      <div class="sunrise-sunset">
        <div class="sunrise">
          <i class="wi wi-sunrise"></i> {weatherData.sunrise}
        </div>
        <div class="sunset">
          <i class="wi wi-sunset"></i> {weatherData.sunset}
        </div>
      </div>
      <div class="wind-humidity">
        <div class="wind-info">
          <i class="wi wi-strong-wind"></i> {weatherData.windspeed} mph
        </div>
        <div class="humidity-info">
          <i class="wi wi-humidity"></i> {weatherData.humidity}
        </div>
      </div>
    </div>
    <div class="current-weather">
      <img src={weatherData.weatherIcon} alt="Weather Icon" class="weather-icon"/>
      <span class="temperature">{weatherData.temperature}°</span>
    </div>
    <div class="feels-like">
      {weatherData.description}
    </div>
  {:else}
    <p>Loading weather...</p>
  {/if}
</div>




