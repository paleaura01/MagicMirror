<!-- ./src/modules/weatherforecast/WeatherForecastModule.svelte -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import './weatherforecast_styles.css';
    import dayjs from 'dayjs';
    import { sunriseSunsetStore } from '../../stores/weatherStore.js';
    import { modulesToReload } from '../../stores/reloadStore';
    import { get } from 'svelte/store';

    export let lat = 35.2080;
    export let lon = -81.3673;

    let forecastData = [];
    let error = null;
    let sunrise = null;
    let sunset = null;
    let previousIsDaytime = null;
    let reloadCount = 0;

    const unsubscribe = modulesToReload.subscribe((state) => {
        if (state.WeatherForecastModule !== reloadCount) {
            reloadCount = state.WeatherForecastModule;
            // console.log(`[WeatherForecastModule] Reload triggered at ${new Date().toLocaleTimeString()}`);
            reload();
        }
    });

    onDestroy(unsubscribe);

    const iconMap = {
        "0": { day: "/src/modules/weatherforecast/icons/32.png", night: "/src/modules/weatherforecast/icons/31.png" },
        "1": { day: "/src/modules/weatherforecast/icons/34.png", night: "/src/modules/weatherforecast/icons/33.png" },
        "2": { day: "/src/modules/weatherforecast/icons/30.png", night: "/src/modules/weatherforecast/icons/29.png" },
        "3": { day: "/src/modules/weatherforecast/icons/28.png", night: "/src/modules/weatherforecast/icons/27.png" },
        "45": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" },
        "48": { day: "/src/modules/weatherforecast/icons/20.png", night: "/src/modules/weatherforecast/icons/20.png" },
        "51": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },
        "53": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },
        "55": { day: "/src/modules/weatherforecast/icons/9.png", night: "/src/modules/weatherforecast/icons/9.png" },
        "56": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },
        "57": { day: "/src/modules/weatherforecast/icons/8.png", night: "/src/modules/weatherforecast/icons/8.png" },
        "61": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" },
        "63": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
        "65": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
        "66": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" },
        "67": { day: "/src/modules/weatherforecast/icons/10.png", night: "/src/modules/weatherforecast/icons/10.png" },
        "71": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" },
        "73": { day: "/src/modules/weatherforecast/icons/16.png", night: "/src/modules/weatherforecast/icons/16.png" },
        "75": { day: "/src/modules/weatherforecast/icons/41.png", night: "/src/modules/weatherforecast/icons/41.png" },
        "77": { day: "/src/modules/weatherforecast/icons/13.png", night: "/src/modules/weatherforecast/icons/13.png" },
        "80": { day: "/src/modules/weatherforecast/icons/11.png", night: "/src/modules/weatherforecast/icons/11.png" },
        "81": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
        "82": { day: "/src/modules/weatherforecast/icons/12.png", night: "/src/modules/weatherforecast/icons/12.png" },
        "85": { day: "/src/modules/weatherforecast/icons/14.png", night: "/src/modules/weatherforecast/icons/14.png" },
        "86": { day: "/src/modules/weatherforecast/icons/42.png", night: "/src/modules/weatherforecast/icons/42.png" },
        "95": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },
        "96": { day: "/src/modules/weatherforecast/icons/4.png", night: "/src/modules/weatherforecast/icons/4.png" },
        "99": { day: "/src/modules/weatherforecast/icons/3.png", night: "/src/modules/weatherforecast/icons/3.png" },
        "default": { day: "/src/modules/weatherforecast/icons/na.png", night: "/src/modules/weatherforecast/icons/na.png" }
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

                const icon = iconMap[weatherCode] ? (isDay ? iconMap[weatherCode].day : iconMap[weatherCode].night) : iconMap["default"].day;

                return {
                    day: dayjs(date).format('ddd'),
                    maxTemp: maxTempF.toFixed(1),
                    minTemp: minTempF.toFixed(1),
                    icon
                };
            });
            // console.log(`[WeatherForecastModule] Data fetched successfully at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
            error = err.message;
            console.error("[WeatherForecastModule] Error fetching weather data:", err);
        }
    }

    function reload() {
        console.log(`[WeatherForecastModule] Reloading data at ${new Date().toLocaleTimeString()}`);
        fetchWeatherData();
    }

    $: sunriseSunsetStore.subscribe(({ sunrise: newSunrise, sunset: newSunset }) => {
        sunrise = newSunrise;
        sunset = newSunset;
        const currentIsDaytime = isDaytime(sunrise, sunset);

        if (previousIsDaytime === null) {
            previousIsDaytime = currentIsDaytime;
        } else if (currentIsDaytime !== previousIsDaytime) {
            previousIsDaytime = currentIsDaytime;
            fetchWeatherData();
        }
    });

    onMount(fetchWeatherData);
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
