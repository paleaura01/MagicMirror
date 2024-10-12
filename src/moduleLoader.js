import modulesConfig from './modulesConfig.json';

export async function loadModules() {
  const modulesByRegion = {};

  const modules = {
    ...import.meta.glob('./modules/*.js'),     // For Svelte components
    ...import.meta.glob('./jsmodules/*.js'),   // For JavaScript modules
  };

  for (const config of modulesConfig) {
    try {
      const modulePath = `./${config.path}`;
      console.log(`Loading module from: ${modulePath}`);

      const importer = modules[modulePath];
      if (!importer) {
        throw new Error(`Module ${config.name} not found at ${modulePath}`);
      }

      const mod = await importer();

      if (!modulesByRegion[config.region]) {
        modulesByRegion[config.region] = [];
      }

      // Check if the module is a Svelte component or a JS module with a 'render' function
      const isJavaScriptModule = mod.default && typeof mod.default.render === 'function';

      if (isJavaScriptModule) {
        // For JavaScript modules, assign the entire module to 'component'
        modulesByRegion[config.region].push({
          component: mod.default,
          props: config.props || {},
        });
      } else {
        // For Svelte components, use 'default'
        modulesByRegion[config.region].push({
          component: mod.default || mod,
          props: config.props || {},
        });
      }

      console.log(`Adding module to region: ${config.region}`, mod.default || mod);

    } catch (error) {
      console.error(`Error loading module ${config.name}:`, error);
    }
  }

  return modulesByRegion;
}
