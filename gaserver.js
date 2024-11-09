import express from 'express';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { config } from 'dotenv';

config();

const app = express();
const port = 8083;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Logging helper
const logApiCall = (url) => {
  console.log(`[${new Date().toISOString()}] API called: ${url}`);
};

app.get('/gas-prices', async (req, res) => {
  const feedUrl =
    'https://df.gasbuddy.com/feed.df?k=VBh8S%2fpXF1FHiwWyX1QfnelHc54U2rkxmpP3E8a2bTws0hp2wtIa%2bTqordQMBbNXdE%2fl8MaX3Z0%3d&i=4890&ia=1&url=wbtv.com%2Ftraffic%2Fgas-prices%2F';

  logApiCall(feedUrl);

  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }

    const scriptContent = await response.text();

    // Use jsdom to simulate a browser environment
    const dom = new JSDOM(`<!DOCTYPE html><body><div id="gasbuddy_4890"></div></body>`, {
      runScripts: 'outside-only',
    });

    // Execute the JavaScript
    dom.window.eval(scriptContent);

    const gasData = [];
    let i = 0;

    while (true) {
      const priceElem = dom.window.document.querySelector(`#spnGB4890Price${i}`);
      const stationElem = dom.window.document.querySelector(`#spnGB4890StationNm${i}`);
      const addressElem = dom.window.document.querySelector(`#spnGB4890Address${i}`);
      const areaElem = dom.window.document.querySelector(`#spnGB4890Area${i}`);

      if (!priceElem || !stationElem || !addressElem || !areaElem) break;

      const price = priceElem.textContent.trim();
      const station = stationElem.textContent.trim();
      const address = addressElem.textContent.trim();
      const area = areaElem.textContent.trim();

      // Only include stations in Gastonia
      if (area.includes('Gastonia')) {
        gasData.push({ price, station, address });
      }

      i++;
    }

    res.json({ status: 'success', gasData });
  } catch (error) {
    console.error('Error fetching gas prices:', error.message);
    res.status(500).json({ error: 'Failed to fetch gas prices' });
  }
});

app.listen(port, () => {
  console.log(`✅ Gas server is running on port ${port}`);
});
