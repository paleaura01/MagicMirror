<!-- ./src/App.svelte -->
<script>
  import Region from './Region.svelte';
  import { onMount } from 'svelte';
  import { loadModules } from './moduleLoader.js';

  let modulesByRegion = {};

  onMount(async () => {
    modulesByRegion = await loadModules();
    console.log("Loaded modules by region:", modulesByRegion); // Debug log to verify module loading
  });

  const regions = [
    'header',
    'left',
    'top_center',
    'right',
    'center',
    'bottom_center',
    'hidden'
  ];
</script>

<div class="main-container">
  <!-- Conditionally render header region -->
  {#if modulesByRegion['header']}
    <Region modules={modulesByRegion['header']} />
  {/if}

  <header></header>

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
