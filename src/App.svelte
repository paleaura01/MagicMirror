<!-- ./src/App.svelte -->

<script>
  import Region from './Region.svelte';
  import { onMount } from 'svelte';
  import { modulesByRegionStore } from './stores/reloadStore.js';
  import { swapModules } from './stores/hotswapStore.js';
  import modulesConfig from './modulesConfig.json';
  import { loadModules } from './moduleLoader.js';

  let modulesByRegion = {};

  onMount(async () => {
    await loadModules();

    // Extract the hotswap configurations
    const hotswapConfigEntry = modulesConfig.find((config) => config.name === 'HotSwapModule');
    if (hotswapConfigEntry) {
      const hotswapConfigs = hotswapConfigEntry.props.config;
      swapModules(hotswapConfigs);
    }
  });

  // Subscribe to the store
  $: modulesByRegion = $modulesByRegionStore;

  const regions = ['header', 'left', 'top_center', 'right', 'center', 'bottom_center', 'hidden'];
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
