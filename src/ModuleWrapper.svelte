<script>
    import { onMount } from 'svelte';
  
    export let module;
  
    let container;
  
    onMount(() => {
      console.log('Module received in ModuleWrapper:', module);
      if (module && module.component && typeof module.component.render === 'function') {
        console.log('Rendering JavaScript module:', module);
        module.component.render(container); // Call the module's render function
      } else {
        console.error('Module does not have a valid render function:', module);
      }
    });
  </script>
  
  <div bind:this={container}></div>
  