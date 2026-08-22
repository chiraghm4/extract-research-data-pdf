# Glass Powder Paper Extractor

Structured data extraction pipeline for glass-powder-in-concrete literature. It reads a research paper PDF, extracts text and tables with `pdfplumber`, sends them to an LLM hosted on **Ollama Cloud** (OpenAI-compatible API at `https://ollama.com/v1`), and prints structured JSON describing materials, mix conditions, and compressive strength data.

## Project Structure

```
├── extract_paper.py      # Main extraction script
├── requirements.txt      # Pinned Python dependencies
├── .env                  # Holds the OLLAMA_CHEWS_THE_KEY API key
├── sample.py / sample.json
└── venv/                 # Python 3.13 virtual environment
```

## Requirements

- Python 3.13 (already bundled in `venv/`)
- An Ollama Cloud API key — get one free at https://ollama.com/settings/keys

## Setup

### 1. Activate the virtual environment

**Command Prompt (cmd):**

```powershell
venv\Scripts\activate.bat
```

You should see `(venv)` prefixed to your prompt.

### 2. Install dependencies (only needed on a fresh setup)

```powershell
pip install -r requirements.txt
```

### 3. Configure the API key

Create/update `.env` in the project root:

```
OLLAMA_CHEWS_THE_KEY=your-api-key-here
```

## Usage

With the virtual environment activated:

```powershell
python extract_paper.py "Utilization_of_waste_glass_powder_in_the_production_of_cement.pdf"
```

General form — pass any paper PDF as the first argument:

```powershell
python extract_paper.py path/to/paper.pdf
```

The script prints the extracted structured JSON to stdout. Redirect to save it:

```powershell
python extract_paper.py path/to/paper.pdf > output.json
```

## Notes

- The model is set to `nemotron-3-super:cloud` (`MODEL` in `extract_paper.py`); swap it for another model available on your plan if needed.
- Table data read off figures rather than tables is flagged with `"low_confidence": true` in the output.
- Temperature is set to `0` for deterministic extraction.
