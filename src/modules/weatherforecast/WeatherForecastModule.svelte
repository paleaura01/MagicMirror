<script>
    import { onMount } from 'svelte';
    import './weatherforecast_styles.css';
    import MeteoconsWindFill from './icons/MeteoconsWindFill.svelte';
    import MeteoconsRaindropsFill from './icons/MeteoconsRaindropsFill.svelte';
    import dayjs from 'dayjs';

    let forecastData = [];
    let error = null;
    const basePath = '/src/modules/weather/weathericons';

    function getWeatherIcon(condition) {
        if (!condition) return `${basePath}/Clear%20Skies/Clear%20Skies.mp4`; // Default fallback
        const encodedCondition = encodeURIComponent(condition.trim());
        return `${basePath}/${encodedCondition}/${encodedCondition}.mp4`;
    }

    async function fetchForecastData() {
        try {
            const response = await fetch('data/meteoweatherForecastData.json', { cache: 'no-cache' });
            const data = await response.json();

            if (!data.forecast) {
                throw new Error('Forecast data not available');
            }

            // Process forecast data
            forecastData = data.forecast.map((day) => ({
                day: dayjs(day.date).format('ddd'), // Format date as day of the week
                icon: getWeatherIcon(day.weather_condition), // Match description to folder/file names
                maxTemp: day.temperature_max.toFixed(1), // Show one decimal place for temperature
                minTemp: day.temperature_min.toFixed(1), // Show one decimal place for temperature
                windspeed: day.windspeed_max.toFixed(1), // Use one decimal place for wind speed
                precipitation: day.precipitation.toFixed(2), // Keep precipitation in millimeters with two decimal places
            }));
        } catch (err) {
            error = `Error loading forecast data: ${err.message}`;
            console.error('[WeatherForecastModule] Error:', err);
        }
    }

    onMount(() => {
        fetchForecastData();
    });
</script>

<div class="weather-forecast">
    {#if error}
        <p>{error}</p>
    {:else if forecastData.length > 0}
        <div class="forecast-wrapper">
            <div class="forecast-header">
                <h2>7-Day Forecast</h2>
            </div>
            <div class="forecast-container">
                {#each forecastData as dayForecast}
                    <div class="forecast-day">
                        <div class="forecast-day-name">{dayForecast.day}</div>
                        <div class="icon-container">
                            <video
                                src={dayForecast.icon}
                                autoplay
                                muted
                                loop
                                class="forecast-icon"
                                playsinline
                                type="video/mp4"
                            ></video>
                        </div>
                        <div class="forecast-temp">
                            <div class="max-temp">{dayForecast.maxTemp}°F</div>
                            <div class="min-temp">{dayForecast.minTemp}°F</div>
                        </div>
                        <div class="forecast-details">
                            <div class="wind small-text">
                                <MeteoconsWindFill /> {dayForecast.windspeed} mph
                            </div>
                            <div class="precipitation small-text">
                                <MeteoconsRaindropsFill /> {dayForecast.precipitation} mm
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {:else}
        <p>Loading forecast...</p>
    {/if}
</div>

