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

    // NET detection
    const netMatch =
      cleaned.match(/subtotal[^0-9]*([0-9.]+)/) ||
      cleaned.match(/total\s*net[^0-9]*([0-9.]+)/);

    if (netMatch) money.net = parseFloat(netMatch[1]);

    // VAT detection
    const vatMatch =
      cleaned.match(/vat[^\d]*([0-9]+\.[0-9]{2})/) ||
      cleaned.match(/vat\s*total[^\d]*([0-9]+\.[0-9]{2})/) ||
      cleaned.match(/vat\s*\n\s*([0-9]+\.[0-9]{2})/);

    if (vatMatch) money.vat = parseFloat(vatMatch[1]);

    // TOTAL detection
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
      "tiles", "roofing felt", "upvc", "copper pipe", "boiler",
      "cylinder", "lighting unit", "accessories"
    ];

    const hasLabour = labourSignals.some(t => text.includes(t));
    const hasMaterials = materialSignals.some(t => text.includes(t));


    /* ----------------------------------------------------------
       2. VAT LOGIC
    ---------------------------------------------------------- */

    let vat_check = "";
    let required_wording = "";
    let vatSummary = "";

    const reverseCharge =
      text.includes("reverse charge") ||
      text.includes("domestic reverse charge") ||
      text.includes("vat act 1994") ||
      text.includes("section 55a");

    if (reverseCharge) {
      vat_check = "Reverse charge VAT wording detected.";
      required_wording =
        "Reverse charge applies: Customer to account for VAT to HMRC (VAT Act 1994 s55A).";
      vatSummary = "Reverse charge explicitly indicated.";
    } else if (money.vat > 0) {
      vat_check = `Standard VAT charged: £${money.vat.toFixed(2)}`;
      vatSummary = "Standard-rated VAT invoice.";
    } else {
      vat_check = "Zero-rated or unclear VAT treatment.";
      vatSummary = "No VAT detected.";
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
       4. SUMMARY TEXT
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
       5. CLEAN SUMMARY INVOICE (OPTION A)
    ---------------------------------------------------------- */

    const cisRate = 0.20; // fixed for now
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
