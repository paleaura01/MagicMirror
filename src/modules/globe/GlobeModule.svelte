<!-- ./src/modules/globe/GlobeModule.svelte -->

<script>
    import { onMount, onDestroy } from "svelte";
    import dayjs from 'dayjs';
    import './globe_styles.css';

    let mapDiv;
    let images = [];
    let currentFrame = 0;
    let animationInterval;
    let refreshInterval;

    const numImages = 1; // Total images for the last 24 hours
    const frameDelay = 1000; // Delay in milliseconds between frame changes
    const refreshDelay = 120000; // 1 minutes in milliseconds
    const fadeDuration = 500; // Fade duration in milliseconds
    const maxConcurrentRequests = 20; // Maximum number of concurrent image requests

    // Generate GOES-16 image URL for a specific hour, minute, and second
    function getGOES16ImageUrl(hourIndex, minute, second) {
        const now = dayjs().utc().startOf('hour'); // Current hour in UTC
        const frameTime = now.subtract(numImages - hourIndex, 'hour'); // Load from oldest to newest
        const year = frameTime.format("YYYY");
        const month = frameTime.format("MM");
        const day = frameTime.format("DD");
        const hour = frameTime.format("HH");
        const minuteStr = minute.toString().padStart(2, '0');
        const secondStr = second.toString().padStart(2, '0');
        const timestamp = `${year}${month}${day}${hour}${minuteStr}${secondStr}`; // Format timestamp for URL

        return `https://rammb-slider.cira.colostate.edu/data/imagery/${year}/${month}/${day}/goes-19---full_disk/geocolor/${timestamp}/00/000_000.png`;
    }

    // Fetch image URLs for animation by checking past minutes and seconds concurrently
    async function fetchImages() {
        images = []; // Clear previous images
        for (let i = 0; i < numImages; i++) {
            let loaded = false;

            // Start from the current minute and second, count backwards
            const now = dayjs().utc();
            let currentMinute = now.minute();
            let currentSecond = now.second();

            const requests = [];

            // Generate all combinations of minutes and seconds to check, starting from the current time
            for (let minute = currentMinute; minute >= 0; minute--) {
                for (let second = currentSecond; second >= 0; second--) {
                    const imageUrl = getGOES16ImageUrl(i, minute, second);
                    requests.push({ imageUrl, minute, second });
                }
                currentSecond = 59; // Reset seconds for the next minute iteration
            }

            // Process requests in batches to limit concurrent requests
            while (requests.length > 0 && !loaded) {
                const batch = requests.splice(0, maxConcurrentRequests); // Get a batch of requests
                const loadPromises = batch.map(({ imageUrl }) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.src = imageUrl;
                        img.onload = () => resolve({ success: true, imageUrl, img });
                        img.onerror = () => resolve({ success: false, imageUrl });
                    });
                });

                // Await results of the batch
                const results = await Promise.all(loadPromises);
                for (const result of results) {
                    if (result.success) {
                        images.push(result.img);
                        // console.log(`[Debug] Image loaded successfully: ${result.imageUrl}`);
                        loaded = true;
                        break;
                    } else {
                    //    console.error(`[Error] Failed to load image: ${result.imageUrl}`);
                    }
                }
            }

            if (!loaded) {
                console.warn(`[Warning] Could not load an image after checking all minutes and seconds for hour index ${i}.`);
            }
        }
    }

    // Start animation loop with crossfade effect
    function startAnimation() {
        animationInterval = setInterval(() => {
            if (images.length > 0) {
                const currentImageUrl = images[currentFrame].src;
                const nextFrame = (currentFrame + 1) % images.length;
                const nextImageUrl = images[nextFrame].src;

                // Create fade-in effect for the next frame
                const fadeOverlay = document.createElement("div");
                fadeOverlay.className = "fade-overlay";
                fadeOverlay.style.backgroundImage = `url(${nextImageUrl})`;
                mapDiv.appendChild(fadeOverlay);

                // Update the background image
                mapDiv.style.backgroundImage = `url(${currentImageUrl})`;

                // Remove fade overlay after animation ends
                setTimeout(() => {
                    mapDiv.removeChild(fadeOverlay);
                }, fadeDuration);

                // Move to the next frame
                currentFrame = nextFrame;
            }
        }, frameDelay);
    }

    // Stop animation
    function stopAnimation() {
        clearInterval(animationInterval);
    }

    // Refresh images every 5 minutes
    function startImageRefresh() {
        refreshInterval = setInterval(async () => {
            console.log("[Debug] Refreshing images...");
            await fetchImages();
            currentFrame = 0; // Reset to the first frame after refreshing images
        }, refreshDelay);
    }

    // Stop image refresh
    function stopImageRefresh() {
        clearInterval(refreshInterval);
    }

    // Lifecycle hooks
    onMount(async () => {
        // console.log("[Debug] onMount triggered. Fetching GOES-19 images...");
        await fetchImages();
        startAnimation();
        startImageRefresh();
    });

    onDestroy(() => {
        stopAnimation();
        stopImageRefresh();
    });
</script>

<!-- HTML -->
<div bind:this={mapDiv} class="image-container"></div>
