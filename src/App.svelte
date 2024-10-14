<script>
  import Region from './Region.svelte';
  import { onMount } from 'svelte';
  import { loadModules } from './moduleLoader.js';
  
  let modulesByRegion = {};

  onMount(async () => {
    modulesByRegion = await loadModules();
    console.log(modulesByRegion); // Debug: Log the loaded modules to check
  });

  const regions = [
    'header',  // Add header as a region
    'left',
    'top_center',
    'top_right',
    'center',
    'upper_right',
    'lower_left',
    'lower_right',
    'bottom_left',
    'bottom_center',
    'bottom_right'
  ];

  // Debug: Log regions for visibility
  console.log("App.svelte - Regions:", regions);
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
