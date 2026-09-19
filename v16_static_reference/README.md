# AnchorFlow task-based SVG editing study — V16

This directory contains the frozen, participant-facing V16 diagnostic pilot
published at:

https://anchorflow-user-study-20260916.anubisjam.chatgpt.site/

The public Sites source was committed as
`b44954248c0295fc7d51208d4a6bc881b962c089` and deployed as Sites version 14.

## Current protocol

- Four tasks from Clean2400: ordinals 1641, 973, 1407, and 724.
- Four anonymized conditions per task: A=AdaVec, B=AnchorFlow (Ours),
  C=the unedited source SVG (Ground Truth control), and D=LIVE.
- One guided practice covering anchor movement, anchor insertion, and control
  point adjustment; practice is not included in formal records.
- One independent 90-second active timer per task-condition trial, for 16
  formal records per participant.
- A required self-report of SVG editing experience: none, general, or expert.
- German-first and English-second participant-facing text.

This is a mechanism-focused diagnostic set, not a random or representative
benchmark sample. No participant results are included. The current browser
flow exports results through share/download; it does not centrally upload
records, compute final IoU, or export a standalone complete final SVG file.

## Files committed to the research repository

- `ui/index.html`: frozen, self-contained participant page.
- `ui/app.js`, `ui/template.html`, `ui/geometry.js`: editable source.
- `ui/real_tasks.json`: frozen task and method payload used by the page.
- `ui/provenance.json`, `ui/attribution.json`: source and license receipts.
- `ui/build_frozen.py`: portable rebuild from the frozen task payload.
- `ui/build_benchmark.py`: full workspace provenance rebuild and hash checks.
- `ui/prepare_benchmark.cjs`: path normalization used by the full rebuild.
- `ui/geometry.test.cjs`, `ui/check.cjs`: geometry and browser-flow checks.
- `ui/benchmark_originals/`: only the four current tasks and four current
  participant-facing conditions, plus their input images.

Historical drafts, obsolete methods, generated screenshots, `.DS_Store`, and
the nested Sites Git checkout are intentionally excluded from this research
repository commit.

## Rebuild and verify

From `ui/`, rebuild the frozen standalone page without access to external
experiment outputs:

```bash
python3 build_frozen.py
node geometry.test.cjs
```

The browser-flow check uses Playwright and Chrome:

```bash
node check.cjs
```

`build_benchmark.py` is the stronger provenance rebuild. It requires the full
AnchorFlow artifact workspace at the recorded paths and verifies source hashes
before regenerating `real_tasks.json`, `provenance.json`, and `index.html`.
