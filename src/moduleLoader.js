// moduleLoader.js

import modulesConfig from './modulesConfig.json';
import { moduleMap } from './moduleMap';

export async function loadModules() {
  const modulesByRegion = {};

  for (const config of modulesConfig) {
    if (config["Comment-Source"]) continue;

    const { name, path, region, props } = config;

    try {
      // Use the moduleMap for importing modules
      const moduleComponent = await moduleMap[path]();
      
      if (!modulesByRegion[region]) {
        modulesByRegion[region] = [];
      }

      modulesByRegion[region].push({
        component: moduleComponent.default,
        props: props || {}
      });
    } catch (error) {
      console.error(`Error loading module ${name} from ${path}:`, error);
    }
  }

  return modulesByRegion;
}
