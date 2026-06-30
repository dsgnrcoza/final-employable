/* onboarding.js — drives the disclaimer → upload two-step flow */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str === null || str === undefined ? "" : str;
  return div.innerHTML;
}

function showLoading(text) {
  document.getElementById("loading-text").textContent = text || "Working…";
  document.getElementById("loading-overlay").classList.add("visible");
}
function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("visible");
}

let latestResult = null;
let pendingFiles = null;

function setStatus(message, kind) {
  const box = document.getElementById("onboard-status");
  if (!message) { box.style.display = "none"; return; }
  box.style.display = "block";
  box.className = "onboard-status " + (kind || "");
  box.textContent = message;
}

function renderDocList(documents) {
  const wrap = document.getElementById("doc-list");
  wrap.innerHTML = (documents || [])
    .map((d) => `
      <div class="doc-row" data-doc-id="${d.id}">
        <span class="name">${escapeHtml(d.filename)} <span class="badge">${(d.file_type || "file").toUpperCase()}</span></span>
        <span class="remove-doc" data-doc-id="${d.id}" title="Remove document">&times;</span>
      </div>`)
    .join("");
}

function renderConflict(result) {
  const box = document.getElementById("conflict-box");
  const continueBtn = document.getElementById("continue-btn");
  if (!result || !result.conflict) {
    box.style.display = "none";
    const hasName = result && result.name;
    continueBtn.disabled = false;
    continueBtn.textContent = hasName ? `Continue as ${result.name}` : "Continue to Dashboard";
    setStatus("", "");
    return;
  }
  box.style.display = "block";
  const optionsWrap = document.getElementById("conflict-options");
  const namedClusters = result.clusters.filter((c) => c.name !== "Unknown");
  const defaultCluster = namedClusters.length
    ? namedClusters.reduce((a, b) => (b.documents.length > a.documents.length ? b : a))
    : null;
  const defaultClusterIdx = defaultCluster ? result.clusters.indexOf(defaultCluster) : -1;

  optionsWrap.innerHTML = result.clusters
    .map((c, ci) => `
      <div class="conflict-group">
        <div class="conflict-group-name">${escapeHtml(c.name)}</div>
        <div class="conflict-group-files">
          ${c.documents.map((d) => `
            <label class="conflict-file">
              <input type="checkbox" name="identity-file" value="${d.id}" data-cluster="${ci}" ${ci === defaultClusterIdx ? "checked" : ""}>
              <span>${escapeHtml(d.filename)}</span>
            </label>`).join("")}
        </div>
      </div>`)
    .join("");
  updateConflictContinueState();
}

function updateConflictContinueState() {
  const continueBtn = document.getElementById("continue-btn");
  const checked = document.querySelectorAll('#conflict-options input[name="identity-file"]:checked');
  continueBtn.disabled = checked.length === 0;
  continueBtn.textContent = checked.length
    ? `Continue with ${checked.length} document${checked.length === 1 ? "" : "s"}`
    : "Select your documents";
}

async function refreshCheck() {
  try {
    const res = await fetch("/api/onboarding/check");
    const result = await res.json();
    latestResult = result;
    renderConflict(result);
  } catch (e) {}
}

function showOwnershipModal(files, onYes) {
  const modal = document.getElementById("ownership-modal");
  modal.style.display = "flex";
  document.getElementById("ownership-yes-btn").onclick = () => {
    modal.style.display = "none";
    onYes(files);
  };
  document.getElementById("ownership-no-btn").onclick = () => {
    modal.style.display = "none";
    const fileInput = document.getElementById("file-input");
    if (fileInput) fileInput.value = "";
    setStatus("Upload cancelled. Only upload documents that belong to you.", "error");
  };
}

document.addEventListener("DOMContentLoaded", () => {

  // ── DISCLAIMER STEP ──
  const disclaimerStep = document.getElementById("disclaimer-step");
  const uploadStep = document.getElementById("upload-step");
  const acceptBtn = document.getElementById("accept-disclaimer-btn");
  const checkboxes = document.querySelectorAll(".disclaimer-checkbox");

  // Apply glow immediately if upload step is already visible (disclaimer already accepted)
  if (uploadStep && uploadStep.style.display !== "none") {
    document.querySelector(".onboard-card")?.classList.add("onboard-card--glow");
  }

  if (disclaimerStep && disclaimerStep.style.display !== "none") {
    function updateAcceptBtn() {
      const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
      acceptBtn.disabled = !allChecked;
    }
    checkboxes.forEach((cb) => cb.addEventListener("change", updateAcceptBtn));

    acceptBtn.addEventListener("click", async () => {
      acceptBtn.disabled = true;
      try {
        await fetch("/api/disclaimer-accept", { method: "POST" });
      } catch (e) {}
      disclaimerStep.style.display = "none";
      uploadStep.style.display = "block";
      document.querySelector(".onboard-card")?.classList.add("onboard-card--glow");
      refreshCheck();
    });
    return; // don't wire upload events yet — they'll be wired after disclaimer
  }

  // ── UPLOAD STEP ──
  initUploadStep();
  refreshCheck();
});

function initUploadStep() {
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");
  if (!uploadZone || !fileInput) return;

  uploadZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) showOwnershipModal(fileInput.files, doUpload);
  });

  ["dragenter", "dragover"].forEach((evt) =>
    uploadZone.addEventListener(evt, (e) => { e.preventDefault(); uploadZone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    uploadZone.addEventListener(evt, (e) => { e.preventDefault(); uploadZone.classList.remove("dragover"); })
  );
  uploadZone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) showOwnershipModal(e.dataTransfer.files, doUpload);
  });

  async function doUpload(fileList) {
    if (!fileList.length) return;
    const formData = new FormData();
    for (const f of fileList) formData.append("documents", f);
    showLoading("Uploading documents…");
    try {
      const res = await fetch("/api/onboarding/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.documents) renderDocList(data.documents);
      if (!data.ok) {
        setStatus(data.error || "Upload failed.", "error");
      } else {
        latestResult = data;
        renderConflict(data);
        if (data.rejected && data.rejected.length) {
          setStatus(`Skipped unreadable file(s): ${data.rejected.join(", ")}`, "error");
        } else {
          setStatus("", "");
        }
      }
    } catch (err) {
      setStatus("Upload failed: " + err.message, "error");
    } finally {
      hideLoading();
      fileInput.value = "";
    }
  }

  document.getElementById("doc-list").addEventListener("click", async (e) => {
    const target = e.target.closest(".remove-doc");
    if (!target) return;
    const docId = target.getAttribute("data-doc-id");
    showLoading("Removing document…");
    try {
      const res = await fetch(`/api/onboarding/document/${docId}`, { method: "DELETE" });
      const data = await res.json();
      latestResult = data;
      target.closest(".doc-row").remove();
      renderConflict(data);
    } finally {
      hideLoading();
    }
  });

  document.getElementById("conflict-options").addEventListener("change", (e) => {
    if (e.target.name === "identity-file") updateConflictContinueState();
  });

  document.getElementById("continue-btn").addEventListener("click", async () => {
    let name = "";
    let keepIds = null;

    if (latestResult && latestResult.conflict) {
      const checked = Array.from(document.querySelectorAll('#conflict-options input[name="identity-file"]:checked'));
      if (!checked.length) { setStatus("Please select which documents are yours.", "error"); return; }
      keepIds = checked.map((el) => Number(el.value));
      const countByCluster = {};
      checked.forEach((el) => {
        const ci = el.getAttribute("data-cluster");
        countByCluster[ci] = (countByCluster[ci] || 0) + 1;
      });
      let bestCi = null, bestCount = 0;
      for (const [ci, count] of Object.entries(countByCluster)) {
        const cluster = latestResult.clusters[Number(ci)];
        if (cluster.name !== "Unknown" && count > bestCount) { bestCi = ci; bestCount = count; }
      }
      name = bestCi !== null ? latestResult.clusters[Number(bestCi)].name : "";
    } else if (latestResult) {
      name = latestResult.name || "";
    }

    showLoading("Confirming your documents and scoring your profile…");
    try {
      const res = await fetch("/api/onboarding/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, keep_document_ids: keepIds }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = "/dashboard";
      } else {
        setStatus(data.error || "Could not confirm documents.", "error");
      }
    } catch (err) {
      setStatus("Something went wrong: " + err.message, "error");
    } finally {
      hideLoading();
    }
  });
}

// Re-wire after disclaimer is accepted (DOM already has upload step)
document.addEventListener("DOMContentLoaded", () => {
  const disclaimerStep = document.getElementById("disclaimer-step");
  const acceptBtn = document.getElementById("accept-disclaimer-btn");
  if (!disclaimerStep || disclaimerStep.style.display === "none") return;

  const checkboxes = document.querySelectorAll(".disclaimer-checkbox");
  function updateAcceptBtn() {
    acceptBtn.disabled = !Array.from(checkboxes).every((cb) => cb.checked);
  }
  checkboxes.forEach((cb) => cb.addEventListener("change", updateAcceptBtn));

  acceptBtn.addEventListener("click", async () => {
    acceptBtn.disabled = true;
    try { await fetch("/api/disclaimer-accept", { method: "POST" }); } catch (e) {}
    disclaimerStep.style.display = "none";
    const uploadStep = document.getElementById("upload-step");
    uploadStep.style.display = "block";
    document.querySelector(".onboard-card")?.classList.add("onboard-card--glow");
    initUploadStep();
    refreshCheck();
  });
});
