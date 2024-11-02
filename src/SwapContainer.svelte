<!-- ./src/SwapContainer.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { swapVisibilityStore } from './stores/swapVisibilityStore';
  
    export let module;
  
    let visibleModuleName = module.modules[0]?.name; // Start with the first module
  
    let unsubscribe;
  
    onMount(() => {
      // Subscribe to visibility changes
      unsubscribe = swapVisibilityStore.subscribe((state) => {
        if (state[module.names[0]]) {
          visibleModuleName = state[module.names[0]];
        }
      });
    });
  
    onDestroy(() => {
      unsubscribe();
    });
  </script>
  
  <div class="swap-container">
    {#each module.modules as mod (mod ? mod.name : '')}
      {#if mod}
        <div class:hidden={visibleModuleName !== mod.name}>
          <svelte:component this={mod.component} {...mod.props} />
        </div>
      {:else}
        <div>Error: Module not found</div>
      {/if}
    {/each}
  </div>
  
  <style>
    .hidden {
      display: none;
    }
  </style>
  