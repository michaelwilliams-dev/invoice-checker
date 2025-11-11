/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-11T15:55:00Z
 * Description:
 * Shows upload feedback in #uploadStatus (never touches VAT dropdown).
 */

Dropzone.autoDiscover = false;

const dz = new Dropzone("#invoiceDrop", {
  url: "/check_invoice",
  maxFiles: 1,
  maxFilesize: 10,
  acceptedFiles: ".pdf,.jpg,.png,.json",
  autoProcessQueue: true,
  dictDefaultMessage: "📄 Drag & drop invoice here or click to select",
  addRemoveLinks: false,

  init: function () {
    const dzInstance = this;
    const statusLine = document.getElementById("uploadStatus");
    const actorsDiv  = document.getElementById("actors");
    const startBtn   = document.getElementById("startCheckBtn");

    startBtn.style.display = "none";

    // When file starts uploading
    dzInstance.on("sending", (file, xhr, formData) => {
      statusLine.textContent = `⏳ Uploading ${file.name} …`;
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
    });

    // Update progress %
    dzInstance.on("uploadprogress", (file, progress) => {
      statusLine.textContent = `⏳ Uploading ${file.name} – ${progress.toFixed(0)} %`;
    });

    // Upload success
    dzInstance.on("success", (file, response) => {
      statusLine.textContent = `✅ ${file.name} uploaded successfully.`;
      actorsDiv.innerHTML = `
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Uploader:</span> ${file.name}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Parser:</span> ${response.parserNote || "Invoice parsed successfully."}</div>`;
      startBtn.style.display = "block";
    });

    // Upload error
    dzInstance.on("error", (file, err) => {
      statusLine.textContent = `❌ Upload failed – ${err}`;
    });

    // Ensure single file only
    dzInstance.on("addedfile", () => {
      if (dzInstance.files.length > 1) dzInstance.removeFile(dzInstance.files[0]);
    });

    // “Start Compliance Check” placeholder
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
