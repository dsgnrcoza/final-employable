/* dashboard.js — Employable dashboard controller */

// =====================================================================
// CONSTANTS & HELPERS
// =====================================================================

const VISIBLE_DIMENSIONS = new Set([
  "Documentation Strength",
  "Experience Strength",
  "Skill Strength",
  "ATS Compatibility",
  "Market Competitiveness",
]);

const DIM_ICONS = {
  "Documentation Strength": {
    bg: "rgba(99,102,241,0.15)", stroke: "#818CF8",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  },
  "Experience Strength": {
    bg: "rgba(59,130,246,0.15)", stroke: "#60A5FA",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  },
  "Skill Strength": {
    bg: "rgba(20,184,166,0.15)", stroke: "#2DD4BF",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  },
  "Market Competitiveness": {
    bg: "rgba(245,158,11,0.15)", stroke: "#FBBF24",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  },
  "ATS Compatibility": {
    bg: "rgba(34,197,94,0.15)", stroke: "#4ADE80",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  },
};

const DIM_BAR_CLASS = {
  "Documentation Strength": "dim-doc",
  "Experience Strength":    "dim-exp",
  "Skill Strength":         "dim-skill",
  "Market Competitiveness": "dim-market",
  "ATS Compatibility":      "dim-ats",
};

const DIMENSION_INFO = {
  "Documentation Strength": `Your documentation score reflects how complete and corroborated your profile is across all uploaded files — not just your CV. A CV alone tells an employer what you <em>claim</em>; supporting documents like certificates, references, transcripts, and portfolios tell them what you can <em>prove</em>.\n\nThis score rewards evidence breadth: the more independent document types you upload, the higher it climbs. It matters because employers increasingly pre-screen candidates based on documentation completeness, and a well-documented profile signals professionalism and transparency before you even speak to anyone.`,
  "Experience Strength": `This score measures the depth, relevance, and quality of your work history as found in your documents. It accounts for years of experience, career progression, employment stability, and — critically — whether roles are described with measurable outcomes or just duty lists.\n\nA candidate who "managed a team" and a candidate who "grew a team from 4 to 11 people and reduced attrition by 30%" have very different evidence profiles. Improving this score means adding quantified achievements, explaining gaps, and demonstrating progression rather than lateral movement.`,
  "Skill Strength": `Each claimed skill is weighted by market demand and cross-referenced against whether it appears elsewhere in your documents — in project outcomes, certifications, or role descriptions.\n\nA bare skill list counts for less than one where most entries are corroborated by independent sources. This score also accounts for the market value of each skill: high-demand technical skills contribute significantly more than commodity skills. Improving it means uploading supporting documents that demonstrate your skills, and adding skills that are actually in demand in your target field.`,
  "ATS Compatibility": `Most companies use Applicant Tracking Systems to automatically parse and rank CVs before a human ever sees them. This score measures whether your CV's structure can be reliably read by that software — independent of how strong your content is.\n\nA brilliant CV in an unparseable format can be invisibly filtered out. This score checks for: conventional section naming, consistent date formats, no content trapped inside tables or images, and role-relevant keywords in plain text. A strong score here ensures your application actually enters the review process.`,
  "Market Competitiveness": `This score compares your overall profile against what is typically expected for your stated or implied target field. It identifies specific gaps — a missing certification, a seniority mismatch, a skills gap relative to common field expectations.\n\nKnowing where you're competitive is more actionable than a general score. Set your Target Role in your profile to lock in a benchmark and get a more precise assessment of how you compare to candidates actively competing for that role.`,
};

const BASE_GREETINGS = [
  "Hey {name}. Let's get you hired.",
  "{name}, your next offer starts here.",
  "Good to see you, {name}. What's the move?",
  "Hi {name}. Let's close the gap today.",
  "Ready when you are, {name}.",
  "Hey {name} — let's build something impressive.",
  "{name}, let's make today count.",
  "You're back, {name}. Let's get to work.",
  "Hey {name}. Let's make something happen.",
];

let _lastGreetingIndex = -1;
function getRandomGreeting(firstName) {
  let idx;
  do { idx = Math.floor(Math.random() * BASE_GREETINGS.length); }
  while (idx === _lastGreetingIndex && BASE_GREETINGS.length > 1);
  _lastGreetingIndex = idx;
  return BASE_GREETINGS[idx].replace("{name}", firstName || "there");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str === null || str === undefined ? "" : str;
  return div.innerHTML;
}

function renderStars(starCount, total = 5) {
  let out = "";
  for (let i = 0; i < total; i++) {
    out += i < starCount ? "★" : "<span class='dim'>★</span>";
  }
  return out;
}

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (name || "JS").slice(0, 2).toUpperCase();
}

function setAvatarEl(el, profile) {
  if (!el) return;
    if (profile.avatar_url) {
    const url = profile.avatar_url + "?t=" + Date.now();
    const initials = getInitials(profile.full_name || "JS");
    el.innerHTML = `<img src="${escapeHtml(url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${initials}'">`;
  } else {
    el.textContent = getInitials(profile.full_name || "JS");
  }
}

function showLoading(text) {
  document.getElementById("loading-text").textContent = text || "Working…";
  document.getElementById("loading-overlay").classList.add("visible");
}
function hideLoading() {
  document.getElementById("loading-overlay").classList.remove("visible");
}

// =====================================================================
// RENDER FUNCTIONS
// =====================================================================

function generateUserBio(profile, analysis) {
  // Prefer positive evidence from analysis to describe the person
  const wells = (analysis && analysis.working_well || []).slice(0, 2);
  if (wells.length) return wells.join(". ").replace(/\.$/, "") + ".";
  const expDim = (analysis && analysis.dimensions || []).find(d => d.label === "Experience Strength");
  if (expDim && expDim.description) return expDim.description;
  return profile.headline || "";
}

function renderProfile(profile, analysis) {
  const name = profile.full_name || "Job Seeker";
  document.getElementById("profile-name").textContent = name;
  const headlineEl = document.getElementById("profile-headline");
  if (headlineEl) headlineEl.style.display = "none";
  document.getElementById("profile-email").textContent = profile.email || "No email on file";
  document.getElementById("profile-location").textContent = profile.location || "Location not set";

  const phoneRow = document.getElementById("profile-phone-row");
  const phoneEl = document.getElementById("profile-phone");
  if (phoneEl && phoneRow) {
    phoneEl.textContent = profile.phone || "";
    phoneRow.style.display = profile.phone ? "" : "none";
  }

  setAvatarEl(document.getElementById("profile-avatar"), profile);

  // Topbar greeting
  const greeting = document.getElementById("topbar-greeting");
  if (greeting) {
    const first = (name.split(/\s+/)[0] || "");
    const firstName = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    greeting.textContent = `Welcome back, ${firstName}`;
  }

  // Target field
  const tfInput = document.getElementById("target-field-input");
  if (tfInput && profile.target_field !== undefined) {
    tfInput.value = profile.target_field || "";
  }
}

function renderSkills(skills) {
  const wrap = document.getElementById("skills-scroll-inner");
  if (!skills.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:10px 0; font-size:12px;">No skills yet — upload a document or edit them in your profile.</div>`;
    return;
  }
  wrap.innerHTML = skills
    .map(
      (s) => `
      <span class="skill-tag ${s.source === "ai" ? "ai-tag" : ""}" data-skill-id="${s.id}">
        ${escapeHtml(s.label)}
        <span class="remove" data-skill-id="${s.id}" title="Remove skill">&times;</span>
      </span>`
    )
    .join("");
}

function renderDocuments(documents) {
  window._lastDocs = documents;
  const wrap = document.getElementById("doc-list");
  wrap.innerHTML = documents.map((d) => {
    const delta = d.score_delta != null ? parseFloat(d.score_delta) : null;
    const deltaBadge = delta !== null && delta > 0
      ? `<span class="doc-delta-badge">+${delta.toFixed(1)} pts</span>` : "";
    return `
      <div class="doc-row" data-doc-id="${d.id}">
        <span class="name">
          ${escapeHtml(d.filename)}
          <span class="badge">${(d.file_type || "file").toUpperCase()}</span>
          ${deltaBadge}
        </span>
        <span class="doc-row-actions">
          <button class="doc-insight-btn" data-doc-id="${d.id}" title="What did this document contribute?">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </button>
          <span class="remove-doc" data-doc-id="${d.id}" title="Remove document">&times;</span>
        </span>
      </div>`;
  }).join("");
}

function renderDimensions(analysis) {
  const list = document.getElementById("dimensions-list");
  if (!analysis || !analysis.dimensions || !analysis.dimensions.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="big">No analysis yet</span>
        Upload a document to generate your Cubic-Metric breakdown.
      </div>`;
    return;
  }
  const visible = analysis.dimensions.filter((d) => VISIBLE_DIMENSIONS.has(d.label));
  list.innerHTML = visible
    .map((d) => {
      const pct = Math.max(0, Math.min(100, (d.score / 10) * 100));
      const cls = d.score <= 4 ? "low" : d.score <= 7 ? "mid" : "high";
      const icon = DIM_ICONS[d.label];
      const iconHtml = icon
        ? `<div class="dim-icon" style="background:${icon.bg}; color:${icon.stroke};">${icon.svg}</div>`
        : "";
      const hasInfo = !!DIMENSION_INFO[d.label];
      return `
      <div class="dimension-row">
        ${iconHtml}
        <div class="dimension-content">
          <div class="dimension-head">
            <span class="dimension-label">${escapeHtml(d.label)}</span>
            <span class="dimension-score">${d.score.toFixed(1)}/10</span>
          </div>
          ${d.description ? `<div class="dimension-desc">${hasInfo ? `<button class="dim-info-btn" data-dim="${escapeHtml(d.label)}" title="What does this score mean?">i</button>` : ""}<span>${escapeHtml(d.description)}</span></div>` : ""}
          <div class="bar-track" style="margin-top:6px;"><div class="bar-fill ${DIM_BAR_CLASS[d.label] || cls}" style="width:${pct}%"></div></div>
        </div>
      </div>`;
    })
    .join("");
}

function renderGauge(analysis) {
  const overall = analysis ? (analysis.overall_rating || 0) : 0;
  const starCount = analysis ? (analysis.star_rating || 0) : 0;
  const label = analysis ? (analysis.rating_label || "Unrated") : "UPLOAD DOCUMENTS TO BEGIN";

  document.getElementById("gauge-number").textContent = overall > 0 ? overall.toFixed(2) : "—";
  const gaugeStarsEl = document.getElementById("gauge-stars");
  if (gaugeStarsEl) gaugeStarsEl.innerHTML = renderStars(starCount);

  const circumference = 2 * Math.PI * 78;
  const fraction = Math.max(0, Math.min(1, overall / 10));
  const arc = document.getElementById("gauge-arc");
  arc.setAttribute("stroke-dasharray", `${circumference * fraction} ${circumference}`);

  document.getElementById("potential-pill").textContent = analysis
    ? `POTENTIAL: ${label.toUpperCase()}`
    : "UPLOAD DOCUMENTS TO BEGIN";

  // Stars row in profile header
  const starsRow = document.getElementById("stars-row");
  if (starsRow) starsRow.innerHTML = renderStars(starCount);
}

function renderScoreHistory(scoreHistory) {
  const wrap = document.getElementById("score-history-wrap");
  const canvas = document.getElementById("score-sparkline");
  if (!wrap || !canvas || !scoreHistory || scoreHistory.length < 2) {
    if (wrap) wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";
  const ratings = scoreHistory.map((h) => h.overall_rating).reverse(); // chronological
  const w = canvas.offsetWidth || 200;
  const h = 36;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);

  const pts = ratings.map((v, i) => ({
    x: (i / (ratings.length - 1)) * w,
    y: h - 4 - (v / 10) * (h - 8),
  }));

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#6366F1");
  grad.addColorStop(1, "#818CF8");
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const cp = pts[i - 1].x + (pts[i].x - pts[i - 1].x) / 2;
    ctx.bezierCurveTo(cp, pts[i - 1].y, cp, pts[i].y, pts[i].x, pts[i].y);
  }
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dots at each point
  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#818CF8";
    ctx.fill();
  });
}

function renderInsightLists(analysis) {
  const placeholder = `<li style="color:var(--text-faint);list-style:none;padding-left:0;">Upload documents to generate insights.</li>`;
  const fill = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!analysis) { el.innerHTML = placeholder; return; }
    el.innerHTML = (items || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("") || "<li>None noted.</li>";
  };
  fill("evidence-summary-list", analysis && analysis.evidence_summary);
  fill("working-well-list",     analysis && analysis.working_well);
  fill("critical-issues-list",  analysis && analysis.critical_issues);
  fill("missing-evidence-list", analysis && analysis.missing_evidence);
}

function renderRoadmapModal(analysis) {
  const roadmapList = document.getElementById("roadmap-list");
  if (!roadmapList) return;
  const roadmap = analysis && analysis.improvement_roadmap;
  if (!roadmap || !roadmap.length) {
    roadmapList.innerHTML = `<div class="roadmap-empty">Upload and score your documents to generate your personal improvement roadmap.</div>`;
    return;
  }
  roadmapList.innerHTML = roadmap
    .map((r, i) => {
      const what = r.what || r.action || "Improvement action";
      const why = r.why || "";
      const how = r.how || "";
      const dim = r.dimension || "";
      const gain = Number(r.projected_score_gain || 0);
      const gainStr = gain > 0 ? `+${gain.toFixed(1)} pts potential gain` : "";
      return `
      <div class="roadmap-item-card"
        data-label="${escapeHtml(what)}"
        data-what="${escapeHtml(what)}"
        data-why="${escapeHtml(why)}"
        data-how="${escapeHtml(how)}"
        data-gain="${escapeHtml(gainStr)}"
        style="cursor:pointer;"
        title="Click for full details">
        <div class="roadmap-item-head">
          <span class="roadmap-item-num">${i + 1}</span>
          <span class="roadmap-item-what ri-title">${escapeHtml(what)}</span>
          ${dim ? `<span class="roadmap-item-dim">${escapeHtml(dim)}</span>` : ""}
          <span style="margin-left:auto; color:var(--text-faint); font-size:16px; line-height:1;">›</span>
        </div>
        ${gain > 0 ? `<div style="margin-bottom:4px;"><span class="roadmap-item-gain">+${gain.toFixed(1)} pts potential gain</span></div>` : ""}
      </div>`;
    })
    .join("");
}

function renderInlineRoadmap(analysis) {
  const list = document.getElementById("inline-roadmap-list");
  if (!list) return;
  const roadmap = analysis && analysis.improvement_roadmap;
  if (!roadmap || !roadmap.length) {
    list.innerHTML = `<div class="roadmap-empty">Upload and score your documents to generate your personal improvement roadmap.</div>`;
    return;
  }
  list.innerHTML = roadmap.map((r, i) => {
    const what = r.what || r.action || "Improvement action";
    const why  = r.why  || "";
    const how  = r.how  || "";
    const dim  = r.dimension || "";
    const gain = Number(r.projected_score_gain || 0);
    return `
    <div class="inline-roadmap-item"
      data-label="${escapeHtml(what)}" data-what="${escapeHtml(what)}"
      data-why="${escapeHtml(why)}"   data-how="${escapeHtml(how)}"
      data-dim="${escapeHtml(dim)}"
      data-gain="${gain > 0 ? `+${gain.toFixed(1)} pts potential gain` : ""}">
      <div class="inline-roadmap-item-head">
        <span class="inline-roadmap-num">${i + 1}</span>
        <span class="inline-roadmap-title ri-title">${escapeHtml(what)}</span>
        ${dim ? `<span style="font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-faint);background:var(--surface-3);border:1px solid var(--border);border-radius:var(--r-pill);padding:2px 7px;white-space:nowrap;flex-shrink:0;">${escapeHtml(dim)}</span>` : ""}
        ${gain > 0 ? `<span class="inline-roadmap-gain">+${gain.toFixed(1)} pts</span>` : ""}
      </div>
      <div class="inline-roadmap-detail">
        ${why ? `<div class="inline-roadmap-section"><div class="inline-roadmap-section-label">Why it matters</div><div class="inline-roadmap-section-text">${escapeHtml(why)}</div></div>` : ""}
        ${how ? `<div class="inline-roadmap-section"><div class="inline-roadmap-section-label">How to improve</div><div class="inline-roadmap-section-text">${escapeHtml(how)}</div></div>` : ""}
      </div>
    </div>`;
  }).join("");
}

function renderApplications(applications) {
  const targets = [
    document.getElementById("applications-area"),
    document.getElementById("applications-area-full"),
  ].filter(Boolean);
  const html = !applications.length
    ? `<div class="empty-state" style="padding:12px 0;"><span class="big">No applications yet.</span>Track roles in the Applications tab.</div>`
    : applications
        .map(
          (a) => `
      <div class="doc-row">
        <span class="name">${escapeHtml(a.job_title)} — ${escapeHtml(a.company)}</span>
        <span class="badge">${escapeHtml((a.status || "").toUpperCase())}</span>
      </div>`
        )
        .join("");
  targets.forEach((el) => (el.innerHTML = html));
}

function renderRebuilder(analysis) {
  // legacy function kept for compat — new editor handles its own init
}

/* ── CV Rebuilder Editor ── */
(function initCVRebuilder() {
  let editorReady = false;

  function setupRebuilder() {
    if (editorReady) return;
    editorReady = true;

    const editor        = document.getElementById("cvr-editor");
    const placeholder   = document.getElementById("cvr-placeholder");
    const fontFamilySel = document.getElementById("cvr-font-family");
    const fontSizeSel   = document.getElementById("cvr-font-size");
    const aiMessages    = document.getElementById("cvr-ai-messages");
    const aiInput       = document.getElementById("cvr-ai-input");
    const aiSendBtn     = document.getElementById("cvr-ai-send-btn");
    const downloadBtn   = document.getElementById("cvr-download-btn");
    const downloadMenu  = document.getElementById("cvr-download-menu");
    const importBtn     = document.getElementById("cvr-import-btn");

    if (!editor) return;

    const PAGE_H = 990; // px — A4 equivalent height per page

    // ── Placeholder ──
    function updatePlaceholder() {
      if (!placeholder) return;
      placeholder.style.display = editor.innerText.trim() ? "none" : "";
    }
    editor.addEventListener("input", updatePlaceholder);
    updatePlaceholder();

    // ── Page layout: background boxes + content spacers ──
    // White page boxes are drawn behind the editor (cvr-page-bgs).
    // contenteditable=false spacer divs are inserted inside the editor at each
    // page boundary so content physically skips the grey gap — cursor always
    // stays on a white page box.
    const PAGE_GAP = 28;
    const pageBgsEl = document.getElementById("cvr-page-bgs");
    const editorWrap = document.getElementById("cvr-editor-wrap");

    let _layoutBusy = false;
    let _layoutTimer = null;

    function updatePageBgs() {
      if (!pageBgsEl) return;
      const spacers = editor.querySelectorAll("[data-page-spacer]").length;
      const count = Math.max(1, spacers + 1);
      const totalH = count * PAGE_H + (count - 1) * PAGE_GAP;
      if (editorWrap) editorWrap.style.minHeight = totalH + "px";

      pageBgsEl.innerHTML = "";

      for (let i = 0; i < count; i++) {
        const pageTop = i * (PAGE_H + PAGE_GAP);

        // White page box (behind editor)
        const bg = document.createElement("div");
        bg.className = "cvr-page-bg";
        bg.style.top = pageTop + "px";
        bg.style.height = PAGE_H + "px";
        pageBgsEl.appendChild(bg);

        if (i < count - 1) {
          const sep = document.createElement("div");
          sep.className = "cvr-page-sep";
          sep.style.top = (pageTop + PAGE_H) + "px";
          sep.style.height = PAGE_GAP + "px";
          sep.innerHTML = `<span>Page ${i + 2}</span>`;
          pageBgsEl.appendChild(sep);
        }
      }

      // ── Strict page borders via clip-path ──
      // Build a path that exposes ONLY the page rectangles.
      // Anything in a gap or outside a page is physically invisible.
      const W = editor.offsetWidth || 700;
      let pathData = "";
      for (let i = 0; i < count; i++) {
        const t = i * (PAGE_H + PAGE_GAP);
        const b = t + PAGE_H;
        pathData += `M 0 ${t} H ${W} V ${b} H 0 Z `;
      }
      editor.style.clipPath = `path('${pathData.trim()}')`;
    }

    // Padding values that mirror the CSS on #cvr-editor
    const PAD_TOP = 80;
    const PAD_BOTTOM = 80;

    // Where content must STOP on page `p` (1-based), in editor-relative px
    function contentEnd(p)   { return (p - 1) * (PAGE_H + PAGE_GAP) + PAGE_H - PAD_BOTTOM; }
    // Where content must START on page `p+1`
    function contentStart(p) { return p * (PAGE_H + PAGE_GAP) + PAD_TOP; }

    // Insert spacers so every block child lands inside a page's content area.
    // Spacer height is exact: it bridges from the child's current top to the
    // correct content-start of the next page, so text never crosses a page edge.
    function updatePageLayout() {
      if (_layoutBusy) return;
      _layoutBusy = true;

      Array.from(editor.querySelectorAll("[data-page-spacer]")).forEach(s => s.remove());

      let page = 1;
      let i = 0;
      const MAX = 40;

      while (i < editor.children.length && page <= MAX) {
        const child = editor.children[i];
        if (child.hasAttribute("data-page-spacer")) { i++; continue; }

        // Does this child's bottom cross the current page's content boundary?
        if (child.offsetTop + child.offsetHeight > contentEnd(page)) {
          const spacerH = Math.max(4, contentStart(page) - child.offsetTop);
          const spacer = document.createElement("div");
          spacer.setAttribute("data-page-spacer", "true");
          spacer.contentEditable = "false";
          spacer.style.cssText =
            `height:${spacerH}px;margin:0;padding:0;` +
            `pointer-events:none;user-select:none;display:block;`;
          editor.insertBefore(spacer, child);
          page++;
          // Don't advance i — re-check same child against next page boundary
        } else {
          i++;
        }
      }

      updatePageBgs();
      _layoutBusy = false;
    }

    function schedulePageLayout() {
      clearTimeout(_layoutTimer);
      _layoutTimer = setTimeout(updatePageLayout, 80);
    }

    editor.addEventListener("input", schedulePageLayout);
    updatePageLayout();

    // ── Word / char count ──
    const wordCountEl = document.getElementById("cvr-word-count");
    const charCountEl = document.getElementById("cvr-char-count");
    function updateWordCount() {
      const text = editor.innerText.trim();
      const words = text ? text.split(/\s+/).filter(w => w.length > 0).length : 0;
      if (wordCountEl) wordCountEl.textContent = `${words} word${words !== 1 ? "s" : ""}`;
      if (charCountEl) charCountEl.textContent = `${text.length} character${text.length !== 1 ? "s" : ""}`;
    }
    editor.addEventListener("input", updateWordCount);
    updateWordCount();

    // ── Font family — applies to selection only ──
    if (fontFamilySel) {
      fontFamilySel.addEventListener("change", () => {
        const fontName = fontFamilySel.value.split(",")[0].replace(/['"]/g, "").trim();
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("fontName", false, fontName);
        editor.focus();
      });
    }

    // ── Font size — applies to selection only ──
    if (fontSizeSel) {
      fontSizeSel.addEventListener("change", () => {
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("fontSize", false, fontSizeSel.value);
        editor.focus();
      });
    }

    // ── Snapshot-based undo / redo ──
    // The browser's native undo stack is corrupted by the spacer DOM mutations
    // that updatePageLayout makes after every input. We maintain our own stack.
    const _undoStack = [];
    const _redoStack = [];
    let _currentSnap = "";

    function _snap() {
      // Strip spacers so they don't pollute saved state
      const clone = editor.cloneNode(true);
      clone.querySelectorAll("[data-page-spacer]").forEach(s => s.remove());
      return clone.innerHTML;
    }

    function saveUndoSnapshot() {
      const html = _snap();
      if (html === _currentSnap) return;
      _undoStack.push(_currentSnap);
      if (_undoStack.length > 100) _undoStack.shift();
      _currentSnap = html;
      _redoStack.length = 0;
    }

    function applyUndoSnapshot(html) {
      _currentSnap = html;
      editor.innerHTML = html;
      updatePlaceholder(); updateWordCount();
      requestAnimationFrame(updatePageLayout);
    }

    function doUndo() {
      if (!_undoStack.length) return;
      _redoStack.push(_snap());
      applyUndoSnapshot(_undoStack.pop());
    }

    function doRedo() {
      if (!_redoStack.length) return;
      _undoStack.push(_snap());
      applyUndoSnapshot(_redoStack.pop());
    }

    // ── Cross-page Backspace / Delete: handle spacers ──
    // Spacers are contentEditable=false so the browser blocks crossing them.
    // When Backspace is pressed at the very start of the element right after a
    // spacer, we remove the spacer and let layout re-decide placement.
    // When Delete is pressed at the very end of the element right before a spacer,
    // same treatment.
    editor.addEventListener("keydown", e => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed) return;

      const range = sel.getRangeAt(0);

      if (e.key === "Backspace" && range.startOffset === 0) {
        // Find the block-level ancestor that is a direct child of editor
        let node = range.startContainer;
        while (node && node.parentNode !== editor) node = node.parentNode;
        if (!node) return;
        const prev = node.previousSibling;
        if (prev && prev.hasAttribute && prev.hasAttribute("data-page-spacer")) {
          e.preventDefault();
          saveUndoSnapshot();
          prev.remove();
          schedulePageLayout();
          // Place cursor at end of the node now before `node`
          const newPrev = node.previousSibling;
          if (newPrev) {
            const r = document.createRange();
            r.selectNodeContents(newPrev);
            r.collapse(false);
            sel.removeAllRanges();
            sel.addRange(r);
          }
        }
      }

      if (e.key === "Delete") {
        // Find the block-level ancestor that is a direct child of editor
        let node = range.startContainer;
        while (node && node.parentNode !== editor) node = node.parentNode;
        if (!node) return;
        // Check if cursor is at the very end of this node's text
        const nodeText = node.textContent || "";
        const isAtEnd = range.startOffset === (range.startContainer.textContent || "").length
          && range.startContainer === node.lastChild || range.startContainer === node;
        const next = node.nextSibling;
        if (next && next.hasAttribute && next.hasAttribute("data-page-spacer")) {
          // Only intercept if cursor seems to be at end of this block
          const tmpRange = document.createRange();
          tmpRange.selectNodeContents(node);
          tmpRange.collapse(false);
          if (range.compareBoundaryPoints(Range.START_TO_START, tmpRange) >= 0) {
            e.preventDefault();
            saveUndoSnapshot();
            next.remove();
            schedulePageLayout();
          }
        }
      }
    }, true); // capture phase

    // Save at word boundaries so Ctrl+Z jumps back meaningful steps
    editor.addEventListener("keydown", e => {
      if ([" ", "Enter", "Backspace", "Delete"].includes(e.key)) saveUndoSnapshot();
    });
    // Also save before paste
    editor.addEventListener("paste", saveUndoSnapshot);

    // Intercept Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z before the browser handles them
    editor.addEventListener("keydown", e => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); }
      if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); doRedo(); }
    }, true); // capture phase so we beat the browser

    // Initialise snapshot to current (possibly imported) content
    _currentSnap = _snap();

    // ── Toolbar format buttons ──
    document.querySelectorAll(".cvr-tool-btn[data-cmd]").forEach(btn => {
      btn.addEventListener("mousedown", e => {
        e.preventDefault(); // keep selection alive
        const cmd = btn.dataset.cmd;
        if (cmd === "undo") { doUndo(); return; }
        if (cmd === "redo") { doRedo(); return; }
        saveUndoSnapshot();
        document.execCommand("styleWithCSS", false, true);
        document.execCommand(cmd, false, null);
        updateToolbarState();
      });
    });

    function updateToolbarState() {
      ["bold", "italic", "underline", "strikeThrough"].forEach(cmd => {
        const btn = document.querySelector(`.cvr-tool-btn[data-cmd="${cmd}"]`);
        if (btn) btn.classList.toggle("active", document.queryCommandState(cmd));
      });
    }
    document.addEventListener("selectionchange", updateToolbarState);

    // ── Tab key: indent / outdent ──
    editor.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      if (e.shiftKey) {
        document.execCommand("outdent", false, null);
      } else {
        document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
      }
    });

    // ── Helpers — strip invisible page spacers before export ──
    function getFullText() {
      const clone = editor.cloneNode(true);
      clone.querySelectorAll("[data-page-spacer]").forEach(s => s.remove());
      return clone.innerText;
    }
    function getFullHTML() {
      const clone = editor.cloneNode(true);
      clone.querySelectorAll("[data-page-spacer]").forEach(s => s.remove());
      return clone.innerHTML;
    }

    // ── Download ──
    if (downloadBtn && downloadMenu) {
      downloadBtn.addEventListener("click", e => {
        e.stopPropagation();
        downloadMenu.classList.toggle("open");
      });
      document.addEventListener("click", () => downloadMenu.classList.remove("open"));
      downloadMenu.querySelectorAll(".cvr-download-option").forEach(opt => {
        opt.addEventListener("click", () => {
          downloadMenu.classList.remove("open");
          const fmt = opt.dataset.fmt;
          if (fmt === "pdf")  downloadPDF();
          if (fmt === "docx") downloadDOCX();
        });
      });
    }

    function promptFilename(defaultName, ext) {
      return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "cvr-filename-overlay";
        overlay.innerHTML = `
          <div class="cvr-filename-popup">
            <h3>Name your file</h3>
            <p>Choose a name for your downloaded ${ext.toUpperCase()}.</p>
            <input class="cvr-filename-input" id="cvr-fname-input" type="text" value="${defaultName}" spellcheck="false"/>
            <div class="cvr-filename-actions">
              <button class="cvr-filename-cancel">Cancel</button>
              <button class="cvr-filename-confirm">Download ${ext.toUpperCase()}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const input = overlay.querySelector("#cvr-fname-input");
        input.focus(); input.select();
        const finish = name => { overlay.remove(); resolve(name); };
        overlay.querySelector(".cvr-filename-cancel").addEventListener("click", () => finish(null));
        overlay.querySelector(".cvr-filename-confirm").addEventListener("click", () => finish(input.value.trim() || defaultName));
        overlay.addEventListener("click", e => { if (e.target === overlay) finish(null); });
        input.addEventListener("keydown", e => {
          if (e.key === "Enter")  finish(input.value.trim() || defaultName);
          if (e.key === "Escape") finish(null);
        });
      });
    }

    async function downloadFile(endpoint, defaultName, ext) {
      const name = await promptFilename(defaultName, ext);
      if (!name) return;
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: getFullText() })
        });
        if (!res.ok) throw new Error();
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name.endsWith("." + ext) ? name : `${name}.${ext}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch {
        addMsg(`Could not generate ${ext.toUpperCase()}. Please try again.`, "bot");
      }
    }

    function downloadPDF()  { downloadFile("/api/cv-download/pdf",  "my-cv", "pdf");  }
    function downloadDOCX() { downloadFile("/api/cv-download/docx", "my-cv", "docx"); }

    // ── Resize handle (AI panel) ──
    const resizeHandle = document.getElementById("cvr-resize-handle");
    const aiPanel = document.getElementById("cvr-ai-panel");
    if (resizeHandle && aiPanel) {
      let startX, startW;
      resizeHandle.addEventListener("mousedown", e => {
        startX = e.clientX; startW = aiPanel.offsetWidth;
        resizeHandle.classList.add("dragging");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        const onMove = mv => {
          const newW = Math.min(600, Math.max(220, startW + (startX - mv.clientX)));
          aiPanel.style.width = newW + "px";
        };
        const onUp = () => {
          resizeHandle.classList.remove("dragging");
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    }

    // ── Import CV dropdown ──
    const importMenu     = document.getElementById("cvr-import-menu");
    const importDashBtn  = document.getElementById("cvr-import-dashboard");
    const importDevBtn   = document.getElementById("cvr-import-device");
    const importFileInput= document.getElementById("cvr-import-file");

    function loadHtmlIntoEditor(html, msg) {
      editor.innerHTML = html;
      updatePlaceholder(); updateWordCount();
      requestAnimationFrame(updatePageLayout);
      addMsg(msg, "bot");
    }

    if (importBtn && importMenu) {
      // Toggle menu
      importBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = importMenu.classList.toggle("open");
        importMenu.style.display = open ? "" : "none";
      });
      document.addEventListener("click", () => {
        importMenu.classList.remove("open");
        importMenu.style.display = "none";
      });

      // From Dashboard
      if (importDashBtn) {
        importDashBtn.addEventListener("click", () => {
          importMenu.classList.remove("open");
          importMenu.style.display = "none";
          fetch("/api/cv-text")
            .then(r => r.json())
            .then(data => {
              if (data.html) {
                loadHtmlIntoEditor(data.html, "CV imported from your dashboard. Edit freely.");
              } else {
                addMsg("No CV found on your dashboard. Upload one in the Documents section first.", "bot");
              }
            })
            .catch(() => addMsg("Could not load your dashboard CV. Please try again.", "bot"));
        });
      }

      // From Device
      if (importDevBtn && importFileInput) {
        importDevBtn.addEventListener("click", () => {
          importMenu.classList.remove("open");
          importMenu.style.display = "none";
          importFileInput.click();
        });
        importFileInput.addEventListener("change", () => {
          const file = importFileInput.files[0];
          if (!file) return;
          const form = new FormData();
          form.append("file", file);
          addMsg("Importing your CV…", "bot");
          fetch("/api/cv-text-upload", { method: "POST", body: form })
            .then(r => r.json())
            .then(data => {
              if (data.html) {
                loadHtmlIntoEditor(data.html, "CV imported from your device. Edit freely.");
              } else {
                addMsg(data.error || "Could not read that file. Try a PDF, DOCX, or TXT.", "bot");
              }
            })
            .catch(() => addMsg("Upload failed. Please try again.", "bot"))
            .finally(() => { importFileInput.value = ""; });
        });
      }
    }

    // ── AI chat helpers ──
    function addMsg(text, role) {
      const div = document.createElement("div");
      div.className = `cvr-ai-msg cvr-ai-msg--${role}`;
      div.textContent = text;
      aiMessages.appendChild(div);
      aiMessages.scrollTop = aiMessages.scrollHeight;
      return div;
    }

    function addThinking() {
      const div = document.createElement("div");
      div.className = "cvr-ai-msg cvr-ai-msg--thinking";
      div.innerHTML = `Working on it <span class="cvr-ai-dots"><span></span><span></span><span></span></span>`;
      aiMessages.appendChild(div);
      aiMessages.scrollTop = aiMessages.scrollHeight;
      return div;
    }

    // ── AI send ──
    async function sendAIEdit() {
      const instruction = aiInput.value.trim();
      if (!instruction) return;
      aiInput.value = "";
      aiInput.style.height = "";
      addMsg(instruction, "user");
      const thinking = addThinking();
      aiSendBtn.disabled = true;

      try {
        const res = await fetch("/api/cv-edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction, cv_html: getFullHTML(), cv_content: getFullText() })
        });
        const data = await res.json();
        thinking.remove();
        const newHTML = data.updated_html || data.updated_cv;
        if (newHTML) {
          saveUndoSnapshot();
          editor.innerHTML = newHTML;
          updatePlaceholder(); updateWordCount();
          schedulePageLayout();
          addMsg(data.description || "Done.", "bot");
        } else {
          addMsg(data.error || "Something went wrong. Please try again.", "bot");
        }
      } catch {
        thinking.remove();
        addMsg("Connection error. Please try again.", "bot");
      } finally {
        aiSendBtn.disabled = false;
      }
    }

    if (aiSendBtn) aiSendBtn.addEventListener("click", sendAIEdit);
    if (aiInput) {
      aiInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAIEdit(); }
      });
      aiInput.addEventListener("input", () => {
        aiInput.style.height = "auto";
        aiInput.style.height = Math.min(aiInput.scrollHeight, 100) + "px";
      });
    }
  }

  // Activate when the insights panel becomes visible
  const observer = new MutationObserver(() => {
    const panel = document.getElementById("view-insights");
    if (panel && panel.style.display !== "none") setupRebuilder();
  });
  document.addEventListener("DOMContentLoaded", () => {
    const panel = document.getElementById("view-insights");
    if (panel) {
      observer.observe(panel, { attributes: true, attributeFilter: ["style"] });
      if (panel.style.display !== "none") setupRebuilder();
    }
  });
})();

function render(state) {
  window.INITIAL_STATE = state;
  window._lastAnalysis = state.analysis || null;
  renderProfile(state.profile, state.analysis);
  renderSkills(state.skills);
  renderDocuments(state.documents);
  renderDimensions(state.analysis);
  renderGauge(state.analysis);
  renderInsightLists(state.analysis);
  renderInlineRoadmap(state.analysis);
  renderRoadmapModal(state.analysis);
  renderApplications(state.applications);
  renderRebuilder(state.analysis);
  if (window._refreshPanel2) window._refreshPanel2();
}

// =====================================================================
// OWNERSHIP MODAL HELPER
// =====================================================================

function showOwnershipModal(onYes, onNo) {
  // Upload restriction removed — proceed directly
  onYes();
}

// =====================================================================
// DOCUMENT WIRING — runs once on DOMContentLoaded
// =====================================================================

document.addEventListener("DOMContentLoaded", () => {
  render(window.INITIAL_STATE);

  // Load completed roadmap items
  fetch("/api/roadmap/completions")
    .then(r => r.json())
    .then(d => { window._roadmapCompletions = (d.completions || []).map(c => c.item_label); })
    .catch(() => {});

  // ── Skill remove ──
  document.getElementById("skills-scroll").addEventListener("click", async (e) => {
    const target = e.target.closest(".remove");
    if (!target) return;
    const skillId = target.getAttribute("data-skill-id");
    showLoading("Removing skill…");
    try {
      const res = await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) render(data.state);
    } finally {
      hideLoading();
    }
  });

  // ── Document list actions (remove + insight) ──
  document.getElementById("doc-list").addEventListener("click", async (e) => {
    // Insight button
    const insightBtn = e.target.closest(".doc-insight-btn");
    if (insightBtn) {
      const docId = insightBtn.getAttribute("data-doc-id");
      const modal = document.getElementById("doc-insight-modal");
      const titleEl = document.getElementById("doc-insight-title");
      const bodyEl  = document.getElementById("doc-insight-body");
      if (!modal) return;
      titleEl.textContent = "Analysing document…";
      bodyEl.innerHTML = `<p style="color:var(--text-faint);font-size:13px;">Please wait — generating your personalised insight…</p>`;
      modal.style.display = "flex";
      try {
        const res  = await fetch(`/api/document-insight/${docId}`);
        const data = await res.json();
        if (data.error) {
          bodyEl.innerHTML = `<p style="color:#e55;">${escapeHtml(data.error)}</p>`;
        } else {
          titleEl.textContent = data.filename;
          const deltaHtml = data.score_delta > 0
            ? `<div class="doc-delta-badge" style="margin-bottom:14px;display:inline-block;">+${parseFloat(data.score_delta).toFixed(1)} pts added to your overall score</div>` : "";
          // Insight is HTML from the API — render directly (no escaping)
          bodyEl.innerHTML = `<div style="font-size:13.5px;line-height:1.7;">${deltaHtml}${data.insight}</div>`;
        }
      } catch (err) {
        bodyEl.innerHTML = `<p style="color:#e55;">Failed to load insight. Please try again.</p>`;
      }
      return;
    }

    // Remove button
    const target = e.target.closest(".remove-doc");
    if (!target) return;
    const docId = target.getAttribute("data-doc-id");
    showLoading("Removing document and recalculating scores…");
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        render(data.state);
        if (data.warning) alert(data.warning);
      }
    } finally {
      hideLoading();
    }
  });

  // Close insight modal
  const docInsightModal = document.getElementById("doc-insight-modal");
  const docInsightClose = document.getElementById("doc-insight-close");
  docInsightClose && docInsightClose.addEventListener("click", () => { docInsightModal.style.display = "none"; });
  docInsightModal && docInsightModal.addEventListener("click", (e) => {
    if (e.target === docInsightModal) docInsightModal.style.display = "none";
  });

  // ── Upload zone (profile card) ──
  const uploadZone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");

  uploadZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) {
      const files = fileInput.files;
      showOwnershipModal(
        () => uploadFiles(files),
        () => { fileInput.value = ""; }
      );
    }
  });

  ["dragenter", "dragover"].forEach((evt) =>
    uploadZone.addEventListener(evt, (e) => { e.preventDefault(); uploadZone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    uploadZone.addEventListener(evt, (e) => { e.preventDefault(); uploadZone.classList.remove("dragover"); })
  );
  uploadZone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) {
      const files = e.dataTransfer.files;
      showOwnershipModal(() => uploadFiles(files));
    }
  });

  async function uploadFiles(fileList) {
    if (!fileList.length) return;
    const formData = new FormData();
    for (const f of fileList) formData.append("documents", f);
    showLoading("Uploading and scoring your documents…");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.state) render(data.state);
      if (!data.ok) alert(data.error || "Upload failed.");
      else if (data.warning) alert(data.warning);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      hideLoading();
      fileInput.value = "";
    }
  }

  // ── Target field save ──
  const targetSaveBtn = document.getElementById("target-field-save-btn");
  if (targetSaveBtn) {
    targetSaveBtn.addEventListener("click", async () => {
      const val = document.getElementById("target-field-input").value.trim();
      try {
        const res = await fetch("/api/target-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_field: val }),
        });
        const data = await res.json();
        if (data.ok && data.state) render(data.state);
      } catch (err) {
        console.error("Target field save failed:", err);
      }
    });
  }
  // Save target field on Enter
  const tfInput = document.getElementById("target-field-input");
  if (tfInput) {
    tfInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") targetSaveBtn && targetSaveBtn.click();
    });
  }

  // ── Dimension info modal ──
  const dimInfoModal = document.getElementById("dim-info-modal");
  const dimInfoTitle = document.getElementById("dim-info-title");
  const dimInfoBody = document.getElementById("dim-info-body");
  const dimInfoClose = document.getElementById("dim-info-close");

  document.getElementById("dimensions-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".dim-info-btn");
    if (!btn) return;
    const label = btn.getAttribute("data-dim");
    const info = DIMENSION_INFO[label];
    if (!info) return;
    dimInfoTitle.textContent = label;
    dimInfoBody.innerHTML = info.split("\n\n").map((p) => `<p style="margin:0 0 12px;">${p}</p>`).join("");
    dimInfoModal.style.display = "flex";
  });
  dimInfoClose && dimInfoClose.addEventListener("click", () => { dimInfoModal.style.display = "none"; });
  dimInfoModal && dimInfoModal.addEventListener("click", (e) => {
    if (e.target === dimInfoModal) dimInfoModal.style.display = "none";
  });

  // ── Roadmap modal ──
  const roadmapModal = document.getElementById("roadmap-modal");
  const roadmapToggleBtn = document.getElementById("roadmap-toggle-btn");
  const roadmapClose = document.getElementById("roadmap-close");

  roadmapToggleBtn && roadmapToggleBtn.addEventListener("click", () => { roadmapModal.style.display = "flex"; });
  roadmapClose && roadmapClose.addEventListener("click", () => { roadmapModal.style.display = "none"; });
  roadmapModal && roadmapModal.addEventListener("click", (e) => {
    if (e.target === roadmapModal) roadmapModal.style.display = "none";
  });

  // ── Edit Profile modal ──
  const editProfileModal = document.getElementById("edit-profile-modal");
  const editProfileBtn = document.getElementById("edit-profile-btn");
  const editProfileClose = document.getElementById("edit-profile-modal-close");
  const editProfileCancel = document.getElementById("edit-profile-cancel-btn");
  const editProfileSave = document.getElementById("edit-profile-save-btn");
  const avatarFileInput = document.getElementById("avatar-file-input");
  const editAvatar = document.getElementById("edit-profile-avatar");

  function renderEpSkills() {
    const state = window.INITIAL_STATE || {};
    const skills = state.skills || [];
    const container = document.getElementById("ep-skills-list");
    if (!container) return;
    container.innerHTML = skills.map(s => `
      <span style="display:inline-flex;align-items:center;gap:5px;background:var(--surface-3);border:1px solid var(--border);border-radius:var(--r-pill);padding:4px 10px;font-size:12px;font-weight:500;">
        ${escapeHtml(s.label)}
        <button data-skill-id="${s.id}" class="ep-remove-skill" style="background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:14px;line-height:1;padding:0;" title="Remove">&times;</button>
      </span>`).join("") || `<span style="color:var(--text-faint);font-size:12px;">No skills yet.</span>`;
  }

  function openEditProfile() {
    const profile = (window.INITIAL_STATE || {}).profile || {};
    document.getElementById("ep-full-name").value = profile.full_name || "";
    document.getElementById("ep-headline").value = profile.headline || "";
    document.getElementById("ep-email").value = profile.email || "";
    document.getElementById("ep-phone").value = profile.phone || "";
    document.getElementById("ep-location").value = profile.location || "";
    setAvatarEl(editAvatar, profile);
    renderEpSkills();
    editProfileModal.style.display = "flex";
  }

  // Skill add inside Edit Profile
  document.getElementById("ep-add-skill-btn") && document.getElementById("ep-add-skill-btn").addEventListener("click", async () => {
    const inp = document.getElementById("ep-new-skill");
    const label = inp ? inp.value.trim() : "";
    if (!label) return;
    inp.value = "";
    showLoading("Adding skill…");
    try {
      const res = await fetch("/api/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label }) });
      const data = await res.json();
      if (data.ok) { render(data.state); renderEpSkills(); }
    } finally { hideLoading(); }
  });
  document.getElementById("ep-new-skill") && document.getElementById("ep-new-skill").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("ep-add-skill-btn").click();
  });

  // Skill remove inside Edit Profile
  document.getElementById("ep-skills-list") && document.getElementById("ep-skills-list").addEventListener("click", async (e) => {
    const btn = e.target.closest(".ep-remove-skill");
    if (!btn) return;
    const skillId = btn.getAttribute("data-skill-id");
    showLoading("Removing skill…");
    try {
      const res = await fetch(`/api/skills/${skillId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) { render(data.state); renderEpSkills(); }
    } finally { hideLoading(); }
  });
  function closeEditProfile() { editProfileModal.style.display = "none"; }

  editProfileBtn && editProfileBtn.addEventListener("click", openEditProfile);
  editProfileClose && editProfileClose.addEventListener("click", closeEditProfile);
  editProfileCancel && editProfileCancel.addEventListener("click", closeEditProfile);
  editProfileModal && editProfileModal.addEventListener("click", (e) => {
    if (e.target === editProfileModal) closeEditProfile();
  });

  editAvatar && editAvatar.addEventListener("click", () => avatarFileInput && avatarFileInput.click());

  avatarFileInput && avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (editAvatar) editAvatar.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    };
    reader.readAsDataURL(file);
    const form = new FormData();
    form.append("photo", file);
    try {
      const res = await fetch("/api/profile/photo", { method: "POST", body: form });
      const data = await res.json();
      if (data.ok && data.state) {
        render(data.state);
        setAvatarEl(editAvatar, data.state.profile);
      }
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
    avatarFileInput.value = "";
  });

  editProfileSave && editProfileSave.addEventListener("click", async () => {
    const payload = {
      full_name: document.getElementById("ep-full-name").value.trim(),
      headline:  document.getElementById("ep-headline").value.trim(),
      email:     document.getElementById("ep-email").value.trim(),
      phone:     document.getElementById("ep-phone").value.trim(),
      location:  document.getElementById("ep-location").value.trim(),
    };
    showLoading("Saving profile…");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok && data.state) {
        render(data.state);
        closeEditProfile();
      } else {
        alert(data.error || "Could not save profile.");
      }
    } finally {
      hideLoading();
    }
  });

  // ── ESC closes any open modal ──
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [dimInfoModal, roadmapModal, editProfileModal,
       document.getElementById("ownership-modal")].forEach((m) => {
        if (m) m.style.display = "none";
      });
    }
  });

  // ── Sidebar / mobile tab navigation ──
  function animateCardsIn(panel) {
    const cards = panel.querySelectorAll(".card");
    cards.forEach((card, i) => {
      card.classList.remove("card-enter");
      void card.offsetWidth; // force reflow so animation restarts
      card.style.animationDelay = `${i * 140}ms, 0ms`;
      card.classList.add("card-enter");
    });
  }

  const VALID_VIEWS = ["profile", "messages", "insights", "applications", "support"];

  function switchView(viewName) {
    if (!VALID_VIEWS.includes(viewName)) viewName = "profile";
    document.querySelectorAll(".view-panel").forEach((panel) => {
      const isActive = panel.getAttribute("data-view-panel") === viewName;
      panel.style.display = isActive ? "flex" : "none";
      if (isActive) animateCardsIn(panel);
    });
    document.querySelectorAll(".nav-item[data-view], .tab-item[data-view]").forEach((el) => {
      el.classList.toggle("active", el.getAttribute("data-view") === viewName);
    });
    if (viewName === "messages") { initAIGreeting(); loadAllConversations().then(() => renderHistoryList()); }
    localStorage.setItem("emp_active_view", viewName);
  }
  document.querySelectorAll(".nav-item[data-view], .tab-item[data-view]").forEach((el) => {
    el.addEventListener("click", () => switchView(el.getAttribute("data-view")));
  });

  // Restore last active view on page load
  const savedView = localStorage.getItem("emp_active_view") || "profile";
  switchView(savedView);

  // ── Applications add ──
  const addApplicationBtn = document.getElementById("add-application-btn");
  if (addApplicationBtn) {
    addApplicationBtn.addEventListener("click", async () => {
      const jobTitle = document.getElementById("app-job-title").value.trim();
      const company = document.getElementById("app-company").value.trim();
      if (!jobTitle || !company) {
        alert("Please enter both a job title and a company.");
        return;
      }
      showLoading("Adding application…");
      try {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_title: jobTitle, company }),
        });
        const data = await res.json();
        if (data.ok) {
          render(data.state);
          document.getElementById("app-job-title").value = "";
          document.getElementById("app-company").value = "";
        } else {
          alert(data.error || "Could not add application.");
        }
      } finally {
        hideLoading();
      }
    });
  }

  // =====================================================================
  // EMPLOYABLE AI VIEW
  // =====================================================================

  const aiWelcome = document.getElementById("ai-welcome");
  const aiChatView = document.getElementById("ai-chat-view");
  const chatLog = document.getElementById("chat-log");

  let chatHistory = [];
  let allConversations = []; // loaded from server
  let activeConvId = null;

  async function loadAllConversations() {
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (data.ok) allConversations = data.conversations;
    } catch (e) { /* offline */ }
  }

  function renderHistoryList() {
    const list = document.getElementById("ai-history-list");
    if (!list) return;
    if (!allConversations.length) {
      list.innerHTML = `<div class="ai-history-empty">No conversations yet.<br>Start chatting to see history here.</div>`;
      return;
    }
    list.innerHTML = allConversations.map(c => `
      <div class="ai-history-item${c.id === activeConvId ? " active" : ""}" data-conv-id="${c.id}">
        ${escapeHtml(c.title || "Untitled")}
      </div>
    `).join("");
    list.querySelectorAll(".ai-history-item").forEach(el => {
      el.addEventListener("click", () => loadConversation(Number(el.dataset.convId)));
    });
  }

  async function loadConversation(id) {
    try {
      const res = await fetch(`/api/chat/conversations/${id}`);
      const data = await res.json();
      if (!data.ok) return;
      activeConvId = id;
      chatHistory = data.messages.map(m => ({ role: m.role, text: m.text, attachment_ids: m.attachment_ids || [] }));
      if (chatLog) {
        chatLog.innerHTML = "";
        chatHistory.forEach(m => appendChatBubble(m.text, m.role === "user" ? "user" : "bot", true));
      }
      const conv = allConversations.find(c => c.id === id);
      const titleEl = document.getElementById("ai-chat-title");
      if (titleEl) titleEl.textContent = (conv && conv.title) || "Conversation";
      showChatView();
      renderHistoryList();
    } catch (e) { console.error("Load conversation failed", e); }
  }

  function startNewConversation() {
    activeConvId = null;
    chatHistory = [];
    if (chatLog) chatLog.innerHTML = "";
    if (aiChatView) aiChatView.style.display = "none";
    if (aiWelcome) aiWelcome.style.display = "flex";
    initAIGreeting();
    renderHistoryList();
  }

  async function saveCurrentConversation() {
    if (!chatHistory.length) return;
    const title = chatHistory.find(m => m.role === "user")?.text?.replace(/\[Attached:[^\]]+\]/g, "").trim().slice(0, 60) || "Conversation";
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConvId,
          title,
          messages: chatHistory.map(m => ({ role: m.role, text: m.text, attachment_ids: m.attachment_ids || [] })),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        activeConvId = data.conversation_id;
        await loadAllConversations();
        renderHistoryList();
      }
    } catch (e) { console.error("Save conversation failed", e); }
  }

  function initAIGreeting() {
    const state = window.INITIAL_STATE || {};
    const profile = state.profile || {};
    const first = ((profile.full_name || "").split(/\s+/)[0] || "");
    const firstName = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : "";
    const greetEl = document.getElementById("ai-greeting");
    if (!greetEl) return;

    const fullText = getRandomGreeting(firstName);
    greetEl.textContent = "";

    // Cancel any in-progress typing
    if (greetEl._typingTimer) clearTimeout(greetEl._typingTimer);
    let i = 0;
    function type() {
      if (i <= fullText.length) {
        greetEl.textContent = fullText.slice(0, i);
        i++;
        greetEl._typingTimer = setTimeout(type, 28);
      }
    }
    type();
  }

  // ── Markdown renderer ──
  function renderMarkdown(raw) {
    // Escape HTML entities first to prevent XSS
    let safe = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const lines = safe.split("\n");
    let html = "";
    let listType = null; // "ol" | "ul" | null

    function closeList() {
      if (listType === "ol") html += "</ol>";
      if (listType === "ul") html += "</ul>";
      listType = null;
    }

    function inline(t) {
      // Bold
      t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      t = t.replace(/__(.+?)__/g, "<strong>$1</strong>");
      // Italic (only when not part of a bold marker)
      t = t.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
      t = t.replace(/_([^_]+?)_/g, "<em>$1</em>");
      // Inline code
      t = t.replace(/`([^`]+?)`/g, "<code>$1</code>");
      return t;
    }

    for (const line of lines) {
      // Headings
      const h1 = /^#\s+(.+)$/.exec(line);
      const h2 = /^##\s+(.+)$/.exec(line);
      const h3 = /^###\s+(.+)$/.exec(line);
      if (h3) { closeList(); html += `<div class="md-h3">${inline(h3[1])}</div>`; continue; }
      if (h2) { closeList(); html += `<div class="md-h2">${inline(h2[1])}</div>`; continue; }
      if (h1) { closeList(); html += `<div class="md-h1">${inline(h1[1])}</div>`; continue; }

      // Numbered list
      const ol = /^\d+\.\s+(.+)$/.exec(line);
      if (ol) {
        if (listType !== "ol") { closeList(); html += `<ol class="md-ol">`; listType = "ol"; }
        html += `<li>${inline(ol[1])}</li>`;
        continue;
      }

      // Bullet list
      const ul = /^[-*]\s+(.+)$/.exec(line);
      if (ul) {
        if (listType !== "ul") { closeList(); html += `<ul class="md-ul">`; listType = "ul"; }
        html += `<li>${inline(ul[1])}</li>`;
        continue;
      }

      // Empty line
      if (line.trim() === "") { closeList(); html += `<div class="md-spacer"></div>`; continue; }

      // Regular paragraph
      closeList();
      html += `<div class="md-p">${inline(line)}</div>`;
    }
    closeList();
    return html;
  }

  function appendChatBubble(text, who, instant = false) {
    if (!chatLog) return;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble " + who;
    if (who === "bot") {
      bubble.innerHTML = renderMarkdown(text);
      if (!instant) {
        const blocks = Array.from(bubble.children);
        if (blocks.length === 0) {
          // Plain text fallback — animate the bubble itself
          bubble.classList.add("md-anim");
        } else {
          blocks.forEach((el, i) => {
            el.classList.add("md-anim");
            el.style.animationDelay = `${i * 55}ms`;
          });
        }
      }
    } else {
      bubble.textContent = text;
    }
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
    return bubble;
  }

  function showChatView() {
    if (aiWelcome) aiWelcome.style.display = "none";
    if (aiChatView) aiChatView.style.display = "flex";
  }

  function appendTypingIndicator() {
    if (!chatLog) return null;
    const el = document.createElement("div");
    el.className = "chat-bubble bot typing-indicator";
    el.innerHTML = "<span></span><span></span><span></span>";
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    return el;
  }

  async function handleSendMessage(text) {
    if (!text.trim()) return;
    showChatView();

    const fullText = text.trim();

    appendChatBubble(fullText, "user");
    chatHistory.push({ role: "user", text: fullText });

    const typingEl = appendTypingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory }),
      });
      const data = await res.json();
      if (typingEl) typingEl.remove();
      const reply = data.ok ? data.reply : "Sorry, something went wrong. Try again in a moment.";
      appendChatBubble(reply, "bot");
      chatHistory.push({ role: "bot", text: reply });
      await saveCurrentConversation();
    } catch (err) {
      if (typingEl) typingEl.remove();
      appendChatBubble("Connection error — please check your network and try again.", "bot");
    }
  }

  // Welcome screen inputs
  const chatInput = document.getElementById("chat-input");
  const chatSendBtn = document.getElementById("chat-send-btn");
  if (chatSendBtn) {
    chatSendBtn.addEventListener("click", () => {
      handleSendMessage(chatInput.value.trim());
      chatInput.value = "";
    });
  }
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleSendMessage(chatInput.value.trim());
        chatInput.value = "";
      }
    });
  }

  // Chat view inputs
  const chatInputBottom = document.getElementById("chat-input-bottom");
  const chatSendBtnBottom = document.getElementById("chat-send-btn-bottom");
  if (chatSendBtnBottom) {
    chatSendBtnBottom.addEventListener("click", () => {
      handleSendMessage(chatInputBottom.value.trim());
      chatInputBottom.value = "";
    });
  }
  if (chatInputBottom) {
    chatInputBottom.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleSendMessage(chatInputBottom.value.trim());
        chatInputBottom.value = "";
      }
    });
  }

  // New chat buttons
  const aiNewChatSideBtn = document.getElementById("ai-new-chat-side-btn");
  if (aiNewChatSideBtn) aiNewChatSideBtn.addEventListener("click", startNewConversation);

  const aiHistorySidebar   = document.getElementById("ai-history-sidebar");
  const aiCollapseBtn      = document.getElementById("ai-history-collapse-btn");
  const aiExpandBtn        = document.getElementById("ai-history-expand-btn");
  if (aiCollapseBtn) aiCollapseBtn.addEventListener("click", () => {
    aiHistorySidebar.classList.add("collapsed");
    aiExpandBtn.style.display = "flex";
  });
  if (aiExpandBtn) aiExpandBtn.addEventListener("click", () => {
    aiHistorySidebar.classList.remove("collapsed");
    aiExpandBtn.style.display = "none";
  });

  // Initialize history on load (async fetch from server)
  loadAllConversations().then(() => renderHistoryList());

  // Quick action buttons
  document.querySelectorAll(".ai-quick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-quick");
      if (action === "roadmap") {
        switchView("profile");
        setTimeout(() => roadmapModal && (roadmapModal.style.display = "flex"), 100);
      } else if (action === "whatsthis") {
        handleSendMessage("What is Employable AI, what can it do for me, and how can I use it to improve my employability and knowledge of the job market?");
      }
    });
  });


  // Initialize AI greeting on page load if messages view is visible
  initAIGreeting();

  // ── Sidebar hamburger toggle ──
  const sidebarEl = document.getElementById("sidebar");
  const appShell  = document.querySelector(".app-shell");
  const brandToggle = document.getElementById("sidebar-brand-toggle");
  if (brandToggle && sidebarEl) {
    brandToggle.addEventListener("click", () => {
      const opening = !sidebarEl.classList.contains("expanded");
      sidebarEl.classList.toggle("expanded", opening);
      appShell && appShell.classList.toggle("sidebar-open", opening);
    });
  }

  // ── Roadmap item detail modal ──
  const ridModal = document.getElementById("roadmap-item-detail-modal");
  const ridClose = document.getElementById("rid-close");
  const ridTitle = document.getElementById("rid-title");
  const ridBody  = document.getElementById("rid-body");

  if (ridClose && ridModal) {
    ridClose.addEventListener("click", () => { ridModal.style.display = "none"; });
    ridModal.addEventListener("click", (e) => {
      if (e.target === ridModal) ridModal.style.display = "none";
    });
  }

  document.addEventListener("click", (e) => {
    const card = e.target.closest(".roadmap-item-card, .inline-roadmap-item");
    if (!card || !ridModal) return;
    const what  = card.dataset.what  || "";
    const why   = card.dataset.why   || "";
    const how   = card.dataset.how   || "";
    const gain  = card.dataset.gain  || "";
    const dim   = card.dataset.dim   || "";
    const label = card.dataset.label || card.querySelector(".ri-title, .inline-roadmap-title")?.textContent?.trim() || "Action";

    const dimInfo = dim && DIMENSION_INFO[dim] ? DIMENSION_INFO[dim] : "";

    // Build numbered action steps from the "how" text
    const howSteps = how.split(/[.!]/).map(s => s.trim()).filter(s => s.length > 8);
    const howHtml = howSteps.length > 1
      ? `<ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;">${howSteps.map(s => `<li>${s}.</li>`).join("")}</ol>`
      : `<p class="rid-section-body">${how}</p>`;

    // Check if already completed
    const completedItems = window._roadmapCompletions || [];
    const alreadyDone = completedItems.includes(label);

    ridTitle.textContent = label;
    ridBody.innerHTML = `
      ${dim ? `<div style="margin-bottom:6px;"><span class="dim-badge">${escapeHtml(dim)}</span></div>` : ""}

      ${why ? `
      <div class="rid-section">
        <div class="rid-section-head">Why this matters</div>
        <p class="rid-section-body">${why} Understanding this helps you prioritise the effort correctly — employers and ATS systems weight this area when screening candidates.</p>
      </div>` : ""}

      ${how ? `
      <div class="rid-section">
        <div class="rid-section-head">How to do it</div>
        ${howHtml}
      </div>` : ""}

      ${dimInfo ? `
      <div class="rid-section" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r-md);padding:14px 16px;">
        <div class="rid-section-head">About this dimension</div>
        <p class="rid-section-body" style="font-size:12.5px;">${dimInfo.split("\n\n")[0]}</p>
      </div>` : ""}

      ${gain ? `
      <div class="rid-section rid-gain">
        <div class="rid-section-head">Projected score impact</div>
        <p class="rid-section-body">${gain} — this estimate reflects the realistic uplift if this action is fully completed and verified by supporting documents.</p>
      </div>` : ""}

      <div class="rid-section" style="border-top:1px solid var(--border);padding-top:16px;margin-top:4px;">
        ${alreadyDone
          ? `<div class="rid-completed-badge">✓ Completed</div>`
          : `<button class="rid-complete-btn" data-label="${escapeHtml(label)}" data-description="${escapeHtml(why + ' ' + how)}">
               Complete this with a document
             </button>`
        }
      </div>
    `;
    ridModal.style.display = "flex";
  });

  // Roadmap "Complete this" — show doc picker
  document.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("rid-complete-btn")) return;
    const btn = e.target;
    const itemLabel = btn.dataset.label;
    const itemDesc = btn.dataset.description;

    // Build doc picker modal
    const docs = window._lastDocs || [];
    if (!docs.length) {
      showRoadmapResult(false, "No documents uploaded yet. Upload a document first.", 0);
      return;
    }

    const existing = document.getElementById("rid-doc-picker-modal");
    if (existing) existing.remove();

    const picker = document.createElement("div");
    picker.id = "rid-doc-picker-modal";
    picker.className = "modal-overlay";
    picker.style.cssText = "display:flex;z-index:2000;";
    picker.innerHTML = `
      <div class="modal-card" style="max-width:420px;">
        <div class="modal-head">
          <h3 style="font-size:15px;">Choose supporting document</h3>
          <button class="modal-close" id="rdp-close">×</button>
        </div>
        <p style="font-size:13px;color:var(--text-faint);margin:0 0 14px;">Select a document that proves you completed this objective.</p>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${docs.map(d => `
            <button class="rdp-doc-btn" data-doc-id="${d.id}" data-label="${escapeHtml(itemLabel)}" data-desc="${escapeHtml(itemDesc)}"
              style="text-align:left;padding:10px 14px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--surface-2);color:var(--text);cursor:pointer;font-size:13px;">
              ${escapeHtml(d.filename)}
            </button>`).join("")}
        </div>
      </div>`;
    document.body.appendChild(picker);

    document.getElementById("rdp-close").addEventListener("click", () => picker.remove());
    picker.addEventListener("click", (ev) => { if (ev.target === picker) picker.remove(); });
  });

  // Doc selected — call API
  document.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("rdp-doc-btn")) return;
    const btn = e.target;
    const docId = btn.dataset.docId;
    const itemLabel = btn.dataset.label;
    const itemDesc = btn.dataset.desc;
    const picker = document.getElementById("rid-doc-picker-modal");

    btn.textContent = "Evaluating…";
    btn.disabled = true;

    try {
      const res = await fetch("/api/roadmap/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_label: itemLabel, item_description: itemDesc, doc_id: parseInt(docId) }),
      });
      const data = await res.json();
      if (picker) picker.remove();
      document.getElementById("roadmap-item-detail-modal").style.display = "none";

      if (data.fulfilled && data.points > 0) {
        if (!window._roadmapCompletions) window._roadmapCompletions = [];
        window._roadmapCompletions.push(itemLabel);
        showRoadmapReward(data.points, itemLabel);
      } else {
        showRoadmapResult(data.reason || "This document doesn't clearly fulfill this objective yet.", data.steps || [], itemLabel);
      }
    } catch (err) {
      btn.textContent = "Error — try again";
      btn.disabled = false;
    }
  });

  function showRoadmapReward(points, label) {
    // Overlay animation
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.6);z-index:3000;backdrop-filter:blur(4px);`;
    overlay.innerHTML = `
      <div class="roadmap-reward-card">
        <div class="roadmap-reward-icon">🏆</div>
        <div class="roadmap-reward-pts">+${points.toFixed(1)} pts</div>
        <div class="roadmap-reward-label">Objective Completed!</div>
        <div class="roadmap-reward-sub">"${label}"</div>
        <button class="roadmap-reward-close">Awesome!</button>
      </div>`;
    document.body.appendChild(overlay);

    // Floating score particles
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const p = document.createElement("div");
        p.className = "score-particle";
        p.textContent = `+${points.toFixed(1)}`;
        p.style.left = (30 + Math.random() * 40) + "%";
        p.style.top = (20 + Math.random() * 40) + "%";
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
      }, i * 80);
    }

    overlay.querySelector(".roadmap-reward-close").addEventListener("click", () => {
      overlay.remove();
      // Trigger re-analysis to update score
      fetch("/api/rerun-analysis", { method: "POST" })
        .then(r => r.json())
        .then(d => { if (d.state) updateDashboard(d.state); })
        .catch(() => {});
    });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function showRoadmapResult(message, steps, itemLabel) {
    const existing = document.getElementById("roadmap-result-modal");
    if (existing) existing.remove();

    const stepsHtml = steps && steps.length
      ? `<div class="rrm-steps-head">How to complete this objective:</div>
         <ol class="rrm-steps-list">${steps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
      : "";

    const modal = document.createElement("div");
    modal.id = "roadmap-result-modal";
    modal.className = "rrm-overlay";
    modal.innerHTML = `
      <div class="rrm-card">
        <button class="rrm-close" id="rrm-close-btn">×</button>
        <div class="rrm-icon">📋</div>
        <div class="rrm-title">Not quite there yet</div>
        <div class="rrm-label">"${escapeHtml(itemLabel)}"</div>
        <p class="rrm-reason">${escapeHtml(message)}</p>
        ${stepsHtml}
        <button class="rrm-dismiss-btn" id="rrm-dismiss-btn">Got it — I'll improve it</button>
      </div>`;
    document.body.appendChild(modal);

    // Trigger slide-up animation next frame
    requestAnimationFrame(() => modal.classList.add("rrm-visible"));

    const close = () => {
      modal.classList.remove("rrm-visible");
      setTimeout(() => modal.remove(), 380);
    };
    modal.querySelector("#rrm-close-btn").addEventListener("click", close);
    modal.querySelector("#rrm-dismiss-btn").addEventListener("click", close);
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
  }

  // Dashboard entrance animation — animate all cards in the initial active view
  requestAnimationFrame(() => {
    const activePanel = document.querySelector('.view-panel[style*="flex"]');
    if (activePanel) animateCardsIn(activePanel);
  });

  // ══════════════════════════════════════════════
  //  HORIZONTAL PANEL SLIDER (profile view)
  // ══════════════════════════════════════════════
  (function initHSlider() {
    const hOuter  = document.getElementById("h-outer");
    const hTrack  = document.getElementById("h-track");
    const dots    = document.querySelectorAll(".h-dot");
    const hintFwd = document.getElementById("h-hint-fwd");
    const hintBck = document.getElementById("h-hint-back");
    if (!hOuter || !hTrack) return;

    let currentPanel = 0;
    const totalPanels = 2;
    let _scrollLock = false;

    function shortLabel(lbl) {
      return (lbl || "").replace(/ Strength$/,"").replace(/ Competitiveness$/,"").replace(/ Compatibility$/,"").replace(/ Progression$/,"");
    }

    function panelHeight() { return hOuter.offsetHeight; }

    function sizeTrack() {
      const h = panelHeight();
      document.querySelectorAll(".h-panel").forEach(p => { p.style.height = h + "px"; });
    }
    sizeTrack();
    window.addEventListener("resize", () => { sizeTrack(); goToPanel(currentPanel); });

    function goToPanel(idx) {
      idx = Math.max(0, Math.min(totalPanels - 1, idx));
      if (idx === currentPanel) return;
      currentPanel = idx;
      hTrack.style.transform = `translateY(-${idx * panelHeight()}px)`;
      dots.forEach((d, i) => d.classList.toggle("h-dot-active", i === idx));
      if (hintFwd) hintFwd.style.opacity = idx === 0 ? "1" : "0";
      if (hintBck) hintBck.style.opacity = idx > 0  ? "1" : "0";
      if (idx === 1) drawPanel2();
      _scrollLock = true;
      setTimeout(() => { _scrollLock = false; }, 700);
    }

    const isMobile = () => window.innerWidth <= 1100;

    // Scroll down → show Panel 2 below.  Scroll up → return to Panel 1.
    hOuter.addEventListener("wheel", e => {
      if (isMobile()) return; // mobile: panels stack naturally, no JS needed
      const profileView = document.getElementById("view-profile");
      if (!profileView || profileView.style.display === "none") return;
      e.preventDefault();
      if (_scrollLock) return;
      if (e.deltaY > 0) goToPanel(currentPanel + 1);
      else               goToPanel(currentPanel - 1);
    }, { passive: false });

    // Touch swipe (desktop-size only — on mobile panels stack vertically)
    let _touchY = 0;
    hOuter.addEventListener("touchstart", e => {
      _touchY = e.touches[0].clientY;
    }, { passive: true });
    hOuter.addEventListener("touchend", e => {
      if (isMobile()) return;
      if (_scrollLock) return;
      const delta = _touchY - e.changedTouches[0].clientY;
      if (Math.abs(delta) > 48) {
        if (delta > 0) goToPanel(currentPanel + 1);
        else           goToPanel(currentPanel - 1);
      }
    }, { passive: true });

    // Dot click
    dots.forEach(d => d.addEventListener("click", () => goToPanel(+d.dataset.panel)));

    // Keyboard: ArrowDown → next panel (below).  ArrowUp → prev panel (above).
    document.addEventListener("keydown", e => {
      if (isMobile()) return;
      const profileView = document.getElementById("view-profile");
      if (!profileView || profileView.style.display === "none") return;
      if (e.key === "ArrowDown") goToPanel(currentPanel + 1);
      if (e.key === "ArrowUp")   goToPanel(currentPanel - 1);
    });

    // ────────────────────────────────────────────────────────────
    //  PANEL 2 — four quadrant renderer
    // ────────────────────────────────────────────────────────────
    function drawPanel2() {
      const analysis = window._lastAnalysis || {};
      const dims     = analysis.dimensions || [];
      const overall  = parseFloat(analysis.overall_score || 0);
      const insights = analysis.insights || {};
      const roadmap  = analysis.improvement_roadmap || [];

      // Staggered entrance — separate enter from glow so hover isn't blocked by fill-mode
      document.querySelectorAll(".p2-card").forEach((el, i) => {
        el.classList.remove("p2-card-enter", "p2-card-glow");
        void el.offsetWidth;
        el.style.animationDelay = `${i * 150}ms`;
        el.classList.add("p2-card-enter", "p2-card-glow");
        const totalMs = i * 150 + 880;
        setTimeout(() => {
          el.classList.remove("p2-card-enter");
          el.style.animationDelay = "";
        }, totalMs);
      });

      // ── TOP LEFT: Line/bar chart of dimension scores ──────────
      drawLineChart(dims);

      // ── TOP RIGHT: At a glance + what's working ───────────────
      const elOverall = document.getElementById("p2-overall");
      if (elOverall) elOverall.textContent = overall ? overall.toFixed(2) : "—";

      if (dims.length) {
        const sorted = [...dims].sort((a, b) => b.score - a.score);
        const best = sorted[0], weak = sorted[sorted.length - 1];
        const bv = document.getElementById("p2-best-val");
        const bl = document.getElementById("p2-best-label");
        const wv = document.getElementById("p2-weak-val");
        const wl = document.getElementById("p2-weak-label");
        if (bv) bv.textContent = best.score;
        if (bl) bl.textContent = shortLabel(best.label);
        if (wv) wv.textContent = weak.score;
        if (wl) wl.textContent = shortLabel(weak.label);
      }

      // Working well list
      const wwEl = document.getElementById("p2-working-well");
      if (wwEl) {
        const ww = (insights.working_well || []).slice(0, 4);
        if (ww.length) {
          wwEl.innerHTML = ww.map(t => `
            <div class="p2-insight-item">
              <div class="p2-insight-dot p2-insight-dot-green"></div>
              <span>${escapeHtml(t)}</span>
            </div>`).join("");
        } else {
          // Derive from top dims if no explicit insights
          const top = [...dims].sort((a,b) => b.score - a.score).slice(0, 3);
          wwEl.innerHTML = top.length
            ? top.map(d => `<div class="p2-insight-item"><div class="p2-insight-dot p2-insight-dot-green"></div><span><strong>${shortLabel(d.label)}</strong> is one of your strongest areas at ${d.score}/10.</span></div>`).join("")
            : `<div style="color:var(--text-faint);font-size:12px;">Upload documents to see insights.</div>`;
        }
      }

      // ── BOTTOM LEFT: Strengths — top dims + top skills ────────
      const strEl = document.getElementById("p2-strengths");
      if (strEl) {
        const top3 = [...dims].sort((a,b) => b.score - a.score).slice(0, 4);
        const skills = (window.INITIAL_STATE && window.INITIAL_STATE.skills || []).slice(0, 8);
        const dimHTML = top3.map(d => `
          <div class="p2-strength-row">
            <span>${escapeHtml(shortLabel(d.label))}</span>
            <span class="p2-strength-score">${d.score} / 10</span>
          </div>`).join("");
        const skillsHTML = skills.length ? `
          <div style="font-size:11px;color:var(--text-faint);text-transform:uppercase;letter-spacing:.04em;margin-top:10px;margin-bottom:6px;">Top Skills</div>
          <div class="p2-skills-wrap">${skills.map(s => `<span class="p2-skill-chip">${escapeHtml(s.label || s)}</span>`).join("")}</div>` : "";
        strEl.innerHTML = dimHTML + skillsHTML;
      }

      // ── BOTTOM RIGHT: Progress + roadmap snapshot ─────────────
      const progEl = document.getElementById("p2-progress");
      if (progEl) {
        const completions = (window._roadmapCompletions || []).length;
        const totalItems  = roadmap.length;
        const pct = totalItems ? Math.round((completions / totalItems) * 100) : 0;
        const pointsLeft = roadmap.reduce((s, r) => s + (parseFloat(r.projected_score_gain) || 0), 0);
        const potential = analysis.potential || "—";

        // Find next easiest action (lowest gain = quickest win)
        const next = roadmap.filter(r => !(window._roadmapCompletions||[]).includes(r.what||r.action||""))
                             .sort((a,b) => (a.projected_score_gain||0) - (b.projected_score_gain||0))[0];

        progEl.innerHTML = `
          <div class="p2-progress-stat">
            <span>Roadmap completed</span>
            <span class="p2-progress-val">${completions} / ${totalItems} <span style="font-weight:400;color:var(--text-faint);font-size:11px;">(${pct}%)</span></span>
          </div>
          <div class="p2-progress-stat">
            <span>Potential score gain</span>
            <span class="p2-progress-val">+${pointsLeft.toFixed(1)} pts</span>
          </div>
          <div class="p2-progress-stat">
            <span>Rating potential</span>
            <span class="p2-progress-val">${escapeHtml(String(potential))}</span>
          </div>
          ${next ? `<div class="p2-progress-stat" style="flex-direction:column;align-items:flex-start;gap:3px;">
            <span style="color:var(--text-faint);font-size:11px;text-transform:uppercase;letter-spacing:.04em;">Next quick win</span>
            <span style="font-size:12.5px;">${escapeHtml(next.what || next.action || "")}</span>
          </div>` : ""}`;
      }
    }

    // ── Line chart: dimension scores as smooth SVG path ──────────
    function drawLineChart(dims) {
      const svg = document.getElementById("p2-line-svg");
      if (!svg) return;
      const wrap = svg.parentElement;
      if (!wrap) return;

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const W = wrap.offsetWidth  || 300;
      const H = wrap.offsetHeight || 160;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

      const ns = "http://www.w3.org/2000/svg";
      const PAD_L = 28, PAD_R = 12, PAD_T = 12, PAD_B = 28;
      const cW = W - PAD_L - PAD_R;
      const cH = H - PAD_T - PAD_B;

      if (!dims.length) {
        const t = document.createElementNS(ns, "text");
        t.setAttribute("x", W/2); t.setAttribute("y", H/2);
        t.setAttribute("text-anchor","middle"); t.setAttribute("fill","rgba(150,150,150,.5)");
        t.setAttribute("font-size","12"); t.setAttribute("font-family","Arial,sans-serif");
        t.textContent = "Upload documents to see scores";
        svg.appendChild(t); return;
      }

      const N = dims.length;
      const xOf = i => PAD_L + (i / (N - 1)) * cW;
      const yOf = v => PAD_T + cH - (v / 10) * cH;

      // Horizontal gridlines at 2, 4, 6, 8, 10
      [2,4,6,8,10].forEach(v => {
        const y = yOf(v);
        const gl = document.createElementNS(ns, "line");
        gl.setAttribute("x1", PAD_L); gl.setAttribute("x2", PAD_L + cW);
        gl.setAttribute("y1", y);     gl.setAttribute("y2", y);
        gl.setAttribute("stroke", "rgba(150,150,150,.12)"); gl.setAttribute("stroke-width","1");
        svg.appendChild(gl);
        const tl = document.createElementNS(ns, "text");
        tl.setAttribute("x", PAD_L - 4); tl.setAttribute("y", y + 1);
        tl.setAttribute("text-anchor","end"); tl.setAttribute("dominant-baseline","middle");
        tl.setAttribute("font-size","8"); tl.setAttribute("fill","rgba(150,150,150,.6)");
        tl.setAttribute("font-family","Arial,sans-serif"); tl.textContent = v;
        svg.appendChild(tl);
      });

      // Build smooth bezier path (Catmull-Rom → bezier conversion)
      const pts = dims.map((d, i) => ({ x: xOf(i), y: yOf(d.score || 0) }));
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const cp1x = pts[i].x + (pts[i+1].x - pts[i].x) * 0.4;
        const cp2x = pts[i+1].x - (pts[i+1].x - pts[i].x) * 0.4;
        d += ` C ${cp1x} ${pts[i].y} ${cp2x} ${pts[i+1].y} ${pts[i+1].x} ${pts[i+1].y}`;
      }

      // Gradient fill under the line
      const gradId = "p2LineGrad";
      const defs = document.createElementNS(ns, "defs");
      const grad = document.createElementNS(ns, "linearGradient");
      grad.setAttribute("id", gradId); grad.setAttribute("x1","0"); grad.setAttribute("x2","0"); grad.setAttribute("y1","0"); grad.setAttribute("y2","1");
      const s1 = document.createElementNS(ns, "stop"); s1.setAttribute("offset","0%"); s1.setAttribute("stop-color","rgba(99,102,241,.35)");
      const s2 = document.createElementNS(ns, "stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","rgba(99,102,241,0)");
      grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

      const fillPath = document.createElementNS(ns, "path");
      fillPath.setAttribute("d", d + ` L ${pts[pts.length-1].x} ${PAD_T+cH} L ${pts[0].x} ${PAD_T+cH} Z`);
      fillPath.setAttribute("fill", `url(#${gradId})`); fillPath.setAttribute("stroke","none");
      svg.appendChild(fillPath);

      const linePath = document.createElementNS(ns, "path");
      linePath.setAttribute("d", d);
      linePath.setAttribute("fill","none"); linePath.setAttribute("stroke","#6366f1");
      linePath.setAttribute("stroke-width","2.5"); linePath.setAttribute("stroke-linejoin","round");
      svg.appendChild(linePath);

      // Dots + score labels + x-axis labels
      pts.forEach((p, i) => {
        const score = dims[i].score || 0;
        const c = document.createElementNS(ns, "circle");
        c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
        c.setAttribute("r","4"); c.setAttribute("fill","#6366f1"); c.setAttribute("stroke","var(--surface,#1a1a2e)"); c.setAttribute("stroke-width","1.5");
        svg.appendChild(c);

        const sl = document.createElementNS(ns, "text");
        sl.setAttribute("x", p.x); sl.setAttribute("y", p.y - 8);
        sl.setAttribute("text-anchor","middle"); sl.setAttribute("fill","rgba(99,102,241,1)");
        sl.setAttribute("font-size","9"); sl.setAttribute("font-weight","bold"); sl.setAttribute("font-family","Arial,sans-serif");
        sl.textContent = score;
        svg.appendChild(sl);

        const xl = document.createElementNS(ns, "text");
        xl.setAttribute("x", p.x); xl.setAttribute("y", H - 4);
        xl.setAttribute("text-anchor","middle"); xl.setAttribute("fill","rgba(150,150,150,.7)");
        xl.setAttribute("font-size","8"); xl.setAttribute("font-family","Arial,sans-serif");
        xl.textContent = shortLabel(dims[i].label).split(" ")[0];
        svg.appendChild(xl);
      });
    }

    // Expose for render() to call when analysis updates
    window._refreshPanel2 = () => { if (currentPanel === 1) drawPanel2(); };

    // ── P2 card expand (FLIP: grows from card's exact position) ──────
    const expandOverlay = document.getElementById("p2-expand-overlay");
    const expandCard    = document.getElementById("p2-expand-card");
    const expandInner   = expandCard.querySelector(".p2-expand-inner");
    const expandHeader  = document.getElementById("p2-expand-header");
    const expandBody    = document.getElementById("p2-expand-body");
    let   _openCardId   = null;
    let   _closing      = false;

    function scoreColor(s) {
      if (s >= 7) return "#22c55e";
      if (s >= 5) return "#f59e0b";
      return "#f43f5e";
    }

    function countUp(el, target, duration, decimals) {
      const start = performance.now();
      (function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = (target * ease).toFixed(decimals);
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    }

    function buildExpandChart(dims) {
      const svg  = document.getElementById("p2-ex-svg");
      const wrap = svg && svg.parentElement;
      if (!svg || !wrap) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const W = wrap.offsetWidth || 600, H = wrap.offsetHeight || 220;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const ns = "http://www.w3.org/2000/svg";
      const PAD_L=40, PAD_R=20, PAD_T=20, PAD_B=36;
      const cW = W-PAD_L-PAD_R, cH = H-PAD_T-PAD_B;
      const N  = dims.length;
      const xOf = i => PAD_L + (i/(N-1))*cW;
      const yOf = v => PAD_T + cH - (v/10)*cH;

      // Animated grid lines — fade in staggered
      [2,4,6,8,10].forEach((v, gi) => {
        const y = yOf(v);
        const gl = document.createElementNS(ns,"line");
        gl.setAttribute("x1",PAD_L); gl.setAttribute("x2",PAD_L+cW);
        gl.setAttribute("y1",y);     gl.setAttribute("y2",y);
        gl.setAttribute("stroke","rgba(99,102,241,.1)"); gl.setAttribute("stroke-width","1");
        gl.style.opacity = "0";
        gl.style.transition = `opacity .3s ease ${gi*80}ms`;
        svg.appendChild(gl);
        setTimeout(() => gl.style.opacity="1", 50);

        const tl = document.createElementNS(ns,"text");
        tl.setAttribute("x",PAD_L-5); tl.setAttribute("y",y+1);
        tl.setAttribute("text-anchor","end"); tl.setAttribute("dominant-baseline","middle");
        tl.setAttribute("font-size","10"); tl.setAttribute("fill","rgba(99,102,241,.5)");
        tl.setAttribute("font-family","Arial,sans-serif"); tl.textContent = v;
        svg.appendChild(tl);
      });

      const pts = dims.map((d,i) => ({x:xOf(i), y:yOf(d.score||0)}));

      // Build bezier path
      let pathD = `M ${pts[0].x} ${pts[0].y}`;
      for (let i=0;i<pts.length-1;i++) {
        const cp1x = pts[i].x + (pts[i+1].x-pts[i].x)*.4;
        const cp2x = pts[i+1].x - (pts[i+1].x-pts[i].x)*.4;
        pathD += ` C ${cp1x} ${pts[i].y} ${cp2x} ${pts[i+1].y} ${pts[i+1].x} ${pts[i+1].y}`;
      }

      // Defs: gradient + glow filter
      const defs = document.createElementNS(ns,"defs");
      const grad = document.createElementNS(ns,"linearGradient");
      grad.setAttribute("id","p2ExGrad"); grad.setAttribute("x1","0"); grad.setAttribute("x2","0"); grad.setAttribute("y1","0"); grad.setAttribute("y2","1");
      const s1 = document.createElementNS(ns,"stop"); s1.setAttribute("offset","0%");   s1.setAttribute("stop-color","rgba(99,102,241,.4)");
      const s2 = document.createElementNS(ns,"stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","rgba(99,102,241,0)");
      grad.appendChild(s1); grad.appendChild(s2);

      const filter = document.createElementNS(ns,"filter");
      filter.setAttribute("id","lineGlow"); filter.setAttribute("x","-20%"); filter.setAttribute("y","-20%"); filter.setAttribute("width","140%"); filter.setAttribute("height","140%");
      const fe = document.createElementNS(ns,"feGaussianBlur");
      fe.setAttribute("in","SourceGraphic"); fe.setAttribute("stdDeviation","3"); fe.setAttribute("result","blur");
      const feMerge = document.createElementNS(ns,"feMerge");
      const n1 = document.createElementNS(ns,"feMergeNode"); n1.setAttribute("in","blur");
      const n2 = document.createElementNS(ns,"feMergeNode"); n2.setAttribute("in","SourceGraphic");
      feMerge.appendChild(n1); feMerge.appendChild(n2);
      filter.appendChild(fe); filter.appendChild(feMerge);
      defs.appendChild(grad); defs.appendChild(filter);
      svg.appendChild(defs);

      // Fill area (no draw animation — immediate)
      const fillPath = document.createElementNS(ns,"path");
      fillPath.setAttribute("d", pathD + ` L ${pts[pts.length-1].x} ${PAD_T+cH} L ${pts[0].x} ${PAD_T+cH} Z`);
      fillPath.setAttribute("fill","url(#p2ExGrad)"); fillPath.setAttribute("stroke","none");
      fillPath.style.opacity="0"; fillPath.style.transition="opacity .6s ease .8s";
      svg.appendChild(fillPath);
      setTimeout(() => fillPath.style.opacity="1", 50);

      // Line — draw with dashoffset
      const linePath = document.createElementNS(ns,"path");
      linePath.setAttribute("d", pathD);
      linePath.setAttribute("fill","none"); linePath.setAttribute("stroke","#6366f1");
      linePath.setAttribute("stroke-width","2.8"); linePath.setAttribute("stroke-linejoin","round");
      linePath.setAttribute("filter","url(#lineGlow)");
      svg.appendChild(linePath);
      const len = linePath.getTotalLength();
      linePath.style.strokeDasharray = len;
      linePath.style.strokeDashoffset = len;
      linePath.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1) 0.2s";
      setTimeout(() => linePath.style.strokeDashoffset = "0", 50);

      // Dots — appear staggered after line draws
      pts.forEach((p, i) => {
        const score = dims[i].score || 0;
        const delay = 800 + i * 80;

        // Pulse ring
        const ring = document.createElementNS(ns,"circle");
        ring.setAttribute("cx",p.x); ring.setAttribute("cy",p.y); ring.setAttribute("r","0");
        ring.setAttribute("fill","none"); ring.setAttribute("stroke","rgba(99,102,241,.3)"); ring.setAttribute("stroke-width","1");
        ring.style.transition = `r .5s ease ${delay}ms, opacity .5s ease ${delay}ms`;
        svg.appendChild(ring);
        setTimeout(() => { ring.setAttribute("r","12"); ring.style.opacity="0"; }, delay);

        const c = document.createElementNS(ns,"circle");
        c.setAttribute("cx",p.x); c.setAttribute("cy",p.y); c.setAttribute("r","0");
        c.setAttribute("fill","#6366f1"); c.setAttribute("stroke","var(--surface,#fff)"); c.setAttribute("stroke-width","2");
        c.style.transition = `r .35s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`;
        svg.appendChild(c);
        setTimeout(() => c.setAttribute("r","5"), delay);

        // Score label — count up
        const sl = document.createElementNS(ns,"text");
        sl.setAttribute("x",p.x); sl.setAttribute("y",p.y-11);
        sl.setAttribute("text-anchor","middle"); sl.setAttribute("fill","rgba(99,102,241,1)");
        sl.setAttribute("font-size","10"); sl.setAttribute("font-weight","bold"); sl.setAttribute("font-family","Arial,sans-serif");
        sl.textContent="0"; sl.style.opacity="0";
        sl.style.transition=`opacity .3s ease ${delay}ms`;
        svg.appendChild(sl);
        setTimeout(() => {
          sl.style.opacity="1";
          let cur=0; const tgt=score; const steps=20;
          const iv=setInterval(()=>{ cur=Math.min(cur+tgt/steps,tgt); sl.textContent=cur.toFixed(cur%1===0?0:1); if(cur>=tgt)clearInterval(iv); },30);
        }, delay);

        // X-axis label
        const xl = document.createElementNS(ns,"text");
        xl.setAttribute("x",p.x); xl.setAttribute("y",H-5);
        xl.setAttribute("text-anchor","middle"); xl.setAttribute("fill","rgba(150,150,150,.7)");
        xl.setAttribute("font-size","9"); xl.setAttribute("font-family","Arial,sans-serif");
        xl.textContent = shortLabel(dims[i].label).split(" ")[0];
        svg.appendChild(xl);
      });
    }

    function buildExpandContent(cardId) {
      const analysis    = window._lastAnalysis || {};
      const dims        = analysis.dimensions || [];
      const insights    = analysis.insights || {};
      const roadmap     = analysis.improvement_roadmap || [];
      const completions = window._roadmapCompletions || [];

      if (cardId === "p2-card-tl") {
        expandHeader.textContent = "Dimension Scores";
        const sorted = [...dims].sort((a,b) => b.score - a.score);
        const rows = sorted.map((d,i) => `
          <div class="p2-ex-dim-row p2-row-anim" style="animation-delay:${i*55+600}ms">
            <span class="p2-ex-dim-label">${escapeHtml(d.label)}</span>
            <div class="p2-ex-bar-track"><div class="p2-ex-bar-fill" data-w="${d.score*10}" style="transition-delay:${i*55+700}ms"></div></div>
            <span class="p2-ex-dim-score" style="color:${scoreColor(d.score)}">${d.score}/10</span>
          </div>`).join("");
        expandBody.innerHTML = `
          <div class="p2-ex-split" style="flex-direction:column">
            <div class="p2-ex-chart-wrap" style="flex:1;min-height:0">
              <svg id="p2-ex-svg" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;"></svg>
            </div>
            <div class="p2-ex-section" style="margin-top:12px">All Dimensions Ranked</div>
            <div style="display:flex;flex-direction:column;gap:6px;overflow-y:auto">${rows}</div>
          </div>`;

      } else if (cardId === "p2-card-tr") {
        expandHeader.textContent = "Profile at a Glance";
        const overall = parseFloat(analysis.overall_score||0);
        const sorted  = [...dims].sort((a,b)=>b.score-a.score);
        const best    = sorted[0], weak = sorted[sorted.length-1];
        const ww = insights.working_well || [];
        const ci = insights.critical_issues || insights.areas_for_improvement || [];
        const me = insights.missing_evidence || [];
        const insightList = (arr, cls) => arr.length
          ? arr.map((t,i)=>`<div class="p2-ex-insight-item p2-row-anim" style="animation-delay:${i*60+500}ms"><div class="p2-ex-dot ${cls}"></div><span>${escapeHtml(t)}</span></div>`).join("")
          : `<span style="color:var(--text-faint);font-size:13px;">—</span>`;
        expandBody.innerHTML = `
          <div class="p2-ex-stat-grid" style="margin-bottom:8px">
            <div class="p2-ex-stat-box p2-row-anim" style="animation-delay:200ms">
              <div class="p2-ex-stat-val" id="ex-overall-val">0.0</div>
              <div class="p2-ex-stat-lbl">Overall Score</div>
            </div>
            <div class="p2-ex-stat-box p2-row-anim" style="animation-delay:300ms">
              <div class="p2-ex-stat-val" style="color:${scoreColor(best&&best.score||0)}">${best?best.score:0}/10</div>
              <div class="p2-ex-stat-lbl">Top: ${escapeHtml(best?shortLabel(best.label):"—")}</div>
            </div>
            <div class="p2-ex-stat-box p2-row-anim" style="animation-delay:400ms">
              <div class="p2-ex-stat-val" style="color:${scoreColor(weak&&weak.score||0)}">${weak?weak.score:0}/10</div>
              <div class="p2-ex-stat-lbl">Weakest: ${escapeHtml(weak?shortLabel(weak.label):"—")}</div>
            </div>
            <div class="p2-ex-stat-box p2-row-anim" style="animation-delay:500ms">
              <div class="p2-ex-stat-val">${dims.length}</div>
              <div class="p2-ex-stat-lbl">Dimensions</div>
            </div>
          </div>
          <div class="p2-ex-split">
            <div class="p2-ex-left">
              <div class="p2-ex-section">What's Working</div>${insightList(ww,"p2-ex-dot-green")}
            </div>
            <div class="p2-ex-left">
              <div class="p2-ex-section">Areas to Improve</div>${insightList(ci,"p2-ex-dot-red")}
              <div class="p2-ex-section" style="margin-top:10px">Missing Evidence</div>${insightList(me,"p2-ex-dot-amber")}
            </div>
          </div>`;
        setTimeout(() => {
          const el = document.getElementById("ex-overall-val");
          if (el && overall) countUp(el, overall, 900, 2);
        }, 300);

      } else if (cardId === "p2-card-bl") {
        expandHeader.textContent = "Your Strengths";
        const sorted = [...dims].sort((a,b)=>b.score-a.score);
        const skills  = (window.INITIAL_STATE && window.INITIAL_STATE.skills || []);
        const dimRows = sorted.map((d,i)=>`
          <div class="p2-ex-strength-row p2-row-anim" style="animation-delay:${i*55+350}ms">
            <span>${escapeHtml(d.label)}</span>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="p2-ex-bar-track" style="width:80px"><div class="p2-ex-bar-fill" data-w="${d.score*10}" style="transition-delay:${i*55+450}ms"></div></div>
              <span class="p2-ex-strength-score" style="color:${scoreColor(d.score)}">${d.score}/10</span>
            </div>
          </div>`).join("");
        const chips = skills.map((s,i)=>`<span class="p2-ex-skill-chip p2-row-anim" style="animation-delay:${i*30+700}ms">${escapeHtml(s.label||s)}</span>`).join("");
        expandBody.innerHTML = `
          <div class="p2-ex-section">All Dimensions</div>
          <div style="overflow-y:auto;flex:1">${dimRows||"<span style='color:var(--text-faint);font-size:13px'>No data yet.</span>"}</div>
          ${chips?`<div class="p2-ex-section">All Skills</div><div class="p2-ex-skills-wrap">${chips}</div>`:""}`;

      } else if (cardId === "p2-card-br") {
        expandHeader.textContent = "Progress & Next Steps";
        const done  = completions.length, total = roadmap.length;
        const pct   = total ? Math.round(done/total*100) : 0;
        const items = roadmap.map((r,i)=>{
          const label = r.what||r.action||"";
          const isDone = completions.includes(label);
          const gain  = r.projected_score_gain ? `+${r.projected_score_gain} pts` : "";
          return `<div class="p2-ex-roadmap-item p2-row-anim" style="animation-delay:${i*55+450}ms">
            <div class="p2-ex-roadmap-check${isDone?" done":""}">
              ${isDone?`<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`:""}
            </div>
            <span style="${isDone?"text-decoration:line-through;color:var(--text-faint);":""}">${escapeHtml(label)}</span>
            ${gain?`<span class="p2-ex-roadmap-gain">${gain}</span>`:""}
          </div>`;
        }).join("");
        expandBody.innerHTML = `
          <div class="p2-ex-stat-grid p2-row-anim" style="animation-delay:150ms;margin-bottom:10px">
            <div class="p2-ex-stat-box"><div class="p2-ex-stat-val" id="ex-done-val">0</div><div class="p2-ex-stat-lbl">Completed</div></div>
            <div class="p2-ex-stat-box"><div class="p2-ex-stat-val">${total}</div><div class="p2-ex-stat-lbl">Total Items</div></div>
            <div class="p2-ex-stat-box"><div class="p2-ex-stat-val" id="ex-pct-val">0%</div><div class="p2-ex-stat-lbl">Progress</div></div>
            <div class="p2-ex-stat-box"><div class="p2-ex-stat-val" style="font-size:14px">${escapeHtml(String(analysis.potential||"—"))}</div><div class="p2-ex-stat-lbl">Rating Potential</div></div>
          </div>
          <div class="p2-ex-section">Roadmap Items</div>
          <div style="overflow-y:auto;flex:1">${items||"<span style='color:var(--text-faint);font-size:13px'>Upload documents to generate your roadmap.</span>"}</div>`;
        setTimeout(() => {
          const de = document.getElementById("ex-done-val"), pe = document.getElementById("ex-pct-val");
          if (de) countUp(de, done, 700, 0);
          if (pe) {
            let c=0; const iv=setInterval(()=>{ c=Math.min(c+1,pct); pe.textContent=c+"%"; if(c>=pct)clearInterval(iv); },700/Math.max(pct,1));
          }
        }, 300);
      }
    }

    function openP2Card(cardId) {
      if (_closing) return;
      _openCardId = cardId;
      const srcCard = document.getElementById(cardId);
      const r = srcCard.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      const mobile480 = vw <= 480;
      const mobile    = vw <= 1100;
      const tw = mobile480 ? vw      : mobile ? vw * 0.96 : vw * 0.75;
      const th = mobile480 ? vh      : mobile ? vh * 0.88 : vh * 0.75;
      const tl = mobile480 ? 0       : (vw - tw) / 2;
      const tt = mobile480 ? 0       : (vh - th) / 2;

      // Snap card to source position instantly
      expandCard.style.transition = "none";
      expandCard.style.left   = r.left   + "px";
      expandCard.style.top    = r.top    + "px";
      expandCard.style.width  = r.width  + "px";
      expandCard.style.height = r.height + "px";
      expandCard.style.borderRadius = "14px";

      expandBody.innerHTML = "";
      expandHeader.textContent = "";
      expandOverlay.classList.add("p2-expand-visible");

      // Next frame: animate to 75% center
      requestAnimationFrame(() => requestAnimationFrame(() => {
        expandCard.style.transition =
          "left .52s cubic-bezier(0.4,0,0.2,1)," +
          "top .52s cubic-bezier(0.4,0,0.2,1)," +
          "width .52s cubic-bezier(0.4,0,0.2,1)," +
          "height .52s cubic-bezier(0.4,0,0.2,1)," +
          "border-radius .52s cubic-bezier(0.4,0,0.2,1)";
        expandCard.style.left   = tl + "px";
        expandCard.style.top    = tt + "px";
        expandCard.style.width  = tw + "px";
        expandCard.style.height = th + "px";
        expandCard.style.borderRadius = "20px";
      }));

      // Inject content once card is mostly grown
      setTimeout(() => {
        buildExpandContent(cardId);

        // Trigger bar animations
        requestAnimationFrame(() => {
          expandCard.querySelectorAll(".p2-ex-bar-fill[data-w]").forEach(el => {
            el.style.width = el.dataset.w + "%";
          });
          // If chart card, build chart
          if (cardId === "p2-card-tl") {
            requestAnimationFrame(() => buildExpandChart(dims_snapshot));
          }
        });

        // Scan line
        const scan = document.createElement("div");
        scan.className = "p2-scan-line";
        expandCard.appendChild(scan);
        setTimeout(() => scan.remove(), 1800);
      }, 360);

      // Store dims for chart (captured at open time)
      const analysis = window._lastAnalysis || {};
      var dims_snapshot = analysis.dimensions || [];
    }

    function closeP2Expand() {
      if (!_openCardId) return;
      _closing = true;
      const srcCard = document.getElementById(_openCardId);
      if (srcCard) {
        const r = srcCard.getBoundingClientRect();
        expandCard.style.transition =
          "left .38s cubic-bezier(0.4,0,0.2,1)," +
          "top .38s cubic-bezier(0.4,0,0.2,1)," +
          "width .38s cubic-bezier(0.4,0,0.2,1)," +
          "height .38s cubic-bezier(0.4,0,0.2,1)," +
          "border-radius .38s cubic-bezier(0.4,0,0.2,1)";
        expandCard.style.left   = r.left   + "px";
        expandCard.style.top    = r.top    + "px";
        expandCard.style.width  = r.width  + "px";
        expandCard.style.height = r.height + "px";
        expandCard.style.borderRadius = "14px";
      }
      expandOverlay.classList.remove("p2-expand-visible");
      setTimeout(() => {
        expandBody.innerHTML = "";
        _openCardId = null;
        _closing = false;
      }, 420);
    }

    document.getElementById("p2-expand-close").addEventListener("click", closeP2Expand);
    expandOverlay.addEventListener("click", e => { if (e.target === expandOverlay) closeP2Expand(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeP2Expand(); });

    ["p2-card-tl","p2-card-tr","p2-card-bl","p2-card-br"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("click", () => openP2Card(id));
    });
  })();
});
