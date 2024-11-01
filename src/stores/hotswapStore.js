// ./src/stores/hotswapStore.js
import { writable } from 'svelte/store';

export const activeModule = writable(null);

export function swapModule(currentComponent, swapComponent, interval) {
  setTimeout(() => {
    activeModule.set(swapComponent);
    setTimeout(() => activeModule.set(currentComponent), interval);
  }, interval);
}
