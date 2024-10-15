// ./src/moduleLoader.js

import modulesConfig from './modulesConfig.json';

export async function loadModules() {
  const modulesByRegion = {};

  // Glob imports for JavaScript files, which either export Svelte components or pure JS modules
  const modules = {
    ...import.meta.glob('./modules/**/*.js'),    // Includes subdirectories for both Svelte-exporting JS modules
    ...import.meta.glob('./jsmodules/**/*.js'),  // Includes subdirectories for pure JavaScript modules
  };

  for (const config of modulesConfig) {
    try {
      const modulePath = `./${config.path}`;
      const importer = modules[modulePath];
      if (!importer) {
        throw new Error(`Module ${config.name} not found at ${modulePath}`);
      }

      // Import the module, which might be a JS file exporting a Svelte component
      const mod = await importer();

      // Initialize the region if it doesn't exist
      if (!modulesByRegion[config.region]) {
        modulesByRegion[config.region] = [];
      }

      // Check if it's a pure JavaScript module with render() or a Svelte component exported via JS
      const isJavaScriptModule = mod.default && typeof mod.default.render === 'function';
      
      // For Svelte components, the JS file will export the Svelte component as `default`
      modulesByRegion[config.region].push({
        component: mod.default,  // Always use 'default' since JS exports the Svelte component or renderable module
        props: config.props || {} // Pass the props to the module
      });

      // Debug: Log the module being added to the region
      // console.log(`Adding module to region: ${config.region}`, mod.default);

    } catch (error) {
      console.error(`Error loading module ${config.name}:`, error);
    }
  }

  // Debug: Log the final structure of modulesByRegion
  // console.log("Final modulesByRegion:", modulesByRegion);

  return modulesByRegion;
}
