// src/stores/hotswapStore.js

import { writable } from 'svelte/store';

export const modulesByRegionStore = writable({});

export const swapVisibilityStore = writable({});

export function swapModules(config) {
  config.forEach(({ current, swap, swapRegion, interval }) => {
    const hideModule = swapRegion === 'hidden';

    const initialDelay = Math.floor(Math.random() * interval);

    setTimeout(() => {
      setInterval(() => {
        // Hide the current module or show the swap module
        swapVisibilityStore.update((state) => ({
          ...state,
          [current]: hideModule ? null : swap,
        }));

        console.log(
          `[hotswapStore] ${
            hideModule ? `Hid ${current}` : `Swapped: ${current} out, ${swap} in`
          }`
        );

        setTimeout(() => {
          // Show the current module again
          swapVisibilityStore.update((state) => ({
            ...state,
            [current]: current,
          }));

          console.log(
            `[hotswapStore] ${
              hideModule ? `Showed ${current}` : `Reverted: ${swap} out, ${current} in`
            }`
          );
        }, interval / 2);
      }, interval);
    }, initialDelay);
  });
}
