<!-- ./src/modules/delivery/DeliveryModule.svelte -->

<script>
    import { onMount } from 'svelte';
    let screenshotUrl = '';
    let description = '';
    let loading = false;
    let error = '';
  
    async function fetchUSPSData() {
      loading = true;
      try {
        const res = await fetch('http://localhost:8080/api/usps_login');
        const data = await res.json();
  
        if (data.error) {
          error = data.error;
        } else {
          screenshotUrl = data.screenshot_url;
          description = data.description;
        }
      } catch (err) {
        // console.error('Error fetching USPS data:', err);
        error = 'Failed to fetch USPS data.';
      } finally {
        loading = false;
      }
    }
  
    onMount(() => {
      fetchUSPSData();
    });
  </script>
  
  <div class="module-container">
    <h2>USPS Informed Delivery</h2>
  
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else}
      <!-- Attempt to embed the website (may not work) -->
      <!--
      <iframe src="https://reg.usps.com/informeddelivery/login" width="100%" height="600px"></iframe>
      -->
  
      <!-- Display the screenshot -->
      {#if screenshotUrl}
        <img src={screenshotUrl} alt="USPS Dashboard Screenshot" />
      {/if}
  
      <!-- Display the description -->
      {#if description}
        <p><strong>Description:</strong> {description}</p>
      {/if}
    {/if}
  </div>
  
  <style>
    .module-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: white;
    }
    img {
      width: 100%;
      max-width: 400px;
      margin-top: 10px;
      border: 2px solid white;
      border-radius: 8px;
    }
    .error {
      color: red;
    }
  </style>
  