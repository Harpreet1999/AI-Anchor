import json
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data-py" / "processed"
CHROMA_DIR = ROOT / "data-py" / ".chroma"
MODEL_NAME = "all-MiniLM-L6-v2"


def load_dataset(dataset_id: str) -> dict:
    path = DATA_DIR / f"{dataset_id}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def build_collection(dataset_id: str, model: SentenceTransformer):
    dataset = load_dataset(dataset_id)
    client = chromadb.Client(
        chromadb.config.Settings(persist_directory=str(CHROMA_DIR), anonymized_telemetry=False)
    )
    collection = client.get_or_create_collection(
        name=f"anchor-{dataset_id}",
        metadata={"hnsw:space": "cosine"},
    )

    documents = []
    metadata = []
    ids = []
    embeddings = []

    for chunk in dataset["chunks"]:
        documents.append(chunk["text"])
        metadata.append(
            {
                "id": chunk["id"],
                "title": chunk["title"],
                "source": chunk["source"],
                "section": chunk["section"],
            }
        )
        ids.append(chunk["id"])

    vector_rows = model.encode(documents, normalize_embeddings=True)
    embeddings = vector_rows.tolist()

    collection.add(documents=documents, metadatas=metadata, ids=ids, embeddings=embeddings)
    return collection


def retrieve(dataset_id: str, question: str, k: int = 3):
    model = SentenceTransformer(MODEL_NAME)
    collection = build_collection(dataset_id, model)
    query_embedding = model.encode([question], normalize_embeddings=True)[0].tolist()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    formatted = []
    for index, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][index]
        formatted.append(
            {
                "rank": index + 1,
                "chunkId": meta["id"],
                "title": meta["title"],
                "source": meta["source"],
                "section": meta["section"],
                "score": 1 - float(results["distances"][0][index]),
                "text": doc,
            }
        )

    return formatted


if __name__ == "__main__":
    sample_question = "What projects has Harpreet worked on?"
    print(json.dumps(retrieve("portfolio", sample_question, 3), indent=2, ensure_ascii=False))
