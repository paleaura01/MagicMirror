<script>
  import Region from './Region.svelte';
  import { onMount } from 'svelte';
  import { loadModules } from './moduleLoader.js';

  let modulesByRegion = {};

  onMount(async () => {
    modulesByRegion = await loadModules();
    console.log(modulesByRegion); // Log the loaded modules to check
  });

  // Updated region names
  const regions = [
    'top_left',
    'top_center',
    'top_right',
    'upper_left',    // Changed from 'center_left'
    'center',        // This is the merged center box
    'upper_right',   // Changed from 'center_right'
    'lower_left',    // Changed from 'center_left'
    'lower_right',   // Changed from 'center_right'
    'bottom_left',
    'bottom_center',
    'bottom_right'
  ];
</script>

<div class="main-container">
  <header>
    <div class="scrolling-text">
      2 hours ago: How a Trump booster group helped the... (add more text here)
    </div>
  </header>

  <div class="grid-container">
    {#each regions as region}
      <div class="region {region}">
        <Region modules={modulesByRegion[region] || []} />
      </div>
    {/each}
  </div>
</div>
