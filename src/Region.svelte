<script>
  export let modules = [];

  import ModuleWrapper from './ModuleWrapper.svelte';

  // Check if it's a Svelte component or a MagicMirror module
  const isSvelteComponent = (module) => {
    return module.component && typeof module.component === 'function';
  };

  const isMagicMirrorModule = (module) => {
    return module.component && typeof module.component.getDom === 'function';
  };

  const isJavaScriptModule = (module) => {
    return module.component && typeof module.component.render === 'function';
  };

  // Debugging: Log the modules
  console.log("Region.svelte - modules:", modules);
</script>

<div class="region-container">
  {#each modules as module}
    {#if isMagicMirrorModule(module)}
      <!-- Render MagicMirror module with getDom -->
      <ModuleWrapper {module} />
    {:else if isJavaScriptModule(module)}
      <!-- Render JavaScript module -->
      <ModuleWrapper {module} />
    {:else if isSvelteComponent(module)}
      <!-- Render Svelte component -->
      <svelte:component this={module.component} {...module.props} />
    {:else}
      <!-- Error handling -->
      <div>Error: Invalid module loaded in this region</div>
    {/if}
  {/each}
</div>
