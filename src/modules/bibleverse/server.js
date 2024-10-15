// ./src/modules/bibleverse/server.ks

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth'; // To parse DOCX files
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 8081;

// Enable CORS
app.use(cors());

// API route to fetch a random verse
app.get('/api/verse', async (req, res) => {
    const filePath = path.resolve(__dirname, 'docs', 'Tanakh.docx');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Tanakh file not found' });
    }

    try {
        const result = await mammoth.extractRawText({ path: filePath });
        const verses = result.value.split('\n').filter(line => line.trim() !== '');

        if (verses.length === 0) {
            return res.status(500).json({ error: 'No verses found in the document' });
        }

        // Select a random verse
        const verse = verses[Math.floor(Math.random() * verses.length)];
        res.json({ verse });
    } catch (error) {
        res.status(500).json({ error: 'Error reading the document' });
    }
});

// Start the BibleVerse server
app.listen(port, () => {
    console.log(`📖 BibleVerse server is running on port ${port}`);
});

