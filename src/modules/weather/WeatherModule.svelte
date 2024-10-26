<script>
  import { onMount } from 'svelte';
  import dayjs from 'dayjs';
  import './weather_styles.css';
  import { sunriseSunsetStore } from '../../stores/weatherStore.js';

  let weatherData = null;
  let error = null;

  const lat = 35.2080;
  const lon = -81.3673;

  const iconMap = {
    "0": { day: "/src/modules/weatherforecast/icons/36.png", night: "/src/modules/weatherforecast/icons/31.png" }, // Clear sky
    "1": { day: "/src/modules/weatherforecast/icons/34.png", night: "/src/modules/weatherforecast/icons/33.png" }, // Mainly clear
    "2": { day: "/src/modules/weatherforecast/icons/30.png", night: "/src/modules/weatherforecast/icons/27.png" }, // Partly cloudy
    "3": { day: "/src/modules/weatherforecast/icons/26.png", night: "/src/modules/weatherforecast/icons/26.png" }, // Overcast
    "9": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/45.png" }, // Light rain showers
    "10": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/45.png" }, // Moderate rain showers
    "11": { day: "/src/modules/weatherforecast/icons/35.png", night: "/src/modules/weatherforecast/icons/35.png" }, // Thunderstorms
    "13": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/46.png" }, // Snow showers
    "50": { day: "/src/modules/weatherforecast/icons/22.png", night: "/src/modules/weatherforecast/icons/22.png" }, // Fog
    "51": { day: "/src/modules/weatherforecast/icons/24.png", night: "/src/modules/weatherforecast/icons/24.png" }, // Drizzle
    "53": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" }, // Rain
    "19": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" }, // Mist
    "44": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" }, // Not available
    "63": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/45.png" }, // Light rain
    "65": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },
    "default": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" } // Default
};

  const isDaytime = (sunrise, sunset) => {
    const now = dayjs();
    return now.isAfter(dayjs(sunrise)) && now.isBefore(dayjs(sunset));
  };

  const isBeforeSunrise = (sunrise) => {
    const now = dayjs();
    return now.isBefore(dayjs(sunrise));
  };

  onMount(async () => {
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto&daily=sunrise,sunset`);
      const data = await response.json();

      if (!data.current_weather) {
        throw new Error("Weather data not available");
      }

      const tempCelsius = data.current_weather.temperature;
      const tempFahrenheit = (tempCelsius * 9/5) + 32;
      const feelsLike = calculateFeelsLike(tempFahrenheit, data.current_weather.windspeed, 50);
      
      const windspeedMph = (data.current_weather.windspeed * 2.23694).toFixed(1); // Convert wind speed to mph

      const sunrise = data.daily.sunrise[0];
      const sunset = data.daily.sunset[0];
      const isDay = isDaytime(sunrise, sunset);

      const weatherCode = data.current_weather.weathercode.toString();
      const icon = iconMap[weatherCode] ? (isDay ? iconMap[weatherCode].day : iconMap[weatherCode].night) : iconMap["default"].day;

      weatherData = {
        temperature: tempFahrenheit.toFixed(1),
        feelsLike: feelsLike.toFixed(1),
        windspeed: windspeedMph,
        windDirection: getCardinalDirection(data.current_weather.winddirection),
        sunrise: dayjs(sunrise).format('HH:mm'),
        sunset: dayjs(sunset).format('HH:mm'),
        weatherIcon: icon,
        description: getWeatherDescription(weatherCode),
        showSunrise: isBeforeSunrise(sunrise) || (!isDay && dayjs().isAfter(dayjs(sunset)))
      };

      sunriseSunsetStore.set({
        sunrise: dayjs(sunrise),
        sunset: dayjs(sunset)
      });

    } catch (err) {
      error = err.message;
    }
  });

  const getCardinalDirection = (angle) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(angle / 22.5) % 16;
    return directions[index];
  };

  const calculateFeelsLike = (temperature, windSpeed, humidity) => {
    return temperature - ((windSpeed / 3.6) * 0.7);
  };

  const getWeatherDescription = (code) => {
    const descriptions = {
      "0": "Clear Skies",
      "1": "Mainly Clear",
      "2": "Partly Cloudy",
      "3": "Overcast",
      "9": "Showers",
      "10": "Rain",
      "11": "Thunderstorms",
      "13": "Snow",
      "50": "Fog"
    };
    return descriptions[code] || "Unknown Condition";
  };
</script>

<div class="weather">
  {#if error}
    <p>{error}</p>
  {:else if weatherData}
    <div class="top-info">
      <span class="wind-info">
        <i class="wi wi-strong-wind"></i> {weatherData.windspeed} mph {weatherData.windDirection}
      </span>
      <span class="sunrise-sunset">
        <i class="wi wi-sunrise"></i> 
        {weatherData.showSunrise ? weatherData.sunrise : weatherData.sunset}
      </span>
    </div>

    <div class="current-weather">
      <img src={weatherData.weatherIcon} alt="Weather Icon" class="weather-icon"/>
      <span class="temperature">{weatherData.temperature}°</span>
    </div>

    <div class="feels-like">
      {weatherData.description} - Feels like {weatherData.feelsLike}°
    </div>
  {:else}
    <p>Loading weather...</p>
  {/if}
</div>
