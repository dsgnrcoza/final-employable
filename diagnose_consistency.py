"""
diagnose_consistency.py
------------------------
Run this in the SAME folder as analyzer.py and rubric.py.

WHAT IT DOES:
Calls analyze_documents() N times on the exact same in-memory text
string — not re-uploading a file, not re-running OCR/extraction, the
literal same Python variable every time. This isolates one thing only:
does the OpenAI call itself produce wildly different scores on
identical input?

ALSO TRACKS confidence_score specifically (separately from the 7
dimensions): a single CV-only test run was observed landing exactly on
40, the bottom edge of the prompt's stated 40-60 CV-only band. That's
not evidence of a bug on its own — one run picking the floor could be
coincidence — but it's worth knowing whether confidence_score reliably
sits at the floor of its band across repeated identical-input runs, or
whether it actually varies within the band like the spec intends. If it
clusters at 40 every time, that's a real prompt-anchoring bias worth
fixing the same way Documentation Strength was; if it spreads across
40-60, the original observation was just one sample and nothing needs
to change.

WHY THIS MATTERS:
If scores stay tight here (small variance) but you see big swings in
the real app, the problem is NOT the model — it's that your app is
feeding the model different text on different runs (different OCR
pass, file read order, truncation, encoding issue, etc). That's a
completely different bug to fix than "the AI is inconsistent."

If scores swing wildly even here, with identical text every time, the
problem IS the model/prompt, and the fix is on the analyzer.py /
rubric.py side (seed parameter, model swap, prompt tightening).

HOW TO USE (no editing required):
    python diagnose_consistency.py "path\\to\\your\\CV.pdf"

This extracts the same way app.py does (via extract.py) and runs the
identical-input consistency check on it directly — no copy-pasting text
in by hand. You can also still paste text manually into SAMPLE_TEXT
below and run with no arguments, if you'd rather test a specific
text snippet instead of a whole file.
"""

import statistics
import sys

from analyzer import analyze_documents, CVAnalyzerError
from rubric import DIMENSIONS
from cache import clear_cache

RUNS = 5

# ============================================================
# EDIT ME: paste real extracted CV text here, OR load from a file.
# Only used if you run this script with NO command-line arguments.
# ============================================================
SAMPLE_TEXT = """
PASTE A REAL CV'S EXTRACTED TEXT HERE.

This needs to be actual content — the more realistic, the better the
diagnostic. If you have a .txt dump of what your app extracts from a
real uploaded CV, paste that instead of typing a fake one, since the
real extraction pipeline's quirks (weird spacing, broken bullet chars,
etc.) might themselves be part of what's destabilizing the model.
"""

# Alternative: load from a file instead of pasting inline.
# Uncomment these two lines and comment out the SAMPLE_TEXT block above:
#
# with open("sample_cv.txt", "r", encoding="utf-8") as f:
#     SAMPLE_TEXT = f.read()


def _load_text_from_cli_args(paths: list[str]) -> str:
    """
    Runs the SAME extraction app.py uses (extract.extract_all) on real
    file paths passed on the command line, e.g.:
        python diagnose_consistency.py "C:\\Users\\me\\Desktop\\CV.pdf"
        python diagnose_consistency.py "CV.pdf" "RE1_certificate.pdf"
    This guarantees the diagnostic is testing the exact same text the
    real app would send to the model — no risk of a hand-pasted sample
    drifting from what extract.py actually produces on your files.
    """
    from extract import extract_all
    return extract_all(paths)


def main():
    if len(sys.argv) > 1:
        paths = sys.argv[1:]
        print(f"Loading and extracting text from: {paths}")
        sample_text = _load_text_from_cli_args(paths)
        if not sample_text or not sample_text.strip():
            print("ERROR: extraction returned no text from the given file(s).")
            sys.exit(1)
    else:
        if "PASTE A REAL CV" in SAMPLE_TEXT:
            print("ERROR: No file path given, and SAMPLE_TEXT hasn't been edited.")
            print("Either run: python diagnose_consistency.py \"path\\to\\CV.pdf\"")
            print("or edit SAMPLE_TEXT in this file with real CV text.")
            sys.exit(1)
        sample_text = SAMPLE_TEXT

    print(f"Running {RUNS} identical calls against the SAME in-memory text...")
    print(f"Text length: {len(sample_text)} chars")
    print(
        "NOTE: clearing cache/ before every single run below, so each call is "
        "a genuinely fresh API hit, not a cache hit. This wipes ALL cached "
        "results in this folder, including unrelated CVs — that's expected "
        "for this diagnostic, but don't run this on a folder you care about "
        "keeping cached.\n"
    )

    results = []
    for i in range(RUNS):
        removed = clear_cache()
        print(f"--- Run {i+1}/{RUNS} (cleared {removed} cached entr{'y' if removed == 1 else 'ies'}) ---")
        try:
            analysis = analyze_documents(sample_text, extra_context="")
        except CVAnalyzerError as e:
            print(f"  FAILED: {e}")
            continue
        results.append(analysis)
        print(f"  Overall: {analysis.overall_rating}  ({analysis.rating_label})")
        print(f"  Confidence: {analysis.confidence_score}  ({analysis.confidence_label})")

    if len(results) < 2:
        print("\nNot enough successful runs to compare. Fix the errors above first.")
        return

    print("\n" + "=" * 70)
    print("DIMENSION-BY-DIMENSION COMPARISON")
    print("=" * 70)

    dim_labels = [d.label for d in DIMENSIONS]
    header = "Dimension".ljust(28) + "".join(f"Run{i+1}".rjust(8) for i in range(len(results))) + "  StdDev".rjust(9)
    print(header)
    print("-" * len(header))

    for label in dim_labels:
        row_scores = []
        for analysis in results:
            match = next((d.score for d in analysis.dimensions if d.label == label), None)
            row_scores.append(match)

        row = label.ljust(28)
        for s in row_scores:
            row += (f"{s:.2f}".rjust(8) if s is not None else "MISSING".rjust(8))

        valid_scores = [s for s in row_scores if s is not None]
        stdev = statistics.pstdev(valid_scores) if len(valid_scores) > 1 else 0.0
        row += f"{stdev:.2f}".rjust(9)
        print(row)

    print("-" * len(header))
    overalls = [a.overall_rating for a in results]
    overall_row = "OVERALL".ljust(28)
    for o in overalls:
        overall_row += f"{o:.2f}".rjust(8)
    overall_stdev = statistics.pstdev(overalls) if len(overalls) > 1 else 0.0
    overall_row += f"{overall_stdev:.2f}".rjust(9)
    print(overall_row)

    confidences = [a.confidence_score for a in results]
    confidence_row = "CONFIDENCE_SCORE".ljust(28)
    for c in confidences:
        confidence_row += f"{c:.2f}".rjust(8)
    confidence_stdev = statistics.pstdev(confidences) if len(confidences) > 1 else 0.0
    confidence_row += f"{confidence_stdev:.2f}".rjust(9)
    print(confidence_row)

    print("\n" + "=" * 70)
    print("CONFIDENCE_SCORE FLOOR-ANCHORING CHECK")
    print("=" * 70)
    print(f"Values seen: {confidences}")
    if all(c == confidences[0] for c in confidences):
        if confidences[0] in (40, 60, 85):
            print(f"\nVERDICT: Every run landed on exactly {confidences[0]:.0f} — a band")
            print("boundary value, every time, with zero variation. That's a real")
            print("anchoring pattern, not coincidence. Worth the same fix pattern as")
            print("Documentation Strength: tighten the prompt to require a value")
            print("somewhere across the band based on specific evidence found, not")
            print("just the band's edge, and consider a Python-side nudge if the")
            print("prompt fix alone doesn't hold on retest.")
        else:
            print(f"\nVERDICT: Every run landed on {confidences[0]:.0f} exactly, but that's")
            print("not a band boundary, so this isn't floor-anchoring — just a stable,")
            print("consistent score for this input. Not a bug.")
    elif confidence_stdev <= 3:
        print("\nVERDICT: Tight clustering with some spread. Likely fine — the model")
        print("is using the band, not anchoring to one edge of it.")
    else:
        print("\nVERDICT: Wide spread within the confidence band. The model is not")
        print("anchoring to the floor — the original 40 was likely just one sample,")
        print("not a systematic bias. No fix needed here.")

    print("\n" + "=" * 70)
    spread = max(overalls) - min(overalls)
    print(f"Overall score spread across {len(results)} runs: {spread:.2f} points")
    print(f"Overall score std dev: {overall_stdev:.2f}")

    if spread <= 0.5:
        print("\nVERDICT: Tight. This is normal model noise. If your real-world")
        print("results swing more than this, the bug is in your TEXT EXTRACTION")
        print("pipeline, not the model — different runs are feeding it different")
        print("input. Check OCR consistency, file read order, and the 60,000-char")
        print("truncation point in analyzer.py.")
    elif spread <= 1.5:
        print("\nVERDICT: Moderate drift. Worth tightening the prompt and adding")
        print("a seed parameter, but this alone probably isn't your 3.5-vs-8 bug.")
        print("Check your real input text for variability too.")
    else:
        print("\nVERDICT: Wide swings on IDENTICAL input. This confirms the model")
        print("itself is the problem, not your text extraction. The dimensions")
        print("with the highest StdDev above are where the model is guessing")
        print("rather than reading literally — that's where prompt tightening")
        print("needs to happen first.")


if __name__ == "__main__":
    main()
