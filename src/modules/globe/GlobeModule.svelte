<script>
    import { onMount, onDestroy } from "svelte";
    import dayjs from 'dayjs';

    let mapDiv;
    let images = [];
    let currentFrame = 0;
    let animationInterval;

    const numImages = 12; // Total images for 24 hours at 10-minute intervals
    const timeStepMinutes = 60; // Time step in minutes
    const frameDelay = 1000; // Delay in milliseconds between frame changes
    const restartFrame = 10; // The frame at which the animation should restart

    // Generate Himawari image URL for a specific frame index
    function getHimawariImageUrl(frameIndex) {
        const now = dayjs().utc();
        // Calculate the time for the specific frame index
        const frameTime = now.subtract(timeStepMinutes * frameIndex, 'minute');
        const year = frameTime.format("YYYY");
        const month = frameTime.format("MM");
        const day = frameTime.format("DD");
        const hour = frameTime.format("HH");
        const timestamp = `${year}${month}${day}${hour}0000`; // Format timestamp for URL

        return `https://rammb-slider.cira.colostate.edu/data/imagery/${year}/${month}/${day}/himawari---full_disk/geocolor/${timestamp}/00/000_000.png`;
    }

    // Fetch image URLs for animation
    async function fetchImages() {
        for (let i = 0; i < numImages; i++) {
            const imageUrl = getHimawariImageUrl(i);
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                images.push(img);
            };
        }
    }

    // Start animation loop with controlled restart frame
    function startAnimation() {
        animationInterval = setInterval(() => {
            if (images.length > 0) {
                mapDiv.style.backgroundImage = `url(${images[currentFrame].src})`;

                // If the current frame reaches the restart frame, go back to the first frame
                if (currentFrame >= restartFrame) {
                    currentFrame = 0;
                } else {
                    currentFrame++;
                }
            }
        }, frameDelay);
    }

    // Stop animation
    function stopAnimation() {
        clearInterval(animationInterval);
    }

    // Lifecycle hooks
    onMount(async () => {
        console.log("[Debug] onMount triggered. Fetching Himawari images...");
        await fetchImages();
        startAnimation();
    });

    onDestroy(() => {
        stopAnimation();
    });
</script>

<!-- HTML -->
<div bind:this={mapDiv} class="image-container"></div>

<!-- CSS -->
<style>
    .image-container {
        width: 100%;
        height: 100%;
        background-size: 35%; /* Scale down the globe to about 85% of its original size */
        background-repeat: no-repeat;
        background-position: center;
        position: fixed;
        top: 0;
        left: 0;
        transition: background-image 0.5s ease-in-out; /* Smooth transition */
    }
</style>
