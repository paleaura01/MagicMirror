<script>
    import { onMount } from "svelte";
    import * as THREE from "three";

    let globeContainer;
    let globeScene, globeCamera, globeRenderer, globeMesh;

    function initializeGlobe() {
        console.log('[Debug] Initializing globe...');

        if (!globeContainer) {
            console.error('[Error] Globe container is not available.');
            return;
        }

        globeScene = new THREE.Scene();
        console.log('[Debug] Scene created:', globeScene);

        globeCamera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
        globeCamera.position.set(0, 0, 2000);
        globeCamera.lookAt(0, 0, 0);
        console.log('[Debug] Camera created and positioned:', globeCamera.position);

        globeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        globeRenderer.setSize(window.innerWidth, window.innerHeight);
        globeRenderer.setPixelRatio(window.devicePixelRatio);
        globeRenderer.domElement.style.position = 'fixed';
        globeRenderer.domElement.style.top = '0';
        globeRenderer.domElement.style.left = '0';
        globeRenderer.domElement.style.width = '100%';
        globeRenderer.domElement.style.height = '100%';
        globeContainer.appendChild(globeRenderer.domElement);
        console.log('[Debug] Renderer created and attached to container:', globeRenderer);

        const originalUrl = 'https://wvs.earthdata.nasa.gov/api/v1/snapshot?REQUEST=GetSnapshot&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&CRS=EPSG:4326&FORMAT=image/jpeg&WIDTH=4096&HEIGHT=2048&BBOX=-180,-90,180,90&TIME=2024-10-19';
        const proxyUrl = `http://localhost:8080/proxy?url=${encodeURIComponent(originalUrl)}`;
        console.log('[Debug] Loading texture from proxy URL:', proxyUrl);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            proxyUrl,
            (texture) => {
                console.log('[Debug] Texture loaded successfully:', texture);

                // Set texture mapping mode to spherical mapping
                texture.mapping = THREE.EquirectangularReflectionMapping;

                const geometry = new THREE.SphereGeometry(50, 64, 64);
                const material = new THREE.MeshBasicMaterial({ map: texture });
                globeMesh = new THREE.Mesh(geometry, material);
                globeMesh.scale.set(8.8, 8.8, 8.8);
                globeScene.add(globeMesh);
                console.log('[Debug] Globe mesh created, scaled, and added to scene:', globeMesh);
            },
            undefined,
            (error) => {
                console.error('[Error] Failed to load texture:', error);
            }
        );

        function animate() {
            requestAnimationFrame(animate);
            if (globeMesh) {
                globeMesh.rotation.y += 0.005;
            }
            globeRenderer.render(globeScene, globeCamera);
        }

        console.log('[Debug] Starting animation loop...');
        animate();

        window.addEventListener('resize', onWindowResize, false);
    }

    function onWindowResize() {
        console.log('[Debug] Window resized. Updating camera and renderer size.');
        globeCamera.aspect = window.innerWidth / window.innerHeight;
        globeCamera.updateProjectionMatrix();
        globeRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMount(() => {
        console.log('[Debug] Component mounted. Checking if globe container is ready...');
        if (globeContainer) {
            initializeGlobe();
        } else {
            console.error('[Error] Globe container is undefined during onMount.');
        }
    });
</script>

<div bind:this={globeContainer} class="globe-container"></div>

<style>
    .globe-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 100;
        pointer-events: none;
    }
</style>
