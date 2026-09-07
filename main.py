from fastapi import FastAPI, File
from typing import Annotated
from routers import parse_PDF

app = FastAPI()

app.include_router(parse_PDF)

@app.get('/')
async def root():
    return {"message": "Welcome to ParsePDF. Use this app to parse your PDFs and extract useful info from them."}

