# ./assistant.py

from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.llms import HuggingFacePipeline
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
from langchain.utilities import SerpAPIWrapper

# Load Vicuna/WizardLM
model_name = "TheBloke/vicuna-7B-1.1-HF"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, device_map="auto", torch_dtype=torch.float16)
hf_pipeline = pipeline("text-generation", model=model, tokenizer=tokenizer, device=0)

llm = HuggingFacePipeline(pipeline=hf_pipeline)

# Set up Search (SerpAPI)
search = SerpAPIWrapper(api_key="YOUR_SERPAPI_KEY")

# LangChain Prompt
prompt = PromptTemplate(
    input_variables=["query"],
    template="Answer the following using search results:\n{query}\n"
)
chain = LLMChain(llm=llm, prompt=prompt)

# Ask and include search results:
def assist_with_search(question):
    search_results = search.run(question)
    full_context = f"{question}\n{search_results}"
    response = chain.run(full_context)
    return response

print(assist_with_search("What's the latest weather in New York?"))
