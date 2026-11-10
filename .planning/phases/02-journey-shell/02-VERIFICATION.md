---
phase: 02-journey-shell
verified: 2026-11-10T07:11:35Z
status: passed
score: 20/20 requirements delivered
human_verified: 2026-11-10T07:11:35Z
---

# Phase 2 Verification (lean — ponytail mode)

**Goal:** a full daily practice session in a guided 5-step flow, every step working offline.

**Automated:** `node logic.test.mjs` and `node worker/worker.test.mjs` pass. Local browser runs: entry → vocab (5 words saved, Leitner state) → reload resumes at Step 2 → case Submit stays + Done advances → interview reveal; v1→v2 migration keeps all old keys and writes `recallData_v1_backup` once.

**Human (user, Windows Chrome + Android Chrome, 2026-11-10T07:11:35Z):** completed the full flow end to end. One defect: the mic stopped after each pause on the case step (had to press Start speaking repeatedly) — root cause: recognition only auto-restarted while a countdown timer ran. Fixed in 5e6d610 (restart until the user presses Stop).

**Fixed during execution:** migration not persisted/backup not written (4b8ad7b); duplicate stepper (0d22c8e); Submit skipped self-check and the next step (a80d1f9); mic restart (5e6d610).

**Not in scope (expected):** AI feedback after answers — Phase 3.

**User feedback carried into Phase 3:** use proven teaching methods/frameworks so learning sticks; use the day's 5 words inside the speaking/case/interview exercises.
