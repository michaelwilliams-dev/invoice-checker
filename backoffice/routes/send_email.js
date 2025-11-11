/**
 * AIVS Invoice Compliance Checker · Email Sender Route
 * ISO Timestamp: 2025-11-11T22:59:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 *
 * Description:
 * Handles manual email sends from frontend, finding the latest report in /generated.
 */

import express from "express";
import fs from "fs";
import path from "path";
import { sendReportEmail } from "../../server.js";

const router = express.Router();

// Helper: find the latest generated report
function getLatestReportFiles() {
  const dir = "/opt/render/project/src/generated";
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".docx") || f.endsWith("_raw.pdf"))
    .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);

  const latestDoc = files.find(f => f.name.endsWith(".docx"));
  const latestPdf = files.find(f => f.name.endsWith("_raw.pdf"));

  if (!latestDoc || !latestPdf) throw new Error("No report files found");
  return {
    docPath: path.join(dir, latestDoc.name),
    pdfPath: path.join(dir, latestPdf.name),
  };
}

router.post("/send_email", async (req, res) => {
  try {
    const { userEmail, emailCopy1, emailCopy2 } = req.body;
    console.log("📨 Manual email send request:", userEmail, emailCopy1, emailCopy2);

    const { docPath, pdfPath } = getLatestReportFiles();
    const timestamp = new Date().toISOString();

    await sendReportEmail(userEmail, [emailCopy1, emailCopy2], docPath, pdfPath, timestamp);

    console.log("✅ Manual email sent successfully");
    res.json({ status: "email_sent", timestamp });
  } catch (err) {
    console.error("❌ /send_email error:", err.message);
    res.status(500).json({ status: "error", error: err.message });
  }
});

export default router;
