import modulesConfig from './modulesConfig.json';

export async function loadModules() {
  const modulesByRegion = {};
  const modules = import.meta.glob('./modules/*.js');
  
  for (const config of modulesConfig) {
    try {
      const modulePath = `./${config.path}`;
      console.log(`Loading module from: ${modulePath}`); // Log the path
      const importer = modules[modulePath];
      if (!importer) {
        throw new Error(`Module ${config.name} not found at ${modulePath}`);
      }
      const module = await importer();
      if (!modulesByRegion[config.region]) {
        modulesByRegion[config.region] = [];
      }
      modulesByRegion[config.region].push({
        component: module.default,
        props: config.props,
      });
    } catch (error) {
      console.error(`Error loading module ${config.name}:`, error);
    }
  }

  return modulesByRegion;
}
