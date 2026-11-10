---
phase: 03-ai-coach-weak-spots
plan: "02"
subsystem: content-and-logic
tags: [content, logic, tdd, weak-spots, lessons]
dependency_graph:
  requires: []
  provides: [QUESTIONS_objects, CASES_objects, INTERVIEW_objects, CHEAT_CARDS, LESSONS_30, buildCoachPayload, validateCoachResponse, computeTopWeakSpots, selectByWeakSpot, detectWordChips, migrate_v3]
  affects: [app.js, worker/worker.js]
tech_stack:
  added: []
  patterns: [TDD RED-GREEN, incremental-file-writes, Function-scope-eval-pattern]
key_files:
  created: []
  modified:
    - content.js
    - logic.js
    - logic.test.mjs
decisions:
  - CHEAT_CARDS keys exactly match framework strings used in QUESTIONS/CASES/INTERVIEW (STAR/CIRCLES/issue-tree/RICE/PREP)
  - migrate chains v1→v3 and v2→v3; both additive; v3 is idempotent — existing tests updated to expect _version=3
  - selectByWeakSpot fallback is items[0] (round-robin at index 0 suffices for now; app.js will handle full round-robin)
  - detectWordChips strips parentheticals then lowercases — same logic as checkVocab step 3; no duplication
  - Review days (indices 6/13/20/27) have both framework:'Interleaved' and frameworks:[] array for app.js compatibility
metrics:
  duration: "6 min"
  completed: "2026-11-10T08:44:43Z"
  tasks_completed: 2
  files_changed: 3
status: complete
---

# Phase 3 Plan 02: Content + Pure Functions Summary

Static teaching content and pure logic layer for the AI coach. app.js (03-03) can build on this stable model.

## What Was Built

**content.js — data model converted to objects:**
- `QUESTIONS[9]`: `{text, framework}` — frameworks PREP/STAR/CIRCLES per RESEARCH.md
- `CASES[4]`: `{title, scenario, reasoning, framework, targetsTags}` — issue-tree/RICE with weak-spot targeting
- `INTERVIEW[8]`: `{category, question, framework, targetsTags}` — Metrics/Analytics/Execution/Leadership have targetsTags
- `CHEAT_CARDS`: 5 keys (STAR/CIRCLES/issue-tree/RICE/PREP) each with `{l1,l2,l3}` framework guide
- `LESSONS[30]`: concept/detail/workedExample/framework/guidedStep per day; review days (7/14/21/28) have `isReview:true` and `frameworks` array

**logic.js — 5 new pure functions + migrate v3:**
- `buildCoachPayload(mode, inputs)`: builds Worker payload per mode (answer/retry/model/vocab/teachback); caps resumeExcerpt at 1500 chars
- `validateCoachResponse(json)`: score 1–10 integer, non-empty fix/betterLine, tags array
- `computeTopWeakSpots(data, todayStr, days=7)`: iterates aiFeedback.tags across speak/case/interview; returns top-3 sorted by frequency
- `selectByWeakSpot(items, topTags)`: picks first item with targetsTags overlap; fallback to items[0]
- `detectWordChips(text, todayWords)`: returns Set of term IDs present in text (strips parentheticals, lowercase)
- `migrate`: v1→v3 and v2→v3 chain, additive only

**logic.test.mjs — 35 new assertions covering all 5 functions and migrate v3.**

## Commits

| Hash | Description |
|------|-------------|
| 677a8da | feat(03-02): convert content arrays; add CHEAT_CARDS, LESSONS[30] |
| b8bcb4b | test(03-02): RED — failing tests for all 5 new functions + migrate v3 |
| 89c38cb | feat(03-02): GREEN — implement all 5 functions + migrate v3; all tests pass |

## Deviations from Plan

**1. [Rule 1 - Bug] Updated existing migrate test assertions**
- **Found during:** Task 2 GREEN
- **Issue:** Existing tests asserted `_version === 2` after migrate; v3 chain makes v1 data go to v3, breaking those assertions
- **Fix:** Updated test messages/assertions to expect `_version === 3`; this is correct — single migrate call brings data to latest version
- **Files modified:** logic.test.mjs

No other deviations. Plan executed as specified.

## Self-Check

- [x] content.js valid JS, tracer passes (`LESSONS.length === 30`, `LESSONS[6].isReview === true`)
- [x] CHEAT_CARDS keys match framework strings exactly
- [x] `node logic.test.mjs` exits 0 (all tests pass, including 35 new assertions)
- [x] All 5 new functions exported from LOGIC
- [x] Commits exist: 677a8da, b8bcb4b, 89c38cb

## Self-Check: PASSED
