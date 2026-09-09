from openai import AsyncOpenAI
import os
from dotenv import load_dotenv

load_dotenv()

llm_client = AsyncOpenAI(
    base_url="https://ollama.com/v1",
    # value, not the var name itself
    api_key=os.environ["OLLAMA_CHEWS_THE_KEY"],
)
