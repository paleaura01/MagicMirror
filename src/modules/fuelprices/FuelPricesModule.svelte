<!-- ./src/modules/fuelprices/FuelPricesModule.svelte -->

<script>
    import { onMount } from "svelte";
    import { writable } from "svelte/store";
    import Fa6SolidGasPump from "./icons/Fa6SolidGasPump.svelte";
    import "./fuelprices_styles.css";
  
    const stations = writable([]);
    const loading = writable(false);
  
    const FUEL_STORAGE_KEY = "lastFuelPrices"; // Key for localStorage
    const LAST_UPDATED_KEY = "lastFuelUpdateTime"; // Key for last update time
  
    // Save stations to localStorage
    function saveStationsToLocalStorage(stations) {
      try {
        localStorage.setItem(FUEL_STORAGE_KEY, JSON.stringify(stations));
        localStorage.setItem(LAST_UPDATED_KEY, new Date().toISOString());
        console.log(`[Save] Fuel prices saved to localStorage at ${new Date().toISOString()}`);
      } catch (err) {
        console.error("[Save Error] Failed to save fuel prices to localStorage", err);
      }
    }
  
    // Load stations from localStorage
    function loadStationsFromLocalStorage() {
      try {
        const storedStations = localStorage.getItem(FUEL_STORAGE_KEY);
        const lastUpdated = localStorage.getItem(LAST_UPDATED_KEY);
        if (storedStations) {
          stations.set(JSON.parse(storedStations));
          console.log(`[Load] Fuel prices loaded from localStorage, last updated at ${lastUpdated}`);
          loading.set(false); // Immediately display stored stations
        }
      } catch (err) {
        console.error("[Load Error] Failed to load fuel prices from localStorage", err);
      }
    }
  
    const fetchFuelPrices = async () => {
      loading.set(true);
  
      try {
        const response = await fetch("http://localhost:8083/gas-prices");
  
        if (!response.ok) {
          throw new Error(`Failed to fetch gas prices: ${response.status}`);
        }
  
        const fuelPrices = await response.json();
        // Sort by price in ascending order and limit to 2 stations
        const sortedStations = (fuelPrices.gasData || [])
          .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
          .slice(0, 2);
  
        stations.set(sortedStations);
        saveStationsToLocalStorage(sortedStations); // Save fetched stations to localStorage
      } catch (error) {
        console.error("Error fetching gas prices:", error);
        stations.set([{ station: "Error", address: "N/A", price: "N/A" }]);
      } finally {
        loading.set(false);
      }
    };
  
    onMount(() => {
      loadStationsFromLocalStorage(); // Load stations from localStorage on mount
      fetchFuelPrices(); // Fetch new fuel prices from the server
    });
  </script>
  
  <div class="fuelprices-module">
    {#if $loading && $stations.length === 0}
      <p class="loading-text">Loading...</p>
    {:else}
      {#if $stations.length === 0}
        <p>No fuel price data available.</p>
      {:else}
        {#each $stations as station (station.station)}
          <div class="station-info">
            <Fa6SolidGasPump class="symbol" />
            <div class="price-info">
              ${station.price} USD - {station.station} {station.address}
            </div>
          </div>
        {/each}
      {/if}
    {/if}
  </div>
  