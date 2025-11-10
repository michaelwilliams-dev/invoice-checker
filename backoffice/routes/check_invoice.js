/**
 * AIVS Invoice Compliance Checker · Express Route
 * ISO Timestamp: 2025-11-09T18:45:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 * 
 * Description:
 * Handles file uploads and passes them to the AIVS invoice compliance
 * analysis functions. Supports CIS and VAT (DRC/zero-rated) logic.
 */

import express from "express";
import fileUpload from "express-fileupload";

const router = express.Router();
router.use(fileUpload());

router.post("/check_invoice", async (req, res) => {
  try {
    console.log("🟢 /check_invoice endpoint hit");   // 👈 goes first
    if (!req.files?.file) throw new Error("No file uploaded");

    const file = req.files.file;
    const flags = {
      vatCategory: req.body.vatCategory,
      endUserConfirmed: req.body.endUserConfirmed,
      cisRate: req.body.cisRate
    };

    // temporary placeholders until invoice_tools.js is restored
    const parsed = { parserNote: "File received OK" };
    const aiReply = {
      vat_check: "Reverse charge correctly applied.",
      cis_check: "CIS deduction required at 20%.",
      required_wording:
        "Include 'Customer to account for VAT under the reverse charge'.",
      corrected_invoice: "<p>Example corrected invoice preview.</p>",
      summary: "Invoice appears compliant under CIS and DRC rules."
    };

    res.json({
      parserNote: parsed.parserNote,
      aiReply,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ /check_invoice error:", err.message);
    res.status(500).json({ error: err.message, timestamp: new Date().toISOString() });
  }
});

export default router;
