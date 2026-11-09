# Phase 1: Proxy & Hosting — Pattern Map

**Mapped:** 2026-11-09
**Files analyzed:** 7 (new/modified)
**Analogs found:** 1 / 7 (index.html modifications only; all other files are greenfield with no in-repo analog)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `worker/worker.js` | service (proxy) | request-response | none | no analog |
| `config.js` | config | — | none | no analog |
| `index.html` (passcode modal + script tag) | component / config | request-response | `index.html` itself | self (modify existing) |
| `bakeoff.html` | utility UI | request-response | none | no analog |
| `.gitignore` | config | — | none | no analog |
| `.git/hooks/pre-commit` | utility (git hook) | — | none | no analog |
| `docs/SETUP.md` | documentation | — | none | no analog |

---

## Pattern Assignments

### `worker/worker.js` (service, request-response)

**Analog:** None in repo. Use the complete implementation from RESEARCH.md verbatim — it was purpose-written for this stack.

**Key implementation notes:**
- Entry point: `export default { async fetch(request, env) { ... } }`
- `env` holds Worker Secrets (`NIM_KEY_1`–`NIM_KEY_4`, `PASSCODE`) and Variables (`ALLOWED_ORIGIN`, `PRIMARY_MODEL`, `FALLBACK_MODEL`, `DAILY_CAP`) and KV binding (`env.KV`)
- In-memory round-robin index `let idx = 0` at module scope — resets on cold start, acceptable for personal tool
- Task switch: `const task = body.task || 'unknown'` → `if (task === 'ping')` / `if (task === 'bakeoff')` / catch-all 400
- `callNIM` retries all keys on 429 or 5xx; breaks on other 4xx; then retries all keys on fallback model
- `nimRequest` omits `chat_template_kwargs` for non-thinking models (guard: `model.includes('super') || model.includes('ultra')`)
- `stripThink` removes `<think>…</think>` with one regex: `s.replace(/<think>[\s\S]*?<\/think>/g, '').trim()`
- KV daily cap: key `calls:YYYY-MM-DD`, `expirationTtl: 86400`, wrapped in `if (env.KV)` so Worker works without KV binding during dev
- Helper `json(obj, status, headers)` returns `new Response(JSON.stringify(obj), { status, headers })`
- CORS helper `CORS(origin)` returns the four required headers as an object

**BAKEOFF_SYSTEM prompt** (copy verbatim from RESEARCH.md — exact JSON schema matters):
```
You are a PM interview coach evaluating an answer.
Respond ONLY with valid JSON, no prose before or after:
{"score":1-10,"went_right":"...","fix":"...","rewrite":"...","tags":["..."]}
Score rubric: structure, clarity, PM vocabulary, metrics, impact, conciseness.
"fix" is one specific actionable improvement in plain language.
"rewrite" is one better sentence. Under 80 words total response.
```

---

### `config.js` (config)

**Analog:** None in repo.

**Pattern** (trivial, one object literal):
```js
// config.js — Worker URL only (not a secret)
const CONFIG = { workerUrl: 'https://recall-proxy.username.workers.dev' };
```

Planner note: `workerUrl` value is a placeholder; user replaces with actual Worker URL after deploy. This file is committed. The passcode is NOT in this file.

---

### `index.html` — modifications (component, request-response)

**Analog:** `index.html` itself — reuse existing patterns exactly.

**Existing helpers to reuse** (index.html line 56):
```js
const $ = s => document.querySelector(s);
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({...}[c]));
const save = () => { localStorage.setItem('recallData', JSON.stringify(data)); ... };
// localStorage read pattern:
let data = {}; try { data = JSON.parse(localStorage.getItem('recallData') || '{}') } catch(e) {}
```

**Existing CSS variables to reuse** (index.html lines 6–9):
```css
--bg:#0d1421; --panel:#151f30; --panel2:#1d2a3e; --line:#2a3a50;
--text:#edf3fb; --muted:#9eacc0; --accent:#8b9cff; --green:#62d6a4
/* element classes: .card, .btn, .btn.primary, .small, .muted, .row */
/* input style: background:#0d1726; border:1px solid var(--line); border-radius:10px; padding:12px */
```

**Passcode modal — pattern to add:**

Two changes to `index.html`:

1. Add `<script src="config.js"></script>` before the closing `</body>` tag (or just before the inline `<script>`).

2. Add a passcode setup modal that fires on first visit. Insert before `</body>`:

```html
<!-- passcode setup modal — shown when localStorage.passcode is unset -->
<div id="setupModal" style="display:none;position:fixed;inset:0;background:#0d142199;z-index:99;display:flex;align-items:center;justify-content:center">
  <div class="card" style="max-width:360px;width:100%">
    <h2>First-time setup</h2>
    <p class="muted">Enter the passcode you will set in the Cloudflare Worker. It is stored locally and never sent anywhere directly.</p>
    <input type="password" id="passcodeInput" placeholder="Passcode">
    <button class="btn primary" id="savePasscode">Save &amp; continue</button>
  </div>
</div>
```

Add to the inline `<script>` block (before `render()` call):
```js
// passcode first-run setup
(function(){
  var m = document.getElementById('setupModal');
  if (!localStorage.getItem('passcode')) { m.style.display = 'flex'; }
  document.getElementById('savePasscode').addEventListener('click', function(){
    var v = document.getElementById('passcodeInput').value.trim();
    if (!v) return;
    localStorage.setItem('passcode', v);
    m.style.display = 'none';
  });
})();
```

**Worker call helper** — add to inline `<script>` for use in Phase 3:
```js
// ponytail: minimal wrapper; Phase 3 adds task-specific callers
function workerCall(task, payload) {
  return fetch(CONFIG.workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: localStorage.getItem('passcode'), task, ...payload })
  }).then(r => r.json());
}
```

---

### `bakeoff.html` (utility UI, request-response)

**Analog:** None in repo. `index.html` provides the CSS variables and class conventions to copy.

**Pattern:** Standalone HTML page, no build step, no nav links from main app. Reuse `index.html` CSS verbatim (copy the full `<style>` block). Structure:

```
<head> — same charset/viewport/theme-color as index.html
<style> — copy full :root + * block from index.html lines 6–9
<body>
  Worker URL input (pre-filled from CONFIG.workerUrl if config.js is loaded)
  Passcode input (pre-filled from localStorage.getItem('passcode'))
  Model selector: three <option> values from RESEARCH.md
  Three <textarea> pre-filled with the three sample answers from RESEARCH.md
  "Run bake-off" <button class="btn primary">
  Results <table> (hidden until results arrive)
  Status <p> for loading / error messages
<script src="config.js"></script>
<script> — inline, no modules
  async function runBakeoff() { ... fetch(workerUrl, {task:'bakeoff', ...}) ... }
  Render results table from response.results array
</script>
```

**Three sample answers** (copy verbatim from RESEARCH.md — scoring rubric depends on exact wording):
1. "Payment conversion dropped 15%. I would look at the data and find the problem and fix it."
2. "Payment conversion fell from 72% to 59% in two weeks. I would segment by platform, payment method, and user cohort; check for latency spikes on the payments API; and rule out UX regressions from the recent deploy before proposing solutions."
3. "So, like, I would first check everything and also talk to stakeholders and also look at the data and then maybe do some user interviews and then probably fix it after figuring out the main thing that's wrong."

**Three models** (dropdown options):
- `nvidia/nemotron-3-super-120b-a12b` (Primary)
- `nvidia/llama-3.1-nemotron-70b-instruct` (Baseline)
- `nvidia/nemotron-3.5-lightning-30b-a3b` (Speed / Fallback)

---

### `.gitignore` (config)

**Analog:** None in repo (no `.gitignore` exists yet).

**Pattern** (from RESEARCH.md Secret Hygiene section):
```
# Wrangler local secrets — NEVER commit
.dev.vars
*.dev.vars

# Node install if wrangler is used locally
node_modules/
wrangler.lock
```

---

### `.git/hooks/pre-commit` (utility, git hook)

**Analog:** None in repo.

**Pattern** (from RESEARCH.md):
```sh
#!/bin/sh
# Reject commits containing NVIDIA API keys
if git diff --cached -U0 | grep -q 'nvapi-'; then
  echo "ERROR: Possible NVIDIA API key detected in staged files. Remove before committing."
  exit 1
fi
```

Planner note: File must be `chmod +x`-ed after creation. This is inside `.git/` and not committed; the setup guide (SETUP.md) must include the creation step.

---

### `docs/SETUP.md` (documentation)

**Analog:** None in repo.

**Content outline** (all detail is in RESEARCH.md sections "No-Code Deployment Guide", "KV Namespace Setup", "Failover Testing", "Secret Hygiene"):
1. Prerequisites (Cloudflare account, NVIDIA NIM API keys, GitHub repo already exists)
2. Section A: Create and deploy the Cloudflare Worker (paste `worker/worker.js`, add Secrets, add Variables)
3. Section B: Set up KV namespace and bind it
4. Section C: Update `config.js` with your Worker URL
5. Section D: Enable GitHub Pages (Settings → Pages → main → root)
6. Section E: First visit — enter passcode in the app's setup modal
7. Section F: Run bake-off via `bakeoff.html`
8. Section G: Security — set up pre-commit hook and clean-history check
9. Verification commands (curl snippets from RESEARCH.md "Curl Commands Reference")

---

## Shared Patterns

### localStorage access
**Source:** `index.html` line 54
**Apply to:** `index.html` modifications, `bakeoff.html`
```js
// Read
localStorage.getItem('passcode')
localStorage.getItem('recallData')
// Write (non-data keys)
localStorage.setItem('passcode', value)
```

### CSS design system
**Source:** `index.html` lines 6–9
**Apply to:** `bakeoff.html` (copy full `<style>` block)
Classes available: `.card`, `.btn`, `.btn.primary`, `.small`, `.muted`, `.row`, `.tag`, `.hidden`, `.grid`, `.stat`

### HTML escaping
**Source:** `index.html` line 56
**Apply to:** `bakeoff.html` anywhere user input is rendered into HTML
```js
const esc = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `worker/worker.js` | service | request-response | No server-side code exists in repo; Worker runtime is Cloudflare-specific |
| `config.js` | config | — | No config files exist in repo |
| `bakeoff.html` | utility UI | request-response | Only one HTML file in repo; bakeoff is a distinct standalone page |
| `.gitignore` | config | — | No `.gitignore` exists yet |
| `.git/hooks/pre-commit` | utility | — | No git hooks exist yet |
| `docs/SETUP.md` | documentation | — | No docs directory exists yet |

For all of these, the planner should use the RESEARCH.md code examples directly — they are purpose-written and production-ready.

---

## Metadata

**Analog search scope:** Entire repo (single file: `index.html`)
**Files scanned:** 1
**Pattern extraction date:** 2026-11-09
