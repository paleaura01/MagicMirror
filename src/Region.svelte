<!-- ./src/Region.svelte -->

<script>
  export let modules = [];
</script>

<div>
  {#each modules as { component, props, name } (name)}
    {#if component}
      <svelte:component this={component} {...props} />
    {:else}
      <p>Error loading module {props.title}</p>
    {/if}
  {/each}
</div>
