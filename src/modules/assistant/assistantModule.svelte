<!-- ./src/modules/assistant/AssistantModule.svelte -->

<script>
  import { onMount } from 'svelte';
  import './assistant_styles.css';

  let query = "Test search: Who is the president of the US?";
  let assistantResponse = '';
  let isLoading = true;

  async function fetchAssistantResponse(query) {
    try {
      const response = await fetch('http://localhost:8084/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (response.ok) {
        const data = await response.json();
        assistantResponse = data.results ? data.results[0].title : "No results found.";
      } else {
        assistantResponse = 'Error: Unable to fetch response from assistant.';
      }
    } catch (error) {
      assistantResponse = `Error: ${error.message}`;
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    fetchAssistantResponse(query);
  });
</script>

<div class="assistant-container">
  <div class="assistant-title">Assistant Module</div>
  {#if isLoading}
    <div class="loading">Loading response...</div>
  {:else}
    <div class="assistant-results">{assistantResponse}</div>
  {/if}
</div>
