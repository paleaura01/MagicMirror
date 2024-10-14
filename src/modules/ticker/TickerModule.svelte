<script>
  import { onMount, onDestroy } from 'svelte';
  import './ticker_styles.css';
  // Remove the hardcoded logo import
  import logoPNG from './pics/The-New-York-Times.jpg'; // Fallback image if custom logos fail to load

  export let feeds = [];
  let newsItems = [];
  let scrollingTextEl;
  let newsTickerEl;
  let currentImage = ''; // Initialize as empty
  let currentNewsIndex = 0; // To keep track of the current feed index

  // Since we need to import images dynamically, create a mapping
  let imageImports = {};

// Preload images from feeds
function preloadImages() {
  feeds.forEach(feed => {
    if (feed.customLogo) {
      // Use @vite-ignore to prevent Vite from trying to analyze the dynamic import
      import(/* @vite-ignore */ `${feed.customLogo}`).then(module => {
        imageImports[feed.customLogo] = module.default;
      }).catch(error => {
        console.error(`Failed to load image: ${feed.customLogo}`, error);
      });
    }
  });
}


  // Fetch from your backend RSS proxy
  async function fetchRSSFeedFromServer(url) {
    try {
      const proxyUrl = `http://localhost:8080/rss?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch from server for URL: ${url}`);
      }
      const items = await response.json();
      return items;
    } catch (error) {
      console.error(`Failed to fetch RSS feed from server: ${url}`, error);
      return [];
    }
  }

  // Fetch the RSS feeds and process the items
  async function fetchNewsItems() {
    let fetchedNewsItems = [];
    for (let feed of feeds) {
      const fetchedItems = await fetchRSSFeedFromServer(feed.url);
      if (fetchedItems.length > 0) {
        fetchedItems.forEach(item => {
          fetchedNewsItems.push({
            title: item.title,
            link: item.link,
            logo: imageImports[feed.customLogo] || logoPNG // Use fallback if custom logo is not found
          });
        });
      }
    }

    // Ensure reactivity by directly updating `newsItems`
    newsItems = [...fetchedNewsItems];
    // console.log("News items fetched and set:", newsItems);

    // Update the displayed image after fetching the items
    updateImage();
    // After setting newsItems, update the animation
    updateAnimation();
  }

  // Function to cycle the images every 15 seconds
  function updateImage() {
    if (newsItems.length > 0) {
      currentImage = newsItems[currentNewsIndex].logo;
      currentNewsIndex = (currentNewsIndex + 1) % newsItems.length; // Cycle through the items
    }
  }

  // Cycle images every 15 seconds
  let imageCycleInterval;

  // Fetch the news when the component mounts
  onMount(() => {
    preloadImages(); // Preload images before fetching news
    // Wait a bit to ensure images are loaded
    setTimeout(() => {
      fetchNewsItems();

      // Start the image cycling interval
      imageCycleInterval = setInterval(updateImage, 500); // Adjust the interval to 15 seconds

      // Update animation when window is resized
      window.addEventListener('resize', updateAnimation);
    }, 500); // Adjust the delay as needed
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateAnimation);
    clearInterval(imageCycleInterval); // Clear the interval on destroy
  });

  // Format ticker text from the news items
  $: tickerText = newsItems.map(item => item.title).join(' • ');

  // Function to update animation duration
  function updateAnimation() {
    // Use setTimeout to ensure DOM is updated
    setTimeout(() => {
      if (scrollingTextEl && newsTickerEl) {
        const textWidth = scrollingTextEl.offsetWidth;
        const containerWidth = newsTickerEl.offsetWidth;

        // Calculate total distance to scroll (textWidth + containerWidth)
        const totalDistance = textWidth + containerWidth;

        // Set a desired scrolling speed (pixels per second)
        const speed = 100; // Adjust this value as needed

        // Calculate animation duration
        const animationDuration = totalDistance / speed;

        // Apply the animation duration to the scrolling text
        scrollingTextEl.style.animationDuration = `${animationDuration}s`;
      }
    }, 0);
  }
</script>

<div class="news-ticker" bind:this={newsTickerEl}>
  <!-- Display the current logo image on the left side -->
  <div class="ticker-logo">
    {#if currentImage}
      <img src={currentImage} alt="News Logo">
    {:else}
      <!-- Fallback logo or placeholder -->
      <img src={logoPNG} alt="Default Logo">
    {/if}
  </div>

  <div class="scrolling-text" bind:this={scrollingTextEl}>
    {#if newsItems.length > 0}
      {tickerText}
    {:else}
      No news available.
    {/if}
  </div>
</div>
