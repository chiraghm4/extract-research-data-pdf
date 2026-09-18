import pdfplumber
import re
import json
import sys
from openai import AsyncOpenAI
import os
from dotenv import load_dotenv
import io

from prompts.output_schema import SCHEMA_DESCRIPTION


load_dotenv()

MODEL = os.environ["LLM_MODEL"]

def pdf_to_text(pdf_path: bytes) -> str:
    chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            chunks.append(page.extract_text() or "")
            for table in page.extract_tables():
                chunks.append("\n[TABLE]\n" + "\n".join(
                    " | ".join(str(c) if c is not None else "" for c in row)
                    for row in table
                ))
    return "\n\n".join(chunks)


def extract_json(raw: str) -> dict:
    # Strip markdown fences if the model added them despite instructions
    cleaned = re.sub(r"^```json\s*|\s*```$", "",
                     raw.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


async def extract_from_pdf(pdf_file: bytes, client: AsyncOpenAI) -> dict:
    paper_text = pdf_to_text(io.BytesIO(pdf_file))

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You extract structured data from materials science papers. Output ONLY JSON, nothing else."},
            {"role": "user", "content": SCHEMA_DESCRIPTION +
                "\n\n--- PAPER TEXT ---\n\n" + paper_text},
        ],
        temperature=0,  # deterministic extraction, not creative writing
        stream_options={"include_usage": True}
    )

    raw = response.choices[0].message.content

    try:
        return extract_json(raw)    
    except json.JSONDecodeError:
        print("Model did not return clean JSON. Raw output:\n", raw, file=sys.stderr)
        raise