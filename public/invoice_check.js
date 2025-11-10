/**
 * AIVS CIS Compliance Checker · Front-end (Dropzone + render results)
 * ISO Timestamp: 2025-11-10T18:10:00Z
 * Names fixed: file is public/invoice_check.js; form id="invoiceDrop"
 */

(function () {
  // Ensure the DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("invoiceDrop");
    const actorsEl = document.getElementById("actors");
    if (!form || !actorsEl) {
      console.error("Missing #invoiceDrawp form or #actors container in HTML.");
      return;
    }

    // We will initialise Dropzone manually to avoid auto-init race conditions
    // and to ensure we control preview/handlers. Do NOT rely on autoDiscover.
    if (window.Dropzone && window.Dropzone.autoDiscover) {
      window.Dropzone.autoDiscover = false;
    }

    const dz = new Dropzone(form, {
      url: "/check_invoice",          // backend route (server is already responding 200)
      paramName: "file",
      maxFiles: 1,
      maxFilesize: 10,                // MB
      acceptedFiles: ".pdf,.jpg,.jpeg,.png,.json",
      addRemoveLinks: false,
      clickable: true,
      createImageThumbnails: false,   // don’t generate preview images
      autoProcess: true
    });

    // Optional: keep the drop area clear (hide generated preview element)
    dz.on("addedfile", file => {
      if (file.previewElement) {
        file.previewElement.style.display = "none";
      }
    });

    // Create (once) a Clear button right after the #actors container
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearResultsBtn";
    clearBtn.type = "button";
    clearBtn.textContent = "Clear Results";
    clearBtn.style.cssText = "background:#4e65ac;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;display:none;margin-top:10px;";
    clearBtn.addEventListener("click", () => {
      dz.removeAllFiles(true);
      actorsায়? "":"";
      actorsEl.innerHTML = "";
      clearBtn.style.display = "none";
      // keep the drop area usable
    });
    // insert after results container
    actorsEl.insertAdjacentElement("afterend", clearBtn);

    // Attach metadata before upload
    dz.on("sending", (file, xhr, formData) => {
      const vat = document.getElementById("vatCategory");
      const endUser = document.getElementById("endUserConfirmed");
      const cis = document.getElementById("cisRate");
      if (vat) formData.append("vatCategory", vat.value || "");
      if (endUser) formData.append("endUserConfirmed", endUser.value || "");
      if (cis) formData.append("cisRate", cis.value || "");
    });

    // Render the JSON response under the dropzone
    dz.on("success", (file, response) => {
      const reply = typeof response === "string" ? safeParseJSON(response) : response || {};
      const ai = (reply && reply.aiReply) || {};

      const html = `
        <div class="actor">
          <span>Uploader:</span> ${escapeHtml(file.name || "")}
        </div>
        <div class="actor">
          <span>Parser:</span> ${escapeHtml(reply.parserNote || "—")}
        </div>
        <div class="actor">
          <span>AI Validator:</span>
          <div style="margin-top:6px">
            <p><b>VAT / DRC Check:</b> ${escapeHtml(ai.vat_check || "—")}</p>
            <p><b>CIS Check:</b> ${escapeHtml(ai.cis_check || "—")}</p>
            <p><b>Required Wording:</b> ${ai.required_wording || "—"}</p>
            <p><b>Summary:</b> ${escapeHtml(ai.summary || "—")}</p>
          </div>
        </div>
        <div class="actor">
          <span>Response Time:</span> ${escapeHtml(reply.timestamp || "—")}
        </div>
      `;
      actorsEl.innerHTML = html;
      clearBtn.style.display = "inline-block";

      // remove any auto-generated preview so the drop area stays clean
      if (file.previewElement && file.previewElement.parentNode) {
        file.previewElement.parentNode.removeChild(file.previewElement);
      }
    });

    dz.on("error", (file, errorMessage) => {
      console.error("Upload failed:", errorMessage);
      alert("Upload failed. " + (typeof errorMessage === "string" ? errorMessage : "See console for details."));
      if (file && file.previewElement && file.previewElement.parentNode) {
        file.previewElement.parentNode.removeChild(file.previewElement);
      }
    });

    function safeParseJSON(str) {
      try { return JSON.parse(str); } catch { return {}; }
    }
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, ch =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] || ch)
      );
    }
  });
})();
