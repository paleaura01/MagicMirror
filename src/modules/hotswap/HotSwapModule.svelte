<!-- ./src/modules/hotswap/HotSwapModule.svelte -->
<script>
    import { onMount } from 'svelte';
    import { activeModule, swapModule } from '../../stores/hotswapStore';
  
    export let config = [];
  
    async function loadComponent(path) {
      try {
        console.log(`[HotSwapModule] Attempting to load component from path: ${path}`);
        const component = await import(`../../${path}`);
        console.log(`[HotSwapModule] Loaded component from ${path}:`, component.default);
        return component.default;
      } catch (error) {
        console.error(`[HotSwapModule] Error loading component from ${path}:`, error);
        return null;
      }
    }
  
    onMount(() => {
      config.forEach(async ({ current, currentPath, swap, swapPath, interval }) => {
        const currentComponent = await loadComponent(currentPath);
        const swapComponent = swapPath ? await loadComponent(swapPath) : null;
  
        if (!currentComponent) {
          console.error(`[HotSwapModule] Failed to load current component for ${current}`);
          return;
        }
  
        if (swap && !swapComponent) {
          console.warn(`[HotSwapModule] Swap component for ${swap} could not be loaded`);
        } else if (swapComponent) {
          console.log(`[HotSwapModule] Setting up swap from ${current} to ${swap} every ${interval}ms`);
          swapModule(currentComponent, swapComponent, interval);
        }
      });
    });
  </script>
  
  <div>
    {#each config as { current, swap }}
      {#if $activeModule === current}
        <svelte:component this={current} />
      {:else if $activeModule === swap}
        <svelte:component this={swap} />
      {/if}
    {/each}
  </div>
  