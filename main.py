from fastapi import FastAPI, File, Depends
from typing import Annotated
from contextlib import asynccontextmanager
from openai import AsyncOpenAI
from dotenv import load_dotenv

from dependencies import LLMClient
from utils.parse_file_info_json import extract_from_pdf

load_dotenv()

client_container = {}

@asynccontextmanager
async def lifecycle(app: FastAPI):
    print("LLM Client connecting...")

    client_container["llm"] = LLMClient.llm_client

    yield

    print("LLM Client shutting down...")

    await client_container["llm"].close()


async def get_llm_client() -> AsyncOpenAI:
    return client_container["llm"]

app = FastAPI(lifespan=lifecycle)


@app.get('/')
async def root():
    return {"message": "Welcome to ParsePDF. Use this app to parse your PDFs and extract useful info from them."}

@app.post('/parsefile/')
async def parse_PDF(file: Annotated[bytes, File()], client: AsyncOpenAI = Depends(get_llm_client)):
    print(len(file))
    response = await extract_from_pdf(file, client=client)
    return {"response": response}

