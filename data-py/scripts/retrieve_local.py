"""ChromaDB retrieval — the Python track's real, verified retrieval path.

Unlike the Node track (which searches live, in-browser, against arbitrary
questions — it can do that because it's already fully client-side),
ChromaDB is a local Python library with no browser story and no backend
yet. So this script does the honest version of "Python retrieval, local,
$0, bounded": run a small fixed set of real questions through a real
ChromaDB collection, once, offline, and save the verified output as
static JSON — the same pattern this whole project already uses for
chunks and embeddings.

Run with:
    cd data-py
    .venv\\Scripts\\activate
    python scripts/retrieve_local.py

Writes data-py/processed/retrieval-demo.json.
"""

import json
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data-py" / "processed"
CHROMA_DIR = ROOT / "data-py" / ".chroma"
MODEL_NAME = "all-MiniLM-L6-v2"
TOP_K = 5

# Small and fixed, on purpose — real answers, verified once, not an
# open-ended live search.
DEMO_QUESTIONS = {
    "portfolio": [
        "What did Harpreet work on at Cognizant?",
        "What AWS certifications does Harpreet have?",
    ],
    "cars-jdm-legends": [
        "Which car has the highest horsepower?",
        "Tell me about the Honda NSX engine.",
    ],
    "sherlock-holmes": [
        "How much French gold was in the bank cellar?",
        "Who is Irene Adler?",
    ],
    "cookbook": [
        "How long should you boil an egg to make it hard-boiled?",
        "How do you make baking powder biscuits?",
    ],
}


def load_dataset(dataset_id: str) -> dict:
    path = DATA_DIR / f"{dataset_id}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def build_collection(client, dataset_id: str, model: SentenceTransformer):
    dataset = load_dataset(dataset_id)
    collection = client.get_or_create_collection(
        name=f"anchor-{dataset_id}",
        metadata={"hnsw:space": "cosine"},
    )

    # Re-creating the collection's contents each run keeps this script
    # idempotent — safe to re-run after the source data changes.
    existing = collection.get(include=[])
    if existing["ids"]:
        collection.delete(ids=existing["ids"])

    documents, metadatas, ids = [], [], []
    for chunk in dataset["chunks"]:
        documents.append(chunk["text"])
        metadatas.append({
            "id": chunk["id"],
            "title": chunk["title"],
            "source": chunk["source"],
            "section": chunk["section"],
        })
        ids.append(chunk["id"])

    embeddings = model.encode(documents, normalize_embeddings=True).tolist()
    collection.add(documents=documents, metadatas=metadatas, ids=ids, embeddings=embeddings)
    return collection


def run_query(collection, model: SentenceTransformer, question: str, k: int) -> list:
    query_embedding = model.encode([question], normalize_embeddings=True)[0].tolist()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    formatted = []
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        # Chroma's cosine "distance" is (1 - cosine similarity) for
        # normalized vectors — convert back to the same 0-1 similarity
        # score the Node track reports, so the two tracks are comparable.
        formatted.append({
            "chunkId": meta["id"],
            "title": meta["title"],
            "source": meta["source"],
            "section": meta["section"],
            "text": doc,
            "score": 1 - float(results["distances"][0][i]),
            "metadata": {},
        })
    return formatted


def main():
    print(f"Loading {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    output = {"model": MODEL_NAME, "generatedWith": "ChromaDB (local, cosine)", "datasets": {}}

    for dataset_id, questions in DEMO_QUESTIONS.items():
        print(f"Building ChromaDB collection for {dataset_id}...")
        collection = build_collection(client, dataset_id, model)

        entries = []
        for question in questions:
            results = run_query(collection, model, question, TOP_K)
            entries.append({"question": question, "results": results})
            print(f'  "{question}" -> top result: {results[0]["title"]} ({results[0]["score"]:.3f})')

        output["datasets"][dataset_id] = entries

    out_path = DATA_DIR / "retrieval-demo.json"
    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
