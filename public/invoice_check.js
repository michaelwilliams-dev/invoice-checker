/**
 * AIVS Invoice Compliance Checker · Frontend Logic (Stable)
 * ISO Timestamp: 2025-11-10T17:55:00Z
 * Author: AIVS Software Limited
 */

Dropzone.autoDiscover = false;

Dropzone.options.invoiceDrop = {
  maxFilesize: 10,
  acceptedFiles: ".pdf,.jpg,.png,.json",
  init: function () {
    const dz = this;
    const actorsDiv = document.getElementById("actors");

    // create Clear button (hidden initially)
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear Results";
    clearBtn.id = "clearResultsBtn";
    clearBtn.style.cssText = `
      background:#4e65ac;
      color:#fff;
      border:none;
      padding:6px 14px;
      border-radius:4px;
      cursor:pointer;
      display:none;
      float:right;
      margin-top:10px;
    `;
    actorsDiv.insertAdjacentElement("afterend", clearBtn);

    clearBtn.addEventListener("click", () => {
      actorsDiv.innerHTML = "";
      dz.removeAllFiles(true);
      clearBtn.style.display = "none";
    });

    this.on("sending", function (file, xhr, formData) {
      formData.append("vatCategory", document.getElementById("vatCategory").value);
      formData.append("endUserConfirmed", document.getElementById("endUserConfirmed").value);
      formData.append("cisRate", document.getElementById("cisRate").value);
    });

    this.on("success", function (file, response) {
      const reply = typeof response === "string" ? JSON.parse(response) : response;
      const ai = reply.aiReply || {};

      actorsDiv.innerHTML = `
        <div class="actor"><span>Uploader:</span> ${file.name}</div>
        <div class="actor"><span>Parser:</span> ${reply.parserNote}</div>
        <div class="actor"><span>AI Validator:</span><br>
          <p><b>VAT / DRC Check:</b> ${ai.vat_check}</p>
          <p><b>CIS Check:</b> ${ai.cis_check}</p>
          <p><b>Required Wording:</b> ${ai.required_wording}</p>
          <p><b>Summary:</b> ${ai.summary}</p>
        </div>
        <div class="actor"><span>Response Time:</span> ${reply.timestamp}</div>
      `;

      clearBtn.style.display = "inline-block";
    });

    this.on("error", function (file, err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed. Check console for details.");
    });
  },
};
