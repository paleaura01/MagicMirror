<!-- ./src/modules/reload/ReloadModule.svelte -->

<script>
    import { onDestroy } from 'svelte';
    import { modulesToReload } from '../../stores/reloadStore';

    // Accept modules with interval settings from the configuration
    export let modules = [];

    // Initialize intervals array to store interval IDs
    const intervals = modules.map((mod) => {
        const { title, interval } = mod;
        // console.log(`[ReloadModule] Setting interval for ${title} to ${interval} ms`);

        // Set up the interval for each module based on the config
        return setInterval(() => {
            modulesToReload.update(state => {
                // console.log(`[ReloadModule] Updating reload count for ${title}`);
                return { ...state, [title]: (state[title] || 0) + 1 };
            });
        }, interval);
    });

    onDestroy(() => {
        console.log("[ReloadModule] Clearing all intervals");
        intervals.forEach(clearInterval);
    });
</script>
