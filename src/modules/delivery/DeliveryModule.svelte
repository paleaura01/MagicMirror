<script>
    import { onMount, onDestroy } from 'svelte';

    let emails = [];
    let loading = true;
    let error = '';
    let timer;

    async function fetchEmails() {
        try {
            loading = true; // Start loading indicator
            const res = await fetch('http://localhost:8002/api/fetch_emails');
            const data = await res.json();
            emails = data.trackingNumbers || [];
        } catch (err) {
            error = 'Failed to fetch emails';
            console.error(err);
        } finally {
            loading = false; // End loading indicator
        }
    }

    onMount(() => {
        fetchEmails(); // Initial fetch
        timer = setInterval(fetchEmails, 30 * 60 * 1000); // 30 minutes in milliseconds
    });

    onDestroy(() => {
        clearInterval(timer); // Clean up interval when component is destroyed
    });
</script>

<div class="module-container">
    <h2>Delivery Status</h2>

    {#if loading}
        <p>Loading emails...</p>
    {:else if error}
        <p class="error">{error}</p>
    {:else}
        {#if emails.length > 0}
            <ul>
                {#each emails as email}
                    <li>
                        <strong>{email}</strong>
                    </li>
                {/each}
            </ul>
        {:else}
            <p>No new emails found.</p>
        {/if}
    {/if}
</div>

<style>
    .module-container {
        color: white;
        padding: 10px;
    }
    .error {
        color: red;
    }
</style>
