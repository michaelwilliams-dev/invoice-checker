/**
 * AIVS Invoice Compliance Checker · Frontend Logic
 * ISO Timestamp: 2025-11-09T18:50:00Z
 * Author: AIVS Software Limited
 * Brand Colour: #4e65ac
 * Description:
 * Manages the drag-and-drop upload interface and sends
 * files + user flags to the /check_invoice backend route.
 */

Dropzone.options.invoiceDrop = {
  maxFilesize: 10,
  acceptedFiles: ".pdf,.jpg,.png,.json",
  init: function () {
    const dz = this;
    const actorsDiv = document.getElementById("actors");
    const dzElement = document.getElementById("invoiceDrop");

    // Create Clear button (hidden by default)
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear Results";
    clearBtn.id = "clearResultsBtn";
    clearBtn.style.cssText = `
      background:#4e65ac;
      color:#fff;
      border:none;
      padding:12px 28px;
      border-radius:4px;
      cursor:pointer;
      display:none;
      float:right;
      margin-top:10px;
      font-size:16px;
      font-weight:600;
    `;
    actorsDiv.insertAdjacentElement("afterend", clearBtn);

    // Handle Clear button click
    clearBtn.addEventListener("click", () => {
      actorsDiv.innerHTML = "";
      dz.removeAllFiles(true); // clear Dropzone
      clearBtn.style.display = "none"; // hide again
    });

    // Show "please wait" message inside drop area while uploading
    this.on("sending", function (file, xhr, formData) {
      dzElement.innerHTML = `
        <div style="padding:60px 0;text-align:center;font-weight:600;color:#4e65ac;font-size:16px;">
          ⏳ Please wait while we calculate your report...
        </div>`;
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
    });

    // Handle successful response
    this.on("success", (file, response) => {
      const v = response.aiReply;
      let formattedAIReply = "";

      /* ▼▼▼ CHANGE START — headings blue and reduced in size ▼▼▼ */
      if (typeof v === "object" && v !== null) {
        formattedAIReply = `
          <div class="ai-section">
            <h3 style="color:#4e65ac;font-size:15px;font-weight:600;">VAT / DRC Check</h3><p>${v.vat_check || "—"}</p>
          </div>
          <div class="ai-section">
            <h3 style="color:#4e65ac;font-size:15px;font-weight:600;">CIS Check</h3><p>${v.cis_check || "—"}</p>
          </div>
          <div class="ai-section">
            <h3 style="color:#4e65ac;font-size:15px;font-weight:600;">Required Wording</h3><p>${v.required_wording || "—"}</p>
          </div>
          <div class="ai-section">
            <h3 style="color:#4e65ac;font-size:15px;font-weight:600;">Corrected Invoice</h3>${v.corrected_invoice || "—"}
          </div>
          <div class="ai-section">
            <h3 style="color:#4e65ac;font-size:15px;font-weight:600;">Summary</h3><p>${v.summary || "—"}</p>
          </div>`;
      } else {
        formattedAIReply = v || "No AI response.";
      }
      /* ▲▲▲ CHANGE END — headings blue and reduced in size ▲▲▲ */

      /* ▼▼▼ CHANGE START — enlarge and color main labels ▼▼▼ */
      actorsDiv.innerHTML = `
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">Uploader:</span> ${file.name}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">Parser:</span> ${response.parserNote}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">AI Validator:</span><br>${formattedAIReply}</div>
        <div class="actor"><span style="color:#4e65ac;font-size:17px;font-weight:600;">Response Time:</span> ${response.timestamp || "—"}</div>
      `;
      /* ▲▲▲ CHANGE END — enlarge and color main labels ▲▲▲ */

      // Show Clear button now that results exist
      clearBtn.style.display = "inline-block";
    });

    // When done, restore upload message
    this.on("success", function () {
      dzElement.innerHTML = '<div class="dz-message">📄 Drag & Drop your invoice here</div>';
    });
    this.on("error", function () {
      dzElement.innerHTML = '<div class="dz-message">📄 Drag & Drop your invoice here</div>';
    });

    this.on("error", (file, err) => alert("Upload failed: " + err));
  },
};
