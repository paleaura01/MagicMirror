<!-- HotSwapModule.svelte -->

<script>
  import { onMount } from 'svelte';
  import { hiddenModules, swapModule } from '../../stores/hotswapStore';
  import { moduleMap } from '../../moduleMap.js';

  export let config = [];
  let components = new Map();

  async function loadComponent(path) {
      console.log(`[HotSwapModule] Loading component from path: ${path}`);
      const componentModule = await moduleMap[path]();
      if (!componentModule) throw new Error('Component is undefined after import.');
      return componentModule.default || componentModule;
  }

  onMount(() => {
      console.log(`[HotSwapModule] Initial configuration:`, config);

      config.forEach(async ({ current, currentPath, swap, swapPath, interval }) => {
          const currentComponent = await loadComponent(currentPath);
          const swapComponent = swapPath ? await loadComponent(swapPath) : null;

          components.set(current, currentComponent);
          if (swap && swapComponent) {
              components.set(swap, swapComponent);

              console.log(
                  `[HotSwapModule] Setting up continuous swap from ${current} to ${swap} every ${interval}ms`
              );
              swapModule(current, swap, interval);
          } else {
              // If there's no swap component, ensure the current module is visible
              hiddenModules.update((state) => {
                  state = { ...state };
                  state[current] = 'visible';
                  return state;
              });
          }
      });
  });
</script>

<div>
  {#each config as { current }}
      {#if components.get(current)}
          <svelte:component
              this={components.get(current)}
              style="display: {$hiddenModules[current] === 'hidden' ? 'none' : 'block'};"
          />
      {:else}
          <p>Component not found for {current}</p>
      {/if}
  {/each}
  <!-- Render swap components as well -->
  {#each config as { swap }}
      {#if swap && components.get(swap)}
          <svelte:component
              this={components.get(swap)}
              style="display: {$hiddenModules[swap] === 'hidden' ? 'none' : 'block'};"
          />
      {/if}
  {/each}
</div>











