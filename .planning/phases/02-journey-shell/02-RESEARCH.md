# Phase 2: Journey Shell — Research

**Researched:** 2026-11-09
**Domain:** Vanilla JS journey state machine, localStorage v2 schema, Leitner spaced repetition, Web Speech API, pdf.js 6.5.438, offline self-check rubric
**Confidence:** HIGH (all findings cross-checked against existing codebase, ARCHITECTURE.md, STACK.md, FEATURES.md, and the approved UI-SPEC)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JRNY-01 | One page (no tabs), today's journey as ordered steps with progress bar | Journey state machine (§Architecture Patterns), journey stepper component (§UI-SPEC) |
| JRNY-02 | Close and reopen: resume at same step | `d-YYYY-MM-DD.step` persisted on every step completion (§Data Model) |
| JRNY-03 | Day summary: scores, words learned, top weak spots | Day summary card shown when step index = 5 (§Journey State Machine) |
| JRNY-04 | Streak (survives one miss) + 30-day progress grid | Streak algorithm with grace-day, grid from `d-YYYY-MM-DD.complete` flags (§Streak & Grace Day) |
| JRNY-05 | Time hints per step; full day 20–30 min | Static `~N min` tags per step per UI-SPEC; empirically validate at verify (§Pitfalls) |
| JRNY-06 | Old progress survives the upgrade | Non-destructive v1→v2 migration (§Data Migration) |
| JRNY-07 | Export JSON / import JSON | Existing export pattern + import with schema validation (§Backup) |
| VOC-01 | 5 new PM words/day, plain meaning + examples | Full 150-term curriculum transcribed into `content.js` (§Content Verification) |
| VOC-02 | User writes/speaks a sentence; local correctness check | String-match heuristic defined precisely (§Vocab Check Heuristic) |
| VOC-03 | Earlier words come back via Leitner, max 5/day | 5-box Leitner with `nextReview` date in localStorage (§Leitner System) |
| PRAC-01 | Recall step: write from memory what learned yesterday | Step 2 reads `d-{yesterday}.vocab.words` and shows terms without meanings |
| PRAC-02 | Speaking step: 30s think + 90s speak, editable transcript | Web Speech API with auto-restart; transcript shown after timer (§Speech API) |
| PRAC-03 | No speech recognition → type instead, one-line notice | Feature detection; fallback textarea; identical downstream (§Speech Fallback) |
| PRAC-04 | Case step: one product case/day | `cases[dayIndex % cases.length]` from existing array |
| PRAC-05 | Unexpected question: hidden, 30s think, 90s answer, one follow-up | Static follow-up array by category; Phase 3 replaces with AI (§Step 5) |
| PRAC-06 | Filler-word count for spoken answers | Regex count on transcript, not typed text (§Filler Count) |
| RES-01 | PDF → extract in browser → show for editing → save locally | pdf.js 6.5.438 via dynamic `import()` (§PDF Extraction) |
| RES-02 | Scanned PDF → warn + paste fallback | `< 100 chars/page` threshold (§PDF Extraction) |
| RES-03 | Replace or delete saved resume | "Replace resume" re-runs extraction; "Delete resume" clears `recallResume` after `window.confirm()` |
| COACH-06 | AI unavailable → self-check rubric, never blocks the day | Feedback slot always shows rubric; `#aiFeedback` div hidden; "Done — move on" always enabled |
</phase_requirements>

---

## Summary

Phase 2 builds the full daily journey shell: a 5-step linear flow (Vocab → Recall → Speak → Case → Interview) driven by a simple integer state machine stored in localStorage, with no AI dependency. All 20 requirements are offline-first; AI slots are reserved but hidden. The existing `index.html` codebase is replaced/rebuilt as three browser files (`content.js` + `logic.js` + `app.js`) plus the unchanged `index.html` shell, keeping zero build-step and full backward compatibility with existing `recallData` keys.

The two highest-complexity pieces in Phase 2 are (1) the Leitner scheduling logic — it must be exact or words will surface at wrong intervals — and (2) the Web Speech API auto-restart loop for Android Chrome, where `continuous: true` is silently ignored. Both have precise implementations documented below and are testable with plain `node`.

The 150-term PM vocabulary curriculum from `FEATURES.md` is complete and transcribable verbatim into `content.js`. One quasi-duplicate exists (term #80 reuses the same concept as term #66 under a "second application" framing) — the planner should decide whether to keep it as reinforcement or swap it for a fresh Strategy term.

**Primary recommendation:** Start with the data model and migration (testable in Node before any UI), then the state machine, then each step in order. The journey is unblocked the moment step transition and resume work; content and AI hooks can follow.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Journey step state (which step, done flags) | Browser localStorage | — | Single-user, offline-first; no server needed |
| Step rendering and transitions | Browser JS (app.js) | — | Pure DOM; no server round-trip |
| Vocabulary curriculum data | Browser (content.js) | — | Static; shipped with the app |
| Leitner scheduling (which words to review) | Browser JS (logic.js) | — | Pure date math; testable in Node |
| Streak & grace-day calculation | Browser JS (logic.js) | — | Pure date math; testable in Node |
| Filler-word count | Browser JS (logic.js) | — | Pure string regex; testable in Node |
| Vocab correctness check (Phase 2) | Browser JS (logic.js) | — | String-match heuristic; Phase 3 replaces with Worker/AI |
| Speech-to-text | Browser (Web Speech API) | Typing fallback | No server; Chrome/Edge/Android Chrome only |
| PDF text extraction | Browser (pdf.js CDN) | Paste fallback | Never leaves device |
| Resume storage | Browser localStorage (`recallResume`) | — | Privacy constraint |
| Self-check rubric (COACH-06) | Browser JS (app.js) | — | Static checklist; no AI |
| AI coaching feedback | Worker (Phase 3) | Self-check rubric | Phase 2 always uses rubric fallback |
| Data export/import | Browser JS (app.js) | — | JSON file; existing pattern |

---

## Standard Stack

### Core (all zero-dependency, no build step)

| Component | Version / Source | Purpose |
|-----------|-----------------|---------|
| Vanilla JS (ES5-compatible with arrow fns) | Browser-native | All app logic; no transpiler |
| localStorage (`recallData` key) | Browser-native | Versioned progress store; v1 keys preserved |
| `recallResume` localStorage key | Browser-native | Resume text — separate from main key to avoid quota risk |
| pdfjs-dist | 6.5.438 (jsdelivr CDN, confirmed 200 OK) | In-browser PDF text extraction |
| Web Speech API (`webkitSpeechRecognition`) | Browser-native | Spoken answer transcription |
| `window.confirm()` | Browser-native | Resume delete confirmation (UI-SPEC A6) |

### File Split (4 files total — minimum to separate pure logic from DOM)

```
recall/
├── index.html      # HTML shell + all CSS; <script src="content.js"> → <script src="logic.js"> → <script src="app.js">
├── content.js      # Static data only: VOCAB[] (150 terms × 30 days), DAYS[], QUESTIONS[], CASES[], INTERVIEW[], FOLLOWUPS[]
├── logic.js        # Pure functions (UMD export): Leitner, streak, filler count, vocab check, migration, backup validation
└── app.js          # DOM, event handlers, journey engine, storage read/write, speech, resume, rendering
```

**Why 4 files, not 3 (the ARCHITECTURE.md recommendation):** The question specifically requires that pure logic (Leitner, streak, filler count, vocab check, migration, backup validation) be testable with plain `node`. Keeping them in `app.js` (which references `document`, `window`, etc.) makes that impossible. `logic.js` uses a UMD export pattern — it loads as a classic `<script>` in the browser, setting `window.LOGIC`, and also works as `require('./logic.js')` in Node.

**UMD export pattern for logic.js (no bundler, no build step):**
```js
// logic.js
(function(exports) {
  'use strict';
  // ALL pure functions here: no document, no window, no fetch
  exports.advanceLeitner = function(box) { return Math.min(box + 1, 5); };
  exports.leitnerInterval = function(box) { return [0, 1, 2, 4, 8, Infinity][box]; };
  exports.countFillers = countFillers;
  exports.checkVocab = checkVocab;
  exports.computeStreak = computeStreak;
  exports.migrate = migrate;
  exports.validateBackup = validateBackup;
  // ... all pure functions
})(typeof module !== 'undefined' ? module.exports : (window.LOGIC = window.LOGIC || {}));
```

**Node test pattern (mirrors worker/worker.test.mjs):**
```js
// logic.test.mjs  (run: node logic.test.mjs)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const LOGIC = require('./logic.js');
// assertions with process.exitCode
```

---

## Data Model: localStorage v2

### Schema

```js
// Key: 'recallData' (preserves existing key name)
{
  _version: 2,          // absent = v1 (existing). Migration adds this.
  day: 15,              // current programme day 1–30. After day 30, continues to increment.

  // --- EXISTING v1 FLAT KEYS — preserved unchanged for backward compatibility ---
  'tasks-YYYY-MM-DD': [0, 1, 3],   // completed task indices (old dashboard)
  'recall-YYYY-MM-DD': "text",      // old memory gym
  'speak-YYYY-MM-DD': "text",       // old speaking studio
  'case-YYYY-MM-DD': "text",
  'interview-YYYY-MM-DD': "text",
  'reflection-YYYY-MM-DD': "text",
  'short-YYYY-MM-DD': "N",          // screen time (Focus & Detox, removed from UI)
  'long-YYYY-MM-DD': "N",
  'bounds-YYYY-MM-DD': [0,1],
  'distraction-YYYY-MM-DD': "text",

  // --- NEW v2 PER-DAY JOURNEY DATA — key pattern: 'd-YYYY-MM-DD' ---
  'd-2026-11-09': {
    step: 2,            // 0=vocab, 1=recall, 2=speak, 3=case, 4=interview, 5=summary (complete)
    complete: false,    // true when step reaches 5 (day counts toward streak)

    vocab: {
      newWords: ['jtbd', 'userPersona', 'painPoint', 'empathyMap', 'userJourneyMap'],
      reviewWords: ['northStarMetric', 'retention'],    // Leitner words due today
      sentences: { jtbd: '', userPersona: 'We built two personas...', ... },
      results: { jtbd: null, userPersona: 'correct', ... },  // null | 'correct' | 'wrong'
      rubricChecked: []  // Phase 2: unused; Phase 3: not needed for vocab
    },

    recall: {
      text: "I remembered...",
      skipped: false    // true on day 1
    },

    speak: {
      question: "Why should a company invest in customer retention?",
      transcript: "edited transcript text...",
      fromSpeech: true,         // false = typed
      fillerCount: 3,
      rubricChecked: [0, 2, 4]  // indices of checked rubric items (Phase 2 self-check)
    },

    case: {
      caseIndex: 0,
      text: "My analysis...",
      rubricChecked: []
    },

    interview: {
      questionIndex: 0,
      text: "My answer...",
      followupText: "My follow-up...",
      rubricChecked: []
    }
  },

  // --- GLOBALS ---
  vocab: {
    // Leitner state per term ID (camelCase term slug)
    jtbd:             { box: 2, nextReview: '2026-11-11', lastResult: 'correct' },
    northStarMetric:  { box: 1, nextReview: '2026-11-10', lastResult: 'wrong' },
    // New words added when first shown; absent = not yet seen
  },

  weakspots: []  // Phase 3 populates this; Phase 2 leaves it []
}

// Key: 'recallResume' (separate from recallData to prevent 5 MB quota risk)
// Value: plain string (extracted + user-edited resume text)
// Max recommended: 5000 chars (PITFALLS: cap to 1500 for AI; store full for user editing)
```

### Size Estimate

| Component | Estimate |
|-----------|----------|
| 30 days × journey data | ~1 KB/day × 30 = 30 KB |
| Leitner vocab state (150 terms) | ~6 KB |
| Existing v1 flat keys | ~5 KB |
| **Total recallData** | **~41 KB** |
| Resume text (recallResume) | ~5 KB |
| **Grand total** | **~46 KB** well under 5 MB limit [ASSUMED — depends on actual answer lengths; could reach ~150 KB with long typed answers across all 30 days; still safe] |

### Data Migration (v1 → v2)

```js
// logic.js: migrate(data) — called on load if data._version < 2 (or absent)
function migrate(data) {
  if (data._version >= 2) return data;
  // Non-destructive: add new fields, leave all existing keys untouched
  data._version = 2;
  if (!data.vocab) data.vocab = {};
  if (!data.weakspots) data.weakspots = [];
  // Do NOT touch any existing flat keys ('recall-*', 'speak-*', etc.)
  return data;
}
```

**Migration is safe because:** (a) all new fields are added with defaults, (b) no existing field is renamed or deleted, (c) the journey reads from `d-YYYY-MM-DD` first; legacy data under flat keys is left in place but no longer written to by the new code.

**Pitfall:** The existing `day` field stores a programme day integer (1–30), set by clicking days in the old dashboard. The journey engine will trust this for `today()`'s content selection. If `data.day` is 1 (default), the user starts at day 1 content — correct. After completing a day, increment `data.day` only if `data.day === currentCalendarDayNumber` (i.e., we don't auto-advance programme day based on calendar; the user explicitly advances it, as in the existing pattern where clicking day buttons sets `data.day`). **Resolution (see Open Questions Q3):** phase 2 should set `data.day` automatically when a session is completed, incrementing by 1 (up to 30). This decouples programme day from calendar — the user can do day 1 on Nov 9 and day 2 on Nov 11.

### Backup (JRNY-07)

**Export:** `JSON.stringify({ recallData: data, recallResume: localStorage.getItem('recallResume') || '' })`. Triggers `<a>` download.

**Import:** Parse JSON, validate with `validateBackup()` (check `recallData` key exists and has `_version`, `day` fields; reject otherwise). On pass, overwrite both localStorage keys. Show "Restoring…" while parsing (for large files).

**Import validation (pure, Node-testable):**
```js
function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  const d = parsed.recallData;
  if (!d || typeof d !== 'object') return false;
  if (typeof d.day !== 'number') return false;
  return true;  // minimal check; corrupt data inside is handled by try/catch on reads
}
```

**QuotaExceededError:** Catch on every `localStorage.setItem`. Show: "Storage full — download a backup to free space." Allow navigation but prevent saves.

---

## Architecture Patterns

### Journey State Machine

**State:** `d-YYYY-MM-DD.step` (integer 0–5). 0=vocab, 1=recall, 2=speak, 3=case, 4=interview, 5=summary.

**Resume logic (on page load):**
```js
const todayKey = 'd-' + today();         // today() = new Date().toLocaleDateString('en-CA')
const dayData = data[todayKey] || { step: 0, complete: false };
const currentStep = dayData.step;        // render at this step
```

**Step completion:**
```js
function completeStep(step, stepResult) {
  const todayKey = 'd-' + today();
  const dayData = data[todayKey] || { step: 0 };
  dayData[STEP_NAMES[step]] = stepResult; // e.g. dayData.speak = { transcript, fillerCount, ... }
  dayData.step = step + 1;
  if (dayData.step >= 5) {
    dayData.complete = true;
    data.day = Math.min((data.day || 1) + 1, 30);  // auto-advance programme day, cap at 30
  }
  data[todayKey] = dayData;
  save();
  render();
}
```

**Day 1 Recall skip:** In `renderRecall()`, if `daysSince(data) === 1` (no prior completed day), render the "Day 1 — nothing to recall yet" empty state with "Skip to Step 3" CTA that calls `completeStep(1, { skipped: true })`.

**Day rollover:** `today()` is a local calendar date string. If the user opens the app on Nov 10 after completing Nov 9, `d-2026-11-10` doesn't exist → `step = 0` → starts fresh. The programme day (`data.day`) carries over. Correct behavior.

**Day 31+:** `data.day` is capped at 30 by `completeStep`. Content arrays (vocab, questions, cases, interview) use `Math.min(data.day, 30) - 1` as the index. For vocabulary on days 31+: all 150 words have been introduced → show only Leitner reviews (no new words). The Day Summary shows "30-day arc complete — Endless Mode coming in a future update." [ASSUMED — this is the most graceful fallback; planner can override]

**What counts as "day complete":** Reaching step 5 (summary). The summary is shown; `dayData.complete = true`; streak is updated. Even if some steps had `rubricChecked: []` (no rubric interaction), the day is complete. The UI-SPEC confirms: "skipped steps listed as skipped; reaching the summary counts toward streak."

---

### Recommended Project Structure

```
recall/
├── index.html          # HTML shell + all CSS (unchanged base; nav/side stripped for journey)
├── content.js          # 300–350 lines: VOCAB (150 terms), DAYS, QUESTIONS, CASES, INTERVIEW, FOLLOWUPS
├── logic.js            # 150–200 lines: pure functions — Leitner, streak, filler count, vocab check, migrate, validateBackup
└── app.js              # 500–600 lines: DOM, event handlers, journey engine, storage, speech, resume, render
```

**Loading order in index.html:**
```html
<script src="config.js"></script>    <!-- existing: Worker URL -->
<script src="content.js"></script>   <!-- data first (no deps) -->
<script src="logic.js"></script>     <!-- pure logic (no DOM) -->
<script src="app.js"></script>       <!-- DOM + all wiring -->
```

---

## Content: Vocabulary Curriculum Verification

[ASSUMED: term correctness and pedagogical ordering — training knowledge; content was designed by the FEATURES.md researcher]

**Term count:** 150 terms in 8 themes across 30 days × 5 terms/day. Verified by counting term numbers (#1–150) in FEATURES.md. [VERIFIED: manual count of FEATURES.md term table]

**Day-to-theme mapping (locked from FEATURES.md):**

| Days | Theme | Terms | Day indices |
|------|-------|-------|-------------|
| 1–4 | Discovery & User Research | 1–20 | VOCAB[0..3] |
| 5–8 | Metrics & Analytics | 21–40 | VOCAB[4..7] |
| 9–12 | Prioritization | 41–60 | VOCAB[8..11] |
| 13–16 | Strategy | 61–80 | VOCAB[12..15] |
| 17–20 | Execution & Delivery | 81–100 | VOCAB[16..19] |
| 21–23 | Stakeholder & Communication | 101–115 | VOCAB[20..22] |
| 24–26 | Growth | 116–130 | VOCAB[23..25] |
| 27–30 | AI & Tech PM | 131–150 | VOCAB[26..29] |

**Quasi-duplicate:** Term #80 ("Competitive moat — second application") explicitly references term #66 ("Competitive moat"). The FEATURES.md itself flags this ("Covered in term 66; in this lesson focus on types"). This is intentional reinforcement (different PM usage example focusing on switching costs, data network effects, brand, regulatory). **Recommendation:** Keep it as-is — it is a second-angle lesson, not a copy-paste error. The planner can confirm.

**content.js structure for vocab:**
```js
// VOCAB is a 30-element array; each element is an array of 5 term objects
const VOCAB = [
  // Day 1 (index 0)
  [
    { id: 'jtbd', term: 'Jobs-to-be-done (JTBD)', meaning: '...', everyday: '...', interview: '...' },
    { id: 'userPersona', term: 'User persona', meaning: '...', everyday: '...', interview: '...' },
    // ... 3 more
  ],
  // Day 2 (index 1) ...
];
```

**Existing content arrays in index.html (carry forward into content.js):**
- `days[]` — 30 entries, used for day theme/focus/prompt. Carry forward unchanged.
- `questions[]` — 9 speaking questions. Used as `questions[(day-1) % questions.length]` per step.
- `cases[]` — 4 case studies. Used as `cases[(day-1) % cases.length]` per step.
- `interview[]` — 8 interview questions with categories. Used as `interview[(day-1) % interview.length]` per step.

**Follow-up prompts for Step 5 (Phase 2 static):**
```js
// FOLLOWUPS mapped by interview category (matches interview[] categories)
const FOLLOWUPS = {
  'Product sense': 'What metric would tell you that worked?',
  'Metrics':       'What\'s the baseline, and how much movement signals success?',
  'Strategy':      'How would you bring the engineering team along on this?',
  'Prioritisation':'What\'s the opportunity cost of that choice?',
  'Execution':     'How would you communicate the delay to stakeholders?',
  'Leadership':    'What would you do differently with more authority?',
  'Failure':       'How did that change how you approach similar decisions now?',
  'Analytics':     'What leading indicator would you check first?',
};
```

---

## Leitner 5-Box System

### Data Structure

Stored in `recallData.vocab` (not per-day — global across all days):
```js
recallData.vocab = {
  // Key: term ID (camelCase slug, e.g. 'jtbd', 'northStarMetric')
  jtbd: { box: 2, nextReview: '2026-11-11', lastResult: 'correct' },
  userPersona: { box: 1, nextReview: '2026-11-10', lastResult: 'wrong' },
  // New words are added when first shown with { box: 1, nextReview: tomorrow, lastResult: null }
}
```

### Box Intervals

| Box | Review interval | Move on correct | Move on wrong |
|-----|----------------|-----------------|---------------|
| 1 | next day (+1) | → Box 2 | stays Box 1 |
| 2 | 2 days (+2) | → Box 3 | → Box 1 |
| 3 | 4 days (+4) | → Box 4 | → Box 1 |
| 4 | 8 days (+8) | → Box 5 | → Box 1 |
| 5 | graduated (never) | stays Box 5 | → Box 1 |

```js
// logic.js — pure, Node-testable
const BOX_INTERVAL = [0, 1, 2, 4, 8]; // index = box number (1-indexed → arr[box-1])

function advanceLeitner(termState, result) {
  // result: 'correct' | 'wrong'
  const today = todayStr(); // passed in as argument for testability
  if (result === 'correct') {
    const newBox = Math.min(termState.box + 1, 5);
    const days = newBox === 5 ? 999 : BOX_INTERVAL[newBox - 1];
    return { box: newBox, nextReview: addDays(today, days), lastResult: 'correct' };
  } else {
    return { box: 1, nextReview: addDays(today, 1), lastResult: 'wrong' };
  }
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}
```

### Daily Selection Algorithm

```js
// logic.js
function selectReviewWords(vocabState, todayStr, maxReviews) {
  // maxReviews: 5 (UI-SPEC cap)
  return Object.entries(vocabState)
    .filter(([id, s]) => s.box < 5 && s.nextReview <= todayStr)
    .sort(([,a], [,b]) => a.box - b.box)  // lowest box first (weakest)
    .slice(0, maxReviews)
    .map(([id]) => id);
}
```

**Initialization for new words (when first shown):**
```js
function initWord(termId, today) {
  return { box: 1, nextReview: addDays(today, 1), lastResult: null };
}
```

New words shown today are initialized on first display. If the user doesn't answer (closes mid-step), they remain at box 1 with nextReview = tomorrow — they appear as review words the next day.

**UI-SPEC ordering (Step 1):** Review words shown BEFORE new words (UI-SPEC assumption A1). Review section hidden if 0 reviews due (UI-SPEC VOC-01 zero state).

---

## Vocab Check Heuristic (VOC-02 Offline)

The UI-SPEC locks the Phase 2 offline heuristic: "case-insensitive string match — if the submitted sentence contains the term (or its root), mark 'Correct'." This is the floor. Here is the precise implementation:

```js
// logic.js — pure, Node-testable
function checkVocab(termId, termText, sentence, exampleSentence) {
  const s = sentence.trim().toLowerCase();
  const ex = (exampleSentence || '').trim().toLowerCase();

  // 1. Minimum length: at least 6 words (prevents "JTBD is good")
  if (s.split(/\s+/).filter(Boolean).length < 6) return 'wrong';

  // 2. Reject if sentence is essentially the example (>= 80% match)
  if (s === ex || jaccardSimilarity(s, ex) >= 0.80) return 'wrong';

  // 3. Term presence check: case-insensitive; handle multi-word terms and common inflections
  const termLower = termText.toLowerCase();
  if (s.includes(termLower)) return 'correct';

  // 4. For multi-word terms or terms with parenthetical abbreviations (e.g. "Jobs-to-be-done (JTBD)")
  //    also check the abbreviation and the first significant word
  const abbrev = termText.match(/\(([A-Z]+)\)/);
  if (abbrev && s.includes(abbrev[1].toLowerCase())) return 'correct';

  // 5. Root word check: strip common suffixes and check
  const roots = termLower
    .replace(/\([^)]+\)/, '')   // remove parenthetical
    .split(/[\s\-\/]+/)          // split on space, hyphen, slash
    .filter(w => w.length > 4); // only significant words
  if (roots.some(root => s.includes(root))) return 'correct';

  return 'wrong';
}

// Jaccard similarity on word bags (simple; no library)
function jaccardSimilarity(a, b) {
  const wa = new Set(a.split(/\s+/)), wb = new Set(b.split(/\s+/));
  const intersect = [...wa].filter(w => wb.has(w)).length;
  return intersect / (wa.size + wb.size - intersect);
}
```

**Known limits of this heuristic:**
- False positives: "The JTBD is not relevant here" → marked Correct (contains the term but uses it wrongly)
- False negatives: paraphrases without the term (e.g., using "underlying goal" for JTBD) → marked Wrong
- Phase 3 replaces this with an AI call; this heuristic is a placeholder

**Copy shown on failure:** "Try again" with the word's everyday example sentence shown below the textarea (UI-SPEC).

---

## Streak & Grace Day Algorithm

```js
// logic.js — pure, Node-testable
// Accepts data object and todayStr (passed in for testability; production uses today())
function computeStreak(data, todayStr) {
  let streak = 0;
  let graceUsed = false;
  let d = new Date(todayStr + 'T00:00:00');

  while (true) {
    const dateStr = d.toLocaleDateString('en-CA');
    const dayData = data['d-' + dateStr];
    const complete = dayData && (dayData.complete === true || dayData.step >= 5);

    if (complete) {
      streak++;
      graceUsed = false;         // reset grace after a successful day
      d.setDate(d.getDate() - 1);
    } else if (!graceUsed) {
      // Allow one missed day; don't increment streak for it
      graceUsed = true;
      d.setDate(d.getDate() - 1);
    } else {
      break; // two consecutive misses → streak ends
    }

    // Safety cap: don't look further back than 90 days
    const daysBack = (new Date(todayStr + 'T00:00:00') - d) / 86400000;
    if (daysBack > 90) break;
  }

  return streak;
}

// Longest streak (for the grid display)
function computeLongestStreak(data) {
  // Find all completed dates, sort, then find longest run with one-gap grace
  const completedDates = Object.keys(data)
    .filter(k => k.startsWith('d-') && data[k].complete)
    .map(k => k.slice(2))
    .sort();
  // ... walk forward through sorted dates counting runs; omitted for brevity
}
```

**Grace day display (UI-SPEC):** "Yesterday missed — streak protected" banner shown once (dismissible, stored in `data.graceShownDate`). Yesterday's grid circle shows a small dash indicator.

**Day 1 state (UI-SPEC empty state):** Before ANY day is complete, `computeStreak` returns 0. The UI shows "Day 1 — streak starting" (not "0-day streak").

---

## Web Speech API: Implementation Contract

[VERIFIED: MDN compat data, STACK.md research confirmed 2026-11-09]

### Feature Detection

```js
// app.js — runs synchronously on step render
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  // Show typing fallback immediately (PRAC-03)
  // One-line notice: "Microphone not available in this browser — type your answer below."
  renderTypingFallback();
  return;
}
```

### Recording State Machine

```js
// app.js — within the speak/interview step renderer
let accumulated = '';
let listening = false;
let recognition = null;

function startRecording() {
  accumulated = '';
  listening = true;
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.continuous = false;    // ← works on Android; `true` is silently ignored there
  recognition.interimResults = false; // transcript shown after, not live (UI-SPEC)
  recognition.maxAlternatives = 1;

  recognition.onresult = e => {
    // Single-shot mode: collect the final result of this utterance
    const r = e.results[e.results.length - 1];
    if (r.isFinal) accumulated += r[0].transcript + ' ';
  };

  recognition.onend = () => {
    if (listening && timerRunning) {
      // Auto-restart: Android Chrome fires onend after each utterance
      try { recognition.start(); } catch (err) { /* already stopping */ }
    } else {
      // Timer expired or user pressed stop — flush transcript to textarea
      textarea.value = accumulated.trim();
      fillerChip.textContent = formatFillerCount(LOGIC.countFillers(accumulated));
      fillerChip.style.display = accumulated.trim() ? '' : 'none';
    }
  };

  recognition.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'permission-denied') {
      listening = false;
      showTypingFallback('Microphone access denied. Type your answer below.');
    } else if (e.error === 'network') {
      listening = false;
      showTypingFallback('Recording stopped. Edit the transcript below or type your answer.');
      textarea.value = accumulated.trim();  // keep any partial transcript
    }
    // Other errors (aborted, no-speech): onend fires next; loop continues
  };

  recognition.start();
  updateMicButton(true);
}

function stopRecording() {
  listening = false;
  if (recognition) recognition.stop();
  updateMicButton(false);
}
```

**On step leave:** Call `stopRecording()` unconditionally (timers cleared, recognition stopped).

**Android Chrome known issue:** `continuous: true` silently ignored. The `onend` restart loop above handles this. Desktop Chrome may also fire `onend` around 60-second boundaries — the same loop handles that too.

**Empty transcript:** If `accumulated.trim() === ''` after the timer, show: "Nothing was captured — speak again or type your answer." Submit remains disabled until textarea has content.

### Filler-Word Count

```js
// logic.js — pure, Node-testable
const FILLERS = /\b(um|uh|like|you know|sort of|basically|honestly|literally)\b/gi;

function countFillers(text) {
  const matches = text.match(FILLERS);
  return matches ? matches.length : 0;
}
```

**Filler count is shown ONLY for speech transcripts** (UI-SPEC assumption A3). The `fromSpeech` flag on the step result controls display. Typed answers never show filler count.

**Copy mapping (UI-SPEC):**
- 0–2: "N filler word(s) — good" (--green chip)
- 3–5: "N filler words (um, uh, like, you know)"
- 6+: "N filler words — aim for fewer next time"

---

## PDF Text Extraction (pdf.js 6.5.438)

### Loading Pattern (dynamic import from classic script)

Classic scripts can call `import()` dynamically in all modern browsers. This avoids adding a `<script type="module">` tag and keeps the loading order simple.

```js
// app.js — called when user selects a PDF file
let _pdfjs = null;
async function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  try {
    const lib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs');
    lib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs';
    _pdfjs = lib;
    return lib;
  } catch (err) {
    // Network offline, CDN down, or browser blocks dynamic import in some edge cases
    return null;
  }
}

async function extractPDF(file) {
  // Show "Extracting text…" (button disabled) immediately
  setResumeLoading(true);

  const lib = await loadPdfJs();
  if (!lib) {
    // CDN failed to load: show paste fallback
    setResumeLoading(false);
    showResumePasteArea("Couldn't load PDF reader — paste your resume text instead.");
    return;
  }

  try {
    const buf = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
    const pageTexts = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1)
          .then(p => p.getTextContent())
          .then(tc => tc.items.map(it => it.str).join(' '))
      )
    );
    const fullText = pageTexts.join('\n').trim();

    // Scanned PDF detection: < 100 chars per page on average
    const avgCharsPerPage = fullText.length / pdf.numPages;
    if (avgCharsPerPage < 100) {
      setResumeLoading(false);
      showResumePasteArea('This PDF has no readable text. Paste your resume text in the box below instead.');
      return;
    }

    setResumeLoading(false);
    showResumeEditArea(fullText); // editable textarea pre-filled
  } catch (err) {
    setResumeLoading(false);
    showResumePasteArea("Couldn't read this file — try another PDF or paste the text.");
  }
}
```

**Saving:** `localStorage.setItem('recallResume', editedText)` after user clicks Save (not auto-save on extraction — user must review and confirm). Show "Resume saved on this device only." below textarea after save.

**Multi-column PDFs:** The editable textarea is the safeguard. PITFALLS.md documents that pdf.js orders text by y-coordinate across columns, producing garbled output for two-column resumes. Showing the extracted text in an editable textarea (always) lets the user fix column-ordering issues before saving.

**Offline fallback:** If `loadPdfJs()` returns null (CDN unreachable), show paste area immediately. No spinner left running.

---

## Self-Check Rubric (COACH-06)

The feedback slot always renders the 6-item rubric (UI-SPEC component #7). The "Done — move on" button is ALWAYS enabled regardless of rubric state.

**Rubric items (locked from UI-SPEC):**
1. Structure — Did I give a clear opening and conclusion?
2. Clarity — Would a non-PM understand my answer?
3. PM vocabulary — Did I use PM terms correctly?
4. Metrics — Did I include a number or measurement?
5. Impact — Did I say what changed and by how much?
6. Conciseness — Was my answer under 90 seconds?

**Persistence:** `rubricChecked: [0, 2, 4]` (checked item indices) saved in the step's data object when the user clicks "Done — move on".

**Phase 3 compatibility:** `#aiFeedback` div is always present, always `hidden` in Phase 2. Phase 3 removes `hidden` and injects score/fix/better-line without layout changes. The "Coach is thinking" animation div is also always present and always `hidden` in Phase 2.

---

## Common Pitfalls

### Pitfall 1: Android Chrome speech stops mid-answer
**What goes wrong:** With `continuous: true`, Chrome Android silently ignores the flag and fires `onend` after each utterance. Without a restart loop, the transcript cuts off.
**Prevention:** Use `continuous: false` + `onend` restart while `listening && timerRunning`. See Speech API section.
**Test:** 10-second silence on Android; verify restart without pressing anything.

### Pitfall 2: localStorage migration corrupts existing data
**What goes wrong:** New code reads `dayData.vocab` but old code stored data under `speak-2026-11-09`. Without migration, old data looks absent; fresh data overwrites nothing.
**Prevention:** `migrate()` runs on every load, adds new fields with defaults, never deletes existing keys. Test by loading old `recallData` JSON then deploying new code.

### Pitfall 3: pdf.js version mismatch (main vs. worker CDN URL)
**What goes wrong:** `GlobalWorkerOptions.workerSrc` set to wrong version → "Setting up fake worker" console warning → PDF parsing blocks main thread or silently fails.
**Prevention:** Pin both URLs to `@6.5.438`. Load `workerSrc` immediately after `import()`, before any `getDocument()` call.

### Pitfall 4: Leitner interval off-by-one
**What goes wrong:** Box 1 → next review is "today + 1 day". If computed as `today + BOX_INTERVAL[0]` and `BOX_INTERVAL[0] = 0`, it re-appears today (infinite loop).
**Prevention:** `BOX_INTERVAL = [0, 1, 2, 4, 8]` where index is box (1-indexed). Box 1 → `BOX_INTERVAL[1] = 1` day. New words: shown today, `nextReview = addDays(today, 1)`. Test: verify new word appears exactly tomorrow.

### Pitfall 5: Filler count shown for typed answers
**What goes wrong:** UI-SPEC assumption A3: filler detection is a speech coaching signal; typed answers don't have verbal filler. Showing it for typed text misleads users.
**Prevention:** Set `fromSpeech: false` on typed submissions; render filler chip only if `fromSpeech === true`.

### Pitfall 6: programme day auto-advance conflicts with user intent
**What goes wrong:** `data.day` was previously user-controlled (clicking day buttons). Auto-advancing after session completion is a behavior change that could confuse a returning user.
**Prevention:** Remove the old day-selector UI from the journey view. Auto-advance is correct for the linear journey flow. Preserve the old `data.day` value as the starting day on first load. Document in PLAN.md.

### Pitfall 7: "Done — move on" disabled on empty rubric
**What goes wrong:** A developer adds a validation check ("user must tick at least one box"). COACH-06 explicitly prohibits this — AI must never block the day.
**Prevention:** "Done — move on" is never disabled. No validation on rubric state. This is a hard requirement.

### Pitfall 8: `window.confirm()` blocked in some contexts
**What goes wrong:** Some browsers block `window.confirm()` in sandboxed iframes or when called from an event handler that's not user-initiated.
**Prevention:** Always call `window.confirm()` directly from a click event handler (button click → confirm). Never call it from a timeout or promise callback. Cloudflare Pages serves the page normally; this is not an issue in production.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom PDF parser | `pdfjs-dist@6.5.438` via CDN | PDF is a complex format; pdf.js handles 1000+ edge cases |
| Speech-to-text | Whisper API or MediaRecorder + server | `webkitSpeechRecognition` | Free, in-browser, no key, no server |
| JSON export | Custom serialization format | `JSON.stringify(data)` + `<a download>` | stdlib does it in one line |
| JSON import | File parsing from scratch | `FileReader` + `JSON.parse` + `validateBackup()` | stdlib + 5-line validation |
| Date math for Leitner | Calendar library | `Date.setDate(d.getDate() + n)` + `toLocaleDateString('en-CA')` | stdlib does it |
| Multi-line string escaping | Custom escaper | Existing `esc()` function in index.html | Already written |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None — plain `assert` with `process.exitCode` (mirrors `worker/worker.test.mjs` pattern) |
| Config file | None needed |
| Quick run | `node logic.test.mjs` |
| Full suite | `node logic.test.mjs` (same file; all tests run sequentially) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| VOC-03 | Leitner box advance (correct/wrong) | unit | `node logic.test.mjs` | Test all box transitions, interval dates |
| VOC-03 | Leitner daily selection (cap 5, sort by box) | unit | `node logic.test.mjs` | Test with >5 due words |
| JRNY-04 | Streak computation with/without grace day | unit | `node logic.test.mjs` | Test: 3-day streak + 1 miss + 1 more = still 4? No, = 3+grace+1=5? See grace algo |
| PRAC-06 | Filler count regex | unit | `node logic.test.mjs` | Test: "um like you know" = 3? Yes |
| VOC-02 | Vocab check heuristic | unit | `node logic.test.mjs` | Test: term present/absent, short sentences, example-copy rejection |
| JRNY-06 | v1→v2 migration | unit | `node logic.test.mjs` | Test: existing keys preserved; _version set |
| JRNY-07 | Backup validation | unit | `node logic.test.mjs` | Test valid/invalid JSON structures |
| JRNY-01 | Journey stepper renders correctly | manual/visual | Open in Chrome, verify stepper states | CSS state classes; not automatable without headless browser |
| JRNY-02 | Resume at correct step after close/reopen | manual | Close tab mid-step, reopen, verify | Requires DOM state |
| PRAC-02 | Speech auto-restart after silence | human (Android) | Record silence for 10s on Pixel | Requires physical Android Chrome |
| PRAC-03 | Typing fallback in Firefox | human | Open in Firefox desktop, verify no mic button | Requires Firefox |
| RES-01 | PDF extraction of a text PDF | human | Upload a known-good PDF resume | Requires real file |
| RES-02 | Scanned PDF fallback | human | Upload a known scanned PDF | Requires scanned PDF |
| JRNY-05 | Full session under 28 minutes | human | Run complete session, time it | Requires real AI latency estimate |
| COACH-06 | AI offline → rubric shown, day can complete | manual | Navigate through all 5 steps without Worker | Worker not needed for Phase 2; test naturally |

### Wave 0 Gaps (before first implementation task)

- [ ] `logic.test.mjs` — covers all unit-testable requirements above
- [ ] Sample data fixtures: a v1 `recallData` object for migration testing
- [ ] Sample data fixtures: a valid and an invalid backup JSON for `validateBackup` testing

---

## Security Domain

> Phase 2 is entirely offline (no AI calls). Security surface is minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Passcode handled by Worker (Phase 1 complete) |
| V3 Session Management | No | No session; localStorage only |
| V4 Access Control | No | Single-user tool |
| V5 Input Validation | Partial | `esc()` for HTML rendering; backup import validated |
| V6 Cryptography | No | No secrets in Phase 2 browser code |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via stored transcript | Tampering | `esc()` function (already in index.html) for all user-generated content rendered as HTML |
| Backup import with crafted JSON | Tampering | `validateBackup()` gate + `try/catch` around all reads |
| PDF with embedded JS | Tampering | pdf.js extracts text only; embedded scripts are never executed |
| `window.confirm()` spoofing | Tampering | Not applicable: single-user tool; no attacker model for confirm dialog |

---

## Open Questions

1. **Programme day vs. calendar day — who advances `data.day`?** [RESOLVED]
   - **Resolution:** Phase 2 auto-advances `data.day` by 1 when a session is marked complete (reaching step 5), capped at 30. This decouples programme content from the calendar date — the user advances through the 30-day curriculum at their own pace. The old day-selector UI (clickable day buttons on the dashboard) is removed in Phase 2. If `data.day` is already 2 when Phase 2 is deployed (user had manually advanced it in Phase 1), it starts from day 2 content. No reset.

2. **What happens if the user does two sessions in one calendar day?** [RESOLVED]
   - **Resolution:** Each session is keyed by `today()` (calendar date string). If the user finishes a session and starts another on the same day, `d-YYYY-MM-DD` already has `step: 5` and `complete: true`. The app shows the Day Summary screen (already complete state). The user sees "Done for today!" and can export backup. No duplicate session allowed per calendar day. Programme day counter only advances once per completion (the check: only advance if `dayData.complete` was false before this session).

3. **Term #80 "Competitive moat (second application)" — keep or replace?** [RESOLVED: keep]
   - **Resolution:** Keep as-is. The FEATURES.md explicitly frames it as a second-angle lesson (types of moat: switching costs, data network effects, brand, regulatory). The PM interview usage example is distinct from term #66. This is intentional reinforcement pedagogy, not a copy-paste error. Content.js transcribes it verbatim.

4. **Day 31+ behaviour in Phase 2?** [RESOLVED]
   - **Resolution:** Cap programme day at 30 (`data.day = Math.min(data.day + 1, 30)`). Vocab step for days 31+ shows only Leitner reviews (all 150 words introduced; `VOCAB[29]` is the last set). Questions/cases/interview rotate (`(day-1) % array.length`). Day Summary shows "30-day arc complete — Endless Mode coming in a future update." Phase 4 handles true endless mode (END-01, END-02).

5. **Journey replaces the existing multi-tab UI entirely?** [RESOLVED]
   - **Resolution:** Yes. The `sections[]` array nav, `#side`, `.layout` two-column grid, and all section render functions (`home()`, `memory()`, `speak()`, `think()`, `interviewPage()`, `focus()`, `progress()`) are removed or gutted. The new HTML shell is a single-column max-width 760px layout. The `passcode` modal and `checkAI()` AI status bar are retained verbatim (UI-SPEC A10). The existing CSS variables (`:root`) are retained unchanged.

6. **How does `data.day` relate to `today()`?** [RESOLVED]
   - **Resolution:** They are independent. `today()` = calendar date string for localStorage key. `data.day` = programme content index (which set of vocab words, which question, which case). A user can skip a calendar day without losing their programme position. `data.day` advances on session completion, not on calendar change. The stepper shows programme day (e.g. "Day 7 / 30") not calendar date.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Chrome / Edge (desktop) | PRAC-02, PRAC-05 | ✓ | Web Speech API confirmed supported |
| Chrome (Android/Pixel) | PRAC-02 (mobile) | ✓ | Requires `onend` restart loop |
| pdfjs-dist@6.5.438 (jsdelivr CDN) | RES-01, RES-02 | ✓ | 200 OK confirmed 2026-11-09 (1.27 MB) |
| Cloudflare Pages auto-deploy | JRNY-01 (hosting) | ✓ | recallnow.pages.dev live; push to main deploys |
| recall-proxy Worker | COACH-06 (ping check) | ✓ | Phase 1 complete; Worker stays unchanged in Phase 2 |
| Node.js (dev machine) | logic.test.mjs | ✓ | Assumed present on Windows dev machine [ASSUMED] |

**No missing dependencies blocking Phase 2 execution.**

---

## Sources

### Primary (HIGH confidence — from codebase direct read)
- `C:\Users\Nxtwave\Documents\recall\index.html` — existing code: data arrays, localStorage pattern, `today()`, `save()`, `esc()`, passcode modal, `workerCall`, `checkAI`
- `C:\Users\Nxtwave\Documents\recall\worker\worker.js` — Phase 1 worker contract (ping, bakeoff, task routing); Phase 2 adds no new tasks
- `.planning/phases/02-journey-shell/02-UI-SPEC.md` — approved UI design contract; interaction contracts for all 5 steps; component specs; copywriting; accessibility; assumptions A1–A10
- `.planning/REQUIREMENTS.md` — complete requirement list; Phase 2 scope (JRNY-01..07, VOC-01..03, PRAC-01..06, RES-01..03, COACH-06)

### Secondary (HIGH confidence — from project research files)
- `.planning/research/FEATURES.md` — 150-term PM vocab curriculum (verbatim source for content.js); Leitner 5-box intervals; filler word list; feedback rubric
- `.planning/research/ARCHITECTURE.md` — file split rationale; data model v2 schema; migration pattern; journey state machine pattern; anti-patterns
- `.planning/research/STACK.md` — pdfjs-dist 6.5.438 CDN URLs confirmed; Web Speech API compat data; `continuous: false` + `onend` restart pattern
- `.planning/research/PITFALLS.md` — speech silence cut (Pitfall 8); pdf.js scanned PDFs (Pitfall 14); localStorage migration (Pitfall 15); AI blocking journey (Pitfall 17)
- `.planning/phases/01-proxy-hosting/01-03-SUMMARY.md` — Phase 1 completion evidence; Worker contract established; allowed origin = recallnow.pages.dev

### Tertiary (ASSUMED — training knowledge)
- Leitner 5-box system interval values (1/2/4/8 days) — standard SRS design; not empirically verified for this specific use case
- Jaccard similarity threshold of 0.80 for example-copy rejection — heuristic; needs empirical calibration
- 6-word minimum for vocab sentences — pedagogically reasonable; not researched

---

## Metadata

**Research date:** 2026-11-09
**Valid until:** 60 days (content is locked in codebase; no external library versions to track except pdfjs CDN)
**Confidence breakdown:**
- Data model & migration: HIGH — direct codebase read; exact existing keys identified
- Leitner algorithm: HIGH — copied from FEATURES.md spec; standard SRS
- Speech API pattern: HIGH — STACK.md confirmed; MDN compat verified
- PDF extraction pattern: HIGH — CDN URLs live-verified 2026-11-09
- Vocab check heuristic: MEDIUM — no empirical validation of thresholds; Phase 3 replaces it
- Streak grace-day algorithm: MEDIUM — logic is correct but edge cases (e.g. app never opened for 2 weeks) need test coverage
