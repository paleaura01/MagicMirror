<script>
  import Region from './Region.svelte';
  import { onMount } from 'svelte';
  import { loadModules } from './moduleLoader.js';

  let modulesByRegion = {};

  onMount(async () => {
    modulesByRegion = await loadModules();
    console.log(modulesByRegion); // Log the loaded modules to check
  });

  const regions = [
    'top_left',
    'top_center',
    'top_right',
    'center_left',
    'center',
    'center_right',
    'bottom_left',
    'bottom_center',
    'bottom_right',
  ];
</script>

<div class="grid-container">
  {#each regions as region}
    <div class="region {region}">
      <!-- Stop passing the 'name' prop -->
      <Region modules={modulesByRegion[region] || []} />
    </div>
  {/each}
</div>
