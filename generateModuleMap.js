// ./generateModuleMap.js

// Run this to generate moduleMap.js automatically
import fs from 'fs';
import path from 'path';

const modulesConfig = JSON.parse(fs.readFileSync('./src/modulesConfig.json', 'utf-8'));
const moduleEntries = modulesConfig
  .filter(config => config.path && config.name !== 'HotSwapModule') // Exclude HotSwapModule
  .map(({ path }) => `"${path}": () => import("${path}.svelte")`);

const moduleMapContent = `
  // ./src/modulemap.js
  export const moduleMap = {
    ${moduleEntries.join(',\n    ')}
  };
`;

fs.writeFileSync('./src/moduleMap.js', moduleMapContent);
console.log("moduleMap.js generated successfully!");