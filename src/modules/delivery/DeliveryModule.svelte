<!-- ./src/modules/Delivery/DeliveryModule.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import './delivery_styles.css';
  
    let emails = [];
    let loading = true;
    let error = '';
    let timer;
  
    async function fetchEmails() {
      try {
        loading = true;
        const res = await fetch('http://localhost:8002/api/fetch_emails');
        const data = await res.json();
        emails = data.emails || [];
      } catch (err) {
        error = 'Failed to fetch emails';
        console.error(err);
      } finally {
        loading = false;
      }
    }
  
    onMount(() => {
      fetchEmails();
      timer = setInterval(fetchEmails, 30 * 60 * 1000);
    });
  
    onDestroy(() => {
      clearInterval(timer);
    });
  
    function getFadeOpacity(index) {
      const baseOpacity = 1;
      const fadeStep = 0.1;
      return baseOpacity - index * fadeStep;
    }
  </script>
  
  <div class="module-container">
    <h2 class="module-header">Delivery Status</h2>
  
    {#if loading}
      <p class="loading-text">Loading emails...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else}
      <div class="delivery-list-container">
        {#if emails.length > 0}
          <ul class="delivery-list">
            {#each emails.slice(0, 5) as email, index} <!-- Display only the first 5 emails -->
              <li class="delivery-item" style="opacity: {getFadeOpacity(index)};">
                <img src={email.logo} alt="{email.sender} Logo" class="logo-icon" />
                <span class="delivery-info">{email.subject}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="no-emails">No new emails found.</p>
        {/if}
      </div>
    {/if}
  </div>
  