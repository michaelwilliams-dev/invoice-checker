/**
 * AIVS Invoice Checker · FAISS Semantic Search Engine (Step 2)
 * ISO Timestamp: 2025-11-13T19:05:00Z
 */

import fs from "fs";
import faiss from "faiss-node";
import OpenAI from "openai";

const INDEX_PATH = "/mnt/data/vector.index";
const META_PATH = "/mnt/data/chunks_metadata.final.jsonl";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let index = null;
let metadata = [];

/**
 * Load FAISS index + metadata once on startup
 */
export function loadFaissSearch() {
  console.log("🔧 Loading FAISS index…");

  index = faiss.readIndex(INDEX_PATH);
  console.log("✅ FAISS index loaded:", index.ntotal(), "vectors");

  console.log("🔧 Loading FAISS metadata…");
  const raw = fs.readFileSync(META_PATH, "utf8")
    .trim()
    .split("\n")
    .map(line => JSON.parse(line));

  metadata = raw;
  console.log("✅ Metadata loaded:", metadata.length, "chunks");
}

/**
 * Generate embedding for query text
 */
async function embedQuery(text) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });

  return new Float32Array(res.data[0].embedding);
}

/**
 * Perform semantic search against FAISS
 */
export async function semanticSearch(query, k = 6) {
  if (!index || metadata.length === 0) {
    throw new Error("FAISS search engine not loaded.");
  }

  const queryEmbedding = await embedQuery(query);
  const { distances, labels } = index.search(queryEmbedding, k);

  const results = labels.map((id, i) => {
    const chunk = metadata[id] || {};
    return {
      id,
      distance: distances[i],
      text: chunk.text || "",
      source: chunk.source || "",
      meta: chunk
    };
  });

  return results;
}
