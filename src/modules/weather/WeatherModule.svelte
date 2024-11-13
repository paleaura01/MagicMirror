<!-- ./src/modules/weather/WeatherModule.svelte -->

<script>
  import { onMount, onDestroy } from 'svelte';
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  import timezone from 'dayjs/plugin/timezone';
  import './weather_styles.css';
  import {
    sunriseSunsetStore,
    isDaytimeStore,
    updateSunriseSunset,
    setModuleReady
  } from '../../stores/weatherStore.js';
  import MeteoconsWindFill from './icons/MeteoconsWindFill.svelte';
  import MeteoconsWindOnshore from './icons/MeteoconsWindOnshore.svelte'; // For Air Quality Index
  import MeteoconsHurricaneFill from './icons/MeteoconsHurricaneFill.svelte';
  import MeteoconsHumidityFill from './icons/MeteoconsHumidityFill.svelte';
  import MeteoconsSunriseFill from './icons/MeteoconsSunriseFill.svelte';
  import MeteoconsMoonsetFill from './icons/MeteoconsMoonsetFill.svelte';
  import MeteoconsPollenFill from './icons/MeteoconsPollenFill.svelte'; // For Mold
  import MeteoconsPollenGrassFill from './icons/MeteoconsPollenGrassFill.svelte';
  import MeteoconsPollenFlowerFill from './icons/MeteoconsPollenFlowerFill.svelte'; // For Ragweed
  import MeteoconsPollenTreeFill from './icons/MeteoconsPollenTreeFill.svelte';

  dayjs.extend(utc);
  dayjs.extend(timezone);

  let weatherData = null;
  let error = null;
  const lat = 35.2080;
  const lon = -81.3673;
  const userTimezone = dayjs.tz.guess();
  let sunrise = null;
  let sunset = null;
  let isDaytime;
  let intervalId;
  let currentPollenIndex = 0;
  let displayedPollen = null;
  let pollenIntervalId;

  const iconMap = {
    "1": { day: "/src/modules/weatherforecast/icons/32.png", night: "/src/modules/weatherforecast/icons/31.png" }, // Sunny
    "2": { day: "/src/modules/weatherforecast/icons/34.png", night: "/src/modules/weatherforecast/icons/33.png" }, // Mostly Sunny
    "3": { day: "/src/modules/weatherforecast/icons/30.png", night: "/src/modules/weatherforecast/icons/29.png" }, // Partly Sunny
    "4": { day: "/src/modules/weatherforecast/icons/28.png", night: "/src/modules/weatherforecast/icons/27.png" }, // Intermittent Clouds
    "5": { day: "/src/modules/weatherforecast/icons/26.png", night: "/src/modules/weatherforecast/icons/26.png" }, // Hazy Sunshine
    "6": { day: "/src/modules/weatherforecast/icons/44.png", night: "/src/modules/weatherforecast/icons/44.png" }, // Mostly Cloudy
    "7": { day: "/src/modules/weatherforecast/icons/28.png", night: "/src/modules/weatherforecast/icons/27.png" }, // Cloudy
    "8": { day: "/src/modules/weatherforecast/icons/26.png", night: "/src/modules/weatherforecast/icons/26.png" }, // Dreary (Overcast)
    "11": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" }, // Fog
    "12": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" }, // Showers
    "13": { day: "/src/modules/weatherforecast/icons/39.png", night: "/src/modules/weatherforecast/icons/45.png" }, // Mostly Cloudy with Showers
    "14": { day: "/src/modules/weatherforecast/icons/39.png", night: "/src/modules/weatherforecast/icons/45.png" }, // Partly Sunny with Showers
    "15": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" }, // Thunderstorms
    "16": { day: "/src/modules/weatherforecast/icons/38.png", night: "/src/modules/weatherforecast/icons/47.png" }, // Mostly Cloudy with Thunderstorms
    "17": { day: "/src/modules/weatherforecast/icons/37.png", night: "/src/modules/weatherforecast/icons/47.png" }, // Partly Sunny with Thunderstorms
    "18": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Rain
    "19": { day: "/src/modules/weatherforecast/icons/13.png", night: "/src/modules/weatherforecast/icons/13.png" }, // Flurries
    "20": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" }, // Mostly Cloudy with Flurries
    "21": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" }, // Partly Sunny with Flurries
    "22": { day: "/src/modules/weatherforecast/icons/16.png", night: "/src/modules/weatherforecast/icons/16.png" }, // Snow
    "23": { day: "/src/modules/weatherforecast/icons/16.png", night: "/src/modules/weatherforecast/icons/16.png" }, // Mostly Cloudy with Snow
    "24": { day: "/src/modules/weatherforecast/icons/16.png", night: "/src/modules/weatherforecast/icons/16.png" }, // Ice
    "25": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" }, // Sleet
    "26": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" }, // Freezing Rain
    "29": { day: "/src/modules/weatherforecast/icons/6.png", night: "/src/modules/weatherforecast/icons/6.png" }, // Rain and Snow
    "30": { day: "/src/modules/weatherforecast/icons/2.png", night: "/src/modules/weatherforecast/icons/2.png" }, // Hot
    "31": { day: "/src/modules/weatherforecast/icons/25.png", night: "/src/modules/weatherforecast/icons/25.png" }, // Cold
    "32": { day: "/src/modules/weatherforecast/icons/24.png", night: "/src/modules/weatherforecast/icons/24.png" }, // Windy
    "33": { day: "/src/modules/weatherforecast/icons/31.png", night: "/src/modules/weatherforecast/icons/31.png" }, // Clear
    "34": { day: "/src/modules/weatherforecast/icons/33.png", night: "/src/modules/weatherforecast/icons/33.png" }, // Mostly Clear
    "35": { day: "/src/modules/weatherforecast/icons/29.png", night: "/src/modules/weatherforecast/icons/29.png" }, // Partly Cloudy
    "36": { day: "/src/modules/weatherforecast/icons/27.png", night: "/src/modules/weatherforecast/icons/27.png" }, // Intermittent Clouds
    "37": { day: "/src/modules/weatherforecast/icons/26.png", night: "/src/modules/weatherforecast/icons/26.png" }, // Hazy Moonlight
    "38": { day: "/src/modules/weatherforecast/icons/26.png", night: "/src/modules/weatherforecast/icons/26.png" }, // Mostly Cloudy
    "39": { day: "/src/modules/weatherforecast/icons/45.png", night: "/src/modules/weatherforecast/icons/45.png" }, // Partly Cloudy with Showers
    "40": { day: "/src/modules/weatherforecast/icons/45.png", night: "/src/modules/weatherforecast/icons/45.png" }, // Mostly Cloudy with Showers
    "41": { day: "/src/modules/weatherforecast/icons/47.png", night: "/src/modules/weatherforecast/icons/47.png" }, // Partly Cloudy with Thunderstorms
    "42": { day: "/src/modules/weatherforecast/icons/47.png", night: "/src/modules/weatherforecast/icons/47.png" }, // Mostly Cloudy with Thunderstorms
    "43": { day: "/src/modules/weatherforecast/icons/46.png", night: "/src/modules/weatherforecast/icons/46.png" }, // Mostly Cloudy with Flurries
    "44": { day: "/src/modules/weatherforecast/icons/46.png", night: "/src/modules/weatherforecast/icons/46.png" }, // Mostly Cloudy with Snow
    "default": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" }
  };

  isDaytimeStore.subscribe(value => {
    isDaytime = value;
    if (weatherData) {
      weatherData.weatherIcon = getWeatherIcon(weatherData.weatherCode);
    }
  });

  function getWeatherIcon(code) {
    return iconMap[code]
      ? isDaytime
        ? iconMap[code].day
        : iconMap[code].night
      : iconMap["default"][isDaytime ? "day" : "night"];
  }

  function getWeatherDescription(code) {
    const descriptions = {
      "1": "Sunny",
      "2": "Mostly Sunny",
      "3": "Partly Sunny",
      "4": "Intermittent Clouds",
      "5": "Hazy Sunshine",
      "6": "Mostly Cloudy",
      "7": "Cloudy",
      "8": "Dreary (Overcast)",
      "11": "Fog",
      "12": "Showers",
      "13": "Mostly Cloudy with Showers",
      "14": "Partly Sunny with Showers",
      "15": "Thunderstorms",
      "16": "Mostly Cloudy with Thunderstorms",
      "17": "Partly Sunny with Thunderstorms",
      "18": "Rain",
      "19": "Flurries",
      "20": "Mostly Cloudy with Flurries",
      "21": "Partly Sunny with Flurries",
      "22": "Snow",
      "23": "Mostly Cloudy with Snow",
      "24": "Ice",
      "25": "Sleet",
      "26": "Freezing Rain",
      "29": "Rain and Snow",
      "30": "Hot",
      "31": "Cold",
      "32": "Windy",
      "33": "Clear",
      "34": "Mostly Clear",
      "35": "Partly Cloudy",
      "36": "Intermittent Clouds",
      "37": "Hazy Moonlight",
      "38": "Mostly Cloudy",
      "39": "Partly Cloudy with Showers",
      "40": "Mostly Cloudy with Showers",
      "41": "Partly Cloudy with Thunderstorms",
      "42": "Mostly Cloudy with Thunderstorms",
      "43": "Mostly Cloudy with Flurries",
      "44": "Mostly Cloudy with Snow",
      "default": "Unknown"
    };
    return descriptions[code] || descriptions["default"];
  }

  function getPollenIcon(pollenName) {
    switch (pollenName) {
      case 'Grass':
        return MeteoconsPollenGrassFill;
      case 'Tree':
        return MeteoconsPollenTreeFill;
      case 'Ragweed':
        return MeteoconsPollenFlowerFill;
      case 'Mold':
        return MeteoconsPollenFill;
      default:
        return null;
    }
  }

  async function fetchWeatherData() {
    try {
      const response = await fetch(`http://localhost:8085/weather?lat=${lat}&lon=${lon}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const { currentConditions, forecastData } = data;

      const windSpeed = currentConditions[0].Wind.Speed.Imperial.Value;
      const windSpeedUnit = currentConditions[0].Wind.Speed.Imperial.Unit;

      // Determine if wind speed is at hurricane level (74 mph or higher)
      const isHurricane = windSpeed >= 74;

      if (forecastData.DailyForecasts && forecastData.DailyForecasts.length > 0) {
        sunrise = dayjs(forecastData.DailyForecasts[0].Sun.Rise).tz(userTimezone);
        sunset = dayjs(forecastData.DailyForecasts[0].Sun.Set).tz(userTimezone);
        updateSunriseSunset(sunrise, sunset);
      }

      // Fetch pollen and air quality data
      const airAndPollenData = forecastData.DailyForecasts[0].AirAndPollen;

      // Extract pollen data
      const pollenTypes = ['Grass', 'Tree', 'Ragweed', 'Mold'];
      const pollenDataArray = airAndPollenData
        .filter(p => pollenTypes.includes(p.Name))
        .map(pollen => {
          return {
            name: pollen.Name,
            category: mapPollenCategory(pollen.Name, pollen.Value),
            icon: getPollenIcon(pollen.Name)
          };
        });

      // Extract Air Quality Index
      const airQualityData = airAndPollenData.find(p => p.Name === 'AirQuality');
      const airQuality = airQualityData ? {
        category: mapAirQualityCategory(airQualityData.Value),
        icon: MeteoconsWindOnshore
      } : null;

      const weatherCode = currentConditions[0].WeatherIcon.toString();

      weatherData = {
        temperature: currentConditions[0].Temperature.Imperial.Value.toFixed(1),
        feelsLike: currentConditions[0].RealFeelTemperature.Imperial.Value.toFixed(1),
        windspeed: windSpeed.toFixed(1),
        windSpeedUnit,
        humidity: currentConditions[0].RelativeHumidity,
        sunrise: sunrise ? sunrise.format('HH:mm') : 'N/A',
        sunset: sunset ? sunset.format('HH:mm') : 'N/A',
        weatherIcon: isHurricane
          ? '/src/modules/weatherforecast/icons/hurricane.png'
          : getWeatherIcon(weatherCode),
        description: getWeatherDescription(weatherCode),
        pollenDataArray,
        airQuality,
        isHurricane,
        weatherCode,
      };
    } catch (err) {
      error = err.message;
      console.error("[WeatherModule] Error fetching weather data:", err);
    }
  }

  // Map pollen values to categories based on provided tables
  function mapPollenCategory(name, value) {
    const ranges = {
      'Grass': [
        { category: 'Low', min: 0, max: 4.99 },
        { category: 'Moderate', min: 5, max: 19.99 },
        { category: 'High', min: 20, max: 199.99 },
        { category: 'Very High', min: 200, max: 299.99 },
        { category: 'Extreme', min: 300, max: 1000000 }
      ],
      'Mold': [
        { category: 'Low', min: 0, max: 6499.99 },
        { category: 'Moderate', min: 6500, max: 12999.99 },
        { category: 'High', min: 13000, max: 49999.99 },
        { category: 'Very High', min: 50000, max: 64999.99 },
        { category: 'Extreme', min: 65000, max: 1000000 }
      ],
      'Ragweed': [
        { category: 'Low', min: 0, max: 9.99 },
        { category: 'Moderate', min: 10, max: 49.99 },
        { category: 'High', min: 50, max: 499.99 },
        { category: 'Very High', min: 500, max: 649.99 },
        { category: 'Extreme', min: 650, max: 1000000 }
      ],
      'Tree': [
        { category: 'Low', min: 0, max: 14.99 },
        { category: 'Moderate', min: 15, max: 89.99 },
        { category: 'High', min: 90, max: 1499.99 },
        { category: 'Very High', min: 1500, max: 2999.99 },
        { category: 'Extreme', min: 3000, max: 1000000 }
      ],
    };

    const categoryRanges = ranges[name];
    if (categoryRanges) {
      const category = categoryRanges.find(r => value >= r.min && value <= r.max);
      return category ? category.category : 'Unknown';
    }
    return 'Unknown';
  }

  // Map air quality values to categories based on Table 10
  function mapAirQualityCategory(value) {
    const ranges = [
      { category: 'Good', min: 0.00, max: 50.00 },
      { category: 'Moderate', min: 50.01, max: 100.00 },
      { category: 'Unhealthy for Sensitive Groups', min: 100.01, max: 150.00 },
      { category: 'Unhealthy', min: 150.01, max: 200.00 },
      { category: 'Very Unhealthy', min: 200.01, max: 300.00 },
      { category: 'Hazardous', min: 300.01, max: 100000.00 },
    ];

    const category = ranges.find(r => value >= r.min && value <= r.max);
    return category ? category.category : 'Unknown';
  }

  $: if (weatherData && weatherData.pollenDataArray.length > 0) {
    displayedPollen = weatherData.pollenDataArray[currentPollenIndex];
  }

  onMount(() => {
    fetchWeatherData(); // Initial fetch
    setModuleReady("WeatherModule");

    // Set up interval to fetch data every 10 minutes (600,000 milliseconds)
    intervalId = setInterval(fetchWeatherData, 600000);

    // Set up interval to rotate pollen data every 10 seconds
    pollenIntervalId = setInterval(() => {
      if (weatherData && weatherData.pollenDataArray.length > 0) {
        currentPollenIndex = (currentPollenIndex + 1) % weatherData.pollenDataArray.length;
      }
    }, 10000);
  });

  onDestroy(() => {
    clearInterval(intervalId); // Clear the interval when the component is destroyed
    clearInterval(pollenIntervalId);
  });
</script>

<div class="weather">
  {#if error}
    <p>{error}</p>
  {:else if weatherData}
    <div class="top-info">
      <!-- Pollen Icon and Level -->
      <div class="pollen-info">
        {#if displayedPollen}
          <svelte:component this={displayedPollen.icon} class="symbol" /> {displayedPollen.name}: {displayedPollen.category}
        {/if}
        <!-- Air Quality Index -->
        {#if weatherData.airQuality}
          <div class="air-quality">
            <svelte:component this={weatherData.airQuality.icon} class="symbol" />
 AQI: {weatherData.airQuality.category}
          </div>
        {/if}
      </div>
      <!-- Wind/Humidity -->
      <div class="wind-humidity">
        <div class="wind-info">
          {#if weatherData.isHurricane}
            <MeteoconsHurricaneFill class="symbol" /> {weatherData.windspeed} {weatherData.windSpeedUnit}
          {:else}
            <MeteoconsWindFill class="symbol" /> {weatherData.windspeed} {weatherData.windSpeedUnit}
          {/if}
        </div>
        <div class="humidity-info">
          <MeteoconsHumidityFill class="symbol" /> {weatherData.humidity}%
        </div>
      </div>
      <!-- Sunrise/Sunset -->
      <div class="sunrise-sunset">
        <div class="sunrise">
          <MeteoconsSunriseFill class="symbol" /> {weatherData.sunrise}
        </div>
        <div class="sunset">
          <MeteoconsMoonsetFill class="symbol" /> {weatherData.sunset}
        </div>
      </div>
    </div>
    <div class="current-weather">
      <img src={weatherData.weatherIcon} alt="Weather Icon" class="weather-icon" />
      <span class="temperature">{weatherData.temperature}°</span>
    </div>
    <div class="feels-like">Feels Like: {weatherData.feelsLike}°</div>
    <div class="description">{weatherData.description}</div>
  {:else}
    <p>Loading weather...</p>
  {/if}
</div>
