# AGENTS.md

FastAPI service that turns uploaded PDFs (materials-science papers) into structured JSON via an LLM, using pdfplumber for text extraction.

## Commands

- Run dev server: `uv run fastapi dev` (entrypoint `main:app`, per `[tool.fastapi]` in `pyproject.toml`)
- Python `>=3.13`, package manager is **uv**

## Environment

Required in `.env` (loaded via `load_dotenv()` in `main.py`, `dependencies/LLMClient.py`, and `utils/parse_file_info_json.py`):

- `OLLAMA_CHEWS_THE_KEY` — the API key value for the LLM client. The client points at `https://ollama.com/v1`, **not** OpenAI (`dependencies/LLMClient.py`).
- `LLM_MODEL` — model name used in `utils/parse_file_info_json.py`.

## Dependencies

- `pyproject.toml` + `uv.lock` are the source of truth. Add deps with `uv add`/`uv remove`.
- `requirements.txt` is a stale UTF-16-encoded `pip freeze` dump. Do not edit or regenerate it.

## Architecture

- `main.py` — FastAPI app. Lifespan builds the shared `AsyncOpenAI` client from `dependencies/LLMClient.llm_client` and stores it in the module-level `client_container` dict; it is injected via the `get_llm_client` dependency. Endpoint `POST /parsefile/` accepts the file as raw bytes in the request body.
- `utils/parse_file_info_json.py` — `extract_from_pdf` → `pdf_to_text` (pdfplumber; tables emitted after `[TABLE]` markers) → LLM call (`temperature=0`, strict JSON) → `extract_json` (strips markdown fences).
- `prompts/output_schema.py` — `SCHEMA_DESCRIPTION` is the JSON output contract; keep it in sync with any output shape changes.
- `response.json` — saved sample output of a run; useful reference for expected extraction shape.

## Verification

No tests, no lint/typecheck config, no CI. Verify by starting the server and hitting `POST /parsefile/` with a PDF body, or keep `response.json`-style outputs in sync.