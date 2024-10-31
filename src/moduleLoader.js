// ./src/moduleLoader.js

import modulesConfig from './modulesConfig.json';

export async function loadModules() {
  const modulesByRegion = {};

  const modules = {
    ...import.meta.glob('./modules/**/*.js'),
    ...import.meta.glob('./jsmodules/**/*.js'),
  };

  for (const config of modulesConfig) {
    // Skip comments
    if (config["Comment-Source"]) continue;

    try {
      const modulePath = `./${config.path}`;
      const importer = modules[modulePath];
      if (!importer) {
        throw new Error(`Module ${config.name} not found at ${modulePath}`);
      }

      const mod = await importer();

      const region = config.region || 'default'; // Assign a default region if none is specified
      if (!modulesByRegion[region]) {
        modulesByRegion[region] = [];
      }

      modulesByRegion[region].push({
        component: mod.default,
        props: config.props || {}
      });

    } catch (error) {
      console.error(`Error loading module ${config.name}:`, error);
    }
  }

  return modulesByRegion;
}
