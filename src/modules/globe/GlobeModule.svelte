<script>
    import { onMount, onDestroy } from "svelte";
    import dayjs from 'dayjs';

    let mapDiv;
    let images = [];
    let currentFrame = 0;
    let animationInterval;
    let refreshInterval;

    const numImages = 24; // Total images for the last 24 hours
    const frameDelay = 1000; // Delay in milliseconds between frame changes
    const refreshDelay = 600000; // 10 minutes in milliseconds

    // Generate Himawari image URL for a specific hour index
    function getHimawariImageUrl(hourIndex) {
        const now = dayjs().utc().startOf('hour'); // Current hour in UTC
        const frameTime = now.subtract(hourIndex + 1, 'hour'); // Subtract to get the previous hour, excluding the current hour
        const year = frameTime.format("YYYY");
        const month = frameTime.format("MM");
        const day = frameTime.format("DD");
        const hour = frameTime.format("HH");
        const timestamp = `${year}${month}${day}${hour}0000`; // Format timestamp for URL

        return `https://rammb-slider.cira.colostate.edu/data/imagery/${year}/${month}/${day}/himawari---full_disk/geocolor/${timestamp}/00/000_000.png`;
    }

    // Fetch image URLs for animation
    async function fetchImages() {
        images = []; // Clear previous images
        for (let i = 0; i < numImages; i++) {
            const imageUrl = getHimawariImageUrl(i);
            console.log(`[Debug] Fetching image: ${imageUrl}`); // Log the URL being fetched
            const img = new Image();
            img.src = imageUrl;

            // Wait for the image to load or fail
            const loadPromise = new Promise((resolve) => {
                img.onload = () => {
                    images.push(img);
                    console.log(`[Debug] Image loaded successfully: ${imageUrl}`);
                    resolve(true);
                };
                img.onerror = () => {
                    console.error(`[Error] Failed to load image: ${imageUrl}`);
                    resolve(false);
                };
            });

            await loadPromise;
        }
    }

    // Start animation loop
    function startAnimation() {
        animationInterval = setInterval(() => {
            if (images.length > 0) {
                mapDiv.style.backgroundImage = `url(${images[currentFrame].src})`;

                // Move to the next frame or loop back to the first frame
                currentFrame = (currentFrame + 1) % images.length;
            }
        }, frameDelay);
    }

    // Stop animation
    function stopAnimation() {
        clearInterval(animationInterval);
    }

    // Refresh images every 10 minutes
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
        console.log("[Debug] onMount triggered. Fetching Himawari images...");
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

<!-- CSS -->
<style>
    .image-container {
        width: 100%;
        height: 100%;
        background-size: 33%; /* Scale down the globe to about 85% of its original size */
        background-repeat: no-repeat;
        background-position: center;
        position: fixed;
        top: 0;
        left: 0;
        transition: background-image 0.5s ease-in-out; /* Smooth transition */
    }
</style>
