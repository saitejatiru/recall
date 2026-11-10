---
phase: 03-ai-coach-weak-spots
plan: "03"
subsystem: app-wiring
tags: [ai-coach, speak, case, interview, word-chips, cheat-card, micro-lesson, weak-spots]
dependency_graph:
  requires: [QUESTIONS_objects, CASES_objects, INTERVIEW_objects, CHEAT_CARDS, LESSONS_30, buildCoachPayload, validateCoachResponse, computeTopWeakSpots, detectWordChips, migrate_v3]
  provides: [speak_ai_feedback, case_ai_feedback, interview_ai_feedback, try_again, model_answer, vocab_batch_check, word_chips, cheat_card, micro_lesson, weak_spot_banner]
  affects: [app.js, index.html]
tech_stack:
  added: []
  patterns: [fire-and-forget async, event delegation, non-blocking AI call]
key_files:
  created: []
  modified:
    - app.js
    - index.html
decisions:
  - All three AI calls (speak/case/interview) fire after saveStepAnswer+answerSaved so Done-move-on is immediately usable; AI call is strictly non-blocking
  - Migration guard changed from >=2 to >=3; v1 backup guard adds !data._version check so v2 data is not unnecessarily re-backed-up
  - socratiQ update uses textContent not innerHTML (safe; no esc needed)
  - Word chips use existing .tag CSS + new .chip-active rule (single line in index.html)
  - renderCheatCard and renderWordChips are small helper functions; not methods on STEPS to keep the render functions lean
  - runVocabAICheck is fire-and-forget; vocab completion not gated on AI response
  - try-again limited to one retry per step (plan spec; no second try-again button appended)
metrics:
  duration: "18 min"
  completed: "2026-11-10T09:30:00Z"
  tasks_completed: 3
  files_changed: 2
status: complete
---

# Phase 3 Plan 03: AI Coach Wiring Summary

AI coach wired to all three answer steps (speak/case/interview) with score/fix/betterLine feedback, teaching scaffolding (micro-lesson, cheat card, word chips), deliberate-practice loop (try-again, model answer), vocab batch AI check, and weak-spot entry banner.

## What Was Built

**app.js — Migration (bug fix)**
- Guard changed from `!(data._version >= 2)` to `!(data._version >= 3)` so existing v2 users now receive v3 field initialisation
- v1 backup guard adds `!data._version` check so genuinely v2 data is not unnecessarily re-backed up

**app.js — Content object access (bug fix)**
- `renderSpeakStep`: `QUESTIONS[qIdx]` → `q.text`, `q.framework` (was returning object as string)
- `renderCaseStep`: `c[0]`/`c[1]`/`c[2]` → `c.title`/`c.scenario`/`c.reasoning` (were `undefined` on new object format)
- `renderInterviewStep`: `q[1]` → `q.question` (was `undefined`)
- `interview-submit` handler: `q3[0]` → `q3.category` for FOLLOWUPS lookup (was `undefined`)
- All submit handlers now store `question` and `framework` in dayData for retry/model-answer handlers

**app.js — Task 1: Speak AI feedback (tracer)**
- `todayTerms()` / `learnedWordIds()` helpers
- `renderCheatCard(framework, day)` helper: details element, open on days 1-10, closed on 11-20, label "Show framework hint" on 21-30; silently omitted if framework not in CHEAT_CARDS
- `renderWordChips()` helper: 5 span.chip.tag elements with data-term-id; chip-active toggled on transcript input via detectWordChips
- `showSelfCheckFallback(stepId)`: replaces thinking animation with muted notice
- `renderCoachFeedback(stepId, res)`: validates via LOGIC.validateCoachResponse; stores aiFeedback {score,fix,tags,wordsUsed} in dayData[stepId]; renders score badge / one-fix / betterLine blockquote + try-again + show-model-answer buttons
- speak-submit: fires `workerCall('coach', payload)` after saveStepAnswer+answerSaved; shows/hides #thinking div

**app.js — Task 2: Case + Interview + Scaffolding**
- case-submit: same AI pattern; stores question/framework; fires coach/answer call
- interview-final-submit: same AI pattern; stores question/framework; on resolve, updates `#followupQuestion` textContent if res.socratiQ is non-empty (falls back to static FOLLOWUPS[category])
- Micro-lesson card at top of renderVocab: concept/detail/workedExample; guidedStep shown only on days 1-10; skipped on isReview days
- Cheat card added after question text in all three step render functions
- Word chips added to speak (card body), case (card body), and interview (speakPhase before transcript)
- input delegation extended: transcript input updates chip-active class; retryTranscript enables retry-submit button

**app.js — Task 3: Deliberate Practice + Entry Banner**
- try-again: hides button, inserts retryTranscript + retry-submit; placeholder shows the fix text
- retry-submit: builds retry payload (attempt1Text from dayData[stepId].transcript|.text); shows improved/fix/betterLine result; no second retry (one retry per step per spec)
- show-model-answer: disabled during call; on resolve inserts modelAnswer div with green left-border; on fail restores button
- runVocabAICheck(): reads dayData.vocab.sentences, calls coach/vocab, updates fb-{id} divs with AI verdict + correctedSentence, advances Leitner; called fire-and-forget on vocab step-next
- Weak-spot banner in renderEntry: computeTopWeakSpots ≥1 tag → card with today's focus
- Weak-spot row in renderSummary: shows top tags or "No weak spots yet"

**index.html**
- `.chip-active{border-color:var(--green)!important;color:var(--green)!important}` added to style block

## Commits

| Hash | Description |
|------|-------------|
| 00891cc | feat(03-03): wire AI coach to speak/case/interview + teaching scaffolding |

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed all content tuple-index access broken by plan 02's object conversion**
- **Found during:** Task 1 (pre-task read)
- **Issue:** QUESTIONS/CASES/INTERVIEW were converted to object arrays in plan 02; app.js still used `c[0]`, `q[1]`, `q3[0]`, `QUESTIONS[n]` as string — these would render as `[object Object]` or `undefined`
- **Fix:** Updated all six call sites to use named properties (.text, .title, .scenario, .reasoning, .question, .category, .framework)
- **Files modified:** app.js
- **Commit:** 00891cc

**2. [Rule 1 - Bug] Fixed migration guard: v2 users never got v3 initialisation**
- **Found during:** Orchestrator note (pre-task read)
- **Issue:** Guard was `!(data._version >= 2)` — a user who had already migrated to v2 would skip the v3 migration call
- **Fix:** Changed to `!(data._version >= 3)` and added `!data._version` to the backup condition so only genuine v1 data is backed up
- **Files modified:** app.js
- **Commit:** 00891cc

No other deviations. Plan executed as specified.

## Self-Check

- [x] app.js: `buildCoachPayload` called — yes
- [x] app.js: `renderCoachFeedback` defined — yes
- [x] app.js: `aiFeedback` stored — yes
- [x] app.js: `.slice(0,1500)` resumeExcerpt cap — yes
- [x] app.js: `socratiQ` handling — yes
- [x] app.js: `LESSONS[` micro-lesson render — yes
- [x] app.js: `CHEAT_CARDS[` cheat card render — yes
- [x] app.js: `detectWordChips` called — yes
- [x] app.js: `chip-active` toggle — yes
- [x] app.js: `try-again`, `retry-submit`, `show-model-answer` — yes
- [x] app.js: `runVocabAICheck` defined — yes
- [x] app.js: `computeTopWeakSpots` called — yes
- [x] No tuple index access on CASES/INTERVIEW/QUESTIONS arrays — grep confirmed
- [x] Migration guard is `>= 3` — confirmed
- [x] `node logic.test.mjs` passes — all passed
- [x] `node worker/worker.test.mjs` passes — all passed
- [x] Commit 00891cc exists — confirmed

## Self-Check: PASSED
