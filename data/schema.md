# Dataset schema

Every processed dataset in `data/processed/*.json` follows the same shape, so retrieval code
is written once and works identically across all three datasets.

```json
{
  "datasetId": "cars-jdm-legends",
  "displayName": "JDM Legends — Spec Comparison",
  "description": "One-paragraph description shown in the dataset picker's read window.",
  "sourceFiles": ["data/sources/cars-jdm-legends.md"],
  "chunks": [
    {
      "id": "cars-toyota-supra-mk4",
      "section": "car_spec",
      "title": "Toyota Supra MK4 (A80) Turbo",
      "text": "The retrievable prose for this chunk — what gets embedded and what the LLM reads.",
      "source": "cars-jdm-legends.md",
      "metadata": {
        "horsepowerHp": 321,
        "torqueLbFt": 315,
        "zeroToSixtySec": 4.6,
        "curbWeightLb": 3560,
        "yearStart": 1993,
        "yearEnd": 2002
      }
    }
  ]
}
```

Field notes:
- `id` — unique within the dataset, human-readable, stable across rebuilds (used for citations).
- `section` — coarse category (e.g. `certification`, `project`, `work_experience`, `car_spec`, `story`) — lets the UI group/filter chunks in the read window.
- `title` — short label shown in the evidence panel when this chunk is cited.
- `text` — the only field that gets embedded and sent to the LLM as context.
- `metadata` — structured extra fields. Free-form per dataset; for `cars-jdm-legends` it holds parsed numeric specs so the future chart tool can plot without re-parsing prose.
- `source` — which raw file under `data/sources/` this chunk was built from.

Embeddings are **not** stored in these files — a separate build step embeds `text` for
each chunk and writes vectors alongside (kept out of this file so the schema stays readable).
