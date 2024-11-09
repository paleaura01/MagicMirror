// ./src/stores/reloadStore.js

import { writable } from 'svelte/store';

export const modulesByRegionStore = writable({});
export const modulesToReload = writable({});

// Add a debounce mechanism to avoid frequent reloads
let debounceTimeout;

modulesToReload.subscribe((value) => {
  if (debounceTimeout) clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    // console.log("[reloadStore] Current reload state:", value);
  }, 300); // Adjust the debounce time as needed
});