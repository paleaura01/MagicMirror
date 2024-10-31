<!-- ./src/Region.svelte -->

<script>
  import { modulesToReload } from './stores/reloadStore';
  export let modules = [];

  // Function to load each module dynamically
  function loadComponent(module) {
    return module.component;
  }
</script>

<div>
  {#each modules as { component, props }, index}
    {#await loadComponent({ component }) then ModuleComponent}
      <!-- Use a unique key for each component -->
      {#key props.title ?? index}
        <svelte:component this={ModuleComponent} {...props} />
      {/key}
    {:catch error}
      <p>Error loading module: {error.message}</p>
    {/await}
  {/each}
</div>