// ISO Timestamp: 2025-11-23T17:05:00Z
/**
 * invoice_checker.js – JSON-based Invoice Checker
 */

export function checkInvoice(json) {
  const text = JSON.stringify(json).toLowerCase();
  const result = {};

  // extract TOTAL DUE
  result.total_due = numberAfter(text, "total due") || 0;

  // extract labour line-items "X Days @ £Y"
  result.lines = [];
  const re = /([\d.]+)\s*days?\s*@\s*£?\s*([\d.]+)/gi;
  let m;

  while ((m = re.exec(text)) !== null) {
    const days = parseFloat(m[1]);
    const rate = parseFloat(m[2]);
    result.lines.push({
      days,
      rate,
      total: days * rate
    });
  }

  result.subtotal = result.lines.reduce((a, b) => a + b.total, 0);

  // VAT
  result.vat = numberAfter(text, "vat") || 0;

  // CIS
  result.cis = text.includes("cis") ? 0.2 * result.subtotal : 0;

  // validity
  result.valid =
    Math.abs(result.subtotal + result.vat - result.cis - result.total_due) < 1.0;

  return result;
}

function numberAfter(text, label) {
  const i = text.indexOf(label);
  if (i === -1) return 0;
  const match = text.slice(i).match(/£?\s?([\d,]+\.\d+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, ""));
}
