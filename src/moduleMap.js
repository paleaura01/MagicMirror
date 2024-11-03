
  // ./src/modulemap.js
  export const moduleMap = {
    "@/modules/clock/ClockModule": () => import("@/modules/clock/ClockModule.svelte"),
    "@/modules/weathermap/WeatherMapModule": () => import("@/modules/weathermap/WeatherMapModule.svelte"),
    "@/modules/traffic/TrafficModule": () => import("@/modules/traffic/TrafficModule.svelte"),
    "@/modules/onthisday/OnThisDayModule": () => import("@/modules/onthisday/OnThisDayModule.svelte"),
    "@/modules/weather/WeatherModule": () => import("@/modules/weather/WeatherModule.svelte"),
    "@/modules/weatherforecast/WeatherForecastModule": () => import("@/modules/weatherforecast/WeatherForecastModule.svelte"),
    "@/modules/jeopardy/Jeopardy": () => import("@/modules/jeopardy/Jeopardy.svelte"),
    "@/modules/calendar/CalendarModule": () => import("@/modules/calendar/CalendarModule.svelte"),
    "@/modules/ticker/TickerModule": () => import("@/modules/ticker/TickerModule.svelte"),
    "@/modules/bibleverse/BibleVerseModule": () => import("@/modules/bibleverse/BibleVerseModule.svelte"),
    "@/modules/globe/GlobeModule": () => import("@/modules/globe/GlobeModule.svelte"),
    "@/modules/delivery/DeliveryModule": () => import("@/modules/delivery/DeliveryModule.svelte"),
    "@/modules/flightradar/FlightRadarModule": () => import("@/modules/flightradar/FlightRadarModule.svelte"),
    "@/modules/test/TestModule": () => import("@/modules/test/TestModule.svelte")
  };
