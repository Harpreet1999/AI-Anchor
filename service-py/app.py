"""AI Anchor — Python retrieval service.

A small FastAPI service that gives the Python track a real, live,
arbitrary-question retrieval endpoint — the thing the fixed-question
demo (see data-py/scripts/retrieve_local.py) couldn't do, because
ChromaDB and Sentence-Transformers have no browser story.

Design choices, and why:
- No persistent disk. Free hosting doesn't guarantee a container's disk
  survives a restart, so instead of relying on ChromaDB's on-disk
  persistence, every startup rebuilds an in-memory collection from the
  chunk JSON already committed to this repo (data/*.json) — the same
  files data-py/scripts/build_datasets.py produced, embeddings and all.
  That startup rebuild is cheap: the chunk embeddings are already
  computed and baked into the JSON, so this just loads arrays into
  Chroma — no re-embedding the whole corpus on every boot.
- Only the live question gets embedded at request time, with the same
  all-MiniLM-L6-v2 model used to build the corpus, so query and corpus
  vectors are comparable.
- CORS is open (`*`) deliberately — this is a public read-only demo
  endpoint with no auth and no write path, not a service guarding
  anything, so there is nothing CORS-restricting the origin would
  actually protect.
"""

import json
import time
from pathlib import Path
from typing import Optional

import chromadb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

DATA_DIR = Path(__file__).resolve().parent / "data"
MODEL_NAME = "all-MiniLM-L6-v2"

DATASET_FILES = {
    "portfolio": "portfolio.json",
    "cars-jdm-legends": "cars-jdm-legends.json",
    "sherlock-holmes": "sherlock-holmes.json",
}

app = FastAPI(title="AI Anchor — Python retrieval service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_state = {"model": None, "client": None, "collections": {}, "ready": False, "error": None}


def build_collections():
    model = SentenceTransformer(MODEL_NAME)
    # ephemeral, in-memory client — no persist path, rebuilt fresh every boot
    client = chromadb.EphemeralClient()
    collections = {}

    for dataset_id, filename in DATASET_FILES.items():
        payload = json.loads((DATA_DIR / filename).read_text(encoding="utf-8"))
        chunks = payload["chunks"]

        collection = client.create_collection(name=f"anchor-{dataset_id}", metadata={"hnsw:space": "cosine"})
        collection.add(
            ids=[c["id"] for c in chunks],
            documents=[c["text"] for c in chunks],
            embeddings=[c["embedding"] for c in chunks],
            metadatas=[{"title": c["title"], "source": c["source"], "section": c.get("section", "text")} for c in chunks],
        )
        collections[dataset_id] = collection

    return model, client, collections


@app.on_event("startup")
def on_startup():
    started = time.time()
    try:
        model, client, collections = build_collections()
        _state.update(model=model, client=client, collections=collections, ready=True, error=None)
        print(f"[service-py] ready in {time.time() - started:.1f}s — {len(collections)} collections loaded")
    except Exception as exc:  # keep the process alive; report the real error via /health
        _state.update(ready=False, error=str(exc))
        print(f"[service-py] startup failed: {exc}")


class RetrieveRequest(BaseModel):
    datasetId: str
    question: str
    k: Optional[int] = 5


@app.get("/health")
def health():
    if not _state["ready"]:
        return {"ok": False, "message": _state["error"] or "Still starting up — model/collections not loaded yet."}
    return {"ok": True, "model": MODEL_NAME, "datasets": list(_state["collections"].keys())}


@app.post("/retrieve")
def retrieve(req: RetrieveRequest):
    if not _state["ready"]:
        raise HTTPException(status_code=503, detail=_state["error"] or "Service is still starting up. Try again in a few seconds.")

    if req.datasetId not in _state["collections"]:
        raise HTTPException(status_code=400, detail=f"Unknown datasetId '{req.datasetId}'. Expected one of: {list(DATASET_FILES.keys())}")

    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question must not be empty.")

    k = max(1, min(req.k or 5, 10))
    model = _state["model"]
    collection = _state["collections"][req.datasetId]

    query_embedding = model.encode([question], normalize_embeddings=True)[0].tolist()
    result = collection.query(query_embeddings=[query_embedding], n_results=k, include=["documents", "metadatas", "distances"])

    results = []
    for i, doc in enumerate(result["documents"][0]):
        meta = result["metadatas"][0][i]
        results.append({
            "chunkId": result["ids"][0][i],
            "title": meta["title"],
            "source": meta["source"],
            "section": meta["section"],
            "text": doc,
            # Chroma's cosine "distance" is (1 - cosine similarity) for
            # normalized vectors — convert back to a similarity score,
            # same convention the Node track and the fixed demo use.
            "score": 1 - float(result["distances"][0][i]),
            "metadata": {},
        })

    return {"question": question, "results": results, "model": MODEL_NAME, "engine": "ChromaDB (in-memory, cosine)"}
