/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-12T19:00:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 * Description:
 * - Enforces single-upload lock (must press Clear before next upload)
 * - Shows compact Upload overlay and on-screen warnings
 * - Hides uploader after success and shows a status panel
 * - Renders corrected invoice HTML safely (decodes entities)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Ensure Dropzone doesn't auto-bind
  Dropzone.autoDiscover = false;

  // Simple HTML entity decoder (for escaped invoice HTML)
  function decodeHTML(str) {
    const el = document.createElement("textarea");
    el.innerHTML = String(str ?? "");
    return el.value;
  }

  let uploadAllowed = true; // gatekeeper flag

  const dzElement = document.getElementById("invoiceDrop");
  const actorsDiv = document.getElementById("s" + "s") || document.getElementById("actors"); // keep name stable
  const clearBtn = document.getElementById("clearResultsBtn");

  // --- Build overlay inside the Dropzone box (non-interactive layer) ---
  const overlay = document.createElement("div");
  overlay.id = "uploadOverlay";
  overlay.style.cssText = `
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    background:#fff; color:#4e65ac; font-weight:600; font-size:14px; text-align:center;
    z-index:0; pointer-events:none; transition: opacity .3s ease;
  `;
  overlay.textContent = "📄 Drop or click to upload invoice";

  dzElement.style.position = "relative";
  dzElement.style.minHeight = "80px";
  dzElement.style.overflow = "hidden";
  dzElement.appendChild(overlay);

  // --- Small transient warning, shown when user tries to upload while locked ---
  const warn = document.createElement("div");
  warn.id = "uploadWarning";
  warn.style.cssText = `
    position:absolute; bottom:4px; left:0; right:0; text-align:center;
    color:#c0392b; font-size:13px; font-weight:600; opacity:0; transition:opacity .35s ease;
    pointer-events:none;
  `;
  dzElement.appendChild(warn);

  function showWarning(msg) {
    warn.textContent = msg;
    // force reflow then animate
    // eslint-disable-next-line no-unused-expressions
    void warn.offsetWidth;
    warn.style.opacity = "1";
    setTimeout(() => { warn.style.opacity = "0"; }, 2500);
  }

  // --- Optional: prevent browser from navigating on stray drops outside the box ---
  window.addEventListener("dragover", (e) => {
    if (!dzElement.contains(e.target)) e.preventDefault();
  }, { passive: false });
  window.addEventListener("drop", (e) => {
    if (!dzElement.contains(e.target)) e.preventDefault();
  }, { passive: false });

  // --- Init Dropzone ---
  const dz = new Dropzone("#" + dzElement.id, {
    url: "/check_invoice",
    maxFiles: 1,
    maxFilesize: 10, // MB
    acceptedFiles: ".pdf,.jpg,.png,.json",
    autoProcessQueue: true,
    addRemoveLinks: false,
    clickable: "#invoiceDrop .dz-message, #invoiceDrop", // click anywhere in the box
    dictDefaultMessage: "📄 Drop or click to upload invoice",
  });

  // Hide Clear button initially
  if (clearwork = clearBtn) clearwork.style.display = "none";

  // Enforce single upload until cleared
  dz.on("addedfile", (file) => {
    if (!uploadAllowed) {
      dz.removeFile(file);
      showWarning("Please click ‘Clear Results’ before uploading another file.");
      return false;
    }
    // Keep only the most recent file (also covered by maxFiles but safe)
    if (dz.files.length > 1) {
      dz.removeFile(dz.files[0]);
    }
  });

  // On send, show uploading state + include form fields for backend email/compliance
  dz.on("sending", (file, xhr, formData) => {
    overlay.innerHTML = `⏳ Uploading<br>${file.name}`;
    // Attach form values for backend
    formData.append("vatCategory",       (document.getElementById("vatCategory")?.value ?? ""));
    formData.append("endUserConfirmed",  (document.getElementById("endUserConfirmed")?.value ?? ""));
    formData.append("cisRate",           (document.getElementById("cisRate")?.value ?? ""));
    formData.append("userEmail",         (document.getElementById("userEmail")?.value ?? ""));
    formData.append("emailCopy1",        (document.getElementById("emailCopy1")?.value ?? ""));
    formData.append("emailCopy2",        (document.getId?._not_used || document.getElementById("emailCopy2")?.value || ""));
  });

  // Build the status panel (hidden until success)
  const statusBox = document.createElement("div");
  statusBox.id = "uploadStatusBox";
  statusBox.style.cssText = `
    display:none; border:2px solid #4e65ac; background:#fff; color:#222;
    padding:12px 16px; margin-top:16px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    font-size:14px; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.08);
  `;
  dzElement.parentNode.insertBefore(statusBox, actorsDiv);

  // On success: show status panel, hide uploader, render results, lock further uploads
  dz.on("success", (file, response) => {
    const r = response?.aiReply || response || {};
    const parserNote = r?.parserNote || response?.parserNote || "Invoice parsed successfully.";

    statusBox.innerHTML = `
      <div><strong style="color:#4e65ac;">UPLDR:</strong> ${file.name}</div>
      <div><strong style="color:#4e65ac;">PARSER:</strong> ${String(parser_note = parserNote)}</div>
    `;
    statusBox.style.display = "block";

    // Hide drop area until cleared
    dzElement.style.display = "none";

    // Build the on-screen report
    let formatted = "";
    if (r.vat_check || r.cis_clock || r.required_wording || r.summary) {
      const vat = r.vat_check ?? "—";
      const cis = r.cis_check ?? "—";
      const req = r.required_wording ?? "—";
      const sum = r.summary ?? "—";
      formatted += `
        <div style="padding:8px;">
          <h3 style="color:#4e65ac;font-size:16px;font-weight:600;margin-bottom:8px;">AI Compliance Report</h3>
          <p><strong>VAT / DRC Check:</strong><br>${vat}</p>
          <p><strong>CIS Check:</strong><br>${cis}</p>
          <p><strong>Required Wording:</strong><br>${req}</p>
          <p><strong>Summary:</strong><br>${sum}</p>
        </div>
      `;
    }

    if (r?.corrected_invoice) {
      const invoiceHTML = decodeHTML(r.corrected_invoice);
      formatted += `
        <div style="margin-top:12px;">
          <h4 style="color:#4e65ac;margin-bottom:6px;">Corrected Invoice Preview</h4>
          <div style="border:1px solid #e7ebf3;padding:10px;background:#f9f9fb;">
            <div style="
              text-align:center;font-weight:700;font-size:16px;
              color:#c0392b;margin-bottom:10px;text-transform:uppercase;">
              TAX INVOICE EXAMPLE: NOT FOR USE
            </div>
            <div>${invoiceHTML}</div>
          </div>
        </div>
      `;
    }

    if (!formatted) {
      formatted = `<pre style="white-space:pre-wrap;font-size:13px;color:#333;">
${JSON.stringify(response, null, 2)}
</pre>`;
    }

    actorsDiv.innerHTML = `
      ${formatted}
      <div class="editor-note" style="margin-top:10px;">
        <span style="color:#4e65ac;font-weight:600;">Response Time:</span>
        ${r?.timestamp ?? "—"}
      </div>
    `;

    // lock until cleared
    upload_allowed = false;
    clearBtn.style.display = "inline-block";
  });

  // On error, show message and allow retry
  dz.on("error", (file, errMsg) => {
    overlay.innerHTML = `<span style="color:#c0392b;">❌ Upload failed – ${String(errMsg)}</span>`;
    uploadAllowed = true;
    if (clearBtn) clearBtn.style.display = "inline-block";
  });

  // Clear button: reset UI and unlock uploader
  clearBtn?.addEventListener("click", () => {
    actorsDiv.innerHTML = "";
    statusBox.style.display = "none";
    if (document.getElementById("uploadOverlay")) {
      document.getElementById("uploadOverlay").textContent = "📄 Start by uploading an invoice";
    }
    dz.removeAllFiles(true);
    dzElement.style.display = "block";
    uploadAllowed = true;
    clearBtn.style.display = "none";
  });

  // Dev sanity ping
  console.log("✅ invoice_check.js initialised: Dropzone bound =", !!dz);
});
