<script>
    import { onMount, onDestroy } from 'svelte';
    import './weatherforecast_styles.css';
    import dayjs from 'dayjs';
    import { sunriseSunsetStore } from '../../stores/weatherStore.js';
    import { get } from 'svelte/store';

    export let lat = 35.2080;
    export let lon = -81.3673;

    let forecastData = [];
    let error = null;
    let updateInterval;

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

    // Determine if it's day or night based on sunrise and sunset times
    function isDaytime(sunrise, sunset) {
        const now = dayjs();
        return now.isAfter(dayjs(sunrise)) && now.isBefore(dayjs(sunset));
    }

    async function fetchWeatherData() {
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
        const data = await response.json();

        if (!data.daily) {
            throw new Error("Forecast data not available");
        }

        // Log weather codes for debugging
        console.log("Weather codes for each day:", data.daily.weathercode);

        // Get sunrise and sunset from the store
        const { sunrise, sunset } = get(sunriseSunsetStore);
        const isDay = isDaytime(sunrise, sunset);

        // Populate forecast data and convert temperatures to Fahrenheit
        forecastData = data.daily.time.map((date, index) => {
            const maxTempC = data.daily.temperature_2m_max[index];
            const minTempC = data.daily.temperature_2m_min[index];
            const maxTempF = (maxTempC * 9 / 5) + 32;
            const minTempF = (minTempC * 9 / 5) + 32;
            const weatherCode = data.daily.weathercode[index].toString();
            const icon = iconMap[weatherCode] ? (isDay ? iconMap[weatherCode].day : iconMap[weatherCode].night) : iconMap["default"].day;

            return {
                day: dayjs(date).format('ddd'),
                maxTemp: maxTempF.toFixed(1),
                minTemp: minTempF.toFixed(1),
                icon
            };
        });
    } catch (err) {
        error = err.message;
    }
}


    // Fetch weather data initially and set up periodic updates
    onMount(() => {
        fetchWeatherData();
        updateInterval = setInterval(fetchWeatherData, 1800000);
    });

    // Clean up interval when component is destroyed
    onDestroy(() => {
        clearInterval(updateInterval);
    });
</script>

<div class="weather-forecast">
    {#if error}
        <p>{error}</p>
    {:else if forecastData.length > 0}
        <div class="forecast-wrapper">
            <div class="forecast-header">
                <h2>King's Mountain, NC</h2>
            </div>
            <div class="forecast-container">
                {#each forecastData as dayForecast}
                    <div class="forecast-day">
                        <div class="forecast-day-name">{dayForecast.day}</div>
                        <div class="icon-container">
                        <img src={dayForecast.icon} alt="Weather Icon" class="forecast-icon" />
                        </div>
                        <div class="forecast-temp">
                            <div class="max-temp">{dayForecast.maxTemp}°</div>
                            <div class="min-temp">{dayForecast.minTemp}°</div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {:else}
        <p>Loading forecast...</p>
    {/if}
</div>
