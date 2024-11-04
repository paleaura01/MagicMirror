// ./src/stores/hotswapStore.js

import { writable } from 'svelte/store';

export const swapVisibilityStore = writable({}); 

export function swapModules(config) {
  config.forEach(({ current, swap, swapRegion, interval }) => {
    const hideModule = swapRegion === 'hidden';

    const initialDelay = Math.floor(Math.random() * interval);

    setTimeout(() => {
      setInterval(() => {
        // console.log(`[hotswapStore] Swapping ${current} with ${swap}`);
        swapVisibilityStore.update((state) => {
          const newState = {
            ...state,
            [current]: hideModule ? null : swap,
          };
          // console.log("Visibility state updated:", newState);
          return newState;
        });

        setTimeout(() => {
          // console.log(`[hotswapStore] Reverting ${swap} to show ${current}`);
          swapVisibilityStore.update((state) => {
            const newState = {
              ...state,
              [current]: current,
            };
            // console.log("Reverting state:", newState);
            return newState;
          });
        }, interval / 2);
      }, interval);
    }, initialDelay);
  });
}
