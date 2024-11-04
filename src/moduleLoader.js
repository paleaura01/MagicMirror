// moduleLoader.js

import modulesConfig from './modulesConfig.json';
import { moduleMap } from './moduleMap';
import { modulesByRegionStore } from './stores/reloadStore.js';
import { swapVisibilityStore } from './stores/hotswapStore.js';
import { modulesToReload } from './stores/reloadStore.js';
import { sunriseSunsetStore } from './stores/weatherStore';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

const moduleRegistry = new Map();
let reloadScheduled = false;
let sunriseTimeouts = {};
let sunsetTimeouts = {};
let unsubscribeSunriseSunset;  // Track subscription

const userTimezone = dayjs.tz.guess();

function clearTimeouts() {
  Object.values(sunriseTimeouts).forEach(clearTimeout);
  Object.values(sunsetTimeouts).forEach(clearTimeout);
  sunriseTimeouts = {};
  sunsetTimeouts = {};
}

export async function loadModules() {
  const modulesByRegion = {};

  // Extract swap configurations
  const hotswapConfigEntry = modulesConfig.find(
    (config) => config.name === 'HotSwapModule'
  );
  const swapConfigs = hotswapConfigEntry ? hotswapConfigEntry.props.config : [];

  // Process swapping configurations
  const swapModuleGroups = swapConfigs.reduce((acc, swapConfig) => {
    const groupKey = `${swapConfig.currentRegion}-${swapConfig.current}`;
    acc[groupKey] = acc[groupKey] || { region: swapConfig.currentRegion, current: swapConfig.current, modules: [] };
    acc[groupKey].modules.push({
      name: swapConfig.current,
      path: swapConfig.currentPath,
      region: swapConfig.currentRegion,
    });
    if (swapConfig.swapRegion !== 'hidden') {
      acc[groupKey].modules.push({
        name: swapConfig.swap,
        path: swapConfig.swapPath,
        region: swapConfig.swapRegion,
      });
    }
    return acc;
  }, {});

  const initialVisibility = {};
  const moduleKeys = {};

  modulesToReload.subscribe((reloadCounts) => {
    Object.entries(reloadCounts).forEach(([moduleName, count]) => {
      moduleKeys[moduleName] = count;
    });
  });

  for (const config of modulesConfig) {
    if (config['Comment-Source'] || ['HotSwapModule', 'ReloadModule'].includes(config.name)) continue;

    const { name, path, region, props } = config;
    const swapGroupKey = Object.keys(swapModuleGroups).find((key) => swapModuleGroups[key].current === name);

    if (swapGroupKey) {
      const swapGroup = swapModuleGroups[swapGroupKey];
      if (!modulesByRegion[swapGroup.region]) modulesByRegion[swapGroup.region] = [];
      
      if (!modulesByRegion[swapGroup.region].some((group) => group.isSwapGroup && group.names.includes(name))) {
        const groupModules = await Promise.all(swapGroup.modules.map(async (mod) => {
          if (!moduleRegistry.has(mod.name)) {
            try {
              const moduleComponent = await moduleMap[mod.path]();
              moduleRegistry.set(mod.name, { name: mod.name, component: moduleComponent.default, props: {}, region: mod.region, visible: true });
            } catch (error) {
              console.error(`Error loading module ${mod.name} from ${mod.path}:`, error);
            }
          }
          return moduleRegistry.get(mod.name);
        }));

        const groupNames = groupModules.map((mod) => mod.name);
        modulesByRegion[swapGroup.region].push({ isSwapGroup: true, names: groupNames, modules: groupModules });
        initialVisibility[swapGroup.current] = swapGroup.current;
      }
      continue;
    }

    if (!moduleRegistry.has(name)) {
      try {
        const moduleComponent = await moduleMap[path]();
        moduleRegistry.set(name, { name, component: moduleComponent.default, props: props || {}, region, visible: true });
      } catch (error) {
        console.error(`Error loading module ${name} from ${path}:`, error);
      }
    }

    if (!modulesByRegion[region]) modulesByRegion[region] = [];
    modulesByRegion[region].push({ ...moduleRegistry.get(name), key: moduleKeys[name] || 0 });
  }

  swapVisibilityStore.set(initialVisibility);
  modulesByRegionStore.set(modulesByRegion);

  const reloadConfigEntry = modulesConfig.find((config) => config.name === 'ReloadModule');
  const reloadConfigs = reloadConfigEntry ? reloadConfigEntry.props.modules : [];
  scheduleModuleReloads(reloadConfigs);
}

function scheduleModuleReloads(reloadConfigs) {
  if (unsubscribeSunriseSunset) unsubscribeSunriseSunset();

  unsubscribeSunriseSunset = sunriseSunsetStore.subscribe(({ sunrise, sunset, ready }) => {
    if (!ready) {
       console.log("[moduleLoader] Waiting for both sunrise and sunset times to initialize.");
      return;
    }

    // Proceed with scheduling reloads after confirming sunrise and sunset are set
    const sunriseTime = sunrise ? dayjs(sunrise).tz(userTimezone) : null;
    const sunsetTime = sunset ? dayjs(sunset).tz(userTimezone) : null;

     console.log(`[moduleLoader] Scheduling reload with Sunrise: ${sunriseTime.format()}, Sunset: ${sunsetTime.format()}`);

    clearTimeouts();
    scheduleNextReloads(reloadConfigs, sunriseTime, sunsetTime);
  });
}

function scheduleNextReloads(reloadConfigs, sunriseTime, sunsetTime) {
  if (reloadScheduled) return;
   console.log("[ScheduleReload] Scheduling reloads based on sunrise and sunset times");

  reloadScheduled = true;

  reloadConfigs.forEach(({ title, interval }) => {
    if (interval === 'sunriseSunsetStore') {
      if (sunriseTime) sunriseTimeouts[title] = scheduleReload(sunriseTime, title, 'sunrise');
      if (sunsetTime) sunsetTimeouts[title] = scheduleReload(sunsetTime, title, 'sunset');
    }
  });
}

function scheduleReload(time, moduleName, eventType) {
  const now = dayjs().tz(userTimezone);
  let delay = time.diff(now);

  if (delay < 0) delay += 24 * 60 * 60 * 1000;
   console.log(`[ScheduleReload] Scheduling reload for ${moduleName} at ${time.format()} (in ${delay} ms) for ${eventType}`);

  return setTimeout(() => {
    modulesToReload.update((state) => ({ ...state, [moduleName]: (state[moduleName] || 0) + 1 }));
    console.log(`[Reload] Reload triggered for ${moduleName} at ${dayjs().tz(userTimezone).format()}`);
    reloadScheduled = false;
  }, delay);
}

export function getModuleByName(name) {
  return moduleRegistry.get(name);
}
