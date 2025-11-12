/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-12T21:35:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 * Description:
 * Restored stable Dropzone build – single upload, shows AI report, no email send.
 */

Dropzone.autoDiscover = false;

const dz = new Dropzone("#invoiceDrop", {
  url: "/check_invoice",
  maxFiles: 1,
  maxFilesize: 10,
  acceptedFiles: ".pdf,.jpg,.png,.json",
  autoProcessQueue: true,
  addRemoveLinks: false,
  dictDefaultMessage: "📄 Drop or click to upload invoice",

  init: function () {
    const dzInstance = this;
    const dzElement  = document.getElementById("invoiceDrop");
    const actorsDiv  = document.getElementById("actors");

    // --- Compact height / overlay layer -------------------------------
    dzElement.style.height = "80px";
    dzElement.style.minHeight = "80px";
    dzElement.style.position = "relative";
    dzElement.style.overflow = "hidden";

    const overlay = document.createElement("div");
    overlay.id = "uploadOverlay";
    overlay.style.cssText = `
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      background:#fff; color:#4e65ac; font-weight:600; font-size:14px;
      text-align:center; z-index:0; pointer-events:none;
    `;
    overlay.textContent = "📄 Drop or click to upload invoice";
    dzElement.appendChild(overlay);

    // --- Send form fields ---------------------------------------------
    dzInstance.on("sending", (file, xhr, formData) => {
      overlay.innerHTML = `⏳ Uploading<br>${file.name}`;
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
      formData.append("userEmail", document.getElementById("userEmail").value);
      formData.append("emailCopy1", document.getElementById("emailCopy1").value);
      formData.append("emailCopy2", document.getElementById("emailCopy2").value);
    });

    // --- Success: render AI report ------------------------------------
    dzInstance.on("success", (file, response) => {
      const r = response.aiReply || response;
      overlay.innerHTML = `
        <div><strong style="color:#4e65ac;">Uploader:</strong> ${file.name}</div>
        <div><strong style="color:#4e65ac;">Parser:</strong> ${
          response.parserNote || "Invoice parsed successfully."
        }</div>
      `;

      let html = `
        <div style="padding:8px;">
          <h3 style="color:#4e65ac;font-size:16px;font-weight:600;margin-bottom:8px;">AI Compliance Report</h3>
          <p><strong>VAT / DRC Check:</strong><br>${r.vat_check || "—"}</p>
          <p><strong>CIS Check:</strong><br>${r.cis_check || "—"}</p>
          <p><strong>Required Wording:</strong><br>${r.required_wording || "—"}</p>
          <p><strong>Summary:</strong><br>${r.summary || "—"}</p>
        </div>`;

      if (r.corrected_invoice) {
        html += `
          <div style="margin-top:12px;">
            <h4 style="color:#4e65ac;margin-bottom:6px;">Corrected Invoice Preview</h4>
            <div style="border:1px solid #e7ebf3;padding:10px;background:#f9f9fb;">
              <div style="text-align:center;font-weight:700;font-size:16px;color:#c0392b;margin-bottom:10px;text-transform:uppercase;">
                TAX INVOICE EXAMPLE: NOT FOR USE
              </div>
              ${r.corrected_invoice}
            </div>
          </div>`;
      }

      actorsDiv.innerHTML = html;
    });

    // --- Error --------------------------------------------------------
    dzInstance.on("error", (file, err) => {
      overlay.innerHTML = `<span style="color:#c0392b;">❌ Upload failed – ${err}</span>`;
    });
  },
});

console.log("✅ invoice_check.js restored – stable AI report build active");
