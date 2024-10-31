<!-- ./src/App.svelte -->

<script>
  import Region from './Region.svelte';
  import { onMount } from 'svelte';
  import { loadModules } from './moduleLoader.js';
  
  let modulesByRegion = {};

  onMount(async () => {
    modulesByRegion = await loadModules();
    // console.log(modulesByRegion); // Debug: Log the loaded modules to check
  });

  // Update the regions to reflect the combined 'right' region
  const regions = [
    'header',  // Add header as a region
    'left',
    'top_center',
    'right',    // Use the combined 'right' region
    'center',
    'bottom_center',
    'hidden' 
  ];

  // Debug: Log regions for visibility
  // console.log("App.svelte - Regions:", regions);
</script>

<div class="main-container">
  {#if modulesByRegion['header']}
  <!-- Render modules in the header region -->
  <Region modules={modulesByRegion['header']} />
  {/if}
  <header>

  </header>

  <div class="grid-container">
    {#each regions as region}
      {#if region !== 'header'}
        <div class="region {region}">
          <div class="region-content">
            <Region modules={modulesByRegion[region] || []} />
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>
