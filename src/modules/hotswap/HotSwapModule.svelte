<script>
  import { onMount } from 'svelte';
  import { activeModule, hiddenModules, swapModule, hideModule, getComponentName } from '../../stores/hotswapStore';
  import { get } from 'svelte/store';

  export let config = [];

  let components = new Map();

  async function loadComponent(path) {
    try {
      console.log(`[HotSwapModule] Loading component from path: ${path}`);
      const component = await import(`../../${path}`);
      const componentName = getComponentName(component.default);
      console.log(`[HotSwapModule] Component loaded: ${componentName}`);
      return component.default;
    } catch (error) {
      console.error(`[HotSwapModule] Error loading component at ${path}:`, error);
      return null;
    }
  }

  onMount(() => {
    config.forEach(async ({ current, currentPath, swap, swapPath, interval }) => {
      const currentComponent = await loadComponent(currentPath);
      const swapComponent = swapPath ? await loadComponent(swapPath) : null;

      if (currentComponent) components.set(current, currentComponent);
      if (swap && swapComponent) components.set(swap, swapComponent);

      if (currentComponent && swapComponent) {
        console.log(`[HotSwapModule] Setting up continuous swap from ${current} to ${swap} every ${interval}ms`);
        swapModule(currentComponent, swapComponent, interval);
      } else if (currentComponent) {
        console.log(`[HotSwapModule] Setting up hide for ${current} every ${interval}ms`);
        hideModule(currentComponent, interval);
      }
    });
  });
</script>

<div>
  {#each config as { current }}
    {#if components.get(current)}
      <svelte:component
        this={components.get(current)}
        style="display: {get(hiddenModules).get(current) ? 'none' : 'block'};"
      />
    {/if}
  {/each}
</div>
