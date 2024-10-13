import express from 'express';
import fetch from 'node-fetch';
import FeedMe from 'feedme'; // For RSS parsing

const app = express();
const port = process.env.PORT || 8080;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Function to fetch and parse RSS feed
const fetchRSSFeed = async (url) => {
  const items = [];
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cache-Control': 'no-cache'
      }
    });

    if (response.ok) {
      const data = await response.text();
      const parser = new FeedMe();

      parser.on('item', (item) => {
        const { title, link, description, pubdate } = item;
        items.push({ title, link, description, pubdate });
      });

      parser.end(data);
    } else {
      console.error(`Failed to fetch RSS feed: ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error fetching RSS feed: ${error.message}`);
  }

  return items;
};

// Route to proxy the RSS requests
app.get('/rss', async (req, res) => {
  const feedUrl = req.query.url;
  if (!feedUrl) {
    return res.status(400).json({ error: 'No RSS feed URL provided' });
  }

  try {
    const items = await fetchRSSFeed(feedUrl);
    res.json(items); // Send parsed RSS feed items as JSON
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`CORS proxy running on port ${port}`);
});