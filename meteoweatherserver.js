import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config(); // Load environment variables

const dataFilePath = path.resolve('src/meteoweatherData.json');

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
      return null;
    } else if (error instanceof SyntaxError) {
      console.log(`Invalid JSON format in ${filePath}: ${error.message}`);
      return null;
    }
    throw error;
  }
};

// Helper function to write JSON data to the file
const writeJsonFile = async (filePath, data) => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

// Function to convert wind direction to compass letter
const getCompassDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'];
  const index = Math.round((degrees % 360) / 22.5);
  return directions[index];
};

// Function to fetch and update weather data
const fetchAndUpdateWeatherData = async () => {
  const lat = process.env.DEFAULT_LATITUDE;
  const lon = process.env.DEFAULT_LONGITUDE;

  if (!lat || !lon) {
    console.error('Latitude or longitude is not defined. Please check your environment variables.');
    return;
  }

  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&daily=sunrise,sunset&hourly=apparent_temperature,relative_humidity_2m`;

    console.log(`Fetching weather data from: ${weatherUrl}`);

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error(`Failed to fetch weather data: ${weatherResponse.status} - ${weatherResponse.statusText}`);
    }

    const weatherData = await weatherResponse.json();
    const { current_weather, daily, hourly } = weatherData;

    const windDirectionCode = current_weather.winddirection;
    const windDirectionLetter = getCompassDirection(windDirectionCode);

    const weatherInfo = {
      timestamp: new Date().toISOString(),
      temperature: current_weather.temperature,
      feelsLike: hourly.apparent_temperature[0], // First hourly value for apparent temperature
      humidity: hourly.relative_humidity_2m[0], // First hourly value for relative humidity
      windSpeed: current_weather.windspeed,
      windDirection: {
        degrees: windDirectionCode,
        compass: windDirectionLetter
      },
      weatherCode: current_weather.weathercode,
      weatherDescription: mapWeatherDescription(current_weather.weathercode),
      sunrise: daily.sunrise[0], // First daily value for sunrise
      sunset: daily.sunset[0], // First daily value for sunset
    };

    await writeJsonFile(dataFilePath, weatherInfo);
    console.log('Weather data updated successfully:', weatherInfo);
  } catch (error) {
    console.error(`Error fetching weather data: ${error.message}`);
  }
};

// Map weather code to description
const mapWeatherDescription = (code) => {
  const descriptions = {
    0: "Clear Skies",
    1: "Mostly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    71: "Slight Snow",
    73: "Moderate Snow",
    75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm With Slight Hail",
    99: "Thunderstorm With Heavy Hail",
  };
  return descriptions[code] || 'Unknown';
};

// Function to start periodic updates
const startWeatherUpdate = () => {
  fetchAndUpdateWeatherData();
  setInterval(fetchAndUpdateWeatherData, 10 * 60 * 1000); // Update every 10 minutes
};

// Ensure data file is created or valid on script start
const initializeWeatherData = async () => {
  const existingData = await readJsonFile(dataFilePath);
  if (!existingData) {
    console.log('No valid data found. Fetching initial data.');
    await fetchAndUpdateWeatherData();
  } else {
    console.log('Existing valid data found. Starting updates.');
  }
  startWeatherUpdate();
};

// Start the process
initializeWeatherData();
