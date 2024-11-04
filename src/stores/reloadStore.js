// ./src/stores/reloadStore.js

import { writable } from 'svelte/store';

export const modulesByRegionStore = writable({});

export const modulesToReload = writable({});

// Add a subscription log to track updates
modulesToReload.subscribe((value) => {
  console.log("[reloadStore] Current reload state:", value);
});