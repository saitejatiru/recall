# Phase 2: Journey Shell — Pattern Map

**Mapped:** 2026-11-09
**Files analyzed:** 5 (index.html modified + content.js, logic.js, app.js, logic.test.mjs created)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `index.html` | shell / config | — | `index.html` (self) + `bakeoff.html` | exact |
| `content.js` | static data | — | Inline arrays in `index.html` lines 29–63 | exact |
| `logic.js` | utility (pure functions) | transform / batch | `worker/worker.js` (pure logic sections) | role-match |
| `app.js` | controller / engine | event-driven + CRUD | `index.html` JS block lines 64–123 | exact |
| `logic.test.mjs` | test | — | `worker/worker.test.mjs` | exact |

---

## Pattern Assignments

### `index.html` (shell — modified)

**Analog:** `index.html` (self) + `bakeoff.html`

**CSS variables to keep verbatim** (index.html line 7):
```css
:root{--bg:#0d1421;--panel:#151f30;--panel2:#1d2a3e;--line:#2a3a50;--text:#edf3fb;--muted:#9eacc0;--accent:#8b9cff;--green:#62d6a4}
```

**Base utility classes to keep verbatim** (index.html line 8):
`.card`, `.btn`, `.btn.primary`, `.tag`, `.bar`, `.bar span`, `.timer`, `.hidden`, `.small`, `.muted`, `.stat`, `.row`, `.task`, `.task input` — all unchanged.

**Thinking animation CSS to copy from bakeoff.html** (lines 10–16):
```css
.thinking{display:flex;align-items:center;gap:16px;padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--panel2);margin-top:12px}
.orb{flex:none;width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#d5dbff,var(--accent));animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(.85);box-shadow:0 0 0 0 #8b9cff66}50%{transform:scale(1);box-shadow:0 0 0 14px #8b9cff00}}
.dots span{animation:blink 1.4s infinite both}.dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}
.bar.think span{background:var(--accent);transition:width 1s linear}
@media(prefers-reduced-motion:reduce){.orb,.dots span{animation:none}}
```

**Thinking animation HTML to copy from bakeoff.html** (lines 64–72):
```html
<div id="thinking" class="thinking hidden" role="status" aria-live="polite">
  <div class="orb" aria-hidden="true"></div>
  <div style="flex:1;min-width:0">
    <div><b>Coach is thinking</b><span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></div>
    <div class="small" id="thinkMsg">Reading your answer…</div>
    <div class="bar think" style="margin-top:8px"><span id="thinkBar" style="width:0%"></span></div>
  </div>
  <div class="stat" id="thinkTime" style="margin:0;font-size:22px">0:00</div>
</div>
```

**Passcode modal to keep verbatim** (index.html lines 18–25):
```html
<div id="setupModal" style="display:none;position:fixed;inset:0;background:#0d142199;z-index:99;align-items:center;justify-content:center">
  <div class="card" style="max-width:360px;width:100%">
    <h2>First-time setup</h2>
    <p class="muted">Enter the passcode you will set in the Cloudflare Worker...</p>
    <input type="password" id="passcodeInput" placeholder="Passcode">
    <button class="btn primary" id="savePasscode">Save &amp; continue</button>
  </div>
</div>
```

**Script load order pattern** (index.html line 26):
```html
<script src="config.js"></script>
<!-- Phase 2 adds: -->
<script src="content.js"></script>
<script src="logic.js"></script>
<script src="app.js"></script>
```

**Layout change:** Replace `.layout` two-column grid and `#side` with single-column `max-width:760px`. Remove `.layout`, `.side`, `.mobile`, `.nav` CSS. Keep `.shell` but change `max-width:1160px` → `max-width:760px`.

**New mobile breakpoint:** stepper circles shrink to 28px; labels hidden except active; `#side` removed entirely.

---

### `content.js` (static data)

**Analog:** Inline arrays in `index.html` lines 29–63

**Arrays to extract verbatim:**
- `days[]` — index.html lines 29–60: 30 entries, used as `days[day()-1]`
- `questions[]` — index.html line 61: 9 entries, used as `questions[(day-1)%questions.length]`
- `cases[]` — index.html line 62: 4 entries, used as `cases[(day-1)%cases.length]`
- `interview[]` — index.html line 63: 8 entries with `[category, question]` shape

**New arrays to add (no existing analog):**
- `VOCAB[]` — 30-element array of 5-term objects: `{ id, term, meaning, everyday, interview }`
- `FOLLOWUPS{}` — object keyed by interview category (8 entries per RESEARCH.md)

**Export pattern:** Use plain `const` declarations (no UMD needed — content.js has no Node test requirement and no DOM refs; it just sets globals the browser can read):
```js
// content.js — no UMD wrapper needed; loaded before logic.js and app.js
const VOCAB = [ /* 30 × 5 term objects */ ];
const DAYS = [ /* existing days[] array verbatim */ ];
const QUESTIONS = [ /* existing questions[] verbatim */ ];
const CASES = [ /* existing cases[] verbatim */ ];
const INTERVIEW = [ /* existing interview[] verbatim */ ];
const FOLLOWUPS = { /* 8 category keys */ };
```

---

### `logic.js` (pure functions — UMD export)

**Analog:** `index.html` JS block lines 64–66 for `today()`, `esc()`, `save()` patterns; `worker/worker.test.mjs` for the UMD-compatible pattern.

**UMD export wrapper** (from RESEARCH.md — no existing analog but pattern is well-defined):
```js
(function(exports) {
  'use strict';
  // ALL pure functions here: no document, no window, no fetch
  exports.migrate = migrate;
  exports.validateBackup = validateBackup;
  exports.advanceLeitner = advanceLeitner;
  exports.selectReviewWords = selectReviewWords;
  exports.initWord = initWord;
  exports.computeStreak = computeStreak;
  exports.countFillers = countFillers;
  exports.checkVocab = checkVocab;
})(typeof module !== 'undefined' ? module.exports : (window.LOGIC = window.LOGIC || {}));
```

**`today()` / `addDays()` date pattern** (index.html line 66):
```js
// existing: today=()=>new Date().toLocaleDateString('en-CA')
// logic.js keeps date math as pure functions with todayStr injected for testability:
function today() { return new Date().toLocaleDateString('en-CA'); }
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
}
```

**`esc()` to keep in app.js only** (index.html line 66) — logic.js is pure data-transform; HTML escaping belongs in app.js which renders:
```js
// app.js keeps: esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
```

**All pure function implementations** are defined precisely in RESEARCH.md sections "Leitner 5-Box System", "Vocab Check Heuristic", "Streak & Grace Day Algorithm", "Filler-Word Count", "Data Migration". Copy those code blocks verbatim into logic.js.

---

### `app.js` (DOM + journey engine)

**Analog:** `index.html` JS block lines 64–123

**Storage load/save pattern** (index.html line 64, 66):
```js
// Load
let data = {};
try { data = JSON.parse(localStorage.getItem('recallData') || '{}'); } catch(e) {}
// Save (copy from index.html line 66, adapted for journey):
function save() {
  try {
    localStorage.setItem('recallData', JSON.stringify(data));
  } catch(e) {
    if (e.name === 'QuotaExceededError') showStorageFull();
  }
}
```

**`today()` function** (index.html line 66) — copy verbatim:
```js
const today = () => new Date().toLocaleDateString('en-CA');
```

**`day()` helper** (index.html line 66) — adapt for v2:
```js
// existing: day=()=>Math.max(1,Math.min(30,+data.day||1))
// Phase 2: same but data.day auto-advances; use same guard:
const day = () => Math.max(1, Math.min(30, +data.day || 1));
```

**Export/import backup pattern** (index.html lines 80 — export):
```js
// Export (copy verbatim, extend to include resume):
const a = document.createElement('a');
const payload = { recallData: data, recallResume: localStorage.getItem('recallResume') || '' };
const u = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
a.href = u; a.download = 'recall-backup.json'; a.click(); URL.revokeObjectURL(u);
```

**Timer pattern** (index.html lines 78–79):
```js
// existing stop() + runTimer(n) — copy structure, adapt to track phase (think vs speak):
let timer = null;
function stop() { if (timer) clearInterval(timer); timer = null; }
function runTimer(seconds, onTick, onExpire) {
  stop();
  let left = seconds;
  onTick(left);
  timer = setInterval(() => { left--; onTick(left); if (left <= 0) { stop(); onExpire(); } }, 1000);
}
```

**Event delegation pattern** (index.html lines 80–81) — keep the single `document.addEventListener('click', e => { ... })` approach; switch on `e.target.id` or `e.target.closest('[data-action]')`.

**`workerCall()` to keep verbatim** (index.html lines 95–106) — copy unchanged; Phase 2 never calls it, but it must be present for `checkAI()`.

**`checkAI()` to keep verbatim** (index.html lines 109–123) — copy unchanged.

**AI status bar** (index.html line 108) — `document.querySelector('.top').insertAdjacentHTML('beforeend', '<span id="aiStatus"...>')` — copy verbatim.

**Passcode modal wiring** (index.html lines 83–92) — copy verbatim (the IIFE block).

**Speech API pattern** — no existing analog in codebase; copy from RESEARCH.md "Web Speech API" section precisely as documented (SR feature detection, startRecording/stopRecording state machine, `continuous: false` + `onend` restart loop).

**pdf.js dynamic import pattern** — no existing analog; copy from RESEARCH.md "PDF Text Extraction" section (`loadPdfJs()`, `extractPDF()`).

**Render pattern** (index.html line 77):
```js
// existing: function render(){nav();save();$('#app').innerHTML=...}
// Phase 2: same shell but renders current journey step:
function render() {
  save();
  $('#app').innerHTML = renderStep(currentStep());
  // wiring for newly rendered elements follows
}
```

**`$` selector shorthand** (index.html line 66):
```js
const $ = s => document.querySelector(s);
```

---

### `logic.test.mjs` (self-check test)

**Analog:** `worker/worker.test.mjs` — exact pattern to mirror.

**Test file header pattern** (worker.test.mjs lines 1–8):
```js
// Run: node logic.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const LOGIC = require('./logic.js');
```

**Assertion pattern** (worker.test.mjs throughout):
```js
assert.equal(actual, expected, 'description of what should hold');
assert.deepEqual(actualObj, expectedObj);
// No test framework. If any assert throws, process exits non-zero.
```

**Final confirmation line** (worker.test.mjs line 145):
```js
console.log('logic self-check: all passed');
```

**Test cases required** (from RESEARCH.md "Phase Requirements → Test Map"):
- Leitner box advance: all box transitions (1→2 correct, 2→1 wrong, 5→5 correct, 5→1 wrong)
- Leitner interval dates: box 1 → tomorrow, box 2 → +2 days, box 4 → +8 days, box 5 → +999
- `selectReviewWords`: cap at 5, sort by lowest box first, skip box 5
- `computeStreak`: 3-day run = 3; 3 + 1 miss + 1 = 4 (grace); 3 + 2 misses = 3 (grace consumed)
- `countFillers`: "um like you know" = 3; clean sentence = 0
- `checkVocab`: term present = correct; < 6 words = wrong; example-copy = wrong; abbreviation match = correct
- `migrate`: existing keys untouched; `_version` set to 2; `vocab` and `weakspots` added
- `validateBackup`: valid object passes; missing `day` fails; non-object fails

---

## Shared Patterns

### HTML Escaping
**Source:** `index.html` line 66, `bakeoff.html` line 103
**Apply to:** All `innerHTML` assignments in `app.js`
```js
const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
```

### localStorage Read/Write with Error Guard
**Source:** `index.html` lines 64, 66
**Apply to:** All `localStorage.setItem` calls in `app.js`
```js
// Read: try/catch on parse, default to {}
// Write: try/catch on setItem, catch QuotaExceededError specifically
```

### Timer Stop on Navigation
**Source:** `index.html` line 65, 78 (`let timer=null; stop()` called in nav handler)
**Apply to:** Every step transition in `app.js` — call `stop()` before rendering the next step.

### AI Status Bar + workerCall
**Source:** `index.html` lines 95–123
**Apply to:** `app.js` — copy both functions verbatim; they are not modified in Phase 2.

### `.hidden` Class Toggle
**Source:** `index.html` line 8 (`.hidden{display:none!important}`), used throughout both files
**Apply to:** All conditional visibility in `app.js` — use `el.classList.add/remove('hidden')`, never `el.style.display`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Journey stepper component (HTML/CSS) | component | — | No multi-step stepper exists; build from UI-SPEC component #1 description |
| Speech API recording state machine | controller | event-driven | No speech code exists; implement from RESEARCH.md "Web Speech API" section |
| pdf.js extraction flow | utility | file-I/O | No PDF code exists; implement from RESEARCH.md "PDF Text Extraction" section |
| Leitner scheduler | utility | batch | No spaced-repetition code exists; implement from RESEARCH.md "Leitner 5-Box System" |
| 30-day progress grid (HTML/CSS) | component | — | No grid component exists; build from UI-SPEC component #9 |

---

## Metadata

**Analog search scope:** `index.html`, `bakeoff.html`, `worker/worker.test.mjs`, `worker/worker.js` (via test file)
**Files scanned:** 4
**Pattern extraction date:** 2026-11-09
