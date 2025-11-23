// ISO Timestamp: 2025-11-23T17:05:00Z
/**
 * AIVS Invoice Checker Backend (Docling + JSON Checker)
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { extractInvoice } from "./docling_extract.js";
import { checkInvoice } from "./invoice_checker.js";
import fs from "fs";

console.log("🔧 Booting Invoice Checker …");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));


// -----------------------------
// EXTRACT INVOICE (Docling)
// -----------------------------
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


// -----------------------------
// CHECK INVOICE (JSON-based)
// -----------------------------
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


// -----------------------------
// SERVER START
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Invoice Checker running on port ${PORT}`);
});
