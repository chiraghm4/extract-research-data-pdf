from fastapi import FastAPI, File, Depends
from typing import Annotated
from routers import parse_PDF
from helpers import LLMClient
from contextlib import asynccontextmanager
from openai import AsyncOpenAI
import os

client_container = {}

@asynccontextmanager
async def lifecycle(app: FastAPI):
    print("LLM Client connecting...")

    # client_container["llm"] = AsyncOpenAI(
    #     base_url="https://ollama.com/v1",
    #     # value, not the var name itself
    #     api_key=os.environ["OLLAMA_CHEWS_THE_KEY"],
    # )
    client_container["llm"] = LLMClient.llm_client

    yield

    print("LLM Client shutting down...")
    await client_container["llm"].close()


app = FastAPI(lifespan=lifecycle)

async def get_llm_client() -> AsyncOpenAI:
    return client_container["llm"]

# app.include_router(parse_PDF, prefix="/api/v1/", dependencies=[Depends(get_llm_client)])

@app.get('/')
async def root():
    return {"message": "Welcome to ParsePDF. Use this app to parse your PDFs and extract useful info from them."}

@app.post('/parsefile/')
async def parse_PDF(file: Annotated[bytes, File()], client: AsyncOpenAI = Depends(get_llm_client)):
    print(len(file))

    response = await client.chat.completions.create(
        model="nemotron-3-super:cloud",
        messages=[{"role": "user", "content": "who are you?"}]
    )

    return {"response": response.choices[0].message.content}

