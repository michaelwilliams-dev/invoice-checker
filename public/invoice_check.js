/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-12T19:30:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 * Description:
 * - Single-upload lock (press Clear before next upload)
 * - Shows overlay + warnings
 * - Hides uploader after success and shows status panel
 * - Sends VAT/CIS/email fields and renders corrected invoice HTML
 */

document.addEventListener("DOMContentLoaded", () => {
  Dropzone.autoDiscover = false;

  function decodeHTML(str) {
    const el = document.createElement("textarea");
    el.innerHTML = String(str ?? "");
    return el.value;
  }

  let uploadAllowed = true;

  const dzElement = document.getElementById("invoiceDrop");
  const actorsDiv = document.getElementById("actors");
  const clearBtn = document.getElementById("clearResultsBtn");

  // --- overlay ----------------------------------------------------------
  const overlay = document.createElement("div");
  overlay.id = "uploadOverlay";
  overlay.style.cssText = `
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    background:#fff; color:#4e65ac; font-weight:600; font-size:14px; text-align:center;
    z-index:0; pointer-events:none; transition:opacity .3s ease;
  `;
  overlay.textContent = "📄 Drop or click to upload invoice";
  dzElement.style.position = "relative";
  dzElement.style.minHeight = "80px";
  dzElement.style.overflow = "hidden";
  dzElement.appendChild(overlay);

  // --- warning message --------------------------------------------------
  const warn = document.createElement("div");
  warn.id = "uploadWarning";
  warn.style.cssText = `
    position:absolute; bottom:4px; left:0; right:0; text-align:center;
    color:#c0392b; font-size:13px; font-weight:600; opacity:0;
    transition:opacity .35s ease; pointer-events:none;
  `;
  dzElement.appendChild(warn);

  function showWarning(msg) {
    warn.textContent = msg;
    warn.style.opacity = "1";
    setTimeout(() => (warn.style.opacity = "0"), 2500);
  }

  // prevent stray drops navigating away
  window.addEventListener("dragover", e => { if (!dzElement.contains(e.target)) e.preventDefault(); }, { passive: false });
  window.addEventListener("drop", e => { if (!dzElement.contains(e.target)) e.preventDefault(); }, { passive: false });

  // --- Dropzone init ----------------------------------------------------
  const dz = new Dropzone("#" + dzElement.id, {
    url: "/check_invoice",
    maxFiles: 1,
    maxFilesize: 10,
    acceptedFiles: ".pdf,.jpg,.png,.json",
    autoProcessQueue: true,
    addRemoveLinks: false,
    clickable: "#invoiceDrop .dz-message, #invoiceDrop",
    dictDefaultMessage: "📄 Drop or click to upload invoice",
  });

  clearBtn.style.display = "none";

  dz.on("addedfile", file => {
    if (!uploadAllowed) {
      dz.removeFile(file);
      showWarning("Please click ‘Clear Results’ before uploading another file.");
      return false;
    }
    if (dz.files.length > 1) dz.removeFile(dz.files[0]);
  });

  // include form fields
  dz.on("sending", (file, xhr, formData) => {
    overlay.innerHTML = `⏳ Uploading<br>${file.name}`;
    formData.append("vatCategory", document.getElementById("vatCategory")?.value || "");
    formData.append("endUserConfirmed", document.getElementById("endUserConfirmed")?.value || "");
    formData.append("cisRate", document.getElementById("cisRate")?.value || "");
    formData.append("userEmail", document.getElementById("userEmail")?.value || "");
    formData.append("emailCopy1", document.getElementById("emailCopy1")?.value || "");
    formData.append("emailCopy2", document.getElementById("emailCopy2")?.value || "");
  });

  // --- status box -------------------------------------------------------
  const statusBox = document.createElement("div");
  statusBox.id = "uploadStatusBox";
  statusBox.style.cssText = `
    display:none; border:2px solid #4e65ac; background:#fff; color:#222;
    padding:12px 16px; margin-top:16px;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    font-size:14px; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.08);
  `;
  dzElement.parentNode.insertBefore(statusBox, actorsDiv);

  dz.on("success", (file, response) => {
    const r = response?.aiReply || response || {};
    const parserNote = r.parserNote || "Invoice parsed successfully.";

    statusBox.innerHTML = `
      <div><strong style="color:#4e65ac;">UPLOADER:</strong> ${file.name}</div>
      <div><strong style="color:#4e65ac;">PARSER:</strong> ${parserNote}</div>
    `;
    statusBox.style.display = "block";
    dzElement.style.display = "none";

    let formatted = "";
    if (r.vat_check || r.cis_check || r.required_wording || r.summary) {
      formatted += `
        <div style="padding:8px;">
          <h3 style="color:#4e65ac;font-size:16px;font-weight:600;margin-bottom:8px;">AI Compliance Report</h3>
          <p><strong>VAT / DRC Check:</strong><br>${r.vat_check || "—"}</p>
          <p><strong>CIS Check:</strong><br>${r.cis_check || "—"}</p>
          <p><strong>Required Wording:</strong><br>${r.required_wording || "—"}</p>
          <p><strong>Summary:</strong><br>${r.summary || "—"}</p>
        </div>`;
    }

    if (r.corrected_invoice) {
      const invoiceHTML = decodeHTML(r.corrected_invoice);
      formatted += `
        <div style="margin-top:12px;">
          <h4 style="color:#4e65ac;margin-bottom:6px;">Corrected Invoice Preview</h4>
          <div style="border:1px solid #e7ebf3;padding:10px;background:#f9f9fb;">
            <div style="text-align:center;font-weight:700;font-size:16px;color:#c0392b;margin-bottom:10px;text-transform:uppercase;">
              TAX INVOICE EXAMPLE: NOT FOR USE
            </div>
            <div>${invoiceHTML}</div>
          </div>
        </div>`;
    }

    if (!formatted)
      formatted = `<pre style="white-space:pre-wrap;font-size:13px;color:#333;">${JSON.stringify(response, null, 2)}</pre>`;

    actorsDiv.innerHTML = `
      ${formatted}
      <div class="editor-note" style="margin-top:10px;">
        <span style="color:#4e65ac;font-weight:600;">Response Time:</span>
        ${r.timestamp || "—"}
      </div>`;

    uploadAllowed = false;
    clearBtn.style.display = "inline-block";
  });

  dz.on("error", (file, errMsg) => {
    overlay.innerHTML = `<span style="color:#c0392b;">❌ Upload failed – ${String(errMsg)}</span>`;
    uploadAllowed = true;
    clearBtn.style.display = "inline-block";
  });

  clearBtn.addEventListener("click", () => {
    actorsDiv.innerHTML = "";
    statusBox.style.display = "none";
    overlay.textContent = "📄 Drop or click to upload invoice";
    dz.removeAllFiles(true);
    dzElement.style.display = "block";
    uploadAllowed = true;
    clearBtn.style.display = "none";
  });

  console.log("✅ invoice_check.js initialised; Dropzone bound =", !!dz);
});
