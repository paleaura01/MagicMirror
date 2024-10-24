import express from 'express';
import fetch from 'node-fetch';
import FeedMe from 'feedme'; // For RSS parsing

const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the "public" directory
app.use(express.static('public'));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Helper function to log API calls with timestamps
const logApiCall = (url) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] API called: ${url}`);
};

// Proxy route to handle both RSS, JSON, HTML, and binary requests (e.g., images)
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
    const contentType = response.headers.get('content-type');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for all requests

    // Handle JSON (for APIs)
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);

    // Handle RSS feeds
    } else if (contentType && (contentType.includes('application/rss+xml') || contentType.includes('application/xml'))) {
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
    } else if (contentType && (contentType.startsWith('image/') || contentType.includes('octet-stream'))) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', contentType);
      res.send(buffer);

    } else {
      // Default: treat as binary data
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.send(buffer);
    }
  } catch (error) {
    console.error('Error fetching URL:', error);
    res.status(500).json({ error: 'Failed to fetch URL' });
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
      res.status(response.status).json({ error: `Failed to fetch RSS feed: ${response.statusText}` });
    }
  } catch (error) {
    console.error(`Error fetching RSS feed: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`✅ General Server is running on port ${port}`);
});
