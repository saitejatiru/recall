---
phase: 03-ai-coach-weak-spots
plan: "04"
subsystem: app-wiring
tags: [recall-quiz, teach-back, review-days, weak-spot-selection]
key_files:
  modified: [app.js, bakeoff.html]
decisions:
  - Recall step quizzes yesterday's fix before revealing it (retrieval practice); day 1 / no record skips gracefully
  - Teach-back is optional and non-blocking; offline shows "good effort"
  - Case/interview picked by top weak spot; index stored in today's record so reloads keep the same question
  - Review days (7/14/21/28) reuse the normal coached steps plus a banner; reflection (what improved / what next) lives on the day summary. The executor's separate review page was replaced because it had no way to move on and no mic/coach
metrics:
  completed: "2026-11-10"
  tasks_completed: 3
---

# 03-04 Summary

Built: fix-recall quiz, teach-back coach call, lesson concept stored for tomorrow, weak-spot-adaptive case/interview with stable daily pick, review days with interleaved frameworks and a summary reflection.

Commits: de04603, 48b1bd6, b40f545 (review-day dead-end fix).

Verification: logic + worker self-checks pass; browser-checked locally (recall quiz, offline teach-back fallback, stable case pick, review banner, reflection save); live real-key check on laptop + Android passed (user, 2026-11-10).
