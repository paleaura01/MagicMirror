<!-- ./src/modules/watherforecase/WeatherForecastModule.svelte -->


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
    let sunrise = null;
    let sunset = null;
    let previousIsDaytime = null;

    const iconMap = {
  "0": { day: "/src/modules/weatherforecast/icons/32.png", night: "/src/modules/weatherforecast/icons/31.png" }, // Clear sky
  "1": { day: "/src/modules/weatherforecast/icons/34.png", night: "/src/modules/weatherforecast/icons/33.png" }, // Mainly clear
  "2": { day: "/src/modules/weatherforecast/icons/30.png", night: "/src/modules/weatherforecast/icons/29.png" }, // Partly cloudy
  "3": { day: "/src/modules/weatherforecast/icons/28.png", night: "/src/modules/weatherforecast/icons/27.png" }, // Overcast
  "45": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" }, // Fog
  "48": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" }, // Depositing rime fog
  "51": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },   // Light drizzle
  "53": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },   // Moderate drizzle
  "55": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },   // Dense drizzle
  "56": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },   // Light freezing drizzle
  "57": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },   // Dense freezing drizzle
  "61": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" }, // Slight rain
  "63": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Moderate rain
  "65": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Heavy rain
  "66": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" }, // Light freezing rain
  "67": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" }, // Heavy freezing rain
  "71": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" }, // Slight snowfall
  "73": { day: "/src/modules/weatherforecast/icons/16.png", night: "/src/modules/weatherforecast/icons/16.png" }, // Moderate snowfall
  "75": { day: "/src/modules/weatherforecast/icons/41.png", night: "/src/modules/weatherforecast/icons/41.png" }, // Heavy snowfall
  "77": { day: "/src/modules/weatherforecast/icons/13.png", night: "/src/modules/weatherforecast/icons/13.png" }, // Snow grains
  "80": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" }, // Slight rain showers
  "81": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Moderate rain showers
  "82": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" }, // Violent rain showers
  "85": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" }, // Slight snow showers
  "86": { day: "/src/modules/weatherforecast/icons/42.png", night: "/src/modules/weatherforecast/icons/42.png" }, // Heavy snow showers
  "95": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },   // Thunderstorm
  "96": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },   // Thunderstorm with slight hail
  "99": { day: "/src/modules/weatherforecast/icons/3.png", night: "/src/modules/weatherforecast/icons/3.png" },   // Thunderstorm with heavy hail
  "default": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" } // Default
};


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

            const { sunrise, sunset } = get(sunriseSunsetStore);
            const isDay = isDaytime(sunrise, sunset);

            forecastData = data.daily.time.map((date, index) => {
                const maxTempC = data.daily.temperature_2m_max[index];
                const minTempC = data.daily.temperature_2m_min[index];
                const maxTempF = (maxTempC * 9 / 5) + 32;
                const minTempF = (minTempC * 9 / 5) + 32;
                const weatherCode = data.daily.weathercode[index].toString();

                // Log the weather code for each day
                console.log(`[Debug] Weather code for ${dayjs(date).format('dddd')}: ${weatherCode}`);

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

    // Reactive statement to detect day/night transition
    $: {
        sunriseSunsetStore.subscribe(({ sunrise: newSunrise, sunset: newSunset }) => {
            sunrise = newSunrise;
            sunset = newSunset;
            const currentIsDaytime = isDaytime(sunrise, sunset);

            if (previousIsDaytime === null) {
                previousIsDaytime = currentIsDaytime;
            } else if (currentIsDaytime !== previousIsDaytime) {
                previousIsDaytime = currentIsDaytime;
                // Update the forecast when day/night changes
                fetchWeatherData();
            }
        });
    }

    // Initial fetch and setup interval
    onMount(() => {
        fetchWeatherData();
        updateInterval = setInterval(fetchWeatherData, 1800000);
    });

    // Clean up interval on component destroy
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
