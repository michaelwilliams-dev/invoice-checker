/**
 * AIVS Invoice Compliance Checker · Stand-Alone Service
 * ISO Timestamp: 2025-11-09T19:20:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import checkInvoiceRoute from "./backoffice/routes/check_invoice.js";

// ----------------------------------------------------
// Initialise
// ----------------------------------------------------
console.log("🔧 Booting AIVS Invoice Checker server …");

// Node ESM path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ----------------------------------------------------
// Middleware
// ----------------------------------------------------
app.use(
  cors({
    origin: [
      "https://assistants.aivs.uk",
      "https://property-assistant-plus.onrender.com",
    ],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// Static files and routes
// ----------------------------------------------------
app.use(express.static(path.join(__dirname, "backoffice")));
app.use("/", checkInvoiceRoute);

// ----------------------------------------------------
// Start server (Render supplies PORT env var)
// ----------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ AIVS Invoice Checker running on port ${PORT}`);
});

// ----------------------------------------------------
// AIVS Security Guard: prevent raw invoice uploads to OpenAI
// ----------------------------------------------------
import fs from "fs";

function safeForAI(input) {
  const hasBinary = Buffer.isBuffer(input);
  const isLarge = typeof input === "string" && input.length > 20000;
  const looksLikeFile = /%PDF|PK\x03\x04|<xml/i.test(input);

  if (hasBinary || isLarge || looksLikeFile) {
    console.warn("🚫 BLOCKED: attempt to send raw file data to OpenAI prevented");
    return false;
  }
  return true;
}

async function askOpenAI(prompt) {
  if (!safeForAI(prompt)) {
    throw new Error("Unsafe input blocked — raw invoice data must not leave server");
  }
  console.log("✅ OK: sending clean text to OpenAI");
  // place your actual OpenAI call here
  // const response = await openai.chat.completions.create({...});
}
