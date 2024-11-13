<script>
  import { onMount } from "svelte";
  import { writable } from "svelte/store";
  import Fa6SolidGasPump from "./icons/Fa6SolidGasPump.svelte";
  import "./fuelprices_styles.css";

  const stations = writable([]);
  const loading = writable(false);

  const fetchFuelPrices = async () => {
      loading.set(true);

      try {
          const response = await fetch("http://localhost:8083/gas-prices");

          if (!response.ok) {
              throw new Error(`Failed to fetch gas prices: ${response.status}`);
          }

          const fuelPrices = await response.json();
          // Sort by price in ascending order and limit to 2 stations
          const sortedStations = (fuelPrices.gasData || []).sort((a, b) => parseFloat(a.price) - parseFloat(b.price)).slice(0, 2);
          stations.set(sortedStations);
      } catch (error) {
          console.error("Error fetching gas prices:", error);
          stations.set([{ station: "Error", address: "N/A", price: "N/A" }]);
      } finally {
          loading.set(false);
      }
  };

  onMount(fetchFuelPrices);
</script>

<div class="fuelprices-module">
  {#if $loading}
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
