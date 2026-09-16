# Instructions for AI coding agents

This handoff contains two deliberately separate study surfaces. Preserve that separation.

## Read first, in this order

1. `README.md`
2. `EXPERIMENT_SCOPE.md`
3. `PILOT_TEST_CHECKLIST.md`
4. `HANDOFF_RECEIPT.json`
5. `current_pilot_3x4/provenance.json`

Read `formal_6x2_reference/实验设计.md` only when the task concerns the planned formal experiment rather than the current public pilot.

## Default working target

Unless the human explicitly asks to change the formal design, work only in `current_pilot_3x4/`.

The current public page is a **3-task × 4-option convenience pilot**. It is not random, representative, or formal participant evidence. The earlier written formal plan is **6 tasks × 2 methods (Ours and AdaVec)**. Never silently combine those protocols, denominators or claims.

## Source layout

- `current_pilot_3x4/template.html`: layout, CSS and static visible content.
- `current_pilot_3x4/app.js`: interaction, German-English copy, timer, progress and result export.
- `current_pilot_3x4/geometry.js`: path parsing and editing math. Change only when necessary and preserve geometry tests.
- `current_pilot_3x4/real_tasks.json`: the three tasks and 12 prepared native method paths.
- `current_pilot_3x4/index.html`: generated self-contained page; do not edit it as the only source change.
- `current_pilot_3x4/rebuild.py`: rebuilds `index.html` from the editable sources.
- `current_pilot_3x4/check.cjs`: end-to-end browser check.
- `current_pilot_3x4/geometry.test.cjs`: geometry regression check.
- `current_pilot_3x4/benchmark_originals/`: immutable source copies for the current pilot.

## Required workflow for page changes

1. Inspect the relevant source before editing.
2. Make the smallest versioned change that satisfies the human request.
3. Rebuild:

   ```bash
   cd current_pilot_3x4
   python3 rebuild.py
   ```

4. Test:

   ```bash
   npm install
   npm test
   ```

   If Playwright cannot find a browser, run `npx playwright install chromium` once.

5. Inspect the generated practice and benchmark screenshots before reporting completion.
6. State whether participant-facing behavior, task data, result schema or experiment scope changed.

Do not deploy, upload results, email files, or change the public Site unless the human explicitly asks and gives the necessary destination or authority.

## Visual and interaction constraints

- Participant-visible language order is German first, English second.
- Keep the separate left target panel hidden.
- Show the magenta dashed target locally on every editable method SVG.
- Each example must have one connected local edit target.
- Keep the lower overall and per-option progress bars.
- Practice guidance belongs inside the editable canvas and must identify the actual anchor, curve or control point to manipulate.
- Do not add a redundant label explaining the magenta dashed guide.
- Preserve pause, resume, finish, give-up, reopen, undo and redo behavior.
- Preserve system file sharing with session-tagged JSON download fallback.

## Evidence and data integrity

- Do not simplify, repair, normalize or equalize native method paths.
- Do not overwrite files in `benchmark_originals/` or `formal_6x2_reference/method_outputs/`.
- Preserve sample IDs, source hashes, method identity and original anchor counts.
- Keep completed, abandoned and timed-out attempts in the result denominator.
- Do not claim participant results: none are included in this bundle.
- A UI test passing does not validate the experiment design or task difficulty.
- Small colleague-run sessions are pilots unless a formal protocol has been explicitly frozen and followed.

## Adding or replacing examples

Do not add an example from a screenshot or hand-edited reconstruction alone. Require:

- the same input for every compared method;
- native method SVGs with provenance and hashes;
- an authored target that was not used to tune method output;
- one connected local edit region;
- updated `real_tasks.json`, provenance and denominator;
- geometry and end-to-end checks passing for every method path.

If any requirement is unavailable, report the missing evidence instead of inventing it.

## Result collection boundary

The current static page does not upload to a server. It uses the operating-system share sheet when supported and otherwise downloads JSON. Do not add automatic upload until the human supplies an explicit endpoint, authentication approach, participant notice and data-retention decision.

