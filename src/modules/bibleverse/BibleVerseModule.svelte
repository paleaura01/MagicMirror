<script>
    import { onMount } from "svelte";

    export let llmpath; // Path to the LLM from modulesConfig.json
    export let docxpath; // Path to the Tanakh DOCX from modulesConfig.json

    let verse = null;
    let translatedVerse = null;
    let errorMessage = null;

    // Fetches a verse from the BibleVerse server
    async function fetchVerse() {
        console.log("Fetching verse from BibleVerse server...");
        try {
            const response = await fetch('http://localhost:8081/api/verse', {
                method: 'POST',  // Changed to POST to match the server route
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ llmpath, docxpath }) // Pass llmpath and docxpath to the server
            });
            const data = await response.json();
            verse = data.verse;
            console.log("Verse fetched: ", verse);
            if (verse) {
                await translateVerse(verse);
            }
        } catch (error) {
            console.error('Error fetching verse:', error);
            errorMessage = 'Failed to fetch the verse. Please try again.';
        }
    }

    // Calls the translation API to translate the fetched verse
    async function translateVerse(hebrewVerse) {
        console.log("Starting translation...");
        try {
            const response = await fetch('http://localhost:8081/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: hebrewVerse, sourceLang: "heb", targetLang: "eng", llmpath }) // Pass llmpath to the server
            });
            const data = await response.json();
            translatedVerse = data.translatedText;
            console.log(`Translated verse: ${translatedVerse}`);
        } catch (error) {
            console.error("Error during translation:", error);
            errorMessage = 'Translation failed. Please try again.';
        }
    }

    // Fetches and translates the verse when the component mounts
    onMount(async () => {
        console.log("Component mounted. Fetching and translating verse...");
        await fetchVerse();
    });
</script>

<!-- Display the verse and its translation -->
<div class="bibleverse-container" style="max-width: 400px;">
    {#if errorMessage}
        <p>{errorMessage}</p>
    {/if}

    {#if verse && translatedVerse}
        <h2>Hebrew Verse:</h2>
        <p>{verse}</p>
        <h2>English Translation:</h2>
        <p>{translatedVerse}</p>
    {:else}
        <p>Loading verse...</p>
    {/if}
</div>
