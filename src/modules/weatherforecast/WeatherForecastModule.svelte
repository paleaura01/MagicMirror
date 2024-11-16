<script>
    import { onMount } from 'svelte';
    import './weatherforecast_styles.css';
    import MeteoconsWindFill from './icons/MeteoconsWindFill.svelte';
    import MeteoconsHumidityFill from './icons/MeteoconsHumidityFill.svelte';
    import MeteoconsRaindropsFill from './icons/MeteoconsRaindropsFill.svelte';
    import MeteoconsSnowflakeFill from './icons/MeteoconsSnowflakeFill.svelte';
    import MeteoconsThermometerColderFill from './icons/MeteoconsThermometerColderFill.svelte';
    import MeteoconsHurricaneFill from './icons/MeteoconsHurricaneFill.svelte';
    import { updateWeatherData, weatherDataStore, isWeatherDataStale } from '../../stores/weatherStore';
    import { get } from 'svelte/store';
    import dayjs from 'dayjs';

    export let lat;
    export let lon;

    let forecastData = [];
    let error = null;
    const basePath = 'src/modules/weatherforecast/animatedicons';
    let currentType = 'precipitation';
    let interval;

    const probabilityTypes = ['precipitation', 'thunderstorm', 'rain', 'snow', 'ice'];

    function startProbabilityCycle() {
        let index = 0;
        clearInterval(interval);
        interval = setInterval(() => {
            currentType = probabilityTypes[index];
            index = (index + 1) % probabilityTypes.length;
        }, 10000);
    }

    const iconMap = {
        clear: { animation: 'Clear Skies.mp4' },
        cloudy: { animation: 'Overcast.mp4' },
        partly_cloudy: { animation: 'Partly Cloudy.mp4' },
        rain: { animation: 'Rain.mp4' },
        showers: { animation: 'Rain Shower.mp4' },
        snow: { animation: 'Snow.mp4' },
        thunderstorm: { animation: 'Thunderstorm.mp4' },
        fog: { animation: 'Fog.mp4' },
        default: { animation: 'Sun.mp4' },
    };

    function getWeatherIcon(condition) {
        return `${basePath}/${iconMap[condition]?.animation || iconMap['default'].animation}`;
    }

    async function fetchWeatherData() {
        if (!get(isWeatherDataStale)) {
            console.log('[WeatherForecastModule] Using cached data.');
            forecastData = get(weatherDataStore).forecast;
            return;
        }

        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max&timezone=auto`);
            const data = await response.json();

            if (!data.daily) {
                throw new Error('Forecast data not available');
            }

            forecastData = data.daily.time.map((date, index) => {
                const weatherCode = data.daily.weathercode[index];
                const weatherCondition = getConditionFromCode(weatherCode);

                return {
                    day: dayjs(date).format('ddd'),
                    icon: getWeatherIcon(weatherCondition),
                    maxTemp: data.daily.temperature_2m_max[index],
                    minTemp: data.daily.temperature_2m_min[index],
                    windspeed: data.daily.windspeed_10m_max[index],
                    probabilities: {
                        precipitation: data.daily.precipitation_sum[index],
                    },
                };
            });

            forecastData = forecastData.slice(0, 7); // Show only 7 days
            updateWeatherData(forecastData);
        } catch (err) {
            error = err.message;
            console.error('[WeatherForecastModule] Error fetching data:', err);
        }
    }

    function getConditionFromCode(code) {
        if ([0, 1].includes(code)) return 'clear';
        if ([2].includes(code)) return 'partly_cloudy';
        if ([3].includes(code)) return 'cloudy';
        if ([51, 61].includes(code)) return 'showers';
        if ([71, 73].includes(code)) return 'snow';
        if ([95, 99].includes(code)) return 'thunderstorm';
        return 'default';
    }

    onMount(() => {
        startProbabilityCycle();
        fetchWeatherData();
        const hourlyFetch = setInterval(fetchWeatherData, 3600000);
        return () => {
            clearInterval(hourlyFetch);
            clearInterval(interval);
        };
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
                            <div class="max-temp">{dayForecast.maxTemp}°</div>
                            <div class="min-temp">{dayForecast.minTemp}°</div>
                        </div>
                        <div class="forecast-details">
                            <div class="wind">
                                <MeteoconsWindFill /> {dayForecast.windspeed} km/h
                            </div>
                            <div class="probabilities">
                                <MeteoconsRaindropsFill /> {dayForecast.probabilities.precipitation} mm
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
