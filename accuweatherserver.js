import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';

dotenv.config(); // Load environment variables

const dataFilePath = path.resolve('src/modules/weather/accuweatherData.json');
const apiKeys = [
  process.env.ACCU_WEATHER_API_KEY1,
  process.env.ACCU_WEATHER_API_KEY2,
  process.env.ACCU_WEATHER_API_KEY3,
  process.env.ACCU_WEATHER_API_KEY4,
  process.env.ACCU_WEATHER_API_KEY5,
].filter(Boolean); // Filter out any undefined keys
let currentApiKeyIndex = 0;

if (apiKeys.length === 0) {
  console.error('No API keys loaded. Please check your .env file.');
  process.exit(1);
}

// Helper function to get the current API key
const getCurrentApiKey = () => apiKeys[currentApiKeyIndex];

// Helper function to switch to the next API key
const switchToNextApiKey = () => {
  currentApiKeyIndex = (currentApiKeyIndex + 1) % apiKeys.length;
  console.log(`Switched to API key: ${getCurrentApiKey()}`);
};

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

// Schedule the next API call based on specific times
const scheduleDailyUpdates = (callback) => {
  const scheduleTimes = ['06:00', '12:00', '18:00'];

  scheduleTimes.forEach((time) => {
    const now = dayjs();
    let nextTime = dayjs(`${now.format('YYYY-MM-DD')}T${time}`);
    if (nextTime.isBefore(now)) {
      nextTime = nextTime.add(1, 'day');
    }

    const delay = nextTime.diff(now);
    console.log(`Scheduled update for: ${nextTime.format('YYYY-MM-DD HH:mm:ss')}`);

    setTimeout(() => {
      callback().then(() => scheduleDailyUpdates(callback)); // Reschedule after execution
    }, delay);
  });
};

// Function to map pollen categories based on value
const mapPollenCategory = (name, value) => {
  const ranges = {
    Grass: [
      { category: 'Low', min: 0, max: 4.99 },
      { category: 'Moderate', min: 5, max: 19.99 },
      { category: 'High', min: 20, max: 199.99 },
      { category: 'Very High', min: 200, max: 299.99 },
      { category: 'Extreme', min: 300, max: 1000000 },
    ],
    Mold: [
      { category: 'Low', min: 0, max: 6499.99 },
      { category: 'Moderate', min: 6500, max: 12999.99 },
      { category: 'High', min: 13000, max: 49999.99 },
      { category: 'Very High', min: 50000, max: 64999.99 },
      { category: 'Extreme', min: 65000, max: 1000000 },
    ],
    Ragweed: [
      { category: 'Low', min: 0, max: 9.99 },
      { category: 'Moderate', min: 10, max: 49.99 },
      { category: 'High', min: 50, max: 499.99 },
      { category: 'Very High', min: 500, max: 649.99 },
      { category: 'Extreme', min: 650, max: 1000000 },
    ],
    Tree: [
      { category: 'Low', min: 0, max: 14.99 },
      { category: 'Moderate', min: 15, max: 89.99 },
      { category: 'High', min: 90, max: 1499.99 },
      { category: 'Very High', min: 1500, max: 2999.99 },
      { category: 'Extreme', min: 3000, max: 1000000 },
    ],
  };

  const categoryRange = ranges[name]?.find(
    (range) => value >= range.min && value <= range.max
  );
  return categoryRange ? categoryRange.category : 'Unknown';
};

// Function to fetch and update weather data along with AQI
const fetchAndUpdateWeatherData = async () => {
  const lat = process.env.DEFAULT_LATITUDE;
  const lon = process.env.DEFAULT_LONGITUDE;

  if (!lat || !lon) {
    console.error('Latitude or longitude is not defined. Please check your environment variables.');
    return;
  }

  let retryCount = 0;

  while (retryCount < apiKeys.length) {
    try {
      const apiKey = getCurrentApiKey();
      console.log(`Using API key: ${apiKey}`);
      const locationUrl = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lon}`;
      const locationResponse = await fetch(locationUrl);

      if (!locationResponse.ok) {
        if (locationResponse.status === 403 || locationResponse.status === 401) {
          console.error(`API key failed: ${apiKey} (${locationResponse.status})`);
          switchToNextApiKey();
          retryCount++;
          continue;
        }
        throw new Error(`Failed to fetch location data: ${locationResponse.status} - ${locationResponse.statusText}`);
      }

      const locationData = await locationResponse.json();
      const locationKey = locationData.Key;

      const currentConditionsUrl = `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true`;
      const currentConditionsResponse = await fetch(currentConditionsUrl);

      if (!currentConditionsResponse.ok) {
        throw new Error(`Failed to fetch current conditions: ${currentConditionsResponse.status} - ${currentConditionsResponse.statusText}`);
      }

      const currentConditions = await currentConditionsResponse.json();

      const forecastUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/1day/${locationKey}?apikey=${apiKey}&details=true`;
      const forecastResponse = await fetch(forecastUrl);

      if (!forecastResponse.ok) {
        throw new Error(`Failed to fetch forecast data: ${forecastResponse.status} - ${forecastResponse.statusText}`);
      }

      const forecastData = await forecastResponse.json();
      const airAndPollen = forecastData.DailyForecasts[0].AirAndPollen || [];

      const pollenData = airAndPollen
        .filter((item) => ['Grass', 'Tree', 'Ragweed', 'Mold'].includes(item.Name))
        .map((item) => ({
          ...item,
          Category: mapPollenCategory(item.Name, item.Value),
        }));

      const aqiData = airAndPollen.find((item) => item.Name === 'AirQuality');
      const sunrise = forecastData.DailyForecasts[0].Sun.Rise || 'N/A';
      const sunset = forecastData.DailyForecasts[0].Sun.Set || 'N/A';

      const weatherData = {
        timestamp: new Date().toISOString(),
        sunrise,
        sunset,
        currentConditions,
        pollenData,
        airQuality: aqiData ? { category: aqiData.Category, value: aqiData.Value } : { category: 'N/A', value: 'N/A' },
      };

      await writeJsonFile(dataFilePath, weatherData);
      console.log('Weather and AQI data updated successfully.');
      return; // Exit on success
    } catch (error) {
      console.error(`Error fetching data: ${error.message}`);
      if (retryCount === apiKeys.length - 1) console.error('All API keys have been exhausted.');
      switchToNextApiKey();
      retryCount++;
    }
  }
};

// Initialize weather data on script start
const initializeWeatherData = async () => {
  await fetchAndUpdateWeatherData();
  scheduleDailyUpdates(fetchAndUpdateWeatherData);
};

// Start the process
initializeWeatherData();
setInterval(() => console.log('Server is running...'), 60000); // Keep script running
