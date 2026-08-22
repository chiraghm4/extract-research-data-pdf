"""
Structured data extraction pipeline for glass-powder-in-concrete literature,
using Ollama Cloud instead of the Anthropic API.

Setup:
    1. Get a key at https://ollama.com/settings/keys (free tier works for light use)
    2. Set the OLLAMA_CHEWS_THE_KEY environment variable to that key
       (Windows PowerShell: $env:OLLAMA_CHEWS_THE_KEY = "your-key-here")
    3. pip install openai pdfplumber --break-system-packages
    4. python extract_paper_ollama.py path/to/paper.pdf

Notes on the swap from Claude -> Ollama:
    - Ollama Cloud speaks the OpenAI-compatible API at https://ollama.com/v1,
      so we use the `openai` SDK, just pointed at a different base_url.
    - Ollama's API does not accept a raw PDF like Claude's `document` block does.
      We extract the text ourselves first (pdfplumber) and send that as a normal
      text message. This means table structure can get mangled in extraction --
      worth spot-checking a few papers to see how badly.
    - Structured/JSON output support varies by model. Models good at tool-calling
      and JSON mode as of mid-2026: qwen3, llama3.1+, mistral-nemo. Pick one
      available on your Ollama Cloud plan. Smaller/older models will often ignore
      the schema and ramble -- test on 2-3 papers before trusting it at scale.
"""
import json
import os
import re
import sys
from pathlib import Path

import pdfplumber
from dotenv import load_dotenv
from openai import OpenAI
import openpyxl

load_dotenv()

# MODEL = "gpt-oss:120b-cloud"  # swap for whatever's on your plan; check `ollama list` / ollama.com/library
# swap for whatever's on your plan; check `ollama list` / ollama.com/library
MODEL = "nemotron-3-super:cloud"

client = OpenAI(
    base_url="https://ollama.com/v1",
    # value, not the var name itself
    api_key=os.environ["OLLAMA_CHEWS_THE_KEY"],
)

# Same schema as before, just delivered via a JSON-mode prompt instead of
# Anthropic's forced tool_choice (Ollama's function-calling reliability varies
# more by model, so a strict "respond with ONLY this JSON shape" prompt is
# often more robust across models).
SCHEMA_DESCRIPTION = """
Return ONLY valid JSON (no markdown fences, no commentary) matching this shape:

{
  "materials": [
    {
      "material_analyzed": string,          // e.g. "Cement", "Glass Powder"
      "specific_gravity": number or null,
      "SiO2": number or null, "Al2O3": number or null, "Fe2O3": number or null,
      "CaO": number or null, "MgO": number or null, "SO3": number or null,
      "Na2O": number or null, "K2O": number or null, "LOI": number or null,
      "particle_size_note": string or null
    }
  ],
  "conditions": [
    {
      "condition_id": string,
      "specimen_type": "mortar" | "concrete" | "paste",
      "mix_type": "replacement" | "addition",
      "concrete_grade_mpa": number or null,
      "wb_ratio": number or null,
      "admixture_type": string or null,
      "admixture_dosage_pct": number or null,
      "strength_7d_mpa": {"0pct": number, "5pct": number, ...} or {},
      "strength_28d_mpa": {"0pct": number, "5pct": number, ...} or {},
      "data_source": string,                // e.g. "Table 7" or "Fig. 11 (digitized, approximate)"
      "low_confidence": boolean             // true if read off a chart, not a table
    }
  ]
}

Rules:
- One entry per DISTINCT experimental condition. Do not merge different grades,
  mix types (replacement vs addition), or specimen types (mortar vs concrete)
  into a single condition.
- Pull strength numbers from tables when available. Only use figures if no
  table has the value, and set low_confidence=true when you do.
- Use null for anything not reported. Do not invent values.
"""


def pdf_to_text(pdf_path: str) -> str:
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


def extract_from_pdf(pdf_path: str) -> dict:
    paper_text = pdf_to_text(pdf_path)

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You extract structured data from materials science papers. Output ONLY JSON, nothing else."},
            {"role": "user", "content": SCHEMA_DESCRIPTION +
                "\n\n--- PAPER TEXT ---\n\n" + paper_text},
        ],
        temperature=0,  # deterministic extraction, not creative writing
        stream_options={"include_usage": True}
    )
    print('llm response type', type(response))
    raw = response.choices[0].message.content
    # print(
    #     f'token analysis:\ncompletion token: {response.choices[0].usage.completion_tokens}\nprompt tokens: {response.choices[0].usage.prompt_tokens}\ntotal tokens: {response.choices[0].usage.total_tokens}')
    try:
        return extract_json(raw)
    except json.JSONDecodeError:
        print("Model did not return clean JSON. Raw output:\n", raw, file=sys.stderr)
        raise


if __name__ == "__main__":
    result = extract_from_pdf(sys.argv[1])
    print(json.dumps(result, indent=2))
    # Next: validate ranges, then append to master xlsx via openpyxl,
    # flagging any condition with low_confidence=True for manual review.

    # wb = openpyxl.load_workbook('glass-waste-database-sahil-vijay')
    # for ws in wb.worksheets:
    #     print('SHEET:', ws.title, '| dims:', ws.calculate_dimension())
    #     for i, row in enumerate(ws.iter_rows(values_only=True)):
    #         print(i, row)
    #         if i > 5: break
    #     print('---')
