# Requirements: RECALL — PM Communication Coach

**Defined:** 2026-11-09
**Core Value:** After every practice answer, the learner gets short, specific and personalised feedback (score, the one fix that matters most, and a better line to say) so each day's practice measurably improves how they articulate PM answers.

## v1 Requirements

### Journey (single tab)

- [x] **JRNY-01**: User sees one page (no tabs) with today's journey as ordered steps and a progress bar
- [x] **JRNY-02**: User can close the browser mid-journey and continue at the same step when they come back
- [x] **JRNY-03**: When all steps are done, user sees a day summary: scores, words learned, top weak spots
- [x] **JRNY-04**: User sees their current streak (survives one missed day) and a 30-day progress grid
- [x] **JRNY-05**: Each step shows a time hint, and a full day takes 20–30 minutes
- [x] **JRNY-06**: Progress saved by the old version of the app is still there after the upgrade
- [x] **JRNY-07**: User can export all progress to a JSON file and import it on another device

### Vocabulary

- [x] **VOC-01**: Each day the user gets 5 new PM words (from a 150-term curriculum), each with a plain meaning, an everyday example and an interview usage example
- [x] **VOC-02**: User writes or says their own sentence for each word, and the coach says whether the usage is right and gives a better sentence
- [x] **VOC-03**: Earlier words come back for review on a spaced schedule (Leitner boxes), at most 5 reviews a day

### Practice

- [x] **PRAC-01**: Recall step: user writes from memory what they learned yesterday (words and the main fix), then sees what they missed
- [x] **PRAC-02**: Speaking step: 30 s think + 90 s timed spoken answer to the day's prompt; the transcript appears after speaking and can be edited before submitting
- [x] **PRAC-03**: If speech recognition is not available, the user can type every answer instead (one-line notice, no error)
- [x] **PRAC-04**: Case step: one product case per day that the user answers (spoken or typed)
- [x] **PRAC-05**: Unexpected question: the question is hidden until the user starts; 30 s think, 90 s answer; the coach then asks one follow-up question and the user answers it
- [x] **PRAC-06**: For spoken answers the user sees a filler-word count (um, uh, like, you know…) worked out without an AI call

### AI Coach

- [ ] **COACH-01**: After each answer the user gets: score 1–10, what landed, the one most important fix, and a better line to say — at most ~80 words, in plain language
- [ ] **COACH-02**: The coach stays on PM interview coaching and politely refuses off-topic requests
- [ ] **COACH-03**: Better lines use the user's resume projects and numbers, and never invent facts that are not in the resume
- [ ] **COACH-04**: Scores follow one fixed rubric (structure, clarity, PM vocabulary, metrics, impact, conciseness), so they are comparable across days, and feedback does not open with empty praise
- [ ] **COACH-05**: When the coach notices a missed chance, it names a PM word the user has already learned that would have fit
- [x] **COACH-06**: If the AI is unavailable or slow, the user can self-check with a checklist and continue; the AI never blocks the day
- [ ] **COACH-07**: Text inside an answer or resume cannot change the coach's rules (prompt-injection guard)

### Learning Method (added 2026-11-10 from user testing)

- [ ] **LEARN-01**: Every speak/case/interview question names the framework to use with a 3-line cheat card — STAR (behavioural), CIRCLES (product design/improvement), issue tree + 5 Whys (metric drop/diagnosis), RICE (prioritisation), Pyramid/PREP answer-first (any answer) — and the coach scores structure against that framework
- [ ] **LEARN-02**: Today's 5 words show as "use these words" chips in the speak, case and interview steps; a chip lights up when the word is used, and the coach credits correct use and flags misuse
- [ ] **LEARN-03**: Deliberate practice loop — after feedback the user can "Try again with the fix"; the coach scores the second attempt and shows what improved
- [ ] **LEARN-04**: After feedback the user can open a short model answer (≤120 words) in the named framework, using only facts from their resume
- [ ] **LEARN-05**: The next day's recall step quizzes yesterday's one fix and words before showing them (retrieval practice)
- [ ] **LEARN-06**: The coach checks each vocab sentence (replacing the local check) and gives a corrected sentence when usage is wrong
- [ ] **LEARN-07**: Each day opens with a short micro-lesson (about 3 min, "I do"): one product concept tied to the day's word theme (e.g. North Star metric, AARRR/HEART, JTBD, RICE/Kano, moats) plus one communication framework, taught with a worked example; then the first answer is guided step-by-step through the framework ("we do") before the free answers ("you do") — guidance fades over the 30 days (scaffolding)
- [ ] **LEARN-08**: Teach-back (Feynman): once a day the user explains the day's concept to a "new teammate" in plain words; the coach points out the gap or jargon to fix
- [ ] **LEARN-09**: Socratic follow-up: when an answer skips a framework step, the coach asks one probing interviewer-style question instead of only stating the fix
- [ ] **LEARN-10**: Review days (7, 14, 21, 28) mix questions across all frameworks learned so far (interleaving) and end with a short reflection: what improved, what to drill next (metacognition)

### Resume

- [x] **RES-01**: User uploads a PDF resume; text is extracted in the browser, shown for editing, and saved on the device only
- [x] **RES-02**: If the PDF has no readable text (scanned), the user is told and can paste the text instead
- [x] **RES-03**: User can replace or delete the saved resume

### Weak Spots

- [ ] **WEAK-01**: Each piece of feedback tags mistakes from a fixed list of 10 (e.g. no-metric, rambling, no-structure), and the tags are saved
- [ ] **WEAK-02**: The journey intro shows the top weak spots from the last 7 days and today's focus
- [ ] **WEAK-03**: The unexpected question and case are picked to push on the user's top weak spot

### Proxy & Hosting

- [x] **PROXY-01**: All AI calls go through a Cloudflare Worker; NVIDIA keys live only in Worker secrets, and nothing secret is in the repo or the browser
- [x] **PROXY-02**: The Worker rotates across 3–4 keys, moves to the next key on 429/5xx, and falls back to the fast model if the primary fails
- [x] **PROXY-03**: The Worker only serves the GitHub Pages origin with the app passcode, and enforces a daily request cap
- [x] **PROXY-04**: User can set up Cloudflare and GitHub Pages by following a step-by-step guide without writing code
- [x] **PROXY-05**: The model is confirmed by a bake-off on 3 sample answers with real keys, and can be changed in Worker settings without a code change
- [x] **PROXY-06**: The app is live on GitHub Pages from https://github.com/saitejatiru/recall (changed by user: served by Cloudflare Pages at https://recallnow.pages.dev from the same repo)

### Endless Mode

- [ ] **END-01**: After day 30, each new day (5 new words, prompt, case, unexpected question) is generated by the AI using the user's weak spots and resume, without repeating words
- [ ] **END-02**: If generation fails, the day is built from a remix of the built-in content

## v2 Requirements

Deferred. Tracked but not in the current roadmap.

- **V2-01**: "Focused drill" day when a weak-spot tag fires 5+ times in a week
- **V2-02**: Score trend per question category over time
- **V2-03**: Vocabulary cross-reference against the full 150-term list in every feedback call (token cost)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Focus & Detox (screen-time log, boundaries, journal) | User chose to keep the journey on PM skills |
| Multi-device sync / accounts / database | One device + JSON backup is enough for one learner |
| Audio recording, voice-tone or video analysis | Needs other model classes; the transcript covers most of the value |
| DOCX resume | PDF covers most resumes; paste fallback exists |
| Leaderboards / social features | Single-user personal tool |
| Punitive streaks | Causes drop-off; grace day instead |
| Unlimited feedback retries per step | Burns rate limits; one feedback per step |
| Live transcript overlay while speaking | Distracts from thinking; transcript shown after |
| Native mobile app | Responsive web page covers phone use |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| JRNY-01 | Phase 2 | Complete |
| JRNY-02 | Phase 2 | Complete |
| JRNY-03 | Phase 2 | Complete |
| JRNY-04 | Phase 2 | Complete |
| JRNY-05 | Phase 2 | Complete |
| JRNY-06 | Phase 2 | Complete |
| JRNY-07 | Phase 2 | Complete |
| VOC-01 | Phase 2 | Complete |
| VOC-02 | Phase 2 | Complete |
| VOC-03 | Phase 2 | Complete |
| PRAC-01 | Phase 2 | Complete |
| PRAC-02 | Phase 2 | Complete |
| PRAC-03 | Phase 2 | Complete |
| PRAC-04 | Phase 2 | Complete |
| PRAC-05 | Phase 2 | Complete |
| PRAC-06 | Phase 2 | Complete |
| COACH-01 | Phase 3 | Pending |
| COACH-02 | Phase 3 | Pending |
| COACH-03 | Phase 3 | Pending |
| COACH-04 | Phase 3 | Pending |
| COACH-05 | Phase 3 | Pending |
| COACH-06 | Phase 2 | Complete |
| COACH-07 | Phase 3 | Pending |
| RES-01 | Phase 2 | Complete |
| RES-02 | Phase 2 | Complete |
| RES-03 | Phase 2 | Complete |
| WEAK-01 | Phase 3 | Pending |
| WEAK-02 | Phase 3 | Pending |
| WEAK-03 | Phase 3 | Pending |
| LEARN-01 | Phase 3 | Pending |
| LEARN-02 | Phase 3 | Pending |
| LEARN-03 | Phase 3 | Pending |
| LEARN-04 | Phase 3 | Pending |
| LEARN-05 | Phase 3 | Pending |
| LEARN-06 | Phase 3 | Pending |
| LEARN-07 | Phase 3 | Pending |
| LEARN-08 | Phase 3 | Pending |
| LEARN-09 | Phase 3 | Pending |
| LEARN-10 | Phase 3 | Pending |
| PROXY-01 | Phase 1 | Complete |
| PROXY-02 | Phase 1 | Complete |
| PROXY-03 | Phase 1 | Complete |
| PROXY-04 | Phase 1 | Complete |
| PROXY-05 | Phase 1 | Complete |
| PROXY-06 | Phase 1 | Complete |
| END-01 | Phase 4 | Pending |
| END-02 | Phase 4 | Pending |

**Coverage:**

- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-09*
*Last updated: 2026-11-09 after roadmap creation*
