# AI Anchor — Python retrieval service

A small FastAPI service that gives the Python track a real, live,
arbitrary-question retrieval endpoint, backed by real ChromaDB and
Sentence-Transformers — the thing the fixed-question demo
(`data-py/scripts/retrieve_local.py`) couldn't do, because neither
library runs in a browser.

No persistent disk: every boot rebuilds an in-memory ChromaDB
collection from `data/*.json` (the same chunk files
`data-py/scripts/build_datasets.py` produces, embeddings already
baked in), so free hosting with ephemeral/no disk works fine.

## Run locally

```
cd service-py
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Then:

```
curl http://localhost:8000/health
curl -X POST http://localhost:8000/retrieve \
  -H "Content-Type: application/json" \
  -d '{"datasetId":"sherlock-holmes","question":"Who is Irene Adler?","k":5}'
```

`datasetId` is one of `portfolio`, `cars-jdm-legends`, `sherlock-holmes`.

## Deploy for free — Hugging Face Spaces (Docker SDK)

This is a separate git remote from GitHub, so deploying means pushing
this folder's contents to a Space's own repo. No credit card required.

1. Create a free account at huggingface.co if you don't have one.
2. Create a new Space: huggingface.co/new-space
   - SDK: **Docker**
   - Visibility: Public (so the frontend can call it)
   - Hardware: the free CPU tier
3. Clone the Space's git repo it gives you, then copy this folder's
   contents (`app.py`, `requirements.txt`, `Dockerfile`, `data/`) into
   it and push:
   ```
   git clone https://huggingface.co/spaces/<your-username>/<space-name>
   cp -r service-py/* <space-name>/
   cd <space-name>
   git add -A && git commit -m "Deploy retrieval service" && git push
   ```
4. The Space builds the Dockerfile and starts serving at
   `https://<your-username>-<space-name>.hf.space`. Confirm with:
   ```
   curl https://<your-username>-<space-name>.hf.space/health
   ```
5. Set that URL as `VITE_PY_API_URL` in the frontend's environment
   (see the repo root README / `.env.example`).

**Cold starts are real and expected on the free tier.** The Space
sleeps after a period of inactivity and takes tens of seconds to wake
on the next request — the frontend shows a "waking up" state for this
rather than hiding it, matching the rest of this project's stance on
not overclaiming what's actually live at any given moment.
