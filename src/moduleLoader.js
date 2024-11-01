import modulesConfig from './modulesConfig.json';

export async function loadModules() {
  const modulesByRegion = {};

  for (const config of modulesConfig) {
    if (config["Comment-Source"]) continue;

    const { name, path, region, props } = config;

    try {
      const moduleComponent = await import(`./${path}`);

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
