/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-11T12:35:00Z
 * Author: AIVS Software Limited
 * Description:
 * One-file upload to /check_invoice with progress shown in the
 * visible Dropzone box, then reveals the Start Compliance button.
 */

Dropzone.autoDiscover = false;

const dz = new Dropzone("#invoiceDrop", {
  url: "/check_invoice",
  maxFiles: 1,
  maxFilesize: 10,
  acceptedFiles: ".pdf,.jpg,.png,.json",
  autoProcessQueue: true, // upload automatically
  addRemoveLinks: false,
  dictDefaultMessage: "📄 Drag & drop invoice here or click to select",
  init: function () {
    const dzInstance = this;
    const dzElement = document.getElementById("invoiceDrop");
    const msgBox = dzElement.querySelector(".dz-message");
    const startBtn = document.getElementById("startCheckBtn");
    const actorsDiv = document.getElementById("actors");
    startBtn.style.display = "none";

    dzElement.style.minHeight = "120px";

    // During upload – message inside box
    dzInstance.on("sending", (file, xhr, formData) => {
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="padding:40px 0;text-align:center;
          font-weight:600;color:#4e65ac;font-size:16px;">
            ⏳ Uploading <br>${file.name}
          </div>`;
      }
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
    });

    // When upload succeeds
    dzInstance.on("success", (file, response) => {
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="padding:40px 0;text-align:center;
          font-weight:600;color:#4e65ac;font-size:16px;">
            ✅ ${file.name} uploaded successfully
          </div>`;
      }
      // lock box so user can’t click again until cleared
      dzElement.classList.add("dz-success");
      dzElement.style.pointerEvents = "none";

      // display upload info below
      actorsDiv.innerHTML = `
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Uploader:</span> ${file.name}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Parser:</span> ${response.parserNote || "File parsed successfully."}</div>
      `;
      startBtn.style.display = "block";
    });

    // Handle errors
    dzInstance.on("error", (file, err) => {
      if (msgBox) {
        msgBox.innerHTML = `
          <div style="padding:40px 0;text-align:center;color:#c0392b;">
            ❌ Upload failed<br>${err}
          </div>`;
      }
    });

    // Clear results when new file manually added after clear
    dzInstance.on("addedfile", function () {
      if (dzInstance.files.length > 1) {
        dzInstance.removeFile(dzInstance.files[0]);
      }
    });

    // Start button (demo only for now)
    startBtn.addEventListener("click", () => {
      startBtn.disabled = true;
      startBtn.textContent = "Generating Report…";
      actorsDiv.insertAdjacentHTML(
        "beforeend",
        `<div style='padding:15px;color:#4e65ac;font-weight:600;'>⚙️ Generating report…</div>`
      );
      setTimeout(() => {
        actorsDiv.insertAdjacentHTML(
          "beforeend",
          `<div style='padding:15px;color:#333;'>✅ Report ready (demo placeholder)</div>`
        );
        startBtn.disabled = false;
        startBtn.textContent = "▶ Start Compliance Check";
      }, 2000);
    });
  },
});
