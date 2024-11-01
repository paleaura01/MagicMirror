// ./server.js

import express from 'express';
import fetch from 'node-fetch';
import FeedMe from 'feedme';
import { config } from 'dotenv';

config(); // Load environment variables

const app = express();
const port = process.env.PORT || 8080;
const mapboxAccessToken = process.env.VITE_MAPBOX_ACCESS_TOKEN;

app.use(express.json()); // Parse JSON bodies
app.use(express.static('public')); // Serve static files

// Enable CORS and add security headers for all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: *; script-src 'self';");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Logging helper
const logApiCall = (url) => console.log(`[${new Date().toISOString()}] API called: ${url}`);

// Mapbox Directions API proxy
app.get('/api/mapbox-directions', async (req, res) => {
  const { originLng, originLat, destLng, destLat } = req.query;
  if (!originLng || !originLat || !destLng || !destLat) return res.status(400).json({ error: 'Missing coordinates' });

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originLng},${originLat};${destLng},${destLat}?access_token=${mapboxAccessToken}`;
  logApiCall(url);

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Failed to fetch from Mapbox: ${response.statusText}`);
    res.json(await response.json());
  } catch (error) {
    console.error('Mapbox Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from Mapbox' });
  }
});

// General proxy route
// server.js (enhanced /proxy route with improved error logging)
app.get('/proxy', async (req, res) => {
  const apiUrl = req.query.url;

  if (!apiUrl) {
    console.error("Proxy Error: No URL provided.");
    return res.status(400).json({ error: 'No URL provided' });
  }

  logApiCall(apiUrl); // Log the API call with a timestamp

  try {
    console.log(`Attempting to fetch data from: ${apiUrl}`);
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // User-Agent header may be required by Wikipedia
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${apiUrl}. Status Code: ${response.status}`);
      throw new Error(`Failed to fetch ${apiUrl}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for all requests
    res.setHeader('Cache-Control', 'no-store'); // Prevent caching

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else if (contentType && contentType.includes('text/html')) {
      const html = await response.text();
      res.send(html);
    } else {
      const buffer = await response.buffer();
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.send(buffer);
    }
  } catch (error) {
    console.error('Error during proxy request:', error.stack || error.message);
    res.status(500).json({ error: `Failed to fetch URL: ${error.message}` });
  }
});




// RSS Feed Parsing
app.get('/rss', async (req, res) => {
  const feedUrl = req.query.url;
  if (!feedUrl) return res.status(400).json({ error: 'No RSS feed URL provided' });

  logApiCall(feedUrl);

  try {
    const response = await fetch(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' } });
    if (!response.ok) throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
    
    const rssData = parseRss(await response.text());
    res.json(rssData.items || []);
  } catch (error) {
    console.error('RSS Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

// Image Proxy (specific to image content)
app.get('/proxy-image', async (req, res) => {
  const apiUrl = req.query.url;
  if (!apiUrl) return res.status(400).json({ error: 'No URL provided' });

  logApiCall(apiUrl);

  try {
    const response = await fetch(apiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok || !response.headers.get('content-type').startsWith('image/')) throw new Error('Not an image');
    
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('Image Proxy Error:', error.message);
    res.status(500).json({ error: `Failed to fetch image: ${error.message}` });
  }
});

// LLM interaction route
app.post('/api/llm', async (req, res) => {
  const { prompt, max_length } = req.body;

  try {
    const response = await fetch('http://localhost:5001/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_length }),
    });
    if (!response.ok) throw new Error(`Error from agent1.py: ${response.statusText}`);
    res.json(await response.json());
  } catch (error) {
    console.error('LLM Error:', error.message);
    res.status(500).json({ error: 'Failed to get response from LLM' });
  }
});

// Parse RSS Helper Function
const parseRss = (data) => {
  const parser = new FeedMe(true); // Output JSON
  parser.write(data);
  return parser.done();
};

// Start the server
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
