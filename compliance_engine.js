// ISO Timestamp: 2025-11-24T19:35:00Z
/**
 * compliance_engine.js – AIVS VAT/CIS Logic Engine (pdfjs text version)
 * Input:  raw extracted text from PDF (string)
 * Output: structured VAT/CIS verdict + corrected invoice preview (screen only)
 */

export function runComplianceChecks(text) {
  try {
    text = (text || "").toLowerCase();

    /* ----------------------------------------------------------
       1. DETECTION LAYER (keyword-based, stable)
    ---------------------------------------------------------- */
    const detected = {
      hasLabour: text.includes("labour"),
      hasMaterials: text.includes("material"),
      reverseCharge:
        text.includes("reverse charge") ||
        text.includes("domestic reverse charge") ||
        text.includes("vat act 1994"),
      domestic:
        text.includes("domestic") ||
        text.includes("homeowner"),
      commercial:
        text.includes("contractor") ||
        text.includes("commercial"),
    };

    /* ----------------------------------------------------------
       2. VAT LOGIC
    ---------------------------------------------------------- */
    let vat_check = "";
    let required_wording = "";
    let vatSummary = "";

    if (detected.reverseCharge) {
      vat_check = "Reverse charge VAT wording detected.";
      required_wording =
        "Reverse charge applies: Customer to account for VAT to HMRC (VAT Act 1994 s55A).";
      vatSummary = "Reverse charge explicitly indicated.";
    } else if (detected.hasLabour && detected.commercial) {
      vat_check =
        "Labour to VAT-registered contractor: reverse-charge likely required.";
      required_wording =
        "Include reverse-charge wording if customer is VAT-registered.";
      vatSummary = "Likely reverse-charged supply.";
    } else if (detected.domestic) {
      vat_check = "Domestic work – normal VAT rules apply.";
      vatSummary = "Domestic supply.";
    } else {
      vat_check = "Cannot confirm VAT treatment from the text.";
      vatSummary = "VAT unclear from invoice text.";
    }

    /* ----------------------------------------------------------
       3. CIS LOGIC
    ---------------------------------------------------------- */
    let cis_check = "";

    if (detected.hasLabour && !detected.hasMaterials) {
      cis_check = "Labour-only supply: CIS normally applies.";
    } else if (detected.hasLabour && detected.hasMaterials) {
      cis_check = "Labour + materials: CIS applies to labour portion only.";
    } else if (!detected.hasLabour && detected.hasMaterials) {
      cis_check = "Materials-only: CIS must NOT apply.";
    } else {
      cis_check = "Unable to determine CIS applicability from the text.";
    }

    /* ----------------------------------------------------------
       4. SUMMARY TEXT
    ---------------------------------------------------------- */
    const summary = `
VAT Summary: ${vatSummary}
CIS Summary: ${cis_check}
Required Wording: ${required_wording || "None detected"}
    `.trim();

    /* ----------------------------------------------------------
       5. SCREEN-ONLY SAMPLE INVOICE PREVIEW
          (Never emailed or included in PDF/DOCX)
    ---------------------------------------------------------- */
    const corrected_invoice = `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f3f3f3; font-weight:bold;">
            <td>Description</td>
            <td>Category</td>
            <td>Amount (£)</td>
            <td>VAT Rate</td>
            <td>Notes</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Labour (example)</td>
            <td>Labour</td>
            <td>0.00</td>
            <td>${detected.reverseCharge ? "Reverse Charge" : "20%"}</td>
            <td>Screen preview only</td>
          </tr>
          <tr>
            <td>Materials (example)</td>
            <td>Materials</td>
            <td>0.00</td>
            <td>20%</td>
            <td>Screen preview only</td>
          </tr>
        </tbody>
      </table>
    `;

    /* ----------------------------------------------------------
       6. RETURN STRUCTURE
    ---------------------------------------------------------- */
    return {
      vat_check,
      cis_check,
      required_wording,
      summary,
      corrected_invoice
    };

  } catch (err) {
    console.error("❌ compliance_engine.js error:", err);
    return {
      vat_check: "Error",
      cis_check: "Error",
      required_wording: "",
      summary: "Compliance engine crashed.",
      corrected_invoice: ""
    };
  }
}
