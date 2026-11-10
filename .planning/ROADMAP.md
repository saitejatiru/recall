# Roadmap: RECALL — PM Communication Coach

## Overview

RECALL transforms an existing multi-tab PM practice tool into a guided daily journey coached by AI. The build order is dictated by hard dependencies: the Cloudflare Worker proxy must exist before any AI call is possible (NIM blocks browser CORS), storage migration must run before new data is written, the full offline journey shell with self-assess fallback must exist before AI is wired (so a 429 never blocks a practice day), and endless day generation comes last because it depends on accumulated weak-spot history.

## Phases

- [x] **Phase 1: Proxy & Hosting** - Cloudflare Worker proxy with key rotation, auth, and GitHub Pages deploy; no AI call is possible without this (completed 2026-11-09)
- [x] **Phase 2: Journey Shell** - Complete 5-step daily journey (vocab, recall, speaking, case, interview), resume upload, Leitner review, and storage migration — all offline-testable (completed 2026-11-10)
- [ ] **Phase 3: AI Coach + Weak Spots** - Live NIM feedback on every step with rubric-anchored scoring, weak-spot tagging, and adaptive question selection
- [ ] **Phase 4: Endless Mode** - AI-generated fresh daily content after day 30, using the user's weak-spot history and resume

## Phase Details

### Phase 1: Proxy & Hosting

**Goal**: AI calls from the app can reach NVIDIA NIM via a secure Cloudflare Worker, with no keys ever touching the browser or repo
**Depends on**: Nothing (first phase)
**Requirements**: PROXY-01, PROXY-02, PROXY-03, PROXY-04, PROXY-05, PROXY-06
**Success Criteria** (what must be TRUE):

  1. The app on its GitHub Pages URL calls the Worker and receives a valid AI response
  2. Triggering a 429 on one NIM key automatically advances to the next key with no visible failure
  3. Requests without the passcode or from any origin other than the GitHub Pages domain are rejected by the Worker
  4. No NVIDIA key appears in the repo history, the browser network tab, or any Worker log
  5. The learner can deploy both Worker and GitHub Pages by following the written guide, without writing any code

**Plans**: 3/3 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Worker code, hygiene files, browser integration (passcode modal + AI status), bakeoff.html, SETUP.md

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Human deploy: git push, Cloudflare Worker setup (secrets + KV), GitHub Pages enable

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Human bake-off: update config.js Worker URL, run bakeoff, final E2E security verification

### Phase 2: Journey Shell

**Goal**: User can complete a full daily practice session using the guided 5-step flow, with every step working offline (no AI required)
**Depends on**: Phase 1
**Requirements**: JRNY-01, JRNY-02, JRNY-03, JRNY-04, JRNY-05, JRNY-06, JRNY-07, VOC-01, VOC-02, VOC-03, PRAC-01, PRAC-02, PRAC-03, PRAC-04, PRAC-05, PRAC-06, RES-01, RES-02, RES-03, COACH-06
**Success Criteria** (what must be TRUE):

  1. User opens the app and sees today's 5 steps in order with a progress bar; closing and reopening resumes at the same step
  2. User can speak or type every answer (recall, speaking, case, interview) with timers running; filler words are counted locally
  3. User uploads a PDF resume, sees and edits the extracted text, and saves it on-device only
  4. Each day shows 5 new PM vocab words with examples; user writes or speaks a sentence and receives a local correctness check; earlier words resurface via Leitner review (up to 5/day)
  5. When AI is unavailable, user can self-check with a rubric checklist and complete the full day without being blocked

**Plans**: 3/3 plans executed

- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md
- [x] 02-03-PLAN.md

**UI hint**: yes

### Phase 3: AI Coach + Weak Spots

**Goal**: Every practice answer gets live AI feedback scored against a fixed rubric, with weak-spot tags tracked and surfaced in the daily flow
**Depends on**: Phase 2
**Requirements**: COACH-01, COACH-02, COACH-03, COACH-04, COACH-05, COACH-07, WEAK-01, WEAK-02, WEAK-03, LEARN-01, LEARN-02, LEARN-03, LEARN-04, LEARN-05, LEARN-06
**Success Criteria** (what must be TRUE):

  1. After each answer, user sees a score (1-10), what landed, one specific fix, and a rewritten line using their actual resume projects — all under 80 words, with no praise opener
  2. The coach stays on PM topics and politely refuses off-topic requests; nothing the user writes in an answer or resume changes the coach's rules or rubric
  3. The day summary and journey intro show the user's top weak-spot tags from the past 7 days alongside today's focus
  4. The case and unexpected interview question that appear each day target the user's top weak spot
  5. Each answer step names its framework (STAR / CIRCLES / issue tree / RICE / answer-first), shows today's 5 words as chips that light up when used, and offers "Try again with the fix" plus a resume-based model answer
  6. Vocab sentences get an AI check with a corrected sentence; the next day's recall quizzes yesterday's fix and words

**Plans**: TBD
**UI hint**: yes

### Phase 4: Endless Mode

**Goal**: After day 30, fresh daily practice continues indefinitely without repeating content
**Depends on**: Phase 3
**Requirements**: END-01, END-02
**Success Criteria** (what must be TRUE):

  1. On day 31+, the user gets a new day with 5 fresh PM words, a new prompt, case, and unexpected question generated from their weak-spot history and resume — no word or question already seen repeats
  2. If AI generation fails, the day is built from remixed built-in content and the user can still complete a full practice session without interruption

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Proxy & Hosting | 3/3 | Complete    | 2026-11-09 |
| 2. Journey Shell | 3/3 | Complete    | 2026-11-10 |
| 3. AI Coach + Weak Spots | 0/? | Not started | - |
| 4. Endless Mode | 0/? | Not started | - |
