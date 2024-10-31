// ./src/stores/reloadStore.js

import { writable } from 'svelte/store';

export const modulesToReload = writable({
  WeatherForecastModule: 0,
  WeatherMapModule: 0,
  WeatherModule: 0,
});

// Add a subscription log to track updates
modulesToReload.subscribe((value) => {
  console.log("[reloadStore] Current reload state:", value);
});
