<!-- ./src/modules/test/TestModule.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { modulesToReload } from '../../stores/reloadStore';

    let reloadCount = 0;

    // Subscribe to the reload store
    const unsubscribe = modulesToReload.subscribe((state) => {
        if (state.Test && state.Test !== reloadCount) {
            reloadCount = state.Test;
            console.log(`[TestModule] Reload triggered at ${new Date().toLocaleTimeString()}. Reload count: ${reloadCount}`);
            // Add any reload logic here, such as fetching new data
        }
    });

    onDestroy(unsubscribe);

    onMount(() => {
       // console.log(`[TestModule] Mounted at ${new Date().toLocaleTimeString()}`);
    });
</script>

<div class="test-module">
    <p>[TestModule] This module is loaded. Reload count: {reloadCount}</p>
</div>
