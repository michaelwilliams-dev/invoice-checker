/**
 * AIVS Invoice Checker · FAISS Loader (Step 1 Only)
 * ISO Timestamp: 2025-11-13T18:10:00Z
 */

import fs from "fs";

const INDEX_PATH = "/mnt/data/vector.index";
const META_PATH = "/mnt/data/chunks_metadata.final.jsonl";
const FAISS_BIN = "/mnt/data/index.faiss";
const FAISS_PKL = "/mnt/data/index.pkl";

export function testFaissLoading() {
  const results = {};

  try {
    results.index_exists = fs.existsSync(INDEX_PATH);
    results.index_size = results.index_exists
      ? fs.statSync(INDEX_PATH).size
      : 0;
  } catch (e) {
    results.index_error = e.message;
  }

  try {
    results.meta_exists = fs.existsSync(META_PATH);
    results.meta_size = results.meta_exists
      ? fs.statSync(META_PATH).size
      : 0;
  } catch (e) {
    results.meta_error = e.message;
  }

  try {
    results.faiss_exists = fs.existsSync(FAISS_BIN);
    results.faiss_size = results.faiss_exists
      ? fs.statSync(FAISS_BIN).size
      : 0;
  } catch (e) {
    results.faiss_error = e.message;
  }

  try {
    results.pkl_exists = fs.existsSync(FAISS_PKL);
    results.pkl_size = results.pkl_exists
      ? fs.statSync(FAISS_PKL).size
      : 0;
  } catch (e) {
    results.pkl_error = e.message;
  }

  return results;
}
