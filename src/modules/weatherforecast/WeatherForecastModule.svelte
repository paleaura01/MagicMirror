<script>
    import { onMount, onDestroy } from 'svelte';
    import './weatherforecast_styles.css';
    import dayjs from 'dayjs';
  
    export let lat = 35.2080;  // Default values, can be overridden via props
    export let lon = -81.3673;
  
    let forecastData = [];
    let error = null;
    let updateInterval;

    const iconMap = {
        "0": { day: "/src/modules/weatherforecast/icons/32.png", night: "/src/modules/weatherforecast/icons/31.png" },
        "1": { day: "/src/modules/weatherforecast/icons/34.png", night: "/src/modules/weatherforecast/icons/33.png" },
        "2": { day: "/src/modules/weatherforecast/icons/28.png", night: "/src/modules/weatherforecast/icons/27.png" },
        "3": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },
        "9": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/45.png" },
        "10": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/45.png" },
        "11": { day: "/src/modules/weatherforecast/icons/3.png", night: "/src/modules/weatherforecast/icons/47.png" },
        "13": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/46.png" },
        "50": { day: "/src/modules/weatherforecast/icons/22.png", night: "/src/modules/weatherforecast/icons/22.png" },
        "default": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" }
    };

    // Function to fetch weather data
    async function fetchWeatherData() {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
            const data = await response.json();
    
            if (!data.daily) {
                throw new Error("Forecast data not available");
            }
    
            // Populate forecast data and convert temperatures to Fahrenheit
            forecastData = data.daily.time.map((date, index) => {
                const maxTempC = data.daily.temperature_2m_max[index];
                const minTempC = data.daily.temperature_2m_min[index];
                const maxTempF = (maxTempC * 9/5) + 32;
                const minTempF = (minTempC * 9/5) + 32;
                const weatherCode = data.daily.weathercode[index].toString();
                const icon = iconMap[weatherCode] ? iconMap[weatherCode].day : iconMap["default"].day;
    
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

    // Fetch the weather data initially and set up periodic updates
    onMount(() => {
        fetchWeatherData();

        // Update the weather data every 30 minutes (1800000 milliseconds)
        updateInterval = setInterval(fetchWeatherData, 1800000);
    });

    // Cleanup interval when component is destroyed
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
                        <img src={dayForecast.icon} alt="Weather Icon" class="forecast-icon" style="--icon-offset: -3px;" />
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
