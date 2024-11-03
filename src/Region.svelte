<!-- ./src/Region.svelte -->

<script>
  import SwapContainer from './SwapContainer.svelte';
  export let modules = [];

  // Import the reload store to get module keys
  import { modulesToReload } from './stores/reloadStore.js';

  let moduleKeys = {};

  // Subscribe to modulesToReload to get the latest keys
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
      <!-- Regular module -->
      {#if module.component}
        <!-- Use the key to force re-rendering when needed -->
        {#key moduleKeys[module.name] || 0}
          <svelte:component this={module.component} {...module.props} />
        {/key}
      {:else}
        <p>Error loading module {module.name}</p>
      {/if}
    {/if}
  {/each}
</div>
