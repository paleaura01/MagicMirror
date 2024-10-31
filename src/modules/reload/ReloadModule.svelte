<!-- ./src/modules/reload/ReloadModule.svelte -->
<script>
    import { onMount, onDestroy } from 'svelte';
    import { sunriseSunsetStore } from '../../stores/weatherStore';
    import { modulesToReload } from '../../stores/reloadStore';
    import { get } from 'svelte/store';
  
    export let modules = [];
  
    let timers = {};
  
    function scheduleReload(moduleConfig) {
      // Clear any existing timers for this module
      if (timers[moduleConfig.title]) {
        clearTimeout(timers[moduleConfig.title]);
        delete timers[moduleConfig.title];
      }
  
      if (moduleConfig.interval === 'sunriseSunsetStore') {
        // Get the current sunrise and sunset times
        const { sunrise, sunset } = get(sunriseSunsetStore);
  
        const now = new Date();
        const sunriseTime = new Date(sunrise);
        const sunsetTime = new Date(sunset);
  
        let nextEventTime;
  
        if (now < sunriseTime) {
          nextEventTime = sunriseTime;
        } else if (now < sunsetTime) {
          nextEventTime = sunsetTime;
        } else {
          // If both events have passed, schedule for the next day's sunrise
          nextEventTime = new Date(sunriseTime.getTime() + 24 * 60 * 60 * 1000);
        }
  
        const timeUntilNextEvent = nextEventTime - now;
  
        // Schedule the reload
        timers[moduleConfig.title] = setTimeout(() => {
          reloadModule(moduleConfig.title);
          // Reschedule for the next event after reloading
          scheduleReload(moduleConfig);
        }, timeUntilNextEvent);
  
        console.log(`Scheduled reload for ${moduleConfig.title} at ${nextEventTime.toLocaleTimeString()}`);
      } else {
        // For fixed intervals
        const interval = moduleConfig.interval;
        timers[moduleConfig.title] = setInterval(() => {
          reloadModule(moduleConfig.title);
        }, interval);
  
        console.log(`Scheduled reload for ${moduleConfig.title} every ${interval} ms`);
      }
    }
  
    function reloadModule(title) {
      modulesToReload.update(state => {
        state[title] = (state[title] || 0) + 1;
        return state;
      });
      console.log(`Reloaded module: ${title}`);
    }
  
    onMount(() => {
      modules.forEach(moduleConfig => {
        if (moduleConfig.interval !== 'sunriseSunsetStore') {
          scheduleReload(moduleConfig);
        }
      });
    });
  
    onDestroy(() => {
      // Clear all timers
      Object.values(timers).forEach(timer => {
        clearTimeout(timer);
      });
    });
  
    // Reschedule reloads when sunrise or sunset times change
    const unsubscribe = sunriseSunsetStore.subscribe(() => {
      modules.forEach(moduleConfig => {
        if (moduleConfig.interval === 'sunriseSunsetStore') {
          scheduleReload(moduleConfig);
        }
      });
    });
  </script>
  