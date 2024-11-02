<!-- ./src/Region.svelte -->

<script>
  import SwapContainer from './SwapContainer.svelte';
  export let modules = [];
</script>

<div>
  {#each modules as module (module.isSwapGroup ? module.names.join('-') : module.name)}
    {#if module.isSwapGroup}
      <!-- Handle swapping group -->
      <SwapContainer {module} />
    {:else}
      <!-- Regular module -->
      {#if module.component}
        <svelte:component this={module.component} {...module.props} />
      {:else}
        <p>Error loading module {module.props.title}</p>
      {/if}
    {/if}
  {/each}
</div>
