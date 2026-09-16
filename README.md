# AnchorFlow user-study web handoff [![Netlify Status](https://api.netlify.com/api/v1/badges/a7899cb9-8a7b-489f-8325-73e36abe0af5/deploy-status)](https://app.netlify.com/projects/anchorflowuserstudy/deploys)

## Active Next.js study (`web/`)

The active app uses **4 examples × 3 methods: Ours, AdaVec, LIVE**, for **12 editing attempts** per participant, plus the existing practice. The examples are clean2400 ordinals **1092, 973, 1285, 3**. The fourth task adjusts the crescent's inner curve while preserving its endpoints and outer contour.

- Start locally: `cd web && npm ci && npm run dev`.
- Task data: `web/src/lib/tasks.json`; method slots and denominator: `web/src/app/page.tsx`.
- Fourth-example originals and provenance: `web/study_assets/B0003/`.
- Validate stimuli: `cd web && node scripts/build_tasks.mjs`. This now checks the current data; it does not regenerate the old 6×2 design.
- Build: `cd web && npm run build`.

The existing Next.js editing, timing, randomized method presentation, scoring and results API are retained. Netlify builds `web/` as configured in `netlify.toml`. This branch updates stimuli and their configuration; it does not establish that a participant study has been completed.

## Archived static-page handoff

The sections below describe the earlier static page and the older 6×2 reference protocol; they are retained as historical material, not the active Next.js task configuration.

This bundle is intended for a colleague who will continue improving the web interface and run a small number of pilot sessions.

If an AI coding agent is doing the work, it should read `AGENTS.md` first. `AI_HANDOFF_PROMPT.md` contains a ready-to-paste starting prompt.

## Start here

The current runnable pilot is in `current_pilot_3x4/`.

```bash
cd current_pilot_3x4
python3 -m http.server 8000
```

Open `http://localhost:8000/`. The page is German-first and English-second. It is also a self-contained static page, so `index.html` can be opened directly for quick inspection.

Current public version:

https://anchorflow-user-study-20260916.anubisjam.chatgpt.site

## What is in this bundle

- `current_pilot_3x4/`: current editable source, built page, three clean2400 examples, four real method outputs per example, provenance, attribution, and automated checks.
- `formal_6x2_reference/`: the earlier written formal design, six task definitions and assets, participant record template, and the generated Ours/AdaVec outputs for those six tasks.
- `screenshots/`: expected practice and formal-task appearance.
- `PILOT_TEST_CHECKLIST.md`: how to run a few pilot sessions without treating them as formal study evidence.
- `EXPERIMENT_SCOPE.md`: the important distinction between the current page, the planned formal study, and the old paper study.

## Editing workflow

Edit these files in `current_pilot_3x4/`:

- `template.html`: layout and CSS.
- `app.js`: interaction, visible copy, timers, progress, result sharing and export.
- `geometry.js`: SVG path parsing and editing operations. Change cautiously.
- `real_tasks.json`: the three current tasks and the native SVG paths for A–D.

Rebuild the self-contained page after editing:

```bash
python3 rebuild.py
```

`build_benchmark.py` is retained only as provenance for regenerating the task data inside the original AnchorFlow repository. It is not portable outside that repository. Use `rebuild.py` for ordinary interface work.

## Automated checks

With Node.js and Python 3 installed:

```bash
npm install
npm test
```

The UI check first uses Playwright's bundled Chromium and falls back to an installed Google Chrome. If neither is available, run `npx playwright install chromium` once.

The checks cover the three-step practice flow, all 12 native paths, local target guides, reversible completion, progress, and JSON result export. They do not replace short participant pilots.

## Important integrity rules

- The current page is a **3-task × 4-method convenience pilot**, not a random or representative formal experiment.
- The earlier written formal design is **6 tasks × 2 methods (Ours and AdaVec)**. Do not silently mix its protocol with the current 3×4 page.
- Do not simplify, repair, or equalize native method paths before comparison.
- Keep every completed, abandoned and timed-out attempt in the exported denominator.
- The magenta dashed target is a UI guide and is not part of the edited SVG result.
- Results are not uploaded automatically. The page opens the system share sheet when supported and otherwise downloads a session-tagged JSON file.
- No participant study has been completed or claimed in this bundle.

## Result files

Each exported JSON contains:

- one anonymous `study_session_id`;
- 12 records for 3 tasks × 4 options;
- initial and edited paths;
- timing, completion state and operation history;
- sample IDs, source hashes and native anchor counts.

Keep the raw files unchanged. If participant identity is needed, maintain a separate consented mapping from the anonymous session ID; do not add names or emails to the study JSON.
