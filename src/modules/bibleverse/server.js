import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 8081;

app.use(cors());
app.use(express.json());

app.post('/api/verse', async (req, res) => {
    const { textpath } = req.body;

    if (!textpath) {
        return res.status(400).json({ error: 'Missing text file path' });
    }

    try {
        const folderPath = path.resolve(__dirname, `../../${textpath}`);
        console.log(`Resolved Folder Path: ${folderPath}`);

        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ error: 'Text folder not found' });
        }

        const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.txt'));

        if (files.length === 0) {
            return res.status(404).json({ error: 'No text files found in the directory' });
        }

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const filePath = path.join(folderPath, randomFile);
        console.log(`Selected File: ${filePath}`);

        const fileContent = fs.readFileSync(filePath, 'utf-8');

        const verses = fileContent
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('xxxx'));

        if (verses.length === 0) {
            return res.status(404).json({ error: 'No valid verses found in the file' });
        }

        const randomVerse = verses[Math.floor(Math.random() * verses.length)].trim();
        console.log(`Selected Verse: ${randomVerse}`);

        // Send the filename and the verse
        res.json({ fileName: randomFile, verse: randomVerse });
    } catch (error) {
        console.error('Error processing the request:', error.message);
        res.status(500).json({ error: 'An error occurred', details: error.message });
    }
});


app.post('/api/translate', (req, res) => {
    const { text, sourceLang, targetLang, fileName } = req.body;

    if (!text || !sourceLang || !targetLang) {
        return res.status(400).json({ error: 'Missing input parameters' });
    }

    // Limit translation to one verse at a time, no reprocessing of the same content
    const translateCmd = `python translate.py "${text}" ${sourceLang} ${targetLang}`;
    exec(translateCmd, (error, stdout, stderr) => {
        if (error) {
           
            return res.status(500).json({ error: 'Translation failed', details: stderr });
        }
        console.log(`Translation result: ${stdout}`);
        res.json({ fileName, translatedText: stdout.trim() }); // Return the single result
    });
});


app.listen(port, () => {
    console.log(`📖 BibleVerse server is running on port ${port}`);
});
