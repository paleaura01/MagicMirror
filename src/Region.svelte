<script>
  export let modules = [];
  import ModuleWrapper from './ModuleWrapper.svelte';

  // Debugging: Log the modules
  console.log("Region.svelte - modules:", modules);
</script>

<div class="region-container">
  {#each modules as module}
    {#if module.component && module.component.render}
      <!-- Render JavaScript module via ModuleWrapper -->
      <ModuleWrapper {module} />
    {:else}
      <!-- Render Svelte component -->
      <svelte:component this={module.component} {...module.props} />
    {/if}
  {/each}
</div>
