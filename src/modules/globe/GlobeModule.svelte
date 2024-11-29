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

    const numImages = 1; // Total images for the last hour
    const frameDelay = 1000; // Delay in milliseconds between frame changes
    const refreshDelay = 120000; // 2 minutes in milliseconds
    const fadeDuration = 500; // Fade duration in milliseconds
    const maxConcurrentRequests = 100; // Maximum number of concurrent image requests

    const LAST_IMAGE_KEY = 'lastGlobeImage'; // Key for localStorage

    // Generate GOES-16 image URL for a specific hour, minute, and second
    function getGOES16ImageUrl(hourIndex, minute, second) {
        const now = dayjs().utc().startOf('hour');
        const frameTime = now.subtract(numImages - hourIndex, 'hour');
        const year = frameTime.format("YYYY");
        const month = frameTime.format("MM");
        const day = frameTime.format("DD");
        const hour = frameTime.format("HH");
        const minuteStr = minute.toString().padStart(2, '0');
        const secondStr = second.toString().padStart(2, '0');
        const timestamp = `${year}${month}${day}${hour}${minuteStr}${secondStr}`;
        return `https://rammb-slider.cira.colostate.edu/data/imagery/${year}/${month}/${day}/goes-19---full_disk/geocolor/${timestamp}/00/000_000.png`;
    }

    // Fetch image URLs for animation
    async function fetchImages() {
        images = [];
        for (let i = 0; i < numImages; i++) {
            let loaded = false;
            const now = dayjs().utc();
            let currentMinute = now.minute();
            let currentSecond = now.second();
            const requests = [];

            for (let minute = currentMinute; minute >= 0; minute--) {
                for (let second = currentSecond; second >= 0; second--) {
                    const imageUrl = getGOES16ImageUrl(i, minute, second);
                    requests.push({ imageUrl, minute, second });
                }
                currentSecond = 59;
            }

            while (requests.length > 0 && !loaded) {
                const batch = requests.splice(0, maxConcurrentRequests);
                const loadPromises = batch.map(({ imageUrl }) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.src = imageUrl;
                        img.onload = () => resolve({ success: true, imageUrl, img });
                        img.onerror = () => resolve({ success: false, imageUrl });
                    });
                });

                const results = await Promise.all(loadPromises);
                for (const result of results) {
                    if (result.success) {
                        images.push(result.img);
                        loaded = true;

                        // Save the last loaded image URL to local storage
                        localStorage.setItem(LAST_IMAGE_KEY, result.imageUrl);
                        break;
                    }
                }

                if (!loaded && requests.length === 0) {
                    console.warn(`[Warning] Could not load an image for hour index ${i}.`);
                }
            }
        }
    }

    // Start animation loop with crossfade effect
    function startAnimation() {
        animationInterval = setInterval(() => {
            if (images.length > 0 && mapDiv) {
                const currentImageUrl = images[currentFrame].src;
                const nextFrame = (currentFrame + 1) % images.length;
                const nextImageUrl = images[nextFrame].src;

                const fadeOverlay = document.createElement("div");
                fadeOverlay.className = "fade-overlay";
                fadeOverlay.style.backgroundImage = `url(${nextImageUrl})`;
                mapDiv.appendChild(fadeOverlay);

                mapDiv.style.backgroundImage = `url(${currentImageUrl})`;

                setTimeout(() => {
                    if (mapDiv.contains(fadeOverlay)) {
                        mapDiv.removeChild(fadeOverlay);
                    }
                }, fadeDuration);

                currentFrame = nextFrame;
            }
        }, frameDelay);
    }

    // Stop animation
    function stopAnimation() {
        clearInterval(animationInterval);
    }

    // Refresh images every 2 minutes
    function startImageRefresh() {
        refreshInterval = setInterval(async () => {
            await fetchImages();
            currentFrame = 0;
        }, refreshDelay);
    }

    // Stop image refresh
    function stopImageRefresh() {
        clearInterval(refreshInterval);
    }

    // Load the last saved image
    function loadLastImage() {
        const lastImageUrl = localStorage.getItem(LAST_IMAGE_KEY);
        if (lastImageUrl && mapDiv) {
            mapDiv.style.backgroundImage = `url(${lastImageUrl})`;
        }
    }

    // Lifecycle hooks
    onMount(async () => {
        loadLastImage();
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
