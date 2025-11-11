/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-11T17:05:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 * Description:
 * Compact one-file Dropzone with clear in-box upload message
 * and follow-up compliance button.
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
    const startBtn   = document.getElementById("startCheckBtn");
    startBtn.style.display = "none";

    // Ensure compact height
    dzElement.style.height = "80px";
    dzElement.style.minHeight = "80px";
    dzElement.style.position = "relative";
    dzElement.style.overflow = "hidden";

    // Overlay message element
    const overlay = document.createElement("div");
    overlay.id = "uploadOverlay";
    overlay.style.cssText = `
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      background:rgba(255,255,255,0.8);
      color:#4e65ac;
      font-weight:600;
      font-size:14px;
      z-index:10;
      visibility:hidden;
    `;
    dzElement.appendChild(overlay);

    // --- When sending (start upload) --------------------------------------
    dzInstance.on("sending", (file, xhr, formData) => {
      overlay.textContent = `⏳ Uploading ${file.name} …`;
      overlay.style.visibility = "visible";
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
    });

    // --- Progress update --------------------------------------------------
    dzInstance.on("uploadprogress", (file, progress) => {
      overlay.textContent = `⏳ Uploading ${file.name} – ${progress.toFixed(0)} %`;
    });

    // --- Success ----------------------------------------------------------
    dzInstance.on("success", (file, response) => {
      overlay.textContent = `✅ ${file.name} uploaded successfully`;
      setTimeout(() => { overlay.style.visibility = "hidden"; }, 1000);

      actorsDiv.innerHTML = `
        <div class="actor"><span style="color:#4e65ac;font-size:16px;font-weight:600;">
          Uploader:</span> ${file.name}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:16px;font-weight:600;">
          Parser:</span> ${response.parserNote || "Invoice parsed successfully."}</div>`;
      startBtn.style.display = "block";
    });

    // --- Error ------------------------------------------------------------
    dzInstance.on("error", (file, err) => {
      overlay.textContent = `❌ Upload failed – ${err}`;
      setTimeout(() => { overlay.style.visibility = "hidden"; }, 2000);
    });

    // --- Enforce single file ---------------------------------------------
    dzInstance.on("addedfile", () => {
      if (dzInstance.files.length > 1) dzInstance.removeFile(dzInstance.files[0]);
    });

    // --- Start Compliance Check (demo placeholder) ------------------------
    startBtn.addEventListener("click", () => {
      startBtn.disabled = true;
      startBtn.textContent = "Generating Report…";
      actorsDiv.insertAdjacentHTML(
        "beforeend",
        `<div style="padding:12px;color:#4e65ac;font-weight:600;">⚙️ Generating report…</div>`
      );
      setTimeout(() => {
        actorsDiv.insertAdjacentHTML(
          "beforeend",
          `<div style="padding:12px;color:#333;">✅ Report ready (demo placeholder)</div>`
        );
        startBtn.disabled = false;
        startBtn.textContent = "▶ Start Compliance Check";
      }, 2000);
    });
  },
});
