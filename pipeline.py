"""
pipeline.py
-----------
Glue between an uploaded file, the extraction/analysis logic that was
already written (extract.py, analyzer.py, rubric.py), and per-user
storage in the database (db.py).

This is the one new piece of "business logic" the web app needed that
didn't exist in any form before — the desktop app called extract.py
and analyzer.py directly from Tkinter button-click handlers. Here, the
same two functions get called from a Flask route instead, with the
results saved under the logged-in user's id rather than just shown in
a window.
"""

import dataclasses
import json
import os

import extract
import analyzer
import identity
import db
from rubric import score_skill_set, weighted_overall, label_for_score, stars_for_score, get_skill_market_value, mechanical_ats_check

# On Vercel the local filesystem is ephemeral — use /tmp so uploads can
# at least be processed within the same request. Content is stored in the
# database so re-analysis works without the original file being present.
if os.environ.get("VERCEL"):
    UPLOAD_ROOT = "/tmp/employable_uploads"
else:
    UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")


def user_upload_dir(user_id: int) -> str:
    """
    Every user gets their own subfolder under uploads/<user_id>/ so
    files from different accounts are never mixed on disk, mirroring
    how the database rows are scoped by user_id.
    """
    path = os.path.join(UPLOAD_ROOT, str(user_id))
    os.makedirs(path, exist_ok=True)
    return path


def save_uploaded_file(user_id: int, file_storage) -> dict:
    """
    Saves one Werkzeug FileStorage (from a Flask request.files entry)
    to this user's folder and records it in the documents table.
    Returns the new document row as a dict.
    """
    filename = _safe_filename(file_storage.filename)
    dest_dir = user_upload_dir(user_id)
    dest_path = os.path.join(dest_dir, filename)

    # Avoid silently overwriting a same-named file from an earlier
    # upload — append a numeric suffix instead, e.g. cv(1).pdf.
    base, ext = os.path.splitext(dest_path)
    counter = 1
    while os.path.exists(dest_path):
        dest_path = f"{base}({counter}){ext}"
        counter += 1

    file_storage.save(dest_path)
    file_type = os.path.splitext(filename)[1].lower().lstrip(".")

    # Extract text immediately and store in DB so re-analysis never needs the file on disk.
    content = ""
    try:
        content = extract.extract_text(dest_path) or ""
    except Exception:
        pass

    doc_id = db.add_document(user_id, filename, dest_path, file_type, content)
    return {
        "id": doc_id,
        "filename": filename,
        "stored_path": dest_path,
        "file_type": file_type,
        "content": content,
    }


def _safe_filename(filename: str) -> str:
    """
    Strips directory separators and other path-traversal characters so
    an uploaded filename like '../../etc/passwd' can never escape the
    per-user upload folder. This is a minimal allowlist-style clean,
    not a full normalization library, but it's enough to guarantee the
    saved path always stays inside dest_dir.
    """
    filename = os.path.basename(filename or "upload")
    safe = "".join(c for c in filename if c.isalnum() or c in "._- ")
    return safe or "upload"


def guess_identities_for_documents(document_records: list[dict]) -> list[dict]:
    """
    For each document row (must have stored_path/filename/id), extract
    its text and guess whose document it is. Returns a list of
    {"document_id", "filename", "guessed_name"} ready for
    identity.cluster_identities().
    """
    results = []
    for doc in document_records:
        stored = (doc.get("content") or "").strip()
        if stored:
            text = stored
        elif doc.get("stored_path") and os.path.exists(doc["stored_path"]):
            text = extract.extract_text(doc["stored_path"]) or ""
        else:
            text = ""
        guessed = identity.detect_document_identity(doc["filename"], text)
        results.append({"document_id": doc["id"], "filename": doc["filename"], "guessed_name": guessed})
    return results


def check_identity_conflict(user_id: int) -> dict:
    """
    Looks at every document currently on file for this user (used
    during onboarding, before anything is confirmed) and reports
    whether they plausibly belong to more than one person.

    Returns:
        {"conflict": False, "name": "Keanu Reeves"}                  -- single person, or no documents
        {"conflict": True, "clusters": [{"name": ..., "documents": [...]}]} -- needs a user decision
    """
    documents = db.get_documents_for_user(user_id)
    if not documents:
        return {"conflict": False, "name": ""}

    guesses = guess_identities_for_documents(documents)
    clusters = identity.cluster_identities(guesses)

    # A single cluster (or a single cluster plus nothing else) means
    # everything plausibly belongs to one person — no decision needed.
    # An "Unknown" cluster on its own (every file unguessable) is also
    # not a conflict; we just can't name the owner yet.
    named_clusters = [c for c in clusters if c["name"] != "Unknown"]
    if len(named_clusters) <= 1:
        name = named_clusters[0]["name"] if named_clusters else ""
        return {"conflict": False, "name": name}

    doc_by_id = {d["id"]: d for d in documents}
    return {
        "conflict": True,
        "clusters": [
            {
                "name": c["name"],
                "documents": [
                    {"id": did, "filename": doc_by_id[did]["filename"]}
                    for did in c["document_ids"]
                    if did in doc_by_id
                ],
            }
            for c in clusters
        ],
    }


def resolve_identity_conflict(user_id: int, keep_document_ids: list[int]) -> None:
    """
    Called once the user has picked which person they are during
    onboarding. Deletes every document NOT in keep_document_ids, so
    only one person's files remain on this account.
    """
    documents = db.get_documents_for_user(user_id)
    keep_set = set(keep_document_ids)
    for doc in documents:
        if doc["id"] not in keep_set:
            db.delete_document(user_id, doc["id"])


def matches_confirmed_owner(user_id: int, filename: str, text: str) -> bool:
    """
    Used for uploads made AFTER onboarding is complete: checks a new
    document against the name already confirmed for this account. If
    we can't form a confident guess at all, we don't block the
    upload — the safeguard is for clear mismatches, not every file
    with an unreadable header.
    """
    user = db.get_user_by_id(user_id)
    confirmed_name = (user or {}).get("confirmed_owner_name") or ""
    if not confirmed_name:
        return True
    guessed = identity.detect_document_identity(filename, text)
    if not guessed:
        return True
    return identity.names_are_same_person(confirmed_name, guessed)



def run_analysis_for_user(user_id: int, extra_context: str = "") -> dict:
    """
    Re-extracts text from every document this user has uploaded,
    sends it to the Employability Rating Engine (analyzer.py,
    unchanged from the desktop app), stores the result, syncs the
    AI-detected skills into the skills table, and returns the result
    as a plain dict ready to be sent to the frontend as JSON.

    Raises analyzer.CVAnalyzerError on any failure (missing API key,
    no readable text, bad API response) — the Flask route is
    responsible for turning that into a user-facing error message.
    """
    documents = db.get_documents_for_user(user_id)
    if not documents:
        raise analyzer.CVAnalyzerError("Please upload at least one document first.")

    # Prefer stored content from the database (works on Vercel where the
    # upload directory is ephemeral). Fall back to re-extracting from disk
    # if content is empty and the file still exists locally.
    chunks = []
    for doc in documents:
        stored_content = (doc.get("content") or "").strip()
        if stored_content:
            chunks.append(f"=== FILE: {doc['filename']} ===\n{stored_content}")
        elif doc.get("stored_path") and os.path.exists(doc["stored_path"]):
            text = extract.extract_text(doc["stored_path"]) or "[No text extracted]"
            chunks.append(f"=== FILE: {doc['filename']} ===\n{text}")
        else:
            chunks.append(f"=== FILE: {doc['filename']} ===\n[File content unavailable]")
    combined_text = "\n\n".join(chunks) if chunks else ""

    analysis: analyzer.CVAnalysis = analyzer.analyze_documents(combined_text, extra_context)

    result_dict = dataclasses.asdict(analysis)
    db.save_analysis(user_id, json.dumps(result_dict))

    # Sync AI-detected skills into the skills table without touching
    # any skill the user typed in manually (see db.replace_ai_skills).
    db.replace_ai_skills(user_id, analysis.skills)

    # If this is the user's first analysis, seed their profile fields
    # (name/headline/email/location) from what the AI found — but
    # never overwrite fields the user has already filled in
    # themselves on a later run.
    existing_user = db.get_user_by_id(user_id)
    profile_updates = {}
    if not existing_user.get("full_name") and analysis.full_name and analysis.full_name != "Job Seeker":
        profile_updates["full_name"] = analysis.full_name
    if not existing_user.get("headline") and analysis.headline and analysis.headline != "Aspiring Professional":
        profile_updates["headline"] = analysis.headline
    if not existing_user.get("email") and analysis.email:
        profile_updates["email"] = analysis.email
    if not existing_user.get("location") and analysis.location:
        profile_updates["location"] = analysis.location
    if profile_updates:
        db.update_profile_fields(user_id, **profile_updates)

    # Save score snapshot to history
    try:
        dim_scores = {d["label"]: d["score"] for d in result_dict.get("dimensions", []) if "label" in d}
        if dim_scores:
            db.save_score_history(user_id, result_dict.get("overall_rating", 0), dim_scores)
    except Exception:
        pass  # history saving must never break the main flow

    return result_dict


def _apply_dynamic_skill_strength(analysis_data: dict, skill_rows: list) -> dict:
    """
    Replaces the AI-assigned Skill Strength score with the Python-computed
    deterministic value from rubric.score_skill_set(), then recomputes the
    overall score, star rating, and rating label to match.

    This guarantees:
      - Empty skill list → Skill Strength = exactly 0.0
      - High-demand skills (Python, AWS) move the score far more than
        commodity skills (Typing, Filing)
      - Adding then removing the same skill perfectly reverses the change
      - Score is deterministic: same skills → same number every time
      - Skill add/remove instantly reflects without re-running AI analysis

    The AI's Skill Strength score (from the ensemble runs) is discarded for
    display purposes but kept intact in the raw stored JSON — this function
    works on a copy so the stored analysis is never mutated.
    """
    import copy
    data = copy.deepcopy(analysis_data)

    skill_labels = [s["label"] for s in skill_rows]
    python_skill_score = score_skill_set(skill_labels)

    dimensions = data.get("dimensions") or []
    for dim in dimensions:
        if dim.get("label") == "Skill Strength":
            dim["score"] = python_skill_score
            raw_power = sum(get_skill_market_value(l) for l in skill_labels)
            dim["explanation"] = (
                f"Computed deterministically from {len(skill_labels)} skill(s) "
                f"using market-demand weighting. "
                f"Raw power = {raw_power:.2f}. "
                f"Score = 10 × (1 − exp(−raw_power / 7.0)) = {python_skill_score}."
            ) if skill_labels else (
                "No skills listed. Skill Strength is exactly 0.0 — "
                "add skills to your profile to increase this score."
            )
            break

    dim_scores = {d["label"]: d["score"] for d in dimensions if "label" in d and "score" in d}
    if dim_scores:
        new_overall = weighted_overall(dim_scores)
        data["overall_rating"] = new_overall
        data["star_rating"] = stars_for_score(new_overall)
        data["rating_label"] = label_for_score(new_overall)

    return data


def _apply_mechanical_ats(analysis_data: dict, skill_labels: list, extracted_text: str = "") -> dict:
    """
    Overrides the AI's ATS Compatibility score with a mechanically computed value
    based on actual parsing of the extracted text. Blends 70% mechanical + 30% AI
    so the AI's context knowledge still has some influence but the objective check dominates.
    """
    import copy
    data = copy.deepcopy(analysis_data)
    result = mechanical_ats_check(extracted_text, skill_labels)
    mechanical_score = result["score"]
    findings = result["findings"]

    dimensions = data.get("dimensions") or []
    for dim in dimensions:
        if dim.get("label") == "ATS Compatibility":
            ai_score = float(dim.get("score", 5.0))
            blended = round(0.70 * mechanical_score + 0.30 * ai_score, 1)
            dim["score"] = blended
            dim["ats_findings"] = findings
            break

    dim_scores = {d["label"]: d["score"] for d in dimensions if "label" in d and "score" in d}
    if dim_scores:
        new_overall = weighted_overall(dim_scores)
        data["overall_rating"] = new_overall
        data["star_rating"] = stars_for_score(new_overall)
        data["rating_label"] = label_for_score(new_overall)

    return data


def get_dashboard_state(user_id: int) -> dict:
    """
    Assembles everything the dashboard page needs in one call: profile
    fields, skills (manual + AI, in display order), the most recent
    analysis (if any), and job application count. This is what gets
    serialized to JSON for the frontend to render, and what gets
    re-sent after any change (new upload, skill add/delete, re-run)
    so the Cubic-Metric bars can update live without a full page
    reload.
    """
    user = db.get_user_by_id(user_id)
    skills = db.get_skills_for_user(user_id)
    latest = db.get_latest_analysis(user_id)
    applications = db.get_applications_for_user(user_id)
    documents = db.get_documents_for_user(user_id)

    analysis_data = json.loads(latest["result_json"]) if latest else None

    if analysis_data is not None:
        analysis_data = _apply_dynamic_skill_strength(analysis_data, skills)

    if analysis_data is not None and documents:
        try:
            chunks = []
            for doc in documents:
                sc = (doc.get("content") or "").strip()
                if sc:
                    chunks.append(sc)
                elif doc.get("stored_path") and os.path.exists(doc["stored_path"]):
                    chunks.append(extract.extract_text(doc["stored_path"]) or "")
            combined_text = "\n\n".join(chunks)
            skill_labels = [s["label"] for s in skills]
            analysis_data = _apply_mechanical_ats(analysis_data, skill_labels, combined_text)
        except Exception:
            pass  # ATS override must never break the main flow

    avatar_path = user.get("avatar_path") or ""
    avatar_url = f"/static/{avatar_path}" if avatar_path else ""

    return {
        "profile": {
            "full_name": user.get("full_name") or "",
            "headline": user.get("headline") or "",
            "email": user.get("email") or "",
            "location": user.get("location") or "",
            "phone": user.get("phone") or "",
            "username": user.get("username"),
            "avatar_url": avatar_url,
            "target_field": user.get("target_field") or "",
        },
        "skills": [{"id": s["id"], "label": s["label"], "source": s["source"]} for s in skills],
        "documents": [
            {"id": d["id"], "filename": d["filename"], "file_type": d["file_type"]} for d in documents
        ],
        "analysis": analysis_data,
        "applications_count": len(applications),
        "applications": [
            {
                "id": a["id"],
                "job_title": a["job_title"],
                "company": a["company"],
                "status": a["status"],
            }
            for a in applications
        ],
        "score_history": db.get_score_history(user_id, limit=20),
    }
