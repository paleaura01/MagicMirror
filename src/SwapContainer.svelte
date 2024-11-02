<!-- ./src/SwapContainer.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { swapVisibilityStore } from './stores/hotswapStore.js';
  
    export let module;
  
    let visibleModuleName = module.modules[0]?.name; // Start with the first module
  
    let unsubscribe;
  
    onMount(() => {
      // Subscribe to visibility changes
      unsubscribe = swapVisibilityStore.subscribe((state) => {
        if (state.hasOwnProperty(module.names[0])) {
          visibleModuleName = state[module.names[0]];
        } else {
          visibleModuleName = module.modules[0]?.name;
        }
      });
    });
  
    onDestroy(() => {
      unsubscribe();
    });
  </script>
  
  <div class="swap-container">
    {#if module.modules.length > 1}
      {#each module.modules as mod (mod ? mod.name : '')}
        {#if mod}
          <div class:hidden={visibleModuleName !== mod.name}>
            <svelte:component this={mod.component} {...mod.props} />
          </div>
        {:else}
          <div>Error: Module not found</div>
        {/if}
      {/each}
    {:else}
      <!-- Only one module in the swap group -->
      <div class:hidden={!visibleModuleName}>
        <svelte:component this={module.modules[0].component} {...module.modules[0].props} />
      </div>
    {/if}
  </div>
  
  <style>
    .hidden {
      display: none;
    }
  </style>
  