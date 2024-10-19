// ./src/main.js

import './app.css'
import App from './App.svelte'
import 'leaflet/dist/leaflet.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const app = new App({
  target: document.getElementById('app'),
})

export default app
