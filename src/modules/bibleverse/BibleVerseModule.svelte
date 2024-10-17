<script>
    import { onMount } from "svelte";
    import './bibleverse_styles.css';

    export let sourcelang;
    export let targetlang;
    export let textpath;

    let verse = null;
    let bookName = null; // Store the book name (text file name)
    let translatedVerse = null;
    let errorMessage = null;

    async function fetchVerse() {
        try {
            const response = await fetch('http://localhost:8081/api/verse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textpath })
            });
            const data = await response.json();
            verse = data.verse;
            bookName = data.fileName.replace('.txt', ''); // Remove the .txt extension
            if (verse) {
                await translateVerse(verse);
            }
        } catch (error) {
            console.error('Error fetching verse:', error);
            errorMessage = 'Failed to fetch the verse. Please try again.';
        }
    }

    async function translateVerse(hebrewVerse) {
        try {
            const response = await fetch('http://localhost:8081/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: hebrewVerse,
                    sourceLang: sourcelang,
                    targetLang: targetlang
                })
            });
            const data = await response.json();
            translatedVerse = data.translatedText;
        } catch (error) {
            console.error('Error during translation:', error);
            errorMessage = 'Translation failed. Please try again.';
        }
    }

    onMount(async () => {
        await fetchVerse();
        const interval = setInterval(async () => {
            await fetchVerse();
        }, 120000);

        return () => clearInterval(interval);
    });
</script>

<!-- Display the verse and its translation with the book name -->
<div class="bibleverse-container">
    {#if errorMessage}
        <p>{errorMessage}</p>
    {/if}

    {#if verse && translatedVerse}
        <h2>Tanakh Verse:</h2>
        <h3>{translatedVerse}</h3>
    {:else}
        <p>Loading verse...</p>
    {/if}
</div>
