
/**
 * AIVS Invoice Compliance Checker · Email Sender Route
 * ISO Timestamp: 2025-11-24T15:10:00Z
 * Author: AIVS Software Limited
 *
 * Description:
 * Sends the latest generated CIS/VAT report (PDF + DOCX)
 * to up to 3 email addresses provided by the frontend.
 */

import express from "express";
import fs from "fs";
import path from "path";
import { sendReportEmail } from "../../server.js";

const router = express.Router();

// Helper: return latest PDF + DOCX in /generated
function getLatestReportFiles() {
  const dir = "/opt/render/project/src/generated";
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".docx") || f.endsWith("_raw.pdf"))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(dir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  const latestDoc = files.find(f => f.name.endsWith(".docx"));
  const latestPdf = files.find(f => f.name.endsWith("_raw.pdf"));

  if (!latestDoc || !latestPdf) {
    throw new Error("No report files found in /generated");
  }

  return {
    docPath: path.join(dir, latestDoc.name),
    pdfPath: path.join(dir, latestPdf.name)
  };
}

router.post("/send_email", async (req, res) => {
  try {
    const { userEmail, emailCopy1, emailCopy2 } = req.body;

    console.log("📨 Email request received:", { userEmail, emailCopy1, emailCopy2 });

    if (!userEmail && !emailCopy1 && !emailCopy2) {
      return res.status(400).json({ error: "No valid email addresses provided" });
    }

    // Find the latest generated report
    const { docPath, pdfPath } = getLatestReportFiles();
    const timestamp = new Date().toISOString();

    // Send report via Mailjet
    await sendReportEmail(
      userEmail,
      [emailCopy1, emailCopy2],
      docPath,
      pdfPath,
      timestamp
    );

    console.log("📤 CIS/VAT report emailed successfully");
    return res.json({ status: "email_sent", timestamp });

  } catch (err) {
    console.error("❌ /send_email error:", err.message);
    return res.status(500).json({ status: "error", error: err.message });
  }
});

export default router;
