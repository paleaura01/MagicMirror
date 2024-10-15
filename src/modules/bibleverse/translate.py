import sys
import warnings
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Suppress the TypedStorage warning
warnings.filterwarnings("ignore", category=UserWarning, module="torch")

# Load the NLLB-200 model
model_name = "facebook/nllb-200-3.3B"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

# A mapping from source/target language to model-specific language code
lang_code_map = {
    'heb': 'heb_Hebr',  # Hebrew
    'eng': 'eng_Latn',  # English
}

def translate(text, source_lang, target_lang):
    if source_lang not in lang_code_map or target_lang not in lang_code_map:
        raise ValueError("Unsupported language")

    inputs = tokenizer(text, return_tensors="pt", padding=True)
    translated_tokens = model.generate(
        inputs["input_ids"],
        forced_bos_token_id=tokenizer.lang_code_to_id(lang_code_map[target_lang])
    )
    return tokenizer.decode(translated_tokens[0], skip_special_tokens=True)

if __name__ == '__main__':
    text = sys.stdin.read().strip()
    source_lang = sys.argv[1]
    target_lang = sys.argv[2]
    translation = translate(text, source_lang, target_lang)
    print(translation)
