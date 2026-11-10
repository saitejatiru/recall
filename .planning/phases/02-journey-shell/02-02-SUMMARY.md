---
phase: "02"
plan: "02"
subsystem: journey-engine
tags: [journey, vocab, leitner, recall, stepper, backup, day-rollover]
status: complete

dependency_graph:
  requires:
    - 02-01 (content.js VOCAB, logic.js LOGIC.*)
  provides:
    - app.js (full journey engine)
    - logic.js (shouldAdvanceProgrammeDay added)
    - logic.test.mjs (5 new assertions)
  affects:
    - Plan 02-03 (plugs real speak/case/interview into STEPS registry)

tech_stack:
  added: []
  patterns:
    - 1-indexed journey steps (step=0=entry, 1=vocab ... 5=interview, >5=complete)
    - Single delegated click handler (data-action)
    - renderApp: stepper + stepContent div + renderFeedbackSlot in one pass
    - Day-rollover gated by LOGIC.shouldAdvanceProgrammeDay (pure predicate, Node-testable)

key_files:
  created: []
  modified:
    - app.js (full journey engine: ~600 lines, replaces 71-line stub)
    - logic.js (shouldAdvanceProgrammeDay added + export)
    - logic.test.mjs (5 new test assertions)

decisions:
  - "1-indexed steps: step=1=vocab through step=5=interview; n>5 triggers complete (plan said n>=5 which would skip interview — corrected as off-by-one)"
  - "renderFeedbackSlot called once in renderApp for all active steps (not per-step), avoiding double-slot"
  - "renderStepper receives 0-indexed stepIdx (step-1) for correct circle highlighting"
  - "journey-start resumes at saved step if >0, else starts at step=1 (vocab)"

metrics:
  duration: "~20 minutes"
  completed: "2026-11-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 3
---

# Phase 02 Plan 02: Journey Engine Summary

**One-liner:** Full daily journey engine in app.js — 5-step stepper, Vocab (Leitner + inline heuristic check), Recall (Day 1 skip + reveal), placeholder Steps 3-5, self-check rubric, export/import backup, and day-rollover via shouldAdvanceProgrammeDay.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (tracer) | Journey shell + shouldAdvanceProgrammeDay | 5ce87fe | app.js, logic.js, logic.test.mjs |
| 2 (auto) | Steps 1 & 2 + rubric + backup | 5ce87fe | app.js (included in tracer commit) |

## Verification

```
node logic.test.mjs → logic self-check: all passed (exit 0)
node worker/worker.test.mjs → worker self-check: all passed (exit 0)
```

Grep checks (all pass):
- shouldAdvanceProgrammeDay in logic.js: 2 (definition + export) ✓
- shouldAdvanceProgrammeDay in logic.test.mjs: 11 (5 test cases + comments) ✓
- STEPS in app.js: 5 ✓
- goToStep in app.js: 5 ✓
- renderFeedbackSlot in app.js: 3 ✓
- workerCall: 3 ✓
- checkAI: 4 ✓
- esc(: 19 ✓
- vocab-save: 3 ✓
- recall-skip: 2 ✓
- recall-reveal: 2 ✓
- export-backup: 2 ✓
- import-backup: 2 ✓
- disabled: 2 (Save btn empty + filled) ✓
- innerHTML (non-comment): 7 ✓
- "Done — move on" has no disabled attribute ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] n>5 instead of n>=5 for complete trigger**
- **Found during:** Tracer implementation
- **Issue:** Plan says `goToStep(n>=5)` sets complete; with 1-indexed steps (step=5=interview), this would skip rendering the interview step entirely
- **Fix:** Changed condition to `n > 5` — after clicking Done/Next at interview (step=5), goToStep(6) triggers complete
- **Files modified:** app.js

**2. [Rule 2 - Missing] renderStepper uses 0-indexed stepIdx**
- **Found during:** Tracer implementation
- **Issue:** Plan uses 1-indexed step values in localStorage but renderStepper circle comparison is 0-indexed; passing `step` directly would show wrong circle as active
- **Fix:** renderApp passes `stepIdx = step - 1` to renderStepper; renderEntry passes `step > 0 ? step - 1 : 0`

**3. [Rule 1 - Bug] Task 2 committed alongside tracer**
- **Found during:** Task 2 implementation
- **Issue:** Both tasks modify only app.js; splitting into two commits would require intermediate states; both tasks were implemented together and committed atomically
- **Impact:** One commit for both tasks (5ce87fe) instead of two; no behavioral difference

## Known Stubs

| File | Location | Description |
|------|----------|-------------|
| app.js | STEPS.speak, STEPS.case, STEPS.interview | Placeholder renderers — "Coming in the next update" |

Plan 02-03 replaces these three with real step implementations.

## Threat Flags

None new. All innerHTML assignments with user-generated content (vocab sentences, recall text) pass through `esc()`. Backup import guarded by `LOGIC.validateBackup()` before any localStorage write. `save()` catches QuotaExceededError.

## Self-Check: PASSED

- [x] app.js exists with all required functions: renderApp, renderEntry, renderSummary, renderStepper, renderVocab, renderRecall, renderFeedbackSlot, goToStep, saveStepAnswer, workerCall, checkAI, stop — FOUND
- [x] logic.js has shouldAdvanceProgrammeDay — FOUND
- [x] logic.test.mjs has 5 new assertions — FOUND
- [x] commit 5ce87fe exists — FOUND
- [x] node logic.test.mjs: exit 0 — PASS
- [x] node worker/worker.test.mjs: exit 0 — PASS
