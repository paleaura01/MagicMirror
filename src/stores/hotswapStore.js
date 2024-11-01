// ./src/stores/hotswapStore.js

import { writable } from 'svelte/store';

export const activeModule = writable(null);
export const hiddenModules = writable(new Map());

export function getComponentName(component) {
  const name = component?.name || component?.toString() || "UnknownComponent";
  return name.replace(/^Proxy</, "").replace(/>$/, "");
}

function getCurrentTimestamp() {
  return new Date().toLocaleTimeString();
}

// Swap and manage visibility without affecting regions
export function swapModule(currentComponent, swapComponent, interval, onSwap) {
  const currentName = getComponentName(currentComponent);
  const swapName = getComponentName(swapComponent);

  function swapLoop() {
    console.log(`[${getCurrentTimestamp()}] [hotswapStore] Swapping ${currentName} to hidden and showing ${swapName}`);

    // Hide current module and show swap module
    hiddenModules.update((map) => {
      map.set(currentName, false);  // Hide current module
      map.set(swapName, true);      // Show swap module
      return map;
    });

    activeModule.set(swapComponent);
    if (onSwap) onSwap();

    setTimeout(() => {
      console.log(`[${getCurrentTimestamp()}] [hotswapStore] Reverting ${swapName} to hidden and restoring ${currentName}`);

      // Swap back and restore original component
      activeModule.set(currentComponent);
      hiddenModules.update((map) => {
        map.set(swapName, false);   // Hide swap module
        map.set(currentName, true); // Show original module
        return map;
      });

      if (onSwap) onSwap();

      setTimeout(swapLoop, interval); // Repeat loop
    }, interval);
  }

  swapLoop(); // Start loop
}
