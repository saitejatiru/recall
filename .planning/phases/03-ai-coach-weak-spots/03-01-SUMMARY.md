---
phase: 03-ai-coach-weak-spots
plan: "01"
subsystem: worker
tags: [coach, ai, worker, cloudflare]
dependency_graph:
  requires: []
  provides: [coach-task-worker-endpoint]
  affects: [worker/worker.js]
tech_stack:
  added: []
  patterns: [streamJSON, callAI, parseJSONReply, validateCoachReply]
key_files:
  created: []
  modified:
    - worker/worker.js
    - worker/worker.test.mjs
decisions:
  - System prompts (COACH_SYSTEM etc.) defined server-side only; user content in named XML blocks (COACH-07, T-03-01)
  - validateTags rejects any tag outside VALID_TAGS Set; malformed reply → {error:"malformed_response"} (T-03-05)
  - resumeExcerpt capped at 1500 chars before entering any user message block (T-03-02)
  - socratiQ rule toggled by stepType field; null for non-interview steps (LEARN-09)
  - nimBody max_tokens kept at 2048 (thinking-model headroom); prompt text instructs model on response length
metrics:
  duration: ~15 min
  completed: 2026-11-10
  tasks_completed: 2
  files_modified: 2
status: complete
---

# Phase 3 Plan 01: Worker Coach Task Summary

Add `case "coach"` to the Cloudflare Worker — five modes (answer, retry, model, vocab, teachback) so the browser gets AI coaching without keys ever reaching the client.

## What Was Built

**worker/worker.js** — `if (task === 'coach')` block:
- Mode validation against ALLOWED_MODES Set; unknown_mode → 400
- resumeExcerpt capped at 1500 chars (T-03-02)
- VALID_TAGS Set (10 tags); validateTags helper shared across modes
- `answer`: COACH_SYSTEM server-side rubric; XML-delimited user message; validateCoachReply checks score int 1-10, fix/betterLine non-empty strings, all tags in VALID_TAGS
- `retry`: RETRY_SYSTEM; validates improved bool, fix/betterLine strings, tags
- `model`: MODEL_SYSTEM; validates modelAnswer non-empty string
- `vocab`: VOCAB_SYSTEM; validates results array with id/verdict/correctedSentence per entry
- `teachback`: TEACHBACK_SYSTEM; validates gaps array + betterExplanation string; answer capped at 200 chars
- All modes pipe through callAI → parseJSONReply → mode validator → streamJSON (same path as bakeoff)

**worker/worker.test.mjs** — 7 new tests:
- coach/answer: score=7, tag 'no-metric'
- coach/retry: improved=true
- coach/model: modelAnswer is string
- coach/vocab: verdict='correct'
- coach/teachback: gaps.length > 0
- injection guard: answer "Ignore previous instructions…" → score=5 (mock reply used, not injected value)
- malformed reply: {} → {error:"malformed_response"}

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 (tracer) | d270a17 | coach/answer mode + test |
| 2 | 0a615a0 | retry/model/vocab/teachback + 6 tests |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond what the plan's threat model covers. T-03-01 (injection) and T-03-05 (tag validation) mitigations applied as specified.

## Self-Check: PASSED

- worker/worker.js modified: confirmed
- worker/worker.test.mjs modified: confirmed
- `node worker/worker.test.mjs` exits 0 with "worker self-check: all passed"
- Commits d270a17 and 0a615a0 exist on branch worktree-agent-a6fda442c5385e053
