/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-11T11:40:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 * Description:
 * Uploads one invoice automatically to /check_invoice,
 * shows progress inside upload box, displays file info after upload.
 */

Dropzone.options.invoiceDrop = {
  maxFiles: 1,
  maxFilesize: 10,
  acceptedFiles: ".pdf,.jpg,.png,.json",
  autoProcessQueue: true, // auto-upload on drop
  init: function () {
    const dz = this;
    const actorsDiv = document.getElementById("actors");
    const dzElement = document.getElementById("invoiceDrop");
    const startBtn = document.getElementById("startCheckBtn");
    startBtn.style.display = "none"; // hidden until upload completes

    // Shrink drop area
    dzElement.style.minHeight = "120px";

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear Results";
    clearBtn.id = "clearResultsBtn";
    clearBtn.style.cssText = `
      background:#4e65ac;color:#fff;border:none;
      padding:12px 28px;border-radius:4px;
      cursor:pointer;display:none;float:right;
      margin-top:10px;font-size:16px;font-weight:600;
    `;
    actorsDiv.insertAdjacentElement("afterend", clearBtn);

    clearBtn.addEventListener("click", () => {
      actorsDiv.innerHTML = "";
      dz.removeAllFiles(true);
      clearBtn.style.display = "none";
      startBtn.style.display = "none";
      dzElement.innerHTML = '<div class="dz-message">📄 Drag & Drop your invoice here</div>';
    });

    // Upload progress message (now inside Dropzone box)
    this.on("sending", function (file, xhr, formData) {
      dzElement.innerHTML = `
        <div style="padding:40px 0;text-align:center;
        font-weight:600;color:#4e65ac;font-size:16px;">
          ⏳ Uploading ${file.name} ...
        </div>`;
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
    });

    // Upload success → restore Dropzone box + show file info + button
    this.on("success", function (file, response) {
      dz.uploadResponse = response;
      dzElement.innerHTML = '<div class="dz-message">✅ File uploaded successfully</div>';
      actorsDiv.innerHTML = `
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Uploader:</span> ${file.name}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">
          Parser:</span> ${response.parserNote || "File received, ready for analysis."}</div>
      `;
      startBtn.style.display = "block";
    });

    // Error handling
    this.on("error", (file, err) => {
      alert("Upload failed: " + err);
      dzElement.innerHTML = '<div class="dz-message">📄 Drag & Drop your invoice here</div>';
    });

    // Generate Report (placeholder)
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
        clearBtn.style.display = "inline-block";
        startBtn.textContent = "Generate Report";
        startBtn.disabled = false;
      }, 2000);
    });
  },
};
