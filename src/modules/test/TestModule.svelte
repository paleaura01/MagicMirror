<!-- ./src/modules/reload/ReloadModule.svelte -->

<script>
    import { onDestroy } from 'svelte';
    import { modulesToReload } from '../../stores/reloadStore';

    export let modules = [];

    // Initialize intervals to update each module's reset key in `modulesToReload`
    const intervals = modules.map(({ title, interval }) => {
        console.log(`[ReloadModule] Setting interval for ${title} to ${interval} ms`);

        // Set up interval to increment each module's reload key
        return {
            title,
            intervalId: setInterval(() => {
                modulesToReload.update(state => ({
                    ...state,
                    [title]: (state[title] || 0) + 1
                }));
                console.log(`[ReloadModule] Incremented reset key for ${title} at ${new Date().toLocaleTimeString()}`);
            }, interval)
        };
    });

    onDestroy(() => {
        console.log("[ReloadModule] Clearing all intervals");
        intervals.forEach(({ intervalId }) => clearInterval(intervalId));
    });
</script>

<div>
    {#each modules as { title }}
        <p>{title} reset count: {$modulesToReload[title]}</p>
    {/each}
</div>
