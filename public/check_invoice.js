import express from "express";
import multer from "multer";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/check_invoice", upload.single("file"), async (req, res) => {
  try {
    console.log("📄 File received:", req.file?.originalname);
    console.log("VAT Category:", req.body.vatCategory);
    console.log("End User Confirmed:", req.body.endUserConfirmed);
    console.log("CIS Rate:", req.body.cisRate);

    res.json({
      parserNote: "Invoice upload received successfully.",
      aiReply: {
        vat_check: "Reverse charge correctly applied.",
        cis_check: "CIS deduction required at 20%.",
        required_wording:
          "Include 'Customer to account for VAT under the reverse charge'.",
        corrected_invoice: "<p>Example corrected invoice preview.</p>",
        summary: "Invoice appears compliant under CIS and DRC rules."
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Error in /check_invoice:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
