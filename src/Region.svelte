<!-- src/Region.svelte -->
<script>
  export let name;
  export let modules = [];
</script>

<div class="region-container">
  {#each modules as module}
    <svelte:component this="{module.component}" {...module.props} />
  {/each}
</div>

<style>
  .region-container {
    /* Optional styling */
  }
</style>
