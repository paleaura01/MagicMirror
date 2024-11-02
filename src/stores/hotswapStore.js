// src/stores/hotswapStore.js

import { modulesByRegionStore } from './modulesByRegionStore';
import { getModuleByName } from '../moduleLoader';

export function swapModules(config) {
  config.forEach(({ current, swap, interval, currentRegion, swapRegion }) => {
    if (!swap) return; // No swap defined

    setInterval(() => {
      modulesByRegionStore.update((modulesByRegion) => {
        const currentModule = getModuleByName(current);
        const swapModule = getModuleByName(swap);

        if (!currentModule || !swapModule) {
          console.error(`Module not found: ${currentModule ? swap : current}`);
          return modulesByRegion;
        }

        // Initialize regions if undefined
        modulesByRegion[currentRegion] = modulesByRegion[currentRegion] || [];
        modulesByRegion[swapRegion] = modulesByRegion[swapRegion] || [];

        // Remove the current module from its region
        modulesByRegion[currentRegion] = modulesByRegion[currentRegion].filter(
          (module) => module.name !== current
        );

        // Add the swap module to its region with correct props
        if (!modulesByRegion[swapRegion].some((module) => module.name === swap)) {
          const newSwapModule = {
            name: swapModule.name,
            component: swapModule.component,
            props: swapModule.props || {}, // Ensure correct props
            region: swapRegion,
          };
          modulesByRegion[swapRegion].push(newSwapModule);
        }

        return { ...modulesByRegion };
      });

      console.log(`[hotswapStore] Swapped: ${current} out, ${swap} in`);

      setTimeout(() => {
        modulesByRegionStore.update((modulesByRegion) => {
          const currentModule = getModuleByName(current);
          const swapModule = getModuleByName(swap);

          if (!currentModule || !swapModule) {
            console.error(`Module not found: ${currentModule ? swap : current}`);
            return modulesByRegion;
          }

          // Initialize regions if undefined
          modulesByRegion[currentRegion] = modulesByRegion[currentRegion] || [];
          modulesByRegion[swapRegion] = modulesByRegion[swapRegion] || [];

          // Remove the swap module from its region
          modulesByRegion[swapRegion] = modulesByRegion[swapRegion].filter(
            (module) => module.name !== swap
          );

          // Add the current module back to its region with correct props
          if (!modulesByRegion[currentRegion].some((module) => module.name === current)) {
            const newCurrentModule = {
              name: currentModule.name,
              component: currentModule.component,
              props: currentModule.props || {}, // Ensure correct props
              region: currentRegion,
            };
            modulesByRegion[currentRegion].push(newCurrentModule);
          }

          return { ...modulesByRegion };
        });

        console.log(`[hotswapStore] Reverted: ${swap} out, ${current} in`);
      }, interval / 2);
    }, interval);
  });
}
