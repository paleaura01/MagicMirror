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
    'upper_left',
    'center',
    'upper_right',
    'lower_left',
    'lower_right',
    'bottom_left',
    'bottom_center',
    'bottom_right'
  ];
</script>

<div class="main-container">
  <header>
    <div class="scrolling-text">
      2 hours ago: How Donald Trump went to jail with group who helped the russian... (add more text here)
    </div>
  </header>

  <div class="grid-container">
    {#each regions as region}
      <div class="region {region}">
        <div class="region-content"> <!-- Added region-content div -->
          <Region modules={modulesByRegion[region] || []} />
        </div>
      </div>
    {/each}
  </div>
</div>
