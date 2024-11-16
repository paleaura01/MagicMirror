// weatherStore.js

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

export const isDaytimeStore = derived(sunriseSunsetStore, ($sunriseSunsetStore) => {
  const now = dayjs();
  const { sunrise, sunset, ready } = $sunriseSunsetStore;

  if (ready && sunrise && sunset) {
    return now.isAfter(sunrise) && now.isBefore(sunset);
  }
  return false;
});

export const weatherDataStore = writable({
  forecast: [],
  lastUpdated: null,
});

// Add derived store to check if weather data is stale (older than 30 minutes)
export const isWeatherDataStale = derived(weatherDataStore, ($weatherDataStore) => {
  if (!$weatherDataStore.lastUpdated) return true;
  return dayjs().diff($weatherDataStore.lastUpdated, 'minute') >= 30;
});

export function updateWeatherData(forecast) {
  weatherDataStore.set({
    forecast,
    lastUpdated: dayjs(),
  });
  console.log('[updateWeatherData] Weather data updated at:', dayjs().format());
}

export function updateSunriseSunset(sunrise, sunset) {
  if (sunrise && sunset) {
    sunriseSunsetStore.set({
      sunrise: dayjs(sunrise),
      sunset: dayjs(sunset),
      ready: true,
    });
  } else {
    sunriseSunsetStore.update((state) => ({
      ...state,
      ready: false,
    }));
    console.warn("[updateSunriseSunset] Missing sunrise or sunset time.");
  }
}
