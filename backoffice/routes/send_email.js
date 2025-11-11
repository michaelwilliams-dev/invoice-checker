/**
 * AIVS Invoice Compliance Checker · Email Sender Route
 * ISO Timestamp: 2025-11-11T16:10:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 *
 * Description:
 * Handles post-processing email delivery for generated compliance reports.
 * This route sends the previously generated Word (.docx) and PDF files
 * as Mailjet attachments after the main analysis has completed.
 */

import express from "express";
import { sendReportEmail } from "../../server.js";

const router = express.Router();

router.post("/send_email", async (req, res) => {
  try {
    const { userEmail, emailCopy1, emailCopy2, docPath, pdfPath, timestamp } = req.body;

    console.log("📨 Email send request received:", userEmail, emailCopy1, emailCopy2);

    await sendReportEmail(
      userEmail,
      [emailCopy1, emailCopy2],
      docPath,
      pdfPath,
      timestamp || new Date().toISOString()
    );

    res.json({ status: "email_sent", timestamp: new Date().toISOString() });
    return;
  } catch (err) {
    console.error("❌ /send_email error:", err.message);
    res
      .status(500)
      .json({ error: err.message, timestamp: new Date().toISOString() });
    return;
  }
});

export default router;
