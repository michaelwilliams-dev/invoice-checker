// ISO Timestamp: 2025-11-24T21:50:00Z
/**
 * compliance_engine.js – AIVS VAT/CIS Logic Engine (Simplified + HMRC-Aligned)
 */

 export function runComplianceChecks(raw) {
  try {
    const text = (raw || "").toLowerCase();
    const cleaned = raw.replace(/,/g, "").toLowerCase();

    /* ----------------------------------------------------------
       0. AMOUNT EXTRACTION (NET / VAT / TOTAL)
    ---------------------------------------------------------- */

    const money = { net: 0, vat: 0, total: 0 };

    // NET extraction
    const netMatch =
      cleaned.match(/subtotal[^0-9]*([0-9.]+)/) ||
      cleaned.match(/total\s*net[^0-9]*([0-9.]+)/);

    if (netMatch) money.net = parseFloat(netMatch[1]);

    // VAT extraction
    const vatMatch =
      cleaned.match(/vat[^\d]*([0-9]+\.[0-9]{2})/) ||
      cleaned.match(/vat\s*total[^\d]*([0-9]+\.[0-9]{2})/) ||
      cleaned.match(/vat\s*\n\s*([0-9]+\.[0-9]{2})/);
    if (vatMatch) money.vat = parseFloat(vatMatch[1]);

    // TOTAL extraction
    const totalMatch =
      cleaned.match(/total[^0-9]*([0-9.]+)/) ||
      cleaned.match(/amount\s*due[^0-9]*([0-9.]+)/);
    if (totalMatch) money.total = parseFloat(totalMatch[1]);
    else money.total = money.net + money.vat;


    /* ----------------------------------------------------------
       1. DETECTION LAYER – HMRC Labour/Materials
    ---------------------------------------------------------- */

    const labourSignals = [
      "labour", "labor",
      "groundworks", "excavation", "site preparation", "site clearance",
      "foundations", "footings", "brickwork", "bricklaying",
      "blockwork", "concrete", "steel fixing", "formwork", "shuttering",
      "carpentry", "carpenter", "joinery", "joiner", "first fix", "second fix",
      "electrical installation", "wiring install", "install lighting",
      "plumbing", "pipework", "boiler installation", "cylinder installation",
      "roofing", "roof repairs", "reroof",
      "paving", "slabbing", "decking install", "fencing install",
      "retaining wall", "demolition", "strip out", "dismantling",
      "scaffold", "scaffolding", "erection",
      "painting", "decorating", "building maintenance", "repairs to"
    ];

    const materialSignals = [
      "material", "materials", "timber", "plasterboard", "screws",
      "fixings", "paint", "consumables", "adhesive", "sealant",
      "tiles", "roofing felt", "upvc", "copper pipe",
      "boiler", "cylinder", "lighting unit", "accessories"
    ];

    const hasLabour = labourSignals.some(t => text.includes(t));
    const hasMaterials = materialSignals.some(t => text.includes(t));


    /* ----------------------------------------------------------
       2. VAT LOGIC – detect mistakes, not just state
    ---------------------------------------------------------- */

    let vat_check = "";
    let required_wording = "";
    let vatSummary = "";

    // Reverse charge ONLY if wording actually present
    const reverseCharge =
      text.includes("reverse charge") ||
      text.includes("domestic reverse charge");

    const vatAmount = money.vat || 0;

    // Contractor likely misunderstanding DRC:
    // Labour-only + VAT charged + no RC wording
    const likelyDRCMisunderstanding =
      hasLabour && !hasMaterials && !reverseCharge && vatAmount > 0;

    // CASE 1 – RC wording present AND VAT charged → WRONG
    if (reverseCharge && vatAmount > 0) {
      vat_check =
        `Reverse charge wording detected, but £${vatAmount.toFixed(2)} VAT has been charged on the invoice. ` +
        `Under the domestic reverse charge the supplier should NOT charge VAT – the customer accounts for it.`;
      required_wording =
        "Reverse charge applies: Customer to account for VAT to HMRC (VAT Act 1994 s55A).";
      vatSummary =
        "Reverse charge wording present, but VAT has been added – invoice likely incorrect.";

    // CASE 2 – Correct RC: wording present + no VAT
    } else if (reverseCharge && vatAmount === 0) {
      vat_check =
        "Reverse charge wording detected and no VAT charged – this is consistent with domestic reverse charge.";
      required_wording =
        "Reverse charge applies: Customer to account for VAT to HMRC (VAT Act 1994 s55A).";
      vatSummary = "Correct reverse charge supply.";

    // CASE 3 – No RC wording + VAT charged → standard or misunderstanding
    } else if (!reverseCharge && vatAmount > 0) {

      if (likelyDRCMisunderstanding) {
        vat_check =
          `Standard VAT of £${vatAmount.toFixed(2)} has been charged on a labour-only supply with no materials and no reverse charge wording. ` +
          `This strongly suggests the contractor does NOT understand the domestic reverse charge rules.`;
        vatSummary =
          "Likely contractor misunderstanding of reverse charge on a labour-only supply.";
      } else {
        vat_check = `Standard VAT charged: £${vatAmount.toFixed(2)} (no reverse charge wording detected).`;
        vatSummary = "Standard-rated VAT invoice.";
      }

    // CASE 4 – No VAT + no RC → zero-rated or needs manual review
    } else {
      vat_check =
        "No VAT charged and no reverse charge wording detected – supply may be zero-rated or incomplete.";
      vatSummary = "No VAT detected; manual review recommended.";
    }


    /* ----------------------------------------------------------
       3. CIS LOGIC
    ---------------------------------------------------------- */

    let cis_check = "";

    if (hasLabour && !hasMaterials) {
      cis_check = "Labour-only supply: CIS normally applies.";
    } else if (hasLabour && hasMaterials) {
      cis_check = "Mixed supply: CIS applies to labour portion only.";
    } else if (!hasLabour && hasMaterials) {
      cis_check = "Materials-only supply: CIS must NOT apply.";
    } else {
      cis_check = "Unable to determine CIS applicability.";
    }


    /* ----------------------------------------------------------
       4. SUMMARY TEXT (human explanation)
    ---------------------------------------------------------- */

    const summary = `
Detected Amounts:
  • Net: £${money.net.toFixed(2)}
  • VAT: £${money.vat.toFixed(2)}
  • Total: £${money.total.toFixed(2)}

VAT Summary: ${vatSummary}
CIS Summary: ${cis_check}
Required Wording: ${required_wording || "None required"}
    `.trim();


    /* ----------------------------------------------------------
       5. CLEAN SUMMARY INVOICE (SCREEN ONLY)
    ---------------------------------------------------------- */

    const cisRate = 0.20; 
    const cisDeduction = hasLabour ? (money.net * cisRate).toFixed(2) : "0.00";
    const totalDue = (money.total - parseFloat(cisDeduction)).toFixed(2);

    const corrected_invoice = `
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f3f3f3;font-weight:bold;">
            <td>Description</td>
            <td>Amount (£)</td>
            <td>Notes</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Net Amount</td>
            <td>${money.net.toFixed(2)}</td>
            <td>Extracted from invoice</td>
          </tr>

          <tr>
            <td>VAT Amount</td>
            <td>${money.vat.toFixed(2)}</td>
            <td>Extracted from invoice</td>
          </tr>

          <tr>
            <td>Total</td>
            <td>${money.total.toFixed(2)}</td>
            <td>Extracted from invoice</td>
          </tr>

          <tr>
            <td>CIS Deduction</td>
            <td>${cisDeduction}</td>
            <td>${hasLabour ? "CIS applies" : "Not applicable"}</td>
          </tr>

          <tr style="font-weight:bold;background:#eef2fb;">
            <td>Total Due</td>
            <td>${totalDue}</td>
            <td>Calculated</td>
          </tr>
        </tbody>
      </table>
    `;


    /* ----------------------------------------------------------
       RETURN RESULTS
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
