# data-py — the Python track

Parallel experimental track: the same 3 datasets as the Node track (`data/`),
processed with Python + LangChain Text Splitters (chunking) and
Sentence-Transformers (embeddings), for comparison — not a replacement.

Sources are **not duplicated** — `scripts/build_datasets.py` reads directly
from `../data/sources/`, so both tracks chunk the exact same files. Only the
processed output (`data-py/processed/*.json`) differs.

## Setup (one-time)

```
cd data-py
python -m venv .venv
.venv\Scripts\activate        # Windows — macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```
python scripts/build_datasets.py
```

First run downloads the `all-MiniLM-L6-v2` model (~90MB) and installs
PyTorch as a dependency of `sentence-transformers` — expect a few minutes
and a real download the first time only.

## Status

- Chunking: **done** — `RecursiveCharacterTextSplitter`, the standard
  generic approach (deliberately not the Node track's hand-rolled,
  structure-aware chunker — that contrast is the point). Real counts:
  portfolio 37 chunks, cars-jdm-legends 7, sherlock-holmes 791 — quite
  different from Node's 75/8/560, an honest result of the different
  splitting strategy, not a bug.
- Embeddings: **done** — `all-MiniLM-L6-v2` via `sentence-transformers`,
  the same model the Node track's Xenova embedder uses, 384 dimensions,
  run once, locally, $0. See it live in the app's Step 05.
- Vector search (ChromaDB): **not started**.
- Everything past that (retrieval, agent, LLM call) stays shared with the
  Node track — see `src/components/Step1StackPicker.jsx` for the full
  comparison table.

## Wired into the live app

Steps 03 (dataset picker), 04 (chunk browser), and 05 (embeddings) are all
track-aware — whichever track you pick in Step 01 is what they show.
