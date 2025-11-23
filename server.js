// ISO Timestamp: 2025-11-23T17:25:00Z
/**
 * AIVS Invoice Checker Backend (Docling + JSON Checker + Upload)
 */

import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { extractInvoice } from "./docling_extract.js";
import { checkInvoice } from "./invoice_checker.js";

console.log("🔧 Booting Invoice Checker …");

/* -----------------------------------------------------------
   PATH + APP SETUP
----------------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

/* -----------------------------------------------------------
   MULTER FILE UPLOAD — stores PDF in /uploads
----------------------------------------------------------- */
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  }
});

/* -----------------------------------------------------------
   ROUTE: UPLOAD INVOICE → DOCLING → CHECKER
----------------------------------------------------------- */

app.post("/uploadInvoice", upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded" });

    const uploadedPath = req.file.path;

    console.log("📄 Uploaded:", uploadedPath);

    // STEP 1 — Extract structured JSON using Docling
    const doclingJson = await extractInvoice(uploadedPath);

    if (!doclingJson) {
      return res.status(500).json({ error: "Docling failed to extract invoice" });
    }

    console.log("📊 Docling extraction complete");

    // STEP 2 — Run JSON-based invoice checker
    const output = checkInvoice(doclingJson);

    console.log("🧮 Checker output:", output);

    // STEP 3 — Return results to UI
    res.json({
      success: true,
      file: uploadedPath,
      extracted: doclingJson,
      results: output
    });

  } catch (err) {
    console.error("❌ Upload/Check error:", err);
    res.status(500).json({ error: "Server error during invoice process" });
  }
});

/* -----------------------------------------------------------
   ROUTE: DEBUG — DOC ONLY (optional)
----------------------------------------------------------- */
app.post("/extractInvoice", async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ error: "Missing/invalid filePath" });
    }

    const json = await extractInvoice(filePath);
    if (!json) return res.status(500).json({ error: "Docling failed" });

    res.json({ success: true, data: json });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------------------------
   ROUTE: DIRECT JSON CHECKER (no upload)
----------------------------------------------------------- */
app.post("/checkInvoice", async (req, res) => {
  try {
    const { invoiceJson } = req.body;
    if (!invoiceJson)
      return res.status(400).json({ error: "Missing invoiceJson" });

    const output = checkInvoice(invoiceJson);
    res.json(output);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -----------------------------------------------------------
   START SERVER
----------------------------------------------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Invoice Checker running on port ${PORT}`);
});
