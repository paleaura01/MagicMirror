import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth'; // For parsing DOCX
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { AutoTokenizer, AutoModelForSeq2SeqLM } from '@huggingface/transformers';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 8081;

app.use(cors());
app.use(express.json());

// API to fetch a random verse and translate it
app.post('/api/verse', async (req, res) => {
    const { llmpath, docxpath } = req.body;

    if (!llmpath || !docxpath) {
        console.error('Missing input parameters: ', { llmpath, docxpath });
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        // Resolve model and DOCX paths
        const modelPath = path.resolve(__dirname, `../../${llmpath}`);
        const docxPath = path.resolve(__dirname, `../../${docxpath}`);
        console.log(`Resolved model path: ${modelPath}`);
        console.log(`Resolved DOCX path: ${docxPath}`);

        // Ensure the model and DOCX file exist
        if (!fs.existsSync(docxPath)) {
            console.error(`DOCX file not found at path: ${docxPath}`);
            return res.status(404).json({ error: 'DOCX file not found' });
        }

        const tokenizerPath = path.join(modelPath, 'tokenizer.json');
        const modelFilePath = path.join(modelPath, 'pytorch_model.bin');
        if (!fs.existsSync(tokenizerPath) || !fs.existsSync(modelFilePath)) {
            console.error(`Model or tokenizer file not found. Tokenizer path: ${tokenizerPath}, Model path: ${modelFilePath}`);
            return res.status(404).json({ error: 'Model or tokenizer files not found' });
        }

        // Load tokenizer and model locally
        const tokenizer = await AutoTokenizer.from_pretrained(modelPath, {
            local_files_only: true
        });
        const model = await AutoModelForSeq2SeqLM.from_pretrained(modelPath, {
            local_files_only: true
        });

        console.log('Successfully loaded model and tokenizer.');

        // Read the DOCX file and extract the text
        const result = await mammoth.extractRawText({ path: docxPath });
        const fullText = result.value;
        if (!fullText) {
            console.error('No text found in DOCX file');
            return res.status(500).json({ error: 'No text found in DOCX file' });
        }

        // Select a short verse
        const verse = fullText.split('\n').filter(line => line.trim()).slice(0, 1).join(' ');
        console.log(`Selected verse: ${verse}`);

        res.json({ verse });
    } catch (error) {
        console.error('Error processing the request: ', error);
        res.status(500).json({ error: 'An error occurred', details: error.message });
    }
});

// API route for translation
app.post('/api/translate', async (req, res) => {
    const { text, sourceLang, targetLang, llmpath } = req.body;

    if (!text || !sourceLang || !targetLang || !llmpath) {
        console.error('Missing input parameters: ', { text, sourceLang, targetLang, llmpath });
        return res.status(400).json({ error: 'Invalid input' });
    }

    try {
        const modelPath = path.resolve(__dirname, `../../${llmpath}`);
        console.log(`Resolved model path: ${modelPath}`);

        // Load the tokenizer and model locally
        const tokenizer = await AutoTokenizer.from_pretrained(modelPath, {
            local_files_only: true
        });
        const model = await AutoModelForSeq2SeqLM.from_pretrained(modelPath, {
            local_files_only: true
        });

        console.log('Tokenizer and model loaded successfully.');

        const inputs = tokenizer(text, { return_tensors: 'pt' });
        const translatedTokens = await model.generate(inputs.input_ids, {
            forced_bos_token_id: tokenizer.lang_code_to_id(targetLang)
        });
        const translatedText = tokenizer.decode(translatedTokens[0], { skip_special_tokens: true });

        res.json({ translatedText });
    } catch (error) {
        console.error('Translation error: ', error);
        res.status(500).json({ error: 'Translation failed', details: error.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`📖 BibleVerse server is running on port ${port}`);
});
