<script>
  import { onMount } from 'svelte';
  import { activeModule, hiddenModules, swapModule, getComponentName } from '../../stores/hotswapStore';
  import { get } from 'svelte/store';
  import { moduleMap } from '../../moduleMap.js'; // Adjust path if necessary


  export let config = [];

  let components = new Map();
  let timestamp = ""; // Track each swap time
  let moduleRegions = new Map(); // Track visibility per module region

  function updateTimestamp() {
    timestamp = new Date().toLocaleTimeString();
  }

  async function loadComponent(path) {
  try {
    console.log(`[HotSwapModule] Attempting to load component from path: ${path}`);
    const component = await moduleMap[path]();
    if (!component) throw new Error('Component is undefined after import.');
    console.log(`[HotSwapModule] Component loaded successfully from path: ${path}`);
    return component.default || component;
  } catch (error) {
    console.error(`[HotSwapModule] Error loading component at path: ${path}`, error);
    return null;
  }
}


onMount(() => {
  console.log(`[HotSwapModule] Initial configuration:`, config);
  
  config.forEach(async ({ current, currentPath, swap, swapPath, interval, currentRegion, swapRegion }) => {
    const currentComponent = await loadComponent(currentPath);
    const swapComponent = swapPath ? await loadComponent(swapPath) : null;

    if (currentComponent) {
      components.set(current, currentComponent);
      console.log(`[HotSwapModule] Set current component: ${current} for region: ${currentRegion}`);
    }
    
    if (swap && swapComponent) {
      components.set(swap, swapComponent);
      console.log(`[HotSwapModule] Set swap component: ${swap} for region: ${swapRegion}`);
    }

    // Initialize region visibility for each module
    moduleRegions.set(current, currentRegion || "hidden");
    if (swap) moduleRegions.set(swap, swapRegion || "hidden");

    if (currentComponent && swapComponent) {
      console.log(`[HotSwapModule] Setting up continuous swap from ${current} to ${swap} every ${interval}ms`);
      swapModule(
        currentComponent,
        swapComponent,
        interval,
        updateTimestamp,
        (isOriginalVisible) => {
          moduleRegions.set(isOriginalVisible ? current : swap, currentRegion);
          moduleRegions.set(isOriginalVisible ? swap : current, "hidden");
        }
      );
    }
  });

  console.log(`[HotSwapModule] Final components map:`, Array.from(components.entries()));
  console.log(`[HotSwapModule] Final moduleRegions map:`, Array.from(moduleRegions.entries()));
});

</script>

<div>
  <p>Last swap at: {timestamp}</p>
  {#each config as { current }}
    {#if components.get(current)}
      {#await components.get(current)}
        <p>Loading {current}...</p>
      {:then LoadedComponent}
        <svelte:component
          this={LoadedComponent}
          style="display: {get(hiddenModules).get(current) === 'hidden' ? 'none' : 'block'};"
          class={moduleRegions.get(current)} />
      {:catch error}
        <p>Error loading {current}: {error.message}</p>
      {/await}
    {:else}
      <p>Component not found for {current}</p>
    {/if}
  {/each}
</div>


