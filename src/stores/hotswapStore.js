// hotswapStore.js

import { writable } from 'svelte/store';

export const activeModule = writable(null);
export const hiddenModules = writable(new Map());

export function getComponentName(component) {
  const name = component?.name || component?.toString() || "UnknownComponent";
  return name.replace(/^Proxy</, "").replace(/>$/, "");
}

// Continuous swap loop with recursive setTimeout
export function swapModule(currentComponent, swapComponent, interval) {
  const currentName = getComponentName(currentComponent);
  const swapName = getComponentName(swapComponent);

  function swapLoop() {
    console.log(`[hotswapStore] Swapping ${currentName} with ${swapName}`);
    activeModule.set(swapComponent);
    setTimeout(() => {
      activeModule.set(currentComponent);
      setTimeout(swapLoop, interval);
    }, interval);
  }

  // Initiate the swap loop
  swapLoop();
}

// Updated hide module function to toggle visibility explicitly
export function hideModule(component, interval) {
  const componentName = getComponentName(component);

  console.log(`[hotswapStore] Hiding ${componentName} for ${interval}ms`);

  hiddenModules.update((map) => map.set(componentName, false));
  setTimeout(() => {
    hiddenModules.update((map) => map.set(componentName, true));
  }, interval);
}
