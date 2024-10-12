<script>
  export let modules = [];

  import ModuleWrapper from './ModuleWrapper.svelte';

  const isJavaScriptModule = (module) => {
    return module.component && typeof module.component.render === 'function';
  };
</script>

<div class="region-container">
  {#each modules as module}
    {#if isJavaScriptModule(module)}
      <!-- Pass the module as a prop -->
      <ModuleWrapper {module} />
    {:else}
      <!-- If it's a Svelte component, render it using svelte:component -->
      <svelte:component this={module.component} {...module.props} />
    {/if}
  {/each}
</div>
