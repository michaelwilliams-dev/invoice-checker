// ISO Timestamp: 2025-11-24T16:30:00Z
/**
 * invoice_checker.js – CIS + VAT Rules Engine
 * Works with Docling JSON and produces the structure needed by the frontend.
 */

export function checkInvoice(docJson) {
  try {
    // Convert Docling JSON to searchable text
    const text = JSON.stringify(docJson).toLowerCase();

    /* ----------------------------------------------------------
       1. DETECT INVOICE FEATURES FROM TEXT
    ---------------------------------------------------------- */
    const detected = {
      hasLabour: text.includes("labour") || text.includes("labour only"),
      hasMaterials: text.includes("material"),
      reverseCharge: text.includes("reverse charge") || text.includes("vat act 1994"),
      cisHint: text.includes("cis") || text.includes("construction industry scheme"),
      domestic: text.includes("domestic") || text.includes("homeowner"),
      commercial: text.includes("commercial") || text.includes("contractor"),
      newBuild: text.includes("new build") || text.includes("new-build")
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
        "Reverse charge applies: ‘Customer to account for VAT to HMRC (VAT Act 1994 s55A)’";
      vatSummary = "Reverse charge identified in document.";
    } else if (detected.hasLabour && detected.commercial) {
      vat_check = "Probable reverse charge supply (labour to a VAT-registered contractor).";
      required_wording =
        "Reverse charge may apply. Check customer VAT number.";
      vatSummary = "Labour supply to commercial customer.";
    } else if (detected.domestic) {
      vat_check = "Domestic customer — normal VAT rules apply.";
      vatSummary = "Domestic supply (no reverse charge).";
    } else {
      vat_check = "Standard or reduced VAT — unable to confirm from text.";
      vatSummary = "VAT unclear from extraction.";
    }

    /* ----------------------------------------------------------
       3. CIS LOGIC
    ---------------------------------------------------------- */
    let cis_check = "";

    if (detected.hasLabour && !detected.hasMaterials) {
      cis_check = "Labour-only supply: CIS likely applies unless gross payment status applies.";
    } else if (detected.hasLabour && detected.hasMaterials) {
      cis_check = "Labour + materials: CIS applies to labour portion only.";
    } else if (detected.hasMaterials && !detected.hasLabour) {
      cis_check = "Materials-only invoice — CIS should NOT be applied.";
    } else {
      cis_check = "Unable to determine CIS applicability from text.";
    }

    /* ----------------------------------------------------------
       4. SUMMARY
    ---------------------------------------------------------- */
    const summary = `
VAT Summary: ${vatSummary}
CIS Summary: ${cis_check}
Required Wording: ${required_wording || "None detected"}
    `.trim();

    /* ----------------------------------------------------------
       5. CORRECTED INVOICE PREVIEW (HTML)
    ---------------------------------------------------------- */

    const corrected_invoice = `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f3f3f3; font-weight:bold;">
            <td>Description</td>
            <td>Qty</td>
            <td>Unit Price (£)</td>
            <td>VAT Rate</td>
            <td>Line Total (£)</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Labour (example)</td>
            <td>1</td>
            <td>0.00</td>
            <td>${detected.reverseCharge ? "Reverse Charge" : "20%"}</td>
            <td>0.00</td>
          </tr>
          <tr>
            <td>Materials (example)</td>
            <td>1</td>
            <td>0.00</td>
            <td>20%</td>
            <td>0.00</td>
          </tr>
        </tbody>
      </table>
    `;

    /* ----------------------------------------------------------
       6. RETURN STRUCTURE FOR FRONTEND
    ---------------------------------------------------------- */
    return {
      vat_check,
      cis_check,
      required_wording,
      summary,
      corrected_invoice
    };

  } catch (err) {
    console.error("❌ invoice_checker.js error:", err);
    return {
      vat_check: "Error",
      cis_check: "Error",
      required_wording: "",
      summary: "Checker crashed – see logs.",
      corrected_invoice: ""
    };
  }
}
