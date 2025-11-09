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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ✅ Restrict CORS so only your portal or Shopify sites can access it
app.use(cors({ origin: ["https://assistants.aivs.uk", "https://property-assistant-plus.onrender.com"] }));

// ✅ Serve the backoffice static assets
app.use(express.static(path.join(__dirname, "backoffice")));

// ✅ Register the invoice-checker route
app.use("/", checkInvoiceRoute);

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ AIVS Invoice Checker running on port ${PORT}`));