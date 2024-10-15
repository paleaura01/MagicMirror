<!-- ./src/ModuleWrapper.svelte -->

<script>
  import { onMount } from 'svelte';

  export let module;

  let container;

  onMount(() => {
    console.log('ModuleWrapper initialized for module:', module);

    // Check if this is a MagicMirror module with getDom
    if (module.component && typeof module.component.getDom === 'function') {
      console.log('Calling getDom() for MagicMirror module:', module);

      try {
        const domElement = module.component.getDom();
        console.log('DOM element returned from getDom():', domElement);

        if (domElement instanceof HTMLElement) {
          console.log('Appending valid DOM element to container.');
          container.appendChild(domElement);
        } else if (domElement === null || domElement === undefined) {
          console.error('Error: getDom() returned null or undefined.');
          container.textContent = 'Error: getDom() returned null or undefined.';
        } else {
          console.error('Error: getDom() did not return a valid DOM element.');
          container.textContent = 'Error: getDom() did not return a valid DOM element.';
        }
      } catch (error) {
        console.error('Error while calling getDom():', error);
        container.textContent = 'Error occurred while rendering the module.';
      }
    } else if (module && module.component && typeof module.component.render === 'function') {
      // Handle standard JavaScript modules with render
      console.log('Rendering JavaScript module via render() function:', module);
      module.component.render(container); // Call the module's render function
    } else {
      console.error('Module does not have a valid render or getDom function:', module);
      container.textContent = 'Error: Module cannot be rendered.';
    }
  });
</script>

<div bind:this={container}></div>
