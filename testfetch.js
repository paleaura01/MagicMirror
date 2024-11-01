import fetch from 'node-fetch';

const url = 'https://en.wikipedia.org/wiki/Wikipedia:Selected_anniversaries/November_1';

fetch(url)
  .then(response => {
    if (response.ok) {
      return response.text();
    }
    throw new Error(`Request failed with status ${response.status}`);
  })
  .then(data => console.log("Fetched data successfully"))
  .catch(error => console.error("Fetch failed:", error.message));
