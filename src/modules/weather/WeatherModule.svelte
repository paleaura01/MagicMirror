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
  import {
    sunriseSunsetStore,
    isDaytimeStore,
    updateSunriseSunset,
  } from '../../stores/weatherStore.js';
  import { moonPhaseStore, updateMoonPhase } from '../../stores/moonphaseStore.js';
  import { get } from 'svelte/store';
  import './weather_styles.css';

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

  const basePath = '/src/modules/weather/weathericons';
  let iconPaths = [];
  let iconIndex = 0;
  let currentVideoSrc = '';
  let videoElement;

  let moonPhaseData = null;
  let previousWeatherDescription = null;

  moonPhaseStore.subscribe((value) => {
    moonPhaseData = value;
    if (!get(isDaytimeStore) && weatherData) {
      updateVideoSrc();
    }
  });

  function getWeatherIconPaths(description, isDaytime) {
    if (!description) {
        console.warn('No weather description provided.');
        return [];
    }

    const sanitizedDescription = description.trim();

    // List of conditions that only have the general icon
    const generalIconOnlyConditions = [
        'Fog', 'Depositing Rime Fog', 'Heavy Freezing Rain', 'Heavy Rain',
        'Heavy Snow Fall', 'Heavy Snow Showers', 'Light Freezing Rain',
        'Moderate Rain', 'Moderate Rain Showers', 'Moderate Snow Fall',
        'Overcast', 'Slight Rain', 'Slight Rain Showers', 'Slight Snow Fall',
        'Slight Snow Showers', 'Snow Grains', 'Thunderstorm',
        'Thunderstorm With Heavy Hail', 'Thunderstorm With Slight Hail',
        'Violent Rain Showers'
    ];

    const paths = [];

    if (generalIconOnlyConditions.includes(sanitizedDescription)) {
        // Only general icon exists for this condition
        paths.push(
            encodeURI(`${basePath}/${sanitizedDescription}/${sanitizedDescription}.mp4`)
        );
    } else {
        if (isDaytime) {
            paths.push(
                encodeURI(
                    `${basePath}/${sanitizedDescription}/${sanitizedDescription} - Day.mp4`
                )
            );
        } else {
            // Handle night-time with moon phase data
            if (moonPhaseData?.phase_name) {
                const phaseName = moonPhaseData.phase_name.replace(/\s+/g, ' ');
                paths.push(
                    encodeURI(
                        `${basePath}/${sanitizedDescription}/${sanitizedDescription} - Night - ${phaseName}.mp4`
                    )
                );
            }
            paths.push(
                encodeURI(
                    `${basePath}/${sanitizedDescription}/${sanitizedDescription} - Night.mp4`
                )
            );
        }
        // Add the general icon as a fallback
        paths.push(
            encodeURI(`${basePath}/${sanitizedDescription}/${sanitizedDescription}.mp4`)
        );
    }

    console.log('Generated icon paths:', paths);
    return paths;
}


const refreshData = async () => {
    try {
        await updateMoonPhase();
        await fetchWeatherData();
        await fetchPollenAQIData();
    } catch (err) {
        console.error('Error refreshing data:', err);
    }
};

function updateVideoSrc(forceUpdate = false) {
    if (!weatherData || !weatherData.weatherDescription) {
        console.warn('Weather data is not available.');
        return;
    }

    if (!forceUpdate && weatherData.weatherDescription === previousWeatherDescription) {
        console.log('Weather description has not changed. Skipping icon update.');
        return;
    }

    previousWeatherDescription = weatherData.weatherDescription;

    iconPaths = getWeatherIconPaths(
        weatherData.weatherDescription,
        get(isDaytimeStore)
    );
    console.log('Moon phase data:', moonPhaseData);
    console.log('Computed icon paths:', iconPaths);

    iconIndex = 0;
    currentVideoSrc = iconPaths[iconIndex];
    console.log(`Video source set to: ${currentVideoSrc}`);
    if (videoElement) {
        videoElement.load();
    }
}



  function handleVideoError() {
    console.warn(`Video failed to load: ${currentVideoSrc}`);
    iconIndex++;
    if (iconIndex < iconPaths.length) {
      currentVideoSrc = iconPaths[iconIndex];
      console.log(`Falling back to next icon: ${currentVideoSrc}`);
      if (videoElement) {
        videoElement.load();
      }
    } else {
      console.error('No icons available for the current weather condition.');
      currentVideoSrc = '';
    }
  }

  const fetchWeatherData = async () => {
    try {
      const response = await fetch('/data/meteoweatherData.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Failed to fetch weather');
      const data = await response.json();
      weatherData = {
        temperature: ((data.temperature * 9) / 5 + 32).toFixed(1),
        feelsLike: ((data.feelsLike * 9) / 5 + 32).toFixed(1),
        humidity: data.humidity,
        windSpeed: (data.windSpeed * 0.621371).toFixed(1),
        windDirection: data.windDirection,
        weatherDescription: data.weatherDescription,
        isHurricane: data.windSpeed >= 119,
      };
      updateSunriseSunset(data.sunrise, data.sunset);
      updateVideoSrc();
    } catch (err) {
      error = `Weather error: ${err.message}`;
    }
  };

  const fetchPollenAQIData = async () => {
    try {
      const response = await fetch('/data/accuweatherData.json', {
        cache: 'no-cache',
      });
      if (!response.ok) throw new Error('Failed to fetch pollen and AQI');
      const data = await response.json();
      airQualityData = data.airQuality || { value: 'N/A', category: 'Unknown' };
      pollenData =
        data.pollenData?.map((item) => ({
          name: item.Name,
          category: item.Category || 'Unknown',
          icon: pollenIcons[item.Name],
        })) || [];

      if (pollenData.length > 0) {
        displayedPollen = pollenData[0];
      }
    } catch (err) {
      error = `Pollen/AQI error: ${err.message}`;
    }
  };

  onMount(() => {
    refreshData();
    intervalId = setInterval(refreshData, 30000);

    pollenIntervalId = setInterval(() => {
      if (pollenData.length > 0) {
        currentPollenIndex = (currentPollenIndex + 1) % pollenData.length;
        displayedPollen = pollenData[currentPollenIndex];
      }
    }, 10000);

    isDaytimeStore.subscribe(() => {
      if (weatherData) {
        updateVideoSrc();
      }
    });
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
            <div>
              {displayedPollen.name}: {displayedPollen.category}
            </div>
          {/if}
        </div>

        <div class="air-quality">
          <MeteoconsWindOnshore class="symbol" />
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
                <Fa6SolidArrowUp
                  style="transform: rotate({weatherData.windDirection.degrees}deg);"
                />
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
          <span class="text">
            Sunrise:
            {#if get(sunriseSunsetStore).sunrise}
              {get(sunriseSunsetStore).sunrise.format('h:mm A')}
            {:else}
              N/A
            {/if}
          </span>
        </div>
        <div class="sunset">
          <MeteoconsMoonsetFill class="symbol" />
          <span class="text">
            Sunset:
            {#if get(sunriseSunsetStore).sunset}
              {get(sunriseSunsetStore).sunset.format('h:mm A')}
            {:else}
              N/A
            {/if}
          </span>
        </div>
      </div>
    </div>

    <div class="current-weather">
      {#if weatherData.weatherDescription && currentVideoSrc}
        <video
          src={currentVideoSrc}
          autoplay
          loop
          muted
          class="weather-icon"
          onerror={handleVideoError}
          bind:this={videoElement}
        ></video>
      {:else}
        <!-- Optionally, display a placeholder or message -->
        <div class="no-icon">No weather icon available.</div>
      {/if}
      <div class="temperature">{weatherData.temperature}°F</div>
      <div class="feels-like">Feels Like: {weatherData.feelsLike}°F</div>
      <div class="description">{weatherData.weatherDescription}</div>
    </div>
  {:else}
    <p>Loading weather...</p>
  {/if}
</div>
