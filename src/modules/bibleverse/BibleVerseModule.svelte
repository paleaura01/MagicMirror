<!-- ./src/modules/bibleverse/BibleVerseModule.svelte -->

<script>
    import { onMount } from "svelte";
    import './bibleverse_styles.css';

    export let sourcelang;
    export let targetlang;
    export let textpath;

    let verse = null;
    let bookName = null; // Store the book name (text file name)
    let translatedVerse = null;
    let verseReference = null; // For storing the formatted reference
    let errorMessage = null;

    async function fetchVerse() {
        if (!textpath) {
            console.error('Textpath is undefined or empty');
            errorMessage = 'Invalid textpath provided.';
            return;
        }

        try {
            const response = await fetch('http://localhost:8081/api/verse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textpath }) // Ensure proper textpath is sent
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Unknown error');
            }

            const data = await response.json();
            verse = data.verse;
            bookName = data.fileName ? data.fileName.replace('.txt', '') : 'Unknown';
            extractReference(); // Extract the verse reference
            if (verse) {
                await translateVerse(verse);
            }
        } catch (error) {
            console.error('Error fetching verse:', error);
            errorMessage = 'Failed to fetch the verse. Please try again.';
        }
    }

    function extractReference() {
        // Extract the reference if it matches the pattern (e.g., "7 ׃1")
        const match = verse.match(/(\d+)\s*׃\s*(\d+)/);
        if (match) {
            verseReference = `${match[1]}:${match[2]}`; // Format as "7:1"
            verse = verse.replace(match[0], '').trim(); // Remove the reference from the verse text
        } else {
            verseReference = null; // Clear if no reference is found
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

    onMount(() => {
        console.log('Textpath:', textpath); // Log to check if it's correct
        fetchVerse();
        const interval = setInterval(fetchVerse, 120000);

        return () => clearInterval(interval);
    });
</script>

<!-- Display the verse and its translation with the book name -->
<div class="bibleverse-container">
    {#if errorMessage}
        <p>{errorMessage}</p>
    {/if}

    {#if verse && translatedVerse}
    <h2>Tanakh - {bookName} {#if verseReference}({verseReference}){/if}:</h2>

        <h3>{translatedVerse}</h3>
    {:else}
        <p>Loading verse...</p>
    {/if}
</div>
