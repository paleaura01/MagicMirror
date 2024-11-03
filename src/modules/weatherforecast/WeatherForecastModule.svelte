<script>
    import { onMount, onDestroy } from 'svelte';
    import './weatherforecast_styles.css';
    import dayjs from 'dayjs';
    import utc from 'dayjs/plugin/utc';
    import timezone from 'dayjs/plugin/timezone';
    import { sunriseSunsetStore, isDaytimeStore, updateSunriseSunset, setModuleReady } from '../../stores/weatherStore.js';
    import { modulesToReload } from '../../stores/reloadStore';

    dayjs.extend(utc);
    dayjs.extend(timezone);

    export let lat = 35.2080;
    export let lon = -81.3673;

    let forecastData = [];
    let error = null;
    let sunrise = null;
    let sunset = null;
    let previousIsDaytime = null;
    let reloadCount = 0;

    const userTimezone = dayjs.tz.guess();

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

    let isDaytime;

    isDaytimeStore.subscribe(value => {
        isDaytime = value;
        // console.log(`[WeatherForecastModule] Current daytime status:`, isDaytime ? 'Day' : 'Night');
        if (forecastData.length > 0) {
            forecastData = forecastData.map(day => ({
                ...day,
                icon: getWeatherIcon(day.weatherCode)
            }));
        }
    });

    function getWeatherIcon(code) {
        return iconMap[code] ? (isDaytime ? iconMap[code].day : iconMap[code].night) : iconMap["default"][isDaytime ? "day" : "night"];
    }

    async function fetchWeatherData() {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto`);
            const data = await response.json();

            if (!data.daily) {
                throw new Error("Forecast data not available");
            }

            // Update sunrise and sunset times in the store
            sunrise = dayjs(data.daily.sunrise[0]).tz(userTimezone);
            sunset = dayjs(data.daily.sunset[0]).tz(userTimezone);
            // console.log(`[WeatherForecastModule] Parsed Sunrise: ${sunrise.format()}, Sunset: ${sunset.format()}`);
            updateSunriseSunset(sunrise, sunset);

            forecastData = data.daily.time.map((date, index) => {
                const maxTempC = data.daily.temperature_2m_max[index];
                const minTempC = data.daily.temperature_2m_min[index];
                const maxTempF = (maxTempC * 9 / 5) + 32;
                const minTempF = (minTempC * 9 / 5) + 32;
                const weatherCode = data.daily.weathercode[index].toString();

                return {
                    day: dayjs(date).format('ddd'),
                    maxTemp: maxTempF.toFixed(1),
                    minTemp: minTempF.toFixed(1),
                    icon: getWeatherIcon(weatherCode),
                    weatherCode
                };
            });
        } catch (err) {
            error = err.message;
            console.error("[WeatherForecastModule] Error fetching forecast data:", err);
        }
    }

    function reload() {
        fetchWeatherData();
    }

    sunriseSunsetStore.subscribe(({ sunrise: newSunrise, sunset: newSunset }) => {
        sunrise = dayjs(newSunrise).tz(userTimezone);
        sunset = dayjs(newSunset).tz(userTimezone);
        const currentIsDaytime = isDaytime;

        if (previousIsDaytime === null) {
            previousIsDaytime = currentIsDaytime;
        } else if (currentIsDaytime !== previousIsDaytime) {
            previousIsDaytime = currentIsDaytime;
            fetchWeatherData();
        }
    });

    const unsubscribe = modulesToReload.subscribe((state) => {
        if (state.WeatherForecastModule !== reloadCount) {
            reloadCount = state.WeatherForecastModule;
            reload();
        }
    });

    onDestroy(unsubscribe);

    onMount(async () => {
        await fetchWeatherData();
        setModuleReady("WeatherForecastModule");
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
