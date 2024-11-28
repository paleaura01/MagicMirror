// moonphaseStore.js
import { writable } from 'svelte/store';
import dayjs from 'dayjs';

export const moonPhaseStore = writable(null);

export async function updateMoonPhase() {
  try {
    const response = await fetch('/data/moonPhases.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Failed to fetch moon phase data');

    const data = await response.json();
    const currentTimestamp = dayjs().unix();

    // Use the latest moon phase data available
    // You might need to adjust this depending on how your data is structured
    const moonPhaseData = data; // Assuming data is the current moon phase

    moonPhaseStore.set(moonPhaseData);
  } catch (error) {
    console.error('Error updating moon phase:', error);
    moonPhaseStore.set(null);
  }
}
