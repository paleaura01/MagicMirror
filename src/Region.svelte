<!-- ./src/Region.svelte -->


<script>
  export let modules = [];
</script>

<div>
  {#each modules as { component, props }, index}
    {#if component}
      <svelte:component this={component} {...props} />
    {:else}
      <p>Error loading module {props.title}</p>
    {/if}
  {/each}
</div>

