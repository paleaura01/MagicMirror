import express from 'express';
import Docker from 'dockerode';
import fetch from 'node-fetch';
import cors from 'cors'; // Import the cors package

const app = express();
const docker = new Docker({
  host: 'localhost', // Docker Desktop TCP host
  port: 2375, // Default TCP port for Docker API
});

// Enable CORS for all routes
app.use(cors());

app.use(express.json());

app.post('/assistant', async (req, res) => {
  const { query } = req.body;
  // Ensure Searx is running
  await startSearx();

  try {
    const searchResponse = await fetch(`http://localhost:8085/search?q=${encodeURIComponent(query)}&format=json`);
    const data = await searchResponse.json();
    res.json({ results: data.results });
  } catch (error) {
    res.status(500).json({ error: 'Error querying Searx' });
  }
});

app.listen(8084, () => console.log('Assistant server running on port 8084'));

async function startSearx() {
  try {
    // Check if the Searx image exists locally
    const images = await docker.listImages({ filters: { reference: ['searx/searx:latest'] } });
    if (images.length === 0) {
      console.log('Image not found locally, pulling from Docker Hub...');
      
      // Pull the image from Docker Hub
      await new Promise((resolve, reject) => {
        docker.pull('searx/searx:latest', (err, stream) => {
          if (err) return reject(err);

          docker.modem.followProgress(stream, onFinished, onProgress);

          function onFinished(err, output) {
            if (err) return reject(err);
            console.log('Image pulled successfully!');
            resolve(output);
          }

          function onProgress(event) {
            console.log(event.status);
          }
        });
      });
    }

    // Check if the container exists and is running
    const container = docker.getContainer('searx');
    const containerInfo = await container.inspect();
    if (!containerInfo.State.Running) {
      await container.start();
      console.log('Searx container started.');
    }
  } catch (error) {
    console.log('Error or container does not exist. Starting new Searx container...');
    const newContainer = await docker.createContainer({
      Image: 'searx/searx:latest',  // Ensure we're using the latest image
      name: 'searx',
      Tty: false,
      ExposedPorts: { '8085/tcp': {} },
      HostConfig: { PortBindings: { '8085/tcp': [{ HostPort: '8085' }] } },
    });
    await newContainer.start();
    console.log('New Searx container started on port 8085.');
  }
}


