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

## Deploy for free — Render (Web Service, Docker)

(Hugging Face Spaces used to be the free option here, but HF now
requires a paid PRO plan for Docker/Gradio Spaces — free tier is
static-only, which can't run this. Render's free tier still supports a
real Docker web service with no credit card required, verified against
their current docs, not assumed.)

Render can deploy straight from a subdirectory of this GitHub repo —
no separate git remote to manage, unlike the old HF Spaces approach.

1. Create a free account at render.com if you don't have one (no card
   needed to start).
2. Dashboard → **New → Web Service** → connect your GitHub account →
   select the `AI-Anchor` repo.
3. Configure:
   - **Root Directory:** `service-py`
   - **Runtime:** Docker (it should auto-detect the `Dockerfile`)
   - **Instance Type:** Free
   - **Branch:** whichever branch you're deploying from (e.g. `ui-polish`)
4. Deploy. First build takes a few minutes (installing
   sentence-transformers/chromadb, downloading the embedding model
   into the image). Render gives you a URL like
   `https://<service-name>.onrender.com`. Confirm it's real before
   moving on:
   ```
   curl https://<service-name>.onrender.com/health
   ```
   should return `{"ok":true,"model":"all-MiniLM-L6-v2","datasets":[...]}`.
5. Set that URL as `VITE_PY_API_URL` in the frontend's environment
   (see the repo root README / `.env.example`).

**Cold starts are real and expected on the free tier.** Render spins
the service down after 15 minutes of no traffic and takes about a
minute to wake on the next request — the frontend shows a "waking up"
state for this rather than hiding it, matching the rest of this
project's stance on not overclaiming what's actually live at any given
moment.
