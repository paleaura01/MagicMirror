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
      sunriseSunsetStore,
      isDaytimeStore,
      updateSunriseSunset,
    } from '../../stores/weatherStore.js';
    import { get } from 'svelte/store';

    dayjs.extend(utc);
    dayjs.extend(timezone);

    let forecastData = [];
    let error = null;
    const basePath = '/src/modules/weatherforecast/weathericons';

    let moonPhaseData = null;
    let isDaytime = true; // Default value

    // List of conditions that only have the general icon
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
      'Violent Rain Showers'
    ];

    async function fetchForecastData() {
      try {
        const response = await fetch('/data/meteoweatherForecastData.json', {
          cache: 'no-cache',
        });
        const data = await response.json();

        if (!data.forecast) {
          throw new Error('Forecast data not available');
        }

        // Update moon phase data
        await updateMoonPhase();
        moonPhaseData = get(moonPhaseStore);

        // Update sunrise and sunset times from meteoweatherData.json
        await fetchSunriseSunset();

        // Get the isDaytime value
        isDaytime = get(isDaytimeStore);

        // Process forecast data
        forecastData = data.forecast.map((day) => {
          const date = dayjs(day.date);

          const icon = getWeatherIconPaths(
            day.weather_condition,
            isDaytime,
            moonPhaseData ? moonPhaseData.phase_name : null
          );

          return {
            day: date.format('ddd'), // Format date as day of the week
            icon,
            maxTemp: day.temperature_max.toFixed(1), // Show one decimal place for temperature
            minTemp: day.temperature_min.toFixed(1), // Show one decimal place for temperature
            windspeed: day.windspeed_max.toFixed(1), // Use one decimal place for wind speed
            precipitation: day.precipitation.toFixed(2), // Keep precipitation in millimeters with two decimal places
          };
        });
      } catch (err) {
        error = `Error loading forecast data: ${err.message}`;
        console.error('[WeatherForecastModule] Error:', err);
      }
    }

    async function fetchSunriseSunset() {
      try {
        const response = await fetch('/data/meteoweatherData.json', {
          cache: 'no-cache',
        });
        if (!response.ok) throw new Error('Failed to fetch meteoweather data');
        const data = await response.json();

        const { sunrise, sunset } = data;

        if (sunrise && sunset) {
          updateSunriseSunset(sunrise, sunset);
        } else {
          console.warn('[fetchSunriseSunset] Missing sunrise or sunset times.');
        }
      } catch (err) {
        console.error('[fetchSunriseSunset] Error fetching sunrise/sunset data:', err);
      }
    }

    function getWeatherIconPaths(condition, isDaytime, moonPhaseName) {
      if (!condition) {
        console.warn('No weather description provided.');
        return `${basePath}/Clear Skies/Clear Skies.mp4`; // Default fallback
      }

      const sanitizedCondition = condition.trim();
      const paths = [];

      if (generalIconOnlyConditions.includes(sanitizedCondition)) {
        // Only general icon exists for this condition
        paths.push(
          encodeURI(`${basePath}/${sanitizedCondition}/${sanitizedCondition}.mp4`)
        );
      } else {
        if (isDaytime) {
          paths.push(
            encodeURI(
              `${basePath}/${sanitizedCondition}/${sanitizedCondition} - Day.mp4`
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
              `${basePath}/${sanitizedCondition}/${sanitizedCondition} - Night.mp4`
            )
          );
        }
        paths.push(
          encodeURI(`${basePath}/${sanitizedCondition}/${sanitizedCondition}.mp4`)
        );
      }

      console.log('Generated icon paths:', paths);
      return paths.find(async (path) => {
        try {
          const response = await fetch(path, { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      }) || '';
    }

    onMount(() => {
      fetchForecastData();
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
              <div class="wind small-text">
                mph
              </div>
              <MeteoconsRaindropsFill />
              {dayForecast.precipitation}
              <div class="precipitation small-text">
                mm
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p>Loading forecast...</p>
  {/if}
</div>
