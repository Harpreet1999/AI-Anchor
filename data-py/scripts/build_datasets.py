"""Data-prep / indexing script — the Python track's "offline phase" of RAG.

Reads the SAME source files the Node track uses (data/sources/*.md, *.txt —
not a mirrored copy, so there's one source of truth for both tracks),
chunks them with LangChain's RecursiveCharacterTextSplitter (the standard
generic approach — deliberately NOT the hand-rolled structure-aware
chunker the Node track uses; that contrast is the point of having two
tracks), embeds every chunk with Sentence-Transformers (all-MiniLM-L6-v2,
runs locally, $0), and writes data-py/processed/*.json.

Run with:
    cd data-py
    python -m venv .venv
    .venv\\Scripts\\activate        (Windows)  |  source .venv/bin/activate (macOS/Linux)
    pip install -r requirements.txt
    python scripts/build_datasets.py
"""

import json
import re
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[2]  # AI-Anchor/
SRC = ROOT / "data" / "sources"  # reused from the Node track, not duplicated
OUT = ROOT / "data-py" / "processed"

MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 120

DATASETS = [
    {
        "id": "portfolio",
        "displayName": "Harpreet's Career",
        "description": (
            "Harpreet Singh's resume and full portfolio site — work history, projects, skills, "
            "certifications, achievements, and education. Ask about his AI Engineer work at "
            "Cognizant, the Agentic Grounding Platform, or anything else on his site."
        ),
        "files": ["resume.md", "portfolio.md"],
    },
    {
        "id": "cars-jdm-legends",
        "displayName": "JDM Legends — Spec Comparison",
        "description": (
            "Verified specs (horsepower, torque, 0-60, weight, production years) for 8 iconic "
            "1990s-2000s Japanese sports cars, including both Fairlady Z generations. A numeric, "
            "chartable dataset."
        ),
        "files": ["cars-jdm-legends.md"],                                                                                                           
    },
    {
        "id": "sherlock-holmes",
        "displayName": "The Adventures of Sherlock Holmes",
        "description": (
            "All 12 stories from Arthur Conan Doyle's 1892 collection (public domain, Project "
            "Gutenberg). Ask about any case, character, or clue."
        ),
        "files": ["sherlock-holmes.txt"],
    },
    {
        "id": "cookbook",
        "displayName": "The Boston Cooking-School Cook Book",
        "description": (
            "Fannie Merritt Farmer's 1896 cooking manual (public domain, Project Gutenberg) — "
            "recipes and technique across 38 chapters, from eggs and soups to pastry and cake. "
            "Ask how to make something, or what goes in it."
        ),
        "files": ["boston-cooking-school-cookbook.txt"],
        # Coarser than the 1000-char default (~500 chunks instead of
        # ~1700) — a deliberate demo-scale decision, not a change in what
        # the splitter does. Verified against the real text: 3000 chars
        # lands at 490 chunks.
        "chunk_size": 3000,
    },
]


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def build_dataset(model: SentenceTransformer, spec: dict) -> dict:
    # Per-dataset override, falling back to the shared default — only
    # cookbook (and, if it ever needs one, cars) uses a non-default size;
    # portfolio and sherlock-holmes stay on exactly the chunking they've
    # always had.
    chunk_size = spec.get("chunk_size", CHUNK_SIZE)
    chunk_overlap = spec.get("chunk_overlap", CHUNK_OVERLAP)
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    pieces = []  # [(source_file, piece_index, text)]
    for filename in spec["files"]:
        raw = (SRC / filename).read_text(encoding="utf-8")
        for i, piece in enumerate(splitter.split_text(raw)):
            pieces.append((filename, i, piece))

    texts = [p[2] for p in pieces]
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)

    chunks = []
    for (filename, idx, text), embedding in zip(pieces, embeddings):
        base = slugify(Path(filename).stem)
        chunks.append(
            {
                "id": f"{spec['id']}-{base}-{idx + 1}",
                "section": "text",
                "title": f"{filename} — part {idx + 1}",
                "text": text,
                "source": filename,
                "metadata": {},
                "embedding": [round(float(x), 6) for x in embedding],
            }
        )

    return {
        "datasetId": spec["id"],
        "displayName": spec["displayName"],
        "description": spec["description"],
        "sourceFiles": [f"data/sources/{f}" for f in spec["files"]],
        "chunkingMethod": "LangChain RecursiveCharacterTextSplitter",
        "embeddingModel": MODEL_NAME,
        "chunks": chunks,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"Loading {MODEL_NAME}... (first run downloads the model, ~90MB)")
    model = SentenceTransformer(MODEL_NAME)

    for spec in DATASETS:
        dataset = build_dataset(model, spec)
        out_path = OUT / f"{spec['id']}.json"
        out_path.write_text(json.dumps(dataset, indent=2), encoding="utf-8")
        dim = len(dataset["chunks"][0]["embedding"]) if dataset["chunks"] else 0
        print(f"{spec['id']}.json: {len(dataset['chunks'])} chunks, {dim}-dim embeddings")


if __name__ == "__main__":
    main()
