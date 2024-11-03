// moduleLoader.js

import modulesConfig from './modulesConfig.json';
import { moduleMap } from './moduleMap';
import { modulesByRegionStore } from './stores/reloadStore.js';
import { swapVisibilityStore } from './stores/hotswapStore.js';
import { modulesToReload } from './stores/reloadStore.js';
import { sunriseSunsetStore } from './stores/weatherStore';

const moduleRegistry = new Map();

export async function loadModules() {
  const modulesByRegion = {};

  // Extract swap configurations
  const hotswapConfigEntry = modulesConfig.find(
    (config) => config.name === 'HotSwapModule'
  );
  const swapConfigs = hotswapConfigEntry ? hotswapConfigEntry.props.config : [];

  // Map to track swapping groups
  const swapModuleGroups = {};

  // Process swapping configurations
  for (const swapConfig of swapConfigs) {
    const { current, swap, currentRegion, swapRegion, currentPath, swapPath } = swapConfig;

    // Unique key for each swapping group
    const groupKey = `${currentRegion}-${current}`;

    if (!swapModuleGroups[groupKey]) {
      swapModuleGroups[groupKey] = {
        region: currentRegion,
        current,
        modules: [],
      };
    }

    // Add current module to the swapping group
    swapModuleGroups[groupKey].modules.push({
      name: current,
      path: currentPath,
      region: currentRegion,
    });

    // Only add the swap module if swapRegion is not 'hidden'
    if (swapRegion !== 'hidden') {
      swapModuleGroups[groupKey].modules.push({
        name: swap,
        path: swapPath,
        region: swapRegion,
      });
    }
  }

  const initialVisibility = {};

  // Map to keep track of module keys for reloading
  const moduleKeys = {};

  // Subscribe to modulesToReload to get module reload counts
  modulesToReload.subscribe((reloadCounts) => {
    for (const [moduleName, count] of Object.entries(reloadCounts)) {
      moduleKeys[moduleName] = count;
    }
  });

  // Process modulesConfig.json in order
  for (const config of modulesConfig) {
    if (config['Comment-Source']) continue;
    if (config.name === 'HotSwapModule' || config.name === 'ReloadModule') continue;

    const { name, path, region, props } = config;

    // Check if this module is part of a swapping group
    const swapGroupKey = Object.keys(swapModuleGroups).find(
      (key) => swapModuleGroups[key].current === name
    );

    if (swapGroupKey) {
      const swapGroup = swapModuleGroups[swapGroupKey];
      if (!modulesByRegion[swapGroup.region]) {
        modulesByRegion[swapGroup.region] = [];
      }

      // Avoid duplicating the group
      if (
        !modulesByRegion[swapGroup.region].some(
          (group) => group.isSwapGroup && group.names.includes(name)
        )
      ) {
        // Load swap modules into moduleRegistry if not already loaded
        const groupModules = await Promise.all(
          swapGroup.modules.map(async (mod) => {
            if (!moduleRegistry.has(mod.name)) {
              try {
                const moduleComponent = await moduleMap[mod.path]();

                moduleRegistry.set(mod.name, {
                  name: mod.name,
                  component: moduleComponent.default,
                  props: {}, // Empty props for now, will update if in modulesConfig
                  region: mod.region,
                  visible: true,
                });
              } catch (error) {
                console.error(`Error loading module ${mod.name} from ${mod.path}:`, error);
              }
            }
            return moduleRegistry.get(mod.name);
          })
        );

        // Update module props and region if specified in modulesConfig
        swapGroup.modules.forEach((mod) => {
          const matchingConfig = modulesConfig.find((cfg) => cfg.name === mod.name);
          if (matchingConfig && moduleRegistry.has(mod.name)) {
            const existingModule = moduleRegistry.get(mod.name);
            existingModule.props = matchingConfig.props || existingModule.props;
            existingModule.region = matchingConfig.region || existingModule.region;
          }
        });

        const groupNames = groupModules.map((mod) => mod.name);

        modulesByRegion[swapGroup.region].push({
          isSwapGroup: true,
          names: groupNames,
          modules: groupModules,
        });

        // Initialize visibility to show the current module
        initialVisibility[swapGroup.current] = swapGroup.current;
      }
      continue; // Skip adding this module individually
    }

    // Load or update the module in moduleRegistry
    if (!moduleRegistry.has(name)) {
      try {
        const moduleComponent = await moduleMap[path]();

        moduleRegistry.set(name, {
          name,
          component: moduleComponent.default,
          props: props || {},
          region,
          visible: true, // Default to visible
        });
      } catch (error) {
        console.error(`Error loading module ${name} from ${path}:`, error);
      }
    } else {
      // Update the module's props and region
      const existingModule = moduleRegistry.get(name);
      existingModule.props = props || existingModule.props;
      existingModule.region = region || existingModule.region;
    }

    // Add the module to modulesByRegion
    if (!modulesByRegion[region]) {
      modulesByRegion[region] = [];
    }

    modulesByRegion[region].push({
      ...moduleRegistry.get(name),
      key: moduleKeys[name] || 0, // Add the key for reloading
    });
  }

  // Set the initial visibility state
  swapVisibilityStore.set(initialVisibility);

  // Set the store value
  modulesByRegionStore.set(modulesByRegion);

  // Schedule module reloads
  const reloadConfigEntry = modulesConfig.find(
    (config) => config.name === 'ReloadModule'
  );
  const reloadConfigs = reloadConfigEntry ? reloadConfigEntry.props.modules : [];

  scheduleModuleReloads(reloadConfigs);
}

function scheduleModuleReloads(reloadConfigs) {
  let sunriseTime, sunsetTime;
  let sunriseTimeouts = {};
  let sunsetTimeouts = {};

  // Function to schedule a reload for a module
  function scheduleReload(time, moduleName) {
    const now = new Date();
    const delay = time - now;

    if (delay > 0) {
      return setTimeout(() => {
        modulesToReload.update((state) => ({
          ...state,
          [moduleName]: (state[moduleName] || 0) + 1,
        }));
        console.log(`[Reload] Reload triggered for ${moduleName} at ${new Date().toLocaleTimeString()}`);

        // Reschedule the reload for the next day
        scheduleNextReloads();
      }, delay);
    }
    return null;
  }

  // Function to schedule reloads based on sunrise and sunset times
  function scheduleNextReloads() {
    // Clear previous timeouts
    Object.values(sunriseTimeouts).forEach(clearTimeout);
    Object.values(sunsetTimeouts).forEach(clearTimeout);

    sunriseTimeouts = {};
    sunsetTimeouts = {};

    // Schedule reloads for each module at sunrise and sunset
    reloadConfigs.forEach(({ title, interval }) => {
      if (interval === 'sunriseSunsetStore') {
        if (sunriseTime) {
          sunriseTimeouts[title] = scheduleReload(sunriseTime, title);
        }
        if (sunsetTime) {
          sunsetTimeouts[title] = scheduleReload(sunsetTime, title);
        }
      }
      // Additional intervals can be handled here
    });
  }

  // Subscribe to sunrise and sunset times
  sunriseSunsetStore.subscribe(({ sunrise, sunset }) => {
    sunriseTime = new Date(sunrise);
    sunsetTime = new Date(sunset);

    scheduleNextReloads();
  });
}

export function getModuleByName(name) {
  return moduleRegistry.get(name);
}
