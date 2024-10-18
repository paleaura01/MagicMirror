// src/stores/weatherStore.js
import { writable } from 'svelte/store';

export const sunriseSunsetStore = writable({
  sunrise: null,
  sunset: null
});
