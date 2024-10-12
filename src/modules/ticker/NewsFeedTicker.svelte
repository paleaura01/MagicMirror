<script>
    import { onMount, onDestroy } from 'svelte';
    import './ticker_styles.css';

    // Import all the logos from your pics folder
    import NYTLogo from './pics/NYT_logo_rss_250x40.png';
    import CBCLogo from './pics/CBC_140x140.png';
    import BBCLogo from './pics/bbc_news_120x60.gif';

    // You can keep one default logo if needed
    import logoPNG from './pics/CBC_140x140.png';  // For default or fallback

    export let feeds = [];
    let newsItems = [];
    let scrollingTextEl;
    let newsTickerEl;
    let currentImage = ''; // To hold the currently displayed image
    let currentNewsIndex = 0; // To keep track of the current feed index

    // Mapping between feed titles and their corresponding logos
    const logoMap = {
        'New York Times': NYTLogo,
        'CBC World': CBCLogo,
        'BBC World News': BBCLogo
    };

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
              logo: logoMap[feed.title] || logoPNG // Fallback to logoPNG if no specific logo
            });
          });
        }
      }

      // Ensure reactivity by directly updating newsItems
      newsItems = [...fetchedNewsItems];
      console.log("News items fetched and set:", newsItems);

      // Update the displayed image after fetching the items
      updateImage();
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
    const imageCycleInterval = setInterval(updateImage, 15000); 

    // Fetch the news when the component mounts
    onMount(() => {
      fetchNewsItems();

      // Update animation when window is resized
      window.addEventListener('resize', updateAnimation);
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
          const speed = 300; // Adjust this value as needed

          // Calculate animation duration
          const animationDuration = totalDistance / speed;

          // Apply the animation duration to the scrolling text
          scrollingTextEl.style.animationDuration = `${animationDuration}s`;
        }
      }, 0);
    }
</script>

<!-- The Ticker with the separate Image -->
<div class="news-ticker-container">
  <!-- Logo display -->
  <div class="ticker-logo-box">
    {#if currentImage}
      <img src={currentImage} alt="News Logo">
    {/if}
  </div>

  <!-- Scrolling text below the logo -->
  <div class="news-ticker" bind:this={newsTickerEl}>
    <div class="scrolling-text" bind:this={scrollingTextEl}>
      {#if newsItems.length > 0}
        {tickerText}
      {:else}
        No news available.
      {/if}
    </div>
  </div>
</div>

