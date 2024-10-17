# ./src/modules/bibleverse/translate.py

import os
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import sys


# Force CPU usage and set environment variables for memory efficiency
os.environ["TOKENIZERS_PARALLELISM"] = "false"
torch.set_num_threads(1)

# Load the NLLB distilled 600M model for translation
model_name = "facebook/nllb-200-distilled-600M"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to("cpu")

# Language codes for source and target languages
lang_code_map = {
    'heb': 'heb_Hebr',
    'eng': 'eng_Latn',
}

def translate(text, source_lang, target_lang):
    if source_lang not in lang_code_map or target_lang not in lang_code_map:
        raise ValueError("Unsupported language")

    tokenizer.src_lang = lang_code_map[source_lang]
    
    # Tokenize the text and move input tensors to CPU
    encoded_text = tokenizer(text, return_tensors="pt").to("cpu")
    
    # Generate translation with specific parameters to prevent duplication
    generated_tokens = model.generate(
        **encoded_text,
        max_length=512,  # Set a reasonable max length for verses
        forced_bos_token_id=tokenizer.convert_tokens_to_ids(lang_code_map[target_lang]),
        no_repeat_ngram_size=3,  # Prevent repeated phrases
        num_beams=4,  # Increase the beams for diversity in translation
    )
    
    # Decode and return the single best translation
    return tokenizer.decode(generated_tokens[0], skip_special_tokens=True)

if __name__ == '__main__':
    text = sys.argv[1]
    source_lang = sys.argv[2]
    target_lang = sys.argv[3]
    translation = translate(text, source_lang, target_lang)
    print(translation)
