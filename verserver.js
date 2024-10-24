import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const app = express();
const port = process.env.PORT || 8081;

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, sentry-trace, baggage'); // Add necessary headers

  if (req.method === 'OPTIONS') {
    res.sendStatus(200); // Respond with 200 to preflight requests
    return;
  }

  next();
});

// Express JSON parser
app.use(express.json());

// Helper function to log API calls
const logApiCall = (url) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] API called: ${url}`);
};

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST route to randomly select a verse from the provided text file
app.post('/api/verse', (req, res) => {
  let { textpath } = req.body;

  console.log('Received textpath:', textpath);

  if (!textpath) {
    console.error('No textpath provided');
    return res.status(400).json({ error: 'No textpath provided' });
  }

  try {
    const fullPath = path.resolve(__dirname, textpath);
    console.log('Resolved full path to directory:', fullPath);

    const pathExists = fs.existsSync(fullPath);
    console.log('Path exists:', pathExists);

    const isDirectory = pathExists && fs.lstatSync(fullPath).isDirectory();
    console.log('Is directory:', isDirectory);

    if (!pathExists || !isDirectory) {
      console.error('Provided path is not a valid directory:', fullPath);
      return res.status(400).json({ error: `Provided path is not a valid directory: ${fullPath}` });
    }

    fs.readdir(fullPath, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return res.status(500).json({ error: 'Error reading directory' });
      }

      const txtFiles = files.filter(file => file.endsWith('.txt'));
      if (txtFiles.length === 0) {
        console.error('No text files found in directory:', fullPath);
        return res.status(400).json({ error: 'No text files found in directory' });
      }

      const randomFile = txtFiles[Math.floor(Math.random() * txtFiles.length)];
      const filePath = path.join(fullPath, randomFile);

      console.log('Selected file:', randomFile);

      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading text file:', err);
          return res.status(500).json({ error: 'Error reading text file' });
        }

        const verses = data.split('\n').filter(line => line.trim() !== '');
        const randomVerse = verses[Math.floor(Math.random() * verses.length)];

        console.log('Selected verse:', randomVerse);

        res.json({ verse: randomVerse.trim(), fileName: randomFile });
      });
    });
  } catch (err) {
    console.error('Error processing textpath:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST route for translation with logging and using translate.py
app.post('/api/translate', (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  console.log('Received text for translation:', text);
  console.log('Source language:', sourceLang, 'Target language:', targetLang);

  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ error: 'Missing required parameters for translation' });
  }

  const pythonScript = path.join(__dirname, 'translate.py');
  const command = `python ${pythonScript} "${text}" ${sourceLang} ${targetLang}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error executing translation script:', error);
      return res.status(500).json({ error: 'Translation script failed' });
    }

    if (stderr) {
      console.error('Translation script stderr:', stderr);
    }

    const translatedText = stdout.trim();
    console.log('Translation result:', translatedText);

    res.json({ translatedText });
  });
});

// Start the BibleVerse server
app.listen(port, () => {
  console.log(`✅ BibleVerse Server is running on port ${port}`);
});
