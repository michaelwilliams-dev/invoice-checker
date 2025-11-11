/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-11T13:05:00Z
 * Description:
 * Shows live “Uploading…” message inside Dropzone box itself.
 */

Dropzone.autoDiscover = false;

const dz = new Dropzone("#invoiceDrop", {
  url: "/check_invoice",
  maxFiles: 1,
  maxFilesize: 10,
  acceptedFiles: ".pdf,.jpg,.png,.json",
  autoProcessQueue: true,
  addRemoveLinks: false,
  dictDefaultMessage: "📄 Drag & drop invoice here or click to select",

  init: function () {
    const dzInstance = this;
    const dzElement = document.getElementById("invoiceDrop");
    const startBtn = document.getElementById("startCheckBtn");
    const actorsDiv = document.getElementById("actors");
    startBtn.style.display = "none";
    dzElement.style.minHeight = "120px";

    // --- When upload starts --------------------------------------------------
    dzInstance.on("sending", (file, xhr, formData) => {
      // dynamically find message each time (Dropzone may rebuild DOM)
      const msgBox = dzElement.querySelector(".dz-message");
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="padding:35px 0;text-align:center;
          color:#4e65ac;font-weight:600;">
            ⏳ Uploading <br>${file.name}
          </div>`;
      }
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
    });

    // --- When upload completes ----------------------------------------------
    dzInstance.on("success", (file, response) => {
      const msgBox = dzElement.querySelector(".dz-message");
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="padding:35px 0;text-align:center;
          color:#4e65ac;font-weight:600;">
            ✅ ${file.name} uploaded successfully
          </div>`;
      }

      // lock the drop area
      dzElement.classList.add("dz-success");
      dzElement.style.pointerEvents = "none";

      actorsDiv.innerHTML = `
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Uploader:</span> ${file.name}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Parser:</span> ${response.parserNote || "Invoice parsed successfully."}</div>`;
      startBtn.style.display = "block";
    });

    // --- Handle upload errors -----------------------------------------------
    dzInstance.on("error", (file, err) => {
      const msgBox = dzElement.querySelector(".dz-message");
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="padding:35px 0;text-align:center;color:#c0392b;">
            ❌ Upload failed<br>${err}
          </div>`;
      }
    });

    // --- Prevent multiple files --------------------------------------------
    dzInstance.on("addedfile", () => {
      if (dzInstance.files.length > 1) dzInstance.removeFile(dzInstance.files[0]);
    });

    // --- Start Compliance Check (demo placeholder) --------------------------
    startBtn.addEventListener("click", () => {
      startBtn.disabled = true;
      startBtn.textContent = "Generating Report…";
      actorsDiv.insertAdjacentHTML(
        "beforeend",
        `<div style="padding:15px;color:#4e65ac;font-weight:600;">⚙️ Generating report…</div>`
      );
      setTimeout(() => {
        actorsDiv.insertAdjacentHTML(
          "beforeend",
          `<div style="padding:15px;color:#333;">✅ Report ready (demo placeholder)</div>`
        );
        startBtn.disabled = false;
        startBtn.textContent = "▶ Start Compliance Check";
      }, 2000);
    });
  },
});
