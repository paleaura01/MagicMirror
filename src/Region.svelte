<script>
  export let modules = [];

  import ModuleWrapper from './ModuleWrapper.svelte';

  // Function to check if a module is a MagicMirror (JavaScript-based) module with getDom()
  const isMagicMirrorModule = (module) => {
    return module.component && typeof module.component.getDom === 'function';
  };

  // Function to check if a module is a JavaScript-based component with render()
  const isJavaScriptModule = (module) => {
    return module.component && typeof module.component.render === 'function';
  };

  // Function to check if a module is a valid Svelte component
  const isSvelteComponent = (module) => {
    return module.component && typeof module.component === 'function';
  };
</script>

<div class="region-container">
  {#each modules as module}
    {#if isMagicMirrorModule(module)}
      <!-- Render MagicMirror module with getDom -->
      <ModuleWrapper {module} />
    {:else if isJavaScriptModule(module)}
      <!-- Render JavaScript module with render function -->
      <ModuleWrapper {module} />
    {:else if isSvelteComponent(module)}
      <!-- If it's a Svelte component, render it using svelte:component -->
      <svelte:component this={module.component} {...module.props} />
    {:else}
      <p>Error: Module cannot be rendered</p>
    {/if}
  {/each}
</div>
