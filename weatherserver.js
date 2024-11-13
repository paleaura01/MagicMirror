// weatherserver.js

import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv'; // Import dotenv using ES module syntax

dotenv.config(); // Load environment variables

const app = express();
const port = 8085;

// Enable CORS for all routes, including handling preflight requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, sentry-trace, baggage'
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: *; script-src 'self';"
  );

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

app.get('/weather', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const apiKey = process.env.ACCU_WEATHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AccuWeather API key is not set' });
  }

  try {
    // Get Location Key
    const locationUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lon}`;
    logApiCall(locationUrl);
    const locationResponse = await fetch(locationUrl);
    if (!locationResponse.ok) {
      throw new Error(`Failed to fetch location data: ${locationResponse.statusText}`);
    }
    const locationData = await locationResponse.json();
    const locationKey = locationData.Key;

    // Get Current Conditions and Forecast
    const currentConditionsUrl = `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true`;
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/1day/${locationKey}?apikey=${apiKey}&details=true`;

    logApiCall(currentConditionsUrl);
    logApiCall(forecastUrl);

    const [currentConditionsResponse, forecastResponse] = await Promise.all([
      fetch(currentConditionsUrl),
      fetch(forecastUrl),
    ]);

    if (!currentConditionsResponse.ok) {
      throw new Error(`Failed to fetch current conditions: ${currentConditionsResponse.statusText}`);
    }
    if (!forecastResponse.ok) {
      throw new Error(`Failed to fetch forecast data: ${forecastResponse.statusText}`);
    }

    const currentConditions = await currentConditionsResponse.json();
    const forecastData = await forecastResponse.json();

    // Send the data back to the client
    res.json({ currentConditions, forecastData });
  } catch (error) {
    console.error('Error fetching AccuWeather data:', error.message);
    res.status(500).json({ error: `Failed to fetch AccuWeather data: ${error.message}` });
  }
});

// Enable preflight request handling for CORS (OPTIONS method)
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, sentry-trace, baggage'
  );
  res.sendStatus(200);
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Weather Server is running on port ${port}`);
});
