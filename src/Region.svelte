<!-- ./src/Region.svelte -->

<script>
  import SwapContainer from './SwapContainer.svelte';
  import { modulesToReload } from './stores/reloadStore.js';

  export let modules = [];

  let moduleKeys = {};

  // Subscribe to `modulesToReload` to track reload counts
  modulesToReload.subscribe((reloadCounts) => {
    moduleKeys = { ...reloadCounts };
  });
</script>

<div>
  {#each modules as module (module.name)}
    {#if module.isSwapGroup}
      <!-- Handle swapping group -->
      <SwapContainer {module} />
    {:else}
      <!-- Regular module with forced re-rendering by key change -->
      {#if module.component}
        {#key moduleKeys[module.name] || 0}
          <svelte:component this={module.component} {...module.props} />
        {/key}
      {:else}
        <p>Error loading module {module.name}</p>
      {/if}
    {/if}
  {/each}
</div>
