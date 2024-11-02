// src/stores/hotswapStore.js

import { swapVisibilityStore } from './swapVisibilityStore';

export function swapModules(config) {
  config.forEach(({ current, swap, interval }) => {
    if (!swap) return; // No swap defined

    const initialDelay = Math.floor(Math.random() * interval);

    setTimeout(() => {
      setInterval(() => {
        // Show the swap module
        swapVisibilityStore.update(state => ({
          ...state,
          [current]: swap
        }));

        console.log(`[hotswapStore] Swapped: ${current} out, ${swap} in`);

        setTimeout(() => {
          // Show the current module again
          swapVisibilityStore.update(state => ({
            ...state,
            [current]: current
          }));

          console.log(`[hotswapStore] Reverted: ${swap} out, ${current} in`);
        }, interval / 2);
      }, interval);
    }, initialDelay);
  });
}
