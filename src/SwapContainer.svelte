<!-- ./src/SwapContainer.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { swapVisibilityStore } from './stores/hotswapStore.js';
  
    export let module;
  
    let visibleModuleName = module.modules[0]?.name;
    let unsubscribe;
  
    onMount(() => {
      unsubscribe = swapVisibilityStore.subscribe((state) => {
        if (state.hasOwnProperty(module.modules[0].name)) {
          visibleModuleName = state[module.modules[0].name];
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
      {#each module.modules as mod (mod.name)}
        <div class:hidden={visibleModuleName !== mod.name}>
          <svelte:component this={mod.component} {...mod.props} />
        </div>
      {/each}
    {:else}
      <div>
        <svelte:component this={module.modules[0].component} {...module.modules[0].props} />
      </div>
    {/if}
  </div>
  
  <style>
    .hidden {
      display: none;
    }
  </style>
  