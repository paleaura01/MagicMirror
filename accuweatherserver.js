import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config(); // Load environment variables

const dataFilePath = path.resolve('src/accuweatherData.json');

// Helper function to read JSON data from the file
const readJsonFile = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    if (!data.trim()) {
      console.log('Data file is empty. Initializing fresh data.');
      return null;
    }
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Data file not found. Creating a new one.');
      return null; // File doesn't exist yet
    } else if (error instanceof SyntaxError) {
      console.log(`Invalid JSON format in ${filePath}: ${error.message}`);
      return null; // Return null to force data reinitialization
    }
    throw error;
  }
};

// Helper function to write JSON data to the file
const writeJsonFile = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// Schedule the next API call based on a specific time
const scheduleNextCall = (timestamp, callback) => {
  const delay = new Date(timestamp) - new Date();
  if (delay > 0) {
    setTimeout(callback, delay);
  }
};

// Function to fetch and update weather data along with AQI
const fetchAndUpdateWeatherData = async () => {
  const lat = process.env.DEFAULT_LATITUDE;
  const lon = process.env.DEFAULT_LONGITUDE;

  if (!lat || !lon) {
    console.error('Latitude or longitude is not defined. Please check your environment variables.');
    return;
  }

  const apiKey = process.env.ACCU_WEATHER_API_KEY;
  if (!apiKey) {
    console.error('AccuWeather API key is not set. Aborting.');
    return;
  }

  try {
    // Get Location Key
    const locationUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lon}`;
    const locationResponse = await fetch(locationUrl);

    if (!locationResponse.ok) {
      throw new Error(`Failed to fetch location data: ${locationResponse.status} - ${locationResponse.statusText}`);
    }

    const locationData = await locationResponse.json();
    const locationKey = locationData.Key;

    // Get Current Conditions
    const currentConditionsUrl = `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true`;
    const currentConditionsResponse = await fetch(currentConditionsUrl);

    if (!currentConditionsResponse.ok) {
      throw new Error(`Failed to fetch current conditions: ${currentConditionsResponse.status} - ${currentConditionsResponse.statusText}`);
    }

    const currentConditions = await currentConditionsResponse.json();

    // Get 1-Day Forecast to Extract AirAndPollen
    const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/1day/${locationKey}?apikey=${apiKey}&details=true`;
    const forecastResponse = await fetch(forecastUrl);

    if (!forecastResponse.ok) {
      throw new Error(`Failed to fetch forecast data: ${forecastResponse.status} - ${forecastResponse.statusText}`);
    }

    const forecastData = await forecastResponse.json();
    const airAndPollen = forecastData.DailyForecasts[0].AirAndPollen || [];

    const pollenData = airAndPollen.filter(item =>
      ['Grass', 'Tree', 'Ragweed', 'Mold'].includes(item.Name)
    );

    // Extract AQI data from AirAndPollen
    const aqiData = airAndPollen.find(item => item.Name === 'AirQuality');

    const sunrise = forecastData.DailyForecasts[0].Sun.Rise || 'N/A';
    const sunset = forecastData.DailyForecasts[0].Sun.Set || 'N/A';

    const weatherData = {
      timestamp: new Date().toISOString(),
      sunrise,
      sunset,
      currentConditions,
      pollenData,
      airQuality: aqiData ? { category: aqiData.Category, value: aqiData.Value } : { category: 'N/A', value: 'N/A' }
    };

    await writeJsonFile(dataFilePath, weatherData);
    console.log('Weather and AQI data updated successfully.');

    if (sunrise !== 'N/A') {
      scheduleNextCall(sunrise, fetchAndUpdateWeatherData);
    }
    if (sunset !== 'N/A') {
      scheduleNextCall(sunset, fetchAndUpdateWeatherData);
    }
  } catch (error) {
    console.error(`Error fetching AccuWeather data: ${error.message}`);
  }
};

// Ensure data file is created or valid on script start
const initializeWeatherData = async () => {
  const existingData = await readJsonFile(dataFilePath);
  if (!existingData) {
    console.log('No valid data found. Fetching initial data.');
    await fetchAndUpdateWeatherData();
  } else {
    console.log('Existing valid data found. Scheduling next updates.');
    const { sunrise, sunset } = existingData;
    scheduleNextCall(sunrise, fetchAndUpdateWeatherData);
    scheduleNextCall(sunset, fetchAndUpdateWeatherData);
  }
};

// Start the process
initializeWeatherData();
