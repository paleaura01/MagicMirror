// generateFuelMap.js

import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config(); // Load environment variables

const app = express();
const port = 8083; // New server port
const fuelMapDir = path.resolve('./src/modules/fuelmap');
const fuelMapPath = path.join(fuelMapDir, 'fuelMap.js');

// Ensure fuelMap directory exists
if (!fs.existsSync(fuelMapDir)) {
  fs.mkdirSync(fuelMapDir, { recursive: true });
}

// Middleware for JSON requests
app.use(express.json());

// Enable CORS and add security headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: *; script-src 'self';");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Load existing fuel map data
const loadFuelMap = () => {
  if (fs.existsSync(fuelMapPath)) {
    delete require.cache[require.resolve(fuelMapPath)];
    return require(fuelMapPath);
  }
  return { date: '', prices: [] };
};

// Save updated fuel map data as JS file
const saveFuelMap = (data) => {
  const mapContent = `module.exports = ${JSON.stringify(data, null, 2)};`;
  fs.writeFileSync(fuelMapPath, mapContent, 'utf-8');
};

// Check if today is an allowed update day (Tuesday or Thursday)
const isAllowedUpdateDay = () => {
  const today = new Date();
  const day = today.getDay(); // 2 = Tuesday, 4 = Thursday
  return day === 2 || day === 4;
};

// Fetch fuel prices from RapidAPI's CheapFuelPrice API
const fetchFuelPrices = async () => {
  const lat = 35.2651481;
  const lon = -81.1674864;
  const url = `https://cheapfuel-price-api.p.rapidapi.com/stations/nearest?latitude=${lat}&longitude=${lon}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'cheapfuel-price-api.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed with status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching fuel prices:', error);
    throw error;
  }
};

// Endpoint to serve fuel map data if available
app.get('/fuel-map', (req, res) => {
  if (fs.existsSync(fuelMapPath)) {
    const fuelMapData = loadFuelMap();
    res.json(fuelMapData);
  } else {
    res.status(404).json({ error: 'Fuel map not found' });
  }
});

// API endpoint to trigger fuel map update
app.get('/update-fuel-map', async (req, res) => {
  const fuelMap = loadFuelMap();
  const today = new Date().toISOString().split('T')[0];

  if (fuelMap.date === today) {
    return res.status(200).json({ message: 'Fuel map is already up-to-date.' });
  }

  if (!isAllowedUpdateDay()) {
    return res.status(403).json({ message: 'Today is not an allowed update day.' });
  }

  try {
    const fuelData = await fetchFuelPrices();
    const formattedPrices = fuelData.stations.map((station) => ({
      name: station.name,
      address: station.address,
      price: station.regular,
    }));

    saveFuelMap({ date: today, prices: formattedPrices });

    res.status(200).json({ message: 'Fuel map updated successfully.', data: formattedPrices });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update fuel map.', error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Fuel map server is running on port ${port}`);
});
