// moduleLoader.js

import modulesConfig from './modulesConfig.json';
import { moduleMap } from './moduleMap';
import { modulesByRegionStore } from './stores/modulesByRegionStore';
import { swapVisibilityStore } from './stores/swapVisibilityStore';

const moduleRegistry = new Map();

export async function loadModules() {
  const modulesByRegion = {};

  // Extract swap configurations
  const hotswapConfigEntry = modulesConfig.find(
    (config) => config.name === 'HotSwapModule'
  );
  const swapConfigs = hotswapConfigEntry ? hotswapConfigEntry.props.config : [];

  // Map to track which modules are involved in swapping
  const swapModuleGroups = {};

  // Process swapping configurations
  for (const { current, swap, currentRegion, currentPath, swapPath } of swapConfigs) {
    if (!swapModuleGroups[current]) {
      swapModuleGroups[current] = {
        region: currentRegion,
        current: current, // Store the current module
        modules: new Set(),
      };
    }
    swapModuleGroups[current].modules.add(current);
    swapModuleGroups[current].modules.add(swap);

    // Load current and swap modules if not already loaded
    const modulesToLoad = [
      { name: current, path: currentPath, region: currentRegion },
      { name: swap, path: swapPath, region: currentRegion },
    ];

    for (const { name, path, region } of modulesToLoad) {
      if (!moduleRegistry.has(name)) {
        try {
          const moduleComponent = await moduleMap[path]();

          moduleRegistry.set(name, {
            name,
            component: moduleComponent.default,
            props: {}, // Empty props for now
            region,
            visible: true,
          });
        } catch (error) {
          console.error(`Error loading module ${name} from ${path}:`, error);
        }
      }
    }
  }

  const initialVisibility = {};

  // Process modulesConfig.json in order
  for (const config of modulesConfig) {
    if (config['Comment-Source']) continue;
    if (config.name === 'HotSwapModule') continue; // Skip HotSwapModule

    const { name, path, region, props } = config;

    // Check if this module is part of a swapping group
    if (swapModuleGroups[name]) {
      const swapGroup = swapModuleGroups[name];
      if (!modulesByRegion[region]) {
        modulesByRegion[region] = [];
      }
      // Avoid duplicating the group
      if (!modulesByRegion[region].some((group) => group.isSwapGroup && group.names.includes(name))) {
        // Ensure the current module is first in the group
        const groupNames = [
          swapGroup.current,
          ...Array.from(swapGroup.modules).filter((n) => n !== swapGroup.current),
        ];

        // Update module props and region if necessary
        groupNames.forEach((moduleName) => {
          if (moduleRegistry.has(moduleName)) {
            const existingModule = moduleRegistry.get(moduleName);
            if (moduleName === name) {
              existingModule.props = props || existingModule.props;
              existingModule.region = region || existingModule.region;
            }
          }
        });

        modulesByRegion[region].push({
          isSwapGroup: true,
          names: groupNames,
          modules: groupNames
            .map((moduleName) => moduleRegistry.get(moduleName))
            .filter(Boolean),
        });

        // Initialize visibility to show the current module
        initialVisibility[swapGroup.current] = swapGroup.current;
      }
      continue; // Skip adding this module individually
    }

    // Load the module if not already loaded
    if (!moduleRegistry.has(name)) {
      try {
        const moduleComponent = await moduleMap[path]();

        // Store the module in the registry
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

    modulesByRegion[region].push(moduleRegistry.get(name));
  }

  // Set the initial visibility state
  swapVisibilityStore.set(initialVisibility);

  // Set the store value
  modulesByRegionStore.set(modulesByRegion);
}

export function getModuleByName(name) {
  return moduleRegistry.get(name);
}
