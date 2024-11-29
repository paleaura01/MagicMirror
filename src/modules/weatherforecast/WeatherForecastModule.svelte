<!-- ./src/modules/weather/WeatherModule.svelte -->

<script>
  import { onMount } from 'svelte';
  import './weatherforecast_styles.css';
  import MeteoconsWindFill from './icons/MeteoconsWindFill.svelte';
  import MeteoconsRaindropsFill from './icons/MeteoconsRaindropsFill.svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';
  import { moonPhaseStore, updateMoonPhase } from '../../stores/moonphaseStore.js';
  import {
    isDaytimeStore,
    sunriseSunsetStore,
    updateSunriseSunset,
  } from '../../stores/weatherStore.js';

  export let lat;
  export let lon;

  dayjs.extend(utc);
  dayjs.extend(timezone);

  let rawForecastData = [];
  let error = null;
  const basePath = '/src/modules/weatherforecast/weathericons';

  const generalIconOnlyConditions = [
    'Fog',
    'Depositing Rime Fog',
    'Heavy Freezing Rain',
    'Heavy Rain',
    'Heavy Snow Fall',
    'Heavy Snow Showers',
    'Light Freezing Rain',
    'Moderate Rain',
    'Moderate Rain Showers',
    'Moderate Snow Fall',
    'Overcast',
    'Slight Rain',
    'Slight Rain Showers',
    'Slight Snow Fall',
    'Slight Snow Showers',
    'Snow Grains',
    'Thunderstorm',
    'Thunderstorm With Heavy Hail',
    'Thunderstorm With Slight Hail',
    'Violent Rain Showers',
  ];

  const videoCache = new Map();

  $: forecastData = rawForecastData.map((day) => ({
    ...day,
    icon: getWeatherIconPaths(
      day.weather_condition,
      $isDaytimeStore,
      $moonPhaseStore?.phase_name || null
    ),
  }));

  async function fetchForecastData(latitude, longitude) {
    try {
      const url = `/data/meteoweatherForecastData.json?lat=${latitude}&lon=${longitude}`;
      const response = await fetch(url, { cache: 'no-cache' });
      const data = await response.json();

      if (!data.dailyForecast) {
        throw new Error('Forecast data not available');
      }

      rawForecastData = data.dailyForecast.map((day) => ({
        day: dayjs(day.date).format('ddd'),
        weather_condition: day.weather_condition,
        maxTemp: ((day.temperature_max * 9) / 5 + 32).toFixed(1),
        minTemp: ((day.temperature_min * 9) / 5 + 32).toFixed(1),
        windspeed: day.windspeed_max.toFixed(1),
        precipitation: day.precipitation.toFixed(2),
      }));
    } catch (err) {
      error = `Error loading forecast data: ${err.message}`;
      console.error('[WeatherForecastModule] Error:', err);
    }
  }

  function getWeatherIconPaths(condition, isDaytime, moonPhaseName) {
    if (!condition) {
      console.warn('No weather description provided.');
      return `${basePath}/Clear Skies/Clear Skies.mp4`;
    }

    const sanitizedCondition = condition.trim();
    const paths = [];

    if (generalIconOnlyConditions.includes(sanitizedCondition)) {
      paths.push(
        encodeURI(`${basePath}/${sanitizedCondition}/${sanitizedCondition}.mp4`)
      );
    } else {
      if (isDaytime) {
        paths.push(
          encodeURI(
            `${basePath}/${sanitizedCondition}/${sanitizedCondition}.mp4`
          )
        );
      } else {
        if (moonPhaseName) {
          const phaseName = moonPhaseName.replace(/\s+/g, ' ');
          paths.push(
            encodeURI(
              `${basePath}/${sanitizedCondition}/${sanitizedCondition} - Night - ${phaseName}.mp4`
            )
          );
        }
        paths.push(
          encodeURI(
            `${basePath}/${sanitizedCondition}/${sanitizedCondition}.mp4`
          )
        );
      }
      paths.push(
        encodeURI(`${basePath}/${sanitizedCondition}/${sanitizedCondition}.mp4`)
      );
    }

    return paths[0];
  }

  async function preloadVideos(paths) {
    for (const path of paths) {
      if (!videoCache.has(path)) {
        const video = document.createElement('video');
        video.src = path;
        video.preload = 'auto';

        videoCache.set(path, video);

        // Attempt to load the video to cache it
        try {
          await video.load();
        } catch (e) {
          console.error('Error preloading video:', path, e);
        }
      }
    }
  }

  onMount(() => {
    fetchForecastData(lat, lon);

    // Preload all weather icons for current forecast
    const allVideoPaths = rawForecastData.flatMap((day) =>
      getWeatherIconPaths(
        day.weather_condition,
        $isDaytimeStore,
        $moonPhaseStore?.phase_name || null
      )
    );
    preloadVideos(allVideoPaths);
  });
</script>

<div class="weather-forecast">
  {#if error}
    <p>{error}</p>
  {:else if forecastData.length > 0}
    <div class="forecast-wrapper">
      <div class="forecast-header">
        <h2>7-Day Forecast</h2>
      </div>
      <div class="forecast-container">
        {#each forecastData as dayForecast}
          <div class="forecast-day">
            <div class="forecast-day-name">{dayForecast.day}</div>
            <div class="icon-container">
              <video
                src={dayForecast.icon}
                autoplay
                muted
                loop
                class="forecast-icon"
                playsinline
                type="video/mp4"
              ></video>
            </div>
            <div class="forecast-temp">
              <div class="max-temp">{dayForecast.maxTemp}°F</div>
              <div class="min-temp">{dayForecast.minTemp}°F</div>
            </div>
            <div class="forecast-details">
              <MeteoconsWindFill />
              {dayForecast.windspeed}
              <div class="wind small-text">mph</div>
              <MeteoconsRaindropsFill />
              {dayForecast.precipitation}
              <div class="precipitation small-text">mm</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p>Loading forecast...</p>
  {/if}
</div>
