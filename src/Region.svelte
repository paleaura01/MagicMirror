<!-- ./src/Region.svelte -->

<script>
  export let modules = [];

  async function loadComponent(path) {
    try {
      const module = await import(`../../${path}`);
      return module.default;
    } catch (error) {
      console.error(`Failed to load module at ${path}:`, error);
      return null;
    }
  }
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
