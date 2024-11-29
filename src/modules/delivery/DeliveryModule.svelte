<!-- ./src/modules/Delivery/DeliveryModule.svelte -->

<script>
  import { onMount, onDestroy } from 'svelte';
  import './delivery_styles.css';

  let emails = [];
  let loading = true;
  let error = '';
  let timer;

  const EMAIL_STORAGE_KEY = 'lastEmails'; // Key for localStorage
  const LAST_UPDATED_KEY = 'lastEmailFetchTime'; // Key to track last update time
  const LOGO_CACHE_KEY = 'emailLogosCache'; // Key for caching email logos in localStorage

  // Preload and cache email logos
  async function preloadLogos(emailList) {
      const logoCache = JSON.parse(localStorage.getItem(LOGO_CACHE_KEY)) || {};

      for (const email of emailList) {
          if (!logoCache[email.logo]) {
              try {
                  const response = await fetch(email.logo, { method: 'HEAD' });
                  if (response.ok) {
                      logoCache[email.logo] = true; // Mark as cached
                  }
              } catch (err) {
                  console.error(`[Logo Preload Error] Failed to preload logo: ${email.logo}`, err);
              }
          }
      }

      // Save updated logo cache to localStorage
      try {
          localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(logoCache));
      } catch (err) {
          console.error('[Save Error] Failed to save logo cache to localStorage', err);
      }
  }

  // Save emails to localStorage
  function saveEmailsToLocalStorage(emailList) {
      try {
          localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(emailList));
          localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString());
          console.log(`[Save] Emails saved to localStorage at ${new Date().toISOString()}`);
      } catch (err) {
          console.error('[Save Error] Failed to save emails to localStorage', err);
      }
  }

  // Load emails from localStorage
  function loadEmailsFromLocalStorage() {
      try {
          const storedEmails = localStorage.getItem(EMAIL_STORAGE_KEY);
          const lastUpdated = localStorage.getItem(LAST_UPDATED_KEY);
          if (storedEmails) {
              emails = JSON.parse(storedEmails);
              console.log(`[Load] Emails loaded from localStorage, last updated at ${lastUpdated}`);
              preloadLogos(emails); // Preload logos from loaded emails
              loading = false; // Immediately display loaded emails
          }
      } catch (err) {
          console.error('[Load Error] Failed to load emails from localStorage', err);
      }
  }

  // Fetch emails from the server
  async function fetchEmails() {
      try {
          loading = true; // Show loading indicator during fetch
          const res = await fetch('http://localhost:8002/api/fetch_emails');
          const data = await res.json();
          emails = data.emails || [];
          preloadLogos(emails); // Preload logos from fetched emails
          saveEmailsToLocalStorage(emails); // Save fetched emails to localStorage
      } catch (err) {
          error = 'Failed to fetch emails';
          console.error(err);
      } finally {
          loading = false; // Hide loading indicator after fetch
      }
  }

  onMount(() => {
      loadEmailsFromLocalStorage(); // Load emails from localStorage on mount
      fetchEmails(); // Fetch the latest emails from the server
      timer = setInterval(fetchEmails, 30 * 60 * 1000); // Fetch every 30 minutes
  });

  onDestroy(() => {
      clearInterval(timer); // Clear the interval on component destroy
  });

  // Calculate fade opacity for list items
  function getFadeOpacity(index) {
      const baseOpacity = 1;
      const fadeStep = 0.1;
      return baseOpacity - index * fadeStep;
  }
</script>

<div class="module-container">
  <h2 class="module-header">Delivery Status</h2>

  {#if loading && emails.length === 0}
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

