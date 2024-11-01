<!-- ./src/modules/test/TestModule.svelte -->
<script>
    import { onMount } from 'svelte';

    let timestamp;

    // Set a new timestamp when the module is mounted
    onMount(() => {
        timestamp = new Date().toLocaleTimeString();
        console.log(`[TestModule] Loaded at ${timestamp}`);
    });
</script>

<style>
    /* Add some styling to make it easy to spot */
    .test-module {
        font-size: 1.5rem;
        color: white;
        background-color: #4CAF50; /* Green background for visibility */
        padding: 20px;
        text-align: center;
        border-radius: 8px;
    }
</style>

<div class="test-module">
    <p>Test Module</p>
    <p>Loaded at: {timestamp}</p>
</div>
