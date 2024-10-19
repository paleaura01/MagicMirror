import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.ics'],
  plugins: [svelte()],
  build: {
    rollupOptions: {
      external: ['fs', 'path', 'os'], // Exclude Node.js core modules from frontend build
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,      // You can change the port if needed
    
  },
})
