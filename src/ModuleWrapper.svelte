<script>
    import { onMount } from 'svelte';
  
    export let module;
    export let props = {};
  
    let container;
  
    onMount(() => {
      if (module && typeof module.render === 'function') {
        module.render(container, props);
      }
    });
  </script>
  
  <div bind:this={container}></div>
  