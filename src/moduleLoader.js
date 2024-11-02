// moduleLoader.js

import modulesConfig from './modulesConfig.json';
import { moduleMap } from './moduleMap';
import { modulesByRegionStore } from './stores/modulesByRegionStore';

const moduleRegistry = new Map();

export async function loadModules() {
  const modulesByRegion = {};

  for (const config of modulesConfig) {
    if (config["Comment-Source"]) continue;

    const { name, path, region, props } = config;

    try {
      const moduleComponent = await moduleMap[path]();

      // Store the module in the registry
      moduleRegistry.set(name, {
        name,
        component: moduleComponent.default,
        props: props || {},
        region,
      });

      if (!modulesByRegion[region]) {
        modulesByRegion[region] = [];
      }

      modulesByRegion[region].push(moduleRegistry.get(name));
    } catch (error) {
      console.error(`Error loading module ${name} from ${path}:`, error);
    }
  }

  // Set the store value
  modulesByRegionStore.set(modulesByRegion);
}

export function getModuleByName(name) {
  return moduleRegistry.get(name);
}
