import modulesConfig from './modulesConfig.json';

export async function loadModules() {
  const modulesByRegion = {};

  // Dynamically import Svelte components based on their paths in the config
  for (const config of modulesConfig) {
    // Skip comments or invalid configurations
    if (config["Comment-Source"]) continue;

    const { name, path, region, props } = config;

    try {
      // Dynamic import based on path
      const moduleComponent = await import(`./${path}`);

      // Initialize the region array if not present
      if (!modulesByRegion[region]) {
        modulesByRegion[region] = [];
      }

      modulesByRegion[region].push({
        component: moduleComponent.default,  // Assign the dynamically imported component
        props: props || {}
      });
    } catch (error) {
      console.error(`Error loading module ${name} from ${path}:`, error);
    }
  }

  return modulesByRegion;
}
