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

      // Filter out the unwanted entry
      return items.filter(item => !item.title.includes("New sidebar rule! Keep it Civil!"));
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
        hasUpdates = true;
      }

      allNewsItems = [...allNewsItems, ...feedNewsItems];
    }

    if (hasUpdates) {
      newsItems = [...allNewsItems];
      updateImage();
      updateTickerText();
    } else {
      // console.log("No new items to update in ticker.");
    }
  }

  function updateImage() {
    if (newsItems.length > 0) {
      const currentNewsItem = newsItems[currentNewsIndex];
      currentImage = currentNewsItem.logo || logoPNG;
      currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
    }
  }

  function updateTickerText() {
    if (scrollingTextEl && newsItems.length > 0) {
      const newTickerText = newsItems.map(item => item.title).join(' • ') + ' • ';
      scrollingTextEl.innerHTML = newTickerText + newTickerText;
    } else {
      scrollingTextEl.innerHTML = 'No news available.';
    }
  }

  function updateAnimation() {
    setTimeout(() => {
      if (scrollingTextEl) {
        const animationDuration = 3000;
        scrollingTextEl.style.animationDuration = `${animationDuration}s`;
      }
    }, 0);
  }

  onMount(() => {
    preloadImages();
    setTimeout(() => {
      fetchNewsItems();

      imageCycleInterval = setInterval(updateImage, 5000);
      apiUpdateInterval = setInterval(fetchNewsItems, 180000);

      window.addEventListener('resize', updateAnimation);
      updateAnimation();
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
