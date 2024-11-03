// weatherStore.js

import { writable, derived } from 'svelte/store';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const sunriseSunsetStore = writable({
  sunrise: null,
  sunset: null,
  ready: false,  // Track if both times are set
});

export const isDaytimeStore = derived(sunriseSunsetStore, ($sunriseSunsetStore) => {
  const now = dayjs();
  const { sunrise, sunset, ready } = $sunriseSunsetStore;

  if (ready && sunrise && sunset) {
    return now.isAfter(sunrise) && now.isBefore(sunset);
  }
  return false; // Default to false if not ready or times are missing
});

// Function to update sunrise and sunset times
export function updateSunriseSunset(sunrise, sunset) {
  if (sunrise && sunset) {
    sunriseSunsetStore.set({
      sunrise: dayjs(sunrise),
      sunset: dayjs(sunset),
      ready: true,
    });
    console.log(`[updateSunriseSunset] Updated sunrise: ${dayjs(sunrise).format()} and sunset: ${dayjs(sunset).format()}`);
  } else {
    sunriseSunsetStore.update((state) => ({
      ...state,
      ready: false, // Mark as not ready if any value is missing
    }));
    console.warn("[updateSunriseSunset] Missing sunrise or sunset time; readiness flag set to false.");
  }
}

// Store to track module readiness
export const moduleReadyStore = writable({});

// Function to set module as ready
export function setModuleReady(moduleName) {
  moduleReadyStore.update(state => ({ ...state, [moduleName]: true }));
  console.log(`[setModuleReady] ${moduleName} is now marked as ready`);
}
