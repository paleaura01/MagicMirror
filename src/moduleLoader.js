import modulesConfig from './modulesConfig.json';

export async function loadModules() {
  const modulesByRegion = {};

  const modules = {
    ...import.meta.glob('./modules/**/*.js'),    // Include subdirectories for Svelte modules
    ...import.meta.glob('./jsmodules/**/*.js'),  // Include subdirectories for JS modules
  };

  for (const config of modulesConfig) {
    try {
      const modulePath = `./${config.path}`;
      const importer = modules[modulePath];
      if (!importer) {
        throw new Error(`Module ${config.name} not found at ${modulePath}`);
      }

      const mod = await importer();

      if (!modulesByRegion[config.region]) {
        modulesByRegion[config.region] = [];
      }

      const isJavaScriptModule = mod.default && typeof mod.default.render === 'function';

      // For both JS modules and Svelte components, props should be passed
      modulesByRegion[config.region].push({
        component: mod.default || mod,
        props: config.props || {}  // Pass the props to the module
      });

      console.log(`Adding module to region: ${config.region}`, mod.default || mod);

    } catch (error) {
      console.error(`Error loading module ${config.name}:`, error);
    }
  }

  return modulesByRegion;
}
