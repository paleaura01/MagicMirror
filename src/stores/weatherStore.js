import { writable, derived } from 'svelte/store';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Store for sunrise and sunset times
export const sunriseSunsetStore = writable({
  sunrise: null,
  sunset: null,
  ready: false,
});

// Check if it's daytime based on sunrise and sunset times
export const isDaytimeStore = derived(sunriseSunsetStore, ($sunriseSunsetStore) => {
  const now = dayjs();
  const { sunrise, sunset, ready } = $sunriseSunsetStore;

  if (ready && sunrise && sunset) {
    return now.isAfter(sunrise) && now.isBefore(sunset);
  }
  return false;
});

// Weather data store
export const weatherDataStore = writable({
  forecast: [],
  lastUpdated: null,
});

// Add derived store to check if weather data is stale (older than 30 minutes)
export const isWeatherDataStale = derived(weatherDataStore, ($weatherDataStore) => {
  if (!$weatherDataStore.lastUpdated) return true;
  return dayjs().diff($weatherDataStore.lastUpdated, 'minute') >= 30;
});

/**
 * Update weather forecast data in the store.
 * @param {Array} forecast - The weather forecast array.
 */
export function updateWeatherData(forecast) {
  weatherDataStore.set({
    forecast,
    lastUpdated: dayjs(),
  });
  console.log('[updateWeatherData] Weather data updated at:', dayjs().format());
}

/**
 * Update sunrise and sunset times in the store.
 * @param {string} sunrise - Sunrise time in ISO format.
 * @param {string} sunset - Sunset time in ISO format.
 */
export function updateSunriseSunset(sunrise, sunset) {
  if (sunrise && sunset) {
    sunriseSunsetStore.set({
      sunrise: dayjs(sunrise),
      sunset: dayjs(sunset),
      ready: true,
    });
    // console.log('[updateSunriseSunset] Sunrise and sunset updated:', {sunrise: dayjs(sunrise).format(),sunset: dayjs(sunset).format(),});
  } else {
    sunriseSunsetStore.update((state) => ({
      ...state,
      ready: false,
    }));
    console.warn('[updateSunriseSunset] Missing sunrise or sunset time.');
  }
}

/**
 * Fetch weather data and update sunrise/sunset times.
 * @param {string} filePath - Path to the local meteoweatherData.json file.
 */
export async function fetchWeatherData(filePath) {
  try {
    const response = await fetch(filePath, { cache: 'no-cache' });
    const data = await response.json();

    if (!data) throw new Error('Weather data not found');

    const { sunrise, sunset } = data;

    // Update the sunrise and sunset store
    if (sunrise && sunset) {
      updateSunriseSunset(sunrise, sunset);
    } else {
      console.warn('[fetchWeatherData] Missing sunrise or sunset times.');
    }
  } catch (err) {
    console.error('[fetchWeatherData] Error fetching weather data:', err);
  }
}
