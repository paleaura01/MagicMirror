// ./server.js

import express from 'express';
import fetch from 'node-fetch';
import FeedMe from 'feedme'; // For RSS parsing
import { config } from 'dotenv';

config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 8080;
const mapboxAccessToken = process.env.VITE_MAPBOX_ACCESS_TOKEN;

// Parse JSON bodies for POST requests
app.use(express.json());

// Serve static files from the "public" directory
app.use(express.static('public'));

// Enable CORS for all routes, including handling preflight requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, sentry-trace, baggage');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: *; script-src 'self';");

  if (req.method === 'OPTIONS') {
    res.sendStatus(200); // Respond with 200 to OPTIONS requests
    return;
  }

  next();
});

// Helper function to log API calls with timestamps
const logApiCall = (url) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] API called: ${url}`);
};

// Proxy route for Mapbox Directions API to handle CORS
app.get('/api/mapbox-directions', async (req, res) => {
  const { originLng, originLat, destLng, destLat } = req.query;

  if (!originLng || !originLat || !destLng || !destLat) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${originLng},${originLat};${destLng},${destLat}?access_token=${mapboxAccessToken}`;

  logApiCall(url); // Log the API call with a timestamp

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // Optional: some APIs may require a user-agent
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Mapbox: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching data from Mapbox:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from Mapbox' });
  }
});

// Proxy route to handle various requests including JSON, RSS, HTML, and binary data
app.get('/proxy', async (req, res) => {
  const apiUrl = req.query.url;
  if (!apiUrl) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  logApiCall(apiUrl); // Log the API call with a timestamp

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0', // Some servers may require a User-Agent header
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${apiUrl}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for all requests
    res.setHeader('Cache-Control', 'no-store'); // Prevent caching

    // Handle JSON (for APIs)
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);

      // Handle RSS feeds
    } else if (
      contentType &&
      (contentType.includes('application/rss+xml') ||
        contentType.includes('application/xml'))
    ) {
      const data = await response.text();
      const parser = new FeedMe(true); // 'true' makes the parser output JSON
      parser.write(data);
      const rssData = parser.done();
      res.json(rssData);

      // Handle HTML (for Wikipedia parsing)
    } else if (contentType && contentType.includes('text/html')) {
      const html = await response.text();
      res.send(html);

      // Handle binary data (for satellite/radar tiles)
    } else if (
      contentType &&
      (contentType.startsWith('image/') ||
        contentType.includes('octet-stream'))
    ) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    } else {
      // Default: treat as binary data
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader(
        'Content-Type',
        contentType || 'application/octet-stream'
      );
      res.send(buffer);
    }
  } catch (error) {
    console.error('Error fetching URL:', error.message);
    res.status(500).json({ error: `Failed to fetch URL: ${error.message}` });
  }
});

// Dedicated route to handle image requests to address CORS issues
app.get('/proxy-image', async (req, res) => {
  const apiUrl = req.query.url;
  if (!apiUrl) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  logApiCall(apiUrl); // Log the API call with a timestamp

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${apiUrl}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.startsWith('image/')) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store'); // Prevent caching
      res.send(buffer);
    } else {
      res.status(400).json({ error: 'Not an image' });
    }
  } catch (error) {
    console.error('Error fetching image:', error.message);
    res.status(500).json({ error: `Failed to fetch image: ${error.message}` });
  }
});

// Dedicated route to fetch and parse RSS feeds
app.get('/rss', async (req, res) => {
  const feedUrl = req.query.url;
  if (!feedUrl) {
    return res.status(400).json({ error: 'No RSS feed URL provided' });
  }

  logApiCall(feedUrl); // Log the API call with a timestamp

  try {
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cache-Control': 'no-cache',
      },
    });

    if (response.ok) {
      const data = await response.text();
      const parser = new FeedMe(true); // 'true' makes the parser output JSON
      parser.write(data);
      const rssData = parser.done();

      // Ensure we send only the relevant parts of the RSS data
      const items = rssData.items || [];
      res.json(items);
    } else {
      res
        .status(response.status)
        .json({ error: `Failed to fetch RSS feed: ${response.statusText}` });
    }
  } catch (error) {
    console.error(`Error fetching RSS feed: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

// New route to interact with agent1.py
app.post('/api/llm', async (req, res) => {
  const { prompt, max_length } = req.body;

  try {
    const response = await fetch('http://localhost:5001/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_length }),
    });

    if (!response.ok) {
      throw new Error(`Error from agent1.py: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error communicating with agent1.py:', error.message);
    res.status(500).json({ error: 'Failed to get response from LLM' });
  }
});

// Enable preflight request handling for CORS (OPTIONS method)
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, sentry-trace, baggage');
  res.sendStatus(200);
});

// Start the server
app.listen(port, () => {
  console.log(`✅ General Server is running on port ${port}`);
});
