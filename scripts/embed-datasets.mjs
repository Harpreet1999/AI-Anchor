// Embedding pass — the Node track's "Embed" stage (stage 03), run as its
// own separate script rather than folded into build-datasets.mjs, because
// the app's pipeline UI models Source / Chunk / Embed as three distinct
// stages, and this script's job really is only the third one: read
// already-chunked JSON, add a vector to every chunk, done.
//
// Uses the same model as the Python track (all-MiniLM-L6-v2) via
// transformers.js, so the two tracks' vectors are directly comparable —
// same model, two different runtimes.
//
// Run with: npm run data:embed

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "@huggingface/transformers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROCESSED = path.join(ROOT, "data", "processed");

const MODEL_ID = "Xenova/all-MiniLM-L6-v2"; // ONNX export of the same all-MiniLM-L6-v2 model
const FILES = ["portfolio.json", "cars-jdm-legends.json", "sherlock-holmes.json", "cookbook.json"];
const BATCH_SIZE = 32;

async function embedBatch(extractor, texts) {
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  // output.tolist() gives one array per input text
  return output.tolist();
}

async function main() {
  console.log(`Loading ${MODEL_ID}... (first run downloads the model, ~90MB)`);
  const extractor = await pipeline("feature-extraction", MODEL_ID);

  for (const file of FILES) {
    const filePath = path.join(PROCESSED, file);
    const dataset = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const texts = dataset.chunks.map((c) => c.text);

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const vectors = await embedBatch(extractor, batch);
      vectors.forEach((v, j) => {
        dataset.chunks[i + j].embedding = v.map((x) => Math.round(x * 1e6) / 1e6);
      });
      process.stdout.write(`\r${file}: ${Math.min(i + BATCH_SIZE, texts.length)}/${texts.length} chunks embedded`);
    }
    console.log();

    dataset.chunkingMethod = "Hand-rolled, structure-aware chunker";
    dataset.embeddingModel = "all-MiniLM-L6-v2";
    fs.writeFileSync(filePath, JSON.stringify(dataset, null, 2), "utf8");

    const dim = dataset.chunks[0]?.embedding?.length ?? 0;
    console.log(`${file}: ${dataset.chunks.length} chunks, ${dim}-dim embeddings — written`);
  }
}

main();
