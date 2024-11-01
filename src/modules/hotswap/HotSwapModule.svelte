<script>
  import { onMount } from 'svelte';
  import { activeModule, hiddenModules, swapModule, getComponentName } from '../../stores/hotswapStore';
  import { get } from 'svelte/store';

  export let config = [];

  let components = new Map();
  let timestamp = ""; // Track each swap time
  let moduleRegions = new Map(); // Track visibility per module region

  function updateTimestamp() {
    timestamp = new Date().toLocaleTimeString();
  }

  async function loadComponent(path) {
  try {
    console.log(`[HotSwapModule] Loading component from path: ${path}`);
    // Load the component with path as-is, assuming the path already ends with `.svelte`
    const component = await import(`${path} /* @vite-ignore */`);
    const componentName = getComponentName(component.default);
    console.log(`[HotSwapModule] Component loaded: ${componentName}`);
    return component.default;
  } catch (error) {
    console.error(`[HotSwapModule] Error loading component at ${path}:`, error);
    return null;
  }
}

  onMount(() => {
    config.forEach(async ({ current, currentPath, swap, swapPath, interval, currentRegion, swapRegion }) => {
      const currentComponent = await loadComponent(currentPath);
      const swapComponent = swapPath ? await loadComponent(swapPath) : null;

      if (currentComponent) components.set(current, currentComponent);
      if (swap && swapComponent) components.set(swap, swapComponent);

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
          // Update regions directly in modulesConfig to switch visibility
          moduleRegions.set(isOriginalVisible ? current : swap, currentRegion);
          moduleRegions.set(isOriginalVisible ? swap : current, "hidden");
        }
      );

      }
    });
  });
</script>

<div>
  <p>Last swap at: {timestamp}</p>
  {#each config as { current }}
    {#if components.get(current)}
      <svelte:component
        this={components.get(current)}
        style="display: {get(hiddenModules).get(current) === 'hidden' ? 'none' : 'block'};"
        class={moduleRegions.get(current)} />
    {/if}
  {/each}
</div>

