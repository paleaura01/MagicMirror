<!-- ./src/modules/reload/ReloadModule.svelte -->

<script>
    import { onDestroy } from 'svelte';
    import { modulesToReload } from '../../stores/reloadStore';
    import { sunriseSunsetStore } from '../../stores/weatherStore';
  
    export let modules = [];
  
    let sunriseTime, sunsetTime;
    let sunriseTimeout, sunsetTimeout;
  
    // Debugging: Log received modules
    console.log("[ReloadModule] Received modules:", modules);
  
    function scheduleReload(time, title = "Module") {
      const now = new Date();
      const delay = time - now;
  
      if (delay > 0) {
        console.log(`[ReloadModule] Setting reload for ${title} at ${time.toLocaleTimeString()}`);
        return setTimeout(() => {
          modulesToReload.update(state => ({
            ...state,
            [title]: (state[title] || 0) + 1
          }));
          console.log(`[ReloadModule] Reload triggered for ${title} at ${new Date().toLocaleTimeString()}`);
        }, delay);
      }
      return null;
    }
  
    // Subscribe to sunrise and sunset times
    sunriseSunsetStore.subscribe(({ sunrise, sunset }) => {
      sunriseTime = new Date(sunrise);
      sunsetTime = new Date(sunset);
  
      // Clear previous timeouts
      clearTimeout(sunriseTimeout);
      clearTimeout(sunsetTimeout);
  
      // Schedule reloads for each module at sunrise and sunset
      modules.forEach(({ title }) => {
        sunriseTimeout = scheduleReload(sunriseTime, title);
        sunsetTimeout = scheduleReload(sunsetTime, title);
      });
    });
  
    onDestroy(() => {
      clearTimeout(sunriseTimeout);
      clearTimeout(sunsetTimeout);
    });
  </script>
  
  <div>
    {#each modules as { title }}
      <p>{title || "Unnamed module"} will reload at sunrise and sunset</p>
    {/each}
  </div>
  