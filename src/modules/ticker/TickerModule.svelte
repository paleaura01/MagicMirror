<!-- ./src/modules/ticker/TickerModule.svelte -->

<script>
  import { onMount, onDestroy } from 'svelte';
  import './ticker_styles.css';
  import logoPNG from './pics/The-New-York-Times.jpg';

  export let feeds = [];
  let newsItems = [];
  let scrollingTextEl;
  let newsTickerEl;
  let currentImage = '';
  let currentNewsIndex = 0;

  let imageImports = {};
  let imageCycleInterval;
  let apiUpdateInterval;

  function preloadImages() {
    feeds.forEach(feed => {
      if (feed.customLogo) {
        import(/* @vite-ignore */ `${feed.customLogo}`).then(module => {
          imageImports[feed.customLogo] = module.default;
        }).catch(error => {
          console.error(`Failed to load image: ${feed.customLogo}`, error);
        });
      }
    });
  }

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

  async function fetchNewsItems() {
    let allNewsItems = [];
    let hasUpdates = false;

    for (let feed of feeds) {
      const fetchedItems = await fetchRSSFeedFromServer(feed.url);
      const feedNewsItems = fetchedItems.map(item => ({
        title: item.title,
        link: item.link,
        logo: imageImports[feed.customLogo] || logoPNG,
      }));

      // Check if the news items for this feed are different
      const currentFeedItems = newsItems.filter(item => item.logo === (imageImports[feed.customLogo] || logoPNG));
      const newItemsSet = new Set(feedNewsItems.map(item => item.title));
      const currentItemsSet = new Set(currentFeedItems.map(item => item.title));

      if (newItemsSet.size !== currentItemsSet.size || [...newItemsSet].some(item => !currentItemsSet.has(item))) {
        console.log(`Updating news items from source: ${feed.url}`);
        console.log(`New items from ${feed.url}:`, feedNewsItems.map(item => item.title));
        hasUpdates = true;
      }

      allNewsItems = [...allNewsItems, ...feedNewsItems];
    }

    // Only update the ticker if there are new or changed items
    if (hasUpdates) {
      newsItems = [...allNewsItems];
      updateImage();
      updateTickerText(); // Update the ticker text content
      // Do not call updateAnimation()
    } else {
      console.log("No new items to update in ticker.");
    }
  }

  function updateImage() {
    if (newsItems.length > 0) {
      currentImage = newsItems[currentNewsIndex].logo;
      currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
    }
  }

  function updateTickerText() {
    if (scrollingTextEl && newsItems.length > 0) {
      const newTickerText = newsItems.map(item => item.title).join(' • ') + ' • ';
      // Append the text twice for continuous scroll
      scrollingTextEl.innerHTML = newTickerText + newTickerText;
    } else {
      scrollingTextEl.innerHTML = 'No news available.';
    }
  }

  function updateAnimation() {
    setTimeout(() => {
      if (scrollingTextEl) {
        const animationDuration = 3000; // Fixed duration in seconds
        scrollingTextEl.style.animationDuration = `${animationDuration}s`;
      }
    }, 0);
  }

  onMount(() => {
    preloadImages();
    setTimeout(() => {
      fetchNewsItems();

      imageCycleInterval = setInterval(updateImage, 15000);
      apiUpdateInterval = setInterval(fetchNewsItems, 180000); // Update every 3 minutes

      window.addEventListener('resize', updateAnimation);
      updateAnimation(); // Call it here
    }, 500);
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateAnimation);
    clearInterval(imageCycleInterval);
    clearInterval(apiUpdateInterval);
  });
</script>

<div class="news-ticker" bind:this={newsTickerEl}>
  <div class="ticker-logo">
    {#if currentImage}
      <img src={currentImage} alt="News Logo">
    {:else}
      <img src={logoPNG} alt="Default Logo">
    {/if}
  </div>

  <div class="scrolling-text" bind:this={scrollingTextEl}></div>
</div>
