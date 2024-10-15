import { AutoTokenizer, AutoModelForSeq2SeqLM } from '@huggingface/transformers';
import path from 'path';
import { fileURLToPath } from 'url';

// Simulate __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the resolved path for the model
const modelPath = path.resolve(__dirname, '../llm/nllb-200-3.3B');

// Simple Hebrew text to test the translation
const testHebrewText = "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ"; // "In the beginning, God created the heavens and the earth."

async function testLLM() {
    try {
        console.log("Loading tokenizer and model...");

        // Load the tokenizer and model from the local path
        const tokenizer = AutoTokenizer.from_pretrained(modelPath, { local_files_only: true });
        const model = AutoModelForSeq2SeqLM.from_pretrained(modelPath, { local_files_only: true });

        console.log("Successfully loaded model and tokenizer!");

        // Tokenize the Hebrew text
        const inputs = tokenizer(testHebrewText, { return_tensors: 'pt' });

        // Generate translation
        const translatedTokens = await model.generate(inputs.input_ids, {
            forced_bos_token_id: tokenizer.lang_code_to_id('eng_Latn')
        });

        // Decode the translated tokens into English text
        const translatedText = tokenizer.decode(translatedTokens[0], { skip_special_tokens: true });

        console.log("Translation result:", translatedText);
    } catch (error) {
        console.error("Error in running the LLM:", error);
    }
}

testLLM();
