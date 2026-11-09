# Phase 1: Proxy & Hosting — Research

**Researched:** 2026-11-09
**Domain:** Cloudflare Workers proxy, NVIDIA NIM API, GitHub Pages, secret hygiene, rate limiting
**Confidence:** HIGH (prior stack research was live-verified; Cloudflare free-tier details are ASSUMED)

---

## Summary

Phase 1 establishes the security boundary between the public browser app and NVIDIA NIM. Everything that must remain secret (API keys, rate-limit state) lives exclusively in Cloudflare Worker Secrets and KV. The browser side has no secrets — only a Worker URL (not sensitive) and a user-entered passcode stored in localStorage.

The Worker uses a **task-based contract** (`{task, ...payload}`) rather than a raw message passthrough. This matters because Phase 3 (coach prompts) will add prompt logic to the Worker; with a task contract, Phase 3 adds one `case "coach":` block and nothing else changes. A raw passthrough would let the page construct its own system prompts, defeating the prompt-injection guard.

Phase 1 ships the Worker skeleton with `ping` and `bakeoff` tasks, key rotation, fallback model, KV-backed daily cap, and the GitHub Pages enable step. Phase 3 adds `coach` to the same contract without touching the wire format.

**Primary recommendation:** Ship a task-based Worker contract in Phase 1. The page sends `{task, passcode, ...}`. The Worker switches on `task`. Phase 3 slots in by adding `case "coach":` — no contract change, no frontend change.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROXY-01 | All AI calls go through a Cloudflare Worker; NVIDIA keys live only in Worker secrets, nothing secret in repo or browser | Worker Secrets pattern; task-based contract; passcode in localStorage not committed |
| PROXY-02 | Worker rotates across 3-4 keys, moves to next on 429/5xx, falls back to fast model if primary fails | Key rotation loop; `NIM_KEY_1..4` Secrets; in-memory round-robin counter; fallback model variable |
| PROXY-03 | Worker only serves GitHub Pages origin + passcode, enforces daily request cap | Origin header check; `X-Passcode` or body passcode; KV daily counter |
| PROXY-04 | User can set up Cloudflare and GitHub Pages by following guide, without writing code | Dashboard-only deploy steps; paste Worker code; add Secrets in UI |
| PROXY-05 | Model confirmed by bake-off on 3 sample answers with real keys; switchable in Worker settings without code change | `PRIMARY_MODEL` as Worker var; `bakeoff` task + `bakeoff.html`; scoring rubric |
| PROXY-06 | App is live on GitHub Pages from https://github.com/saitejatiru/recall | GitHub Pages Settings → Pages → branch main → root |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| API key storage | Cloudflare Worker (Secrets) | — | Keys never reach browser or repo; Worker Secrets are encrypted at rest |
| NIM call dispatch | Cloudflare Worker | — | CORS is blocked from browser; Worker is the only viable proxy |
| Key rotation / failover | Cloudflare Worker | — | Rotation state must be server-side; browser has no visibility |
| Origin + passcode auth | Cloudflare Worker | — | First line of abuse defence; must run before any key is used |
| Daily rate cap | Cloudflare Worker + KV | — | Counter must persist across Worker cold starts; KV is the right store |
| Worker URL config | Browser (committed config) | — | URL is not secret; commits to `config.js` or inline in `app.js` |
| Passcode config | Browser (localStorage) | — | User enters once; never committed; read from localStorage per request |
| Static hosting | GitHub Pages | — | Serves `index.html` from main branch root; free, zero config |
| Bake-off UI | Browser (`bakeoff.html`) | Worker (`bakeoff` task) | Non-developer needs a clickable interface; Worker computes results |

---

## Standard Stack

### Core

| Component | Version / ID | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| Cloudflare Worker | free tier | Proxy + auth + key rotation | Only viable way to call CORS-blocked NIM from browser; 100K req/day free; Secrets encrypted |
| Workers KV | free tier | Daily request counter | Persists across cold starts; 100K reads/day + 1K writes/day free [ASSUMED] |
| NIM `nvidia/nemotron-3-super-120b-a12b` | live (Mar 2026) | Primary AI model | Established in STACK.md research; 12B active params, `enable_thinking: false` |
| NIM `nvidia/nemotron-3.5-lightning-30b-a3b` | live | Fallback model | ~3B active params; sub-second; same API; for when all primary-model 429s exhaust |
| GitHub Pages | — | Static hosting | Free; zero server config; `index.html` from main branch root |

### Supporting

| Component | Purpose | Notes |
|-----------|---------|-------|
| `config.js` (committed) | Holds Worker URL only | Not a secret; committed to repo; `const CONFIG = { workerUrl: '...' }` |
| localStorage `passcode` key | Holds passcode entered by user | Never committed; read on every Worker call |
| `bakeoff.html` (committed) | Bake-off UI for non-developer | Standalone page; not linked from main UI; uses same Worker `bakeoff` task |

### Cloudflare Free Tier Limits [ASSUMED]

| Resource | Free Limit | Phase 1 Usage |
|----------|-----------|----------------|
| Worker requests | 100,000 / day | ~5–10 / session, well under |
| Worker CPU time | 10 ms / invocation | Actual CPU (excluding I/O wait) is ~2–3 ms; fine |
| KV reads | 100,000 / day | 1 read per request for counter; fine |
| KV writes | 1,000 / day | 1 write per request; fine for personal use |
| Worker Secrets | Up to 100 | 5 secrets (NIM_KEY_1..4, PASSCODE); fine |

> **Note on Rate Limiting binding:** Cloudflare's built-in Rate Limiting binding (the `RateLimit` binding in `wrangler.toml`) requires a Workers Paid plan [ASSUMED]. For the free plan, implement the daily cap with KV. Per-IP rate limiting is not feasible with KV alone (too many keys); rely on the global daily cap plus origin+passcode to deter abuse.

---

## Worker Contract (Task-Based)

### Why task-based, not raw passthrough

A raw passthrough forwards the page's `messages` array to NIM. The page would construct its own system prompt. Problems:
- Phase 3's PM coaching prompt lives in the page → page can override it at runtime
- Prompt injection via crafted answers can override system instructions
- No single locked place to enforce JSON schema or persona

A task-based contract has the Worker own all model parameters and system prompts:

```
Page → Worker: { task: "ping"|"bakeoff"|"coach", passcode: "...", ...payload }
Worker → NIM: { model, messages: [SYSTEM_PROMPT + user_payload], max_tokens, ... }
Worker → Page: { ok } | { results } | { score, went_right, fix, rewrite }
```

Phase 3 adds `case "coach":` with its system prompt. The contract (URL, auth, task shape) does not change.

### Request body shape (page → Worker)

```json
// Ping (Phase 1 test)
{ "passcode": "...", "task": "ping" }

// Bake-off (Phase 1 PROXY-05)
{ "passcode": "...", "task": "bakeoff", "model": "nvidia/nemotron-3-super-120b-a12b", "answers": ["...", "...", "..."] }

// Coach (Phase 3 — contract defined now, implemented later)
{ "passcode": "...", "task": "coach", "type": "...", "day": 1, "prompt": "...", "answer": "...", "resume": "..." }
```

### Response shape (Worker → page)

```json
// Ping
{ "ok": true, "ts": 1731110400000 }

// Bakeoff
{ "results": [ { "answer_index": 0, "model": "...", "latency_ms": 820, "feedback": {...}, "valid_json": true } ] }

// Error (any task)
{ "error": "auth_failed|rate_limit|model_unavailable|invalid_json|timeout", "retry": true }
```

---

## Worker Implementation

### Complete Phase 1 Worker

```js
// worker/worker.js — Phase 1: auth, rotation, ping, bakeoff
// Phase 3 adds: case "coach" with system prompt injection

// ponytail: in-memory round-robin; resets on cold start, fine for personal tool
let idx = 0;

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
});

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://saitejatiru.github.io';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Origin guard
    const origin = request.headers.get('Origin') || '';
    if (origin !== allowedOrigin) {
      return json({ error: 'auth_failed' }, 403, CORS(allowedOrigin));
    }

    // Parse body
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'bad_request' }, 400, CORS(allowedOrigin)); }

    // Passcode guard
    if (body.passcode !== env.PASSCODE) {
      return json({ error: 'auth_failed' }, 403, CORS(allowedOrigin));
    }

    // Daily cap (KV counter)
    if (env.KV) {
      const dateKey = 'calls:' + new Date().toISOString().slice(0, 10);
      const count = parseInt(await env.KV.get(dateKey) || '0', 10);
      const cap = parseInt(env.DAILY_CAP || '300', 10);
      if (count >= cap) {
        return json({ error: 'rate_limit', retry: false }, 429, CORS(allowedOrigin));
      }
      await env.KV.put(dateKey, String(count + 1), { expirationTtl: 86400 });
    }

    const task = body.task || 'unknown';

    // --- PING ---
    if (task === 'ping') {
      return json({ ok: true, ts: Date.now() }, 200, CORS(allowedOrigin));
    }

    // --- BAKEOFF ---
    if (task === 'bakeoff') {
      const model = body.model || env.PRIMARY_MODEL || 'nvidia/nemotron-3-super-120b-a12b';
      const answers = Array.isArray(body.answers) ? body.answers : [];
      const keys = nimKeys(env);
      const results = [];

      for (let i = 0; i < answers.length; i++) {
        const t0 = Date.now();
        const { content, error } = await callNIM(keys, model, [
          { role: 'system', content: BAKEOFF_SYSTEM },
          { role: 'user', content: answers[i] },
        ], env);
        const latency_ms = Date.now() - t0;

        let feedback = null, valid_json = false;
        if (content) {
          try { feedback = JSON.parse(stripThink(content)); valid_json = true; }
          catch { feedback = { raw: content }; }
        }
        results.push({ answer_index: i, model, latency_ms, feedback, valid_json, error: error || null });
      }

      return json({ results }, 200, CORS(allowedOrigin));
    }

    // --- COACH (Phase 3 adds this) ---
    // case "coach": ... (system prompt injection goes here in Phase 3)

    return json({ error: 'unknown_task' }, 400, CORS(allowedOrigin));
  },
};

// Shared NIM call with key rotation + fallback model
async function callNIM(keys, model, messages, env) {
  const primary = model;
  const fallback = env.FALLBACK_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';

  // Try all keys on primary model
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[idx % keys.length];
    idx = (idx + 1) % keys.length;
    const result = await nimRequest(key, primary, messages);
    if (result.content) return result;
    if (result.status !== 429 && result.status < 500) break; // non-retriable error
  }

  // All primary keys exhausted → try fallback model (same keys, one more pass)
  if (fallback && fallback !== primary) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = keys[idx % keys.length];
      idx = (idx + 1) % keys.length;
      const result = await nimRequest(key, fallback, messages);
      if (result.content) return result;
    }
  }

  return { content: null, error: 'rate_limit' };
}

async function nimRequest(key, model, messages) {
  try {
    const isThinkingModel = model.includes('super') || model.includes('ultra');
    const body = {
      model,
      messages,
      max_tokens: 400,
      temperature: isThinkingModel ? 1.0 : 0.5,
      top_p: isThinkingModel ? 0.95 : undefined,
      ...(isThinkingModel ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    };
    // Remove undefined keys
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (resp.status === 429 || resp.status >= 500) {
      return { content: null, status: resp.status };
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    return { content: stripThink(raw), status: resp.status };
  } catch (e) {
    return { content: null, status: 0, error: 'timeout' };
  }
}

function nimKeys(env) {
  return [env.NIM_KEY_1, env.NIM_KEY_2, env.NIM_KEY_3, env.NIM_KEY_4].filter(Boolean);
}

function stripThink(s) {
  // ponytail: strip <think>...</think> blocks emitted by reasoning models
  return s.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}

// Bake-off system prompt — evaluates PM interview answers
const BAKEOFF_SYSTEM = `You are a PM interview coach evaluating an answer.
Respond ONLY with valid JSON, no prose before or after:
{"score":1-10,"went_right":"...","fix":"...","rewrite":"...","tags":["..."]}
Score rubric: structure, clarity, PM vocabulary, metrics, impact, conciseness.
"fix" is one specific actionable improvement in plain language.
"rewrite" is one better sentence. Under 80 words total response.`;
```

---

## Secrets and Variables

### Worker Secrets (never in any file)

| Secret name | Value | How to add |
|-------------|-------|------------|
| `NIM_KEY_1` | First NVIDIA API key | Dashboard → Worker → Settings → Variables → Add Secret |
| `NIM_KEY_2` | Second NVIDIA API key | Same |
| `NIM_KEY_3` | Third NVIDIA API key | Same |
| `NIM_KEY_4` | Fourth NVIDIA API key (optional) | Same |
| `PASSCODE` | Chosen passcode (e.g., `recall-train-2026`) | Same |

### Worker Variables (plain text — not sensitive)

| Variable name | Value | Purpose |
|---------------|-------|---------|
| `ALLOWED_ORIGIN` | `https://saitejatiru.github.io` | CORS + auth check |
| `PRIMARY_MODEL` | `nvidia/nemotron-3-super-120b-a12b` | Switchable without code change |
| `FALLBACK_MODEL` | `nvidia/nemotron-3.5-lightning-30b-a3b` | Switchable without code change |
| `DAILY_CAP` | `300` | Max requests/day (adjust freely) |

**To switch model:** Cloudflare Dashboard → Worker → Settings → Variables → edit `PRIMARY_MODEL` → Save → (auto-deploy or click Deploy). Zero code change.

---

## KV Namespace Setup

The daily cap requires one KV namespace bound to the Worker.

**Dashboard steps (no Wrangler needed):**
1. Cloudflare Dashboard → Storage → KV → Create Namespace → name: `recall-ratelimit`
2. Worker → Settings → KV Namespace Bindings → Add: Variable name `KV` → Namespace: `recall-ratelimit`
3. Deploy

**How the cap works:** Key `calls:2026-11-09` holds the count. Incremented on each request. `expirationTtl: 86400` auto-expires at ~24h so no manual cleanup is needed.

**Free KV limits (1K writes/day):** At ~5–10 calls/session and 1 session/day, writes are ~10/day. Well within limit.

---

## No-Code Deployment Guide (Summary for PROXY-04)

The planner should produce a step-by-step guide covering:

### A. Cloudflare Worker

1. Create a Cloudflare account at cloudflare.com (free).
2. Dashboard → Workers & Pages → Create → Worker → name it `recall-proxy` → Deploy.
3. Click "Edit Code" → paste the contents of `worker/worker.js` → Save and Deploy.
4. Settings → Variables → Add Secret → `NIM_KEY_1` (paste key, check "Encrypt") → Save. Repeat for `NIM_KEY_2`, `NIM_KEY_3`, `PASSCODE`.
5. Settings → Variables → Add Variable → `ALLOWED_ORIGIN` = `https://saitejatiru.github.io`. Add `PRIMARY_MODEL`, `FALLBACK_MODEL`, `DAILY_CAP` similarly.
6. Storage → KV → Create Namespace → `recall-ratelimit`. Then Worker Settings → KV Namespace Bindings → Add `KV` → `recall-ratelimit` → Deploy.
7. Worker URL is shown at top of the Worker page (e.g. `https://recall-proxy.username.workers.dev`). Copy it.

### B. `config.js`

Add to repo root:

```js
// config.js — Worker URL only (not a secret)
const CONFIG = { workerUrl: 'https://recall-proxy.username.workers.dev' };
```

Add `<script src="config.js"></script>` before `app.js` in `index.html`.

### C. Passcode first-run UI

Add a small first-run setup modal to `index.html`:
- Shows on first visit (or when `localStorage.getItem('passcode')` is null)
- One `<input type="password">` → "Save" stores value to `localStorage.passcode`
- Never submitted to any server directly; read from localStorage when making Worker calls

### D. GitHub Pages

1. Push all files to `main` branch of https://github.com/saitejatiru/recall.
2. GitHub → repo Settings → Pages → Source: "Deploy from a branch" → Branch: `main` → Folder: `/ (root)` → Save.
3. After ~1 minute, the site is live at `https://saitejatiru.github.io/recall/`.

---

## Bake-Off (PROXY-05)

### bakeoff.html design

A standalone page (committed at repo root as `bakeoff.html`, not linked from the main UI). The learner opens it in a browser after entering the Worker URL and passcode.

```
bakeoff.html:
  - Worker URL input (pre-filled from config.js if loaded)
  - Passcode input
  - Model selector dropdown (primary / fallback / custom)
  - Three pre-filled answer textareas (from sample answers below)
  - "Run bake-off" button → calls Worker `bakeoff` task for each model in turn
  - Results table: Answer | Model | JSON Valid | Score | Fix quality | Latency
```

The Worker `bakeoff` task accepts a list of answers and a model; returns per-answer feedback. The page calls it three times (once per model) and renders the comparison table.

### Three sample answers

| # | Description | Answer text |
|---|-------------|-------------|
| 1 | Vague / weak | "Payment conversion dropped 15%. I would look at the data and find the problem and fix it." |
| 2 | Strong / structured | "Payment conversion fell from 72% to 59% in two weeks. I would segment by platform, payment method, and user cohort; check for latency spikes on the payments API; and rule out UX regressions from the recent deploy before proposing solutions." |
| 3 | Rambling / no structure | "So, like, I would first check everything and also talk to stakeholders and also look at the data and then maybe do some user interviews and then probably fix it after figuring out the main thing that's wrong." |

### Scoring sheet

| Criterion | Answer 1 expected | Answer 2 expected | Answer 3 expected |
|-----------|------------------|------------------|------------------|
| JSON valid | Y | Y | Y |
| All fields present (score, went_right, fix, rewrite) | Y | Y | Y |
| Score accuracy | 2–4 (weak) | 7–9 (strong) | 2–4 (weak) |
| Fix is PM-specific, not generic | check | check | check |
| Rewrite is concretely better | check | check | check |
| Latency < 3s | check | check | check |

**Fail signals:** Score 6+ for Answer 1 or 3 = model is too lenient. Score <6 for Answer 2 = model is too harsh. Generic "add more detail" in `fix` field = prompt needs refinement.

**Model selection:** Run all three sample answers through these models:
1. `nvidia/nemotron-3-super-120b-a12b` (thinking OFF) — primary candidate
2. `nvidia/llama-3.1-nemotron-70b-instruct` — baseline
3. `nvidia/nemotron-3.5-lightning-30b-a3b` — speed check / potential fallback

---

## Failover Testing Without Burning Quota

To test key rotation without real 429s:

**Method 1 — Invalid first key (simplest):**
Set `NIM_KEY_1` in Worker Secrets to `nvapi-invalid-test-key-do-not-use`. On the first call, NIM returns 401 (or 400). The Worker's retry loop moves to `NIM_KEY_2`. Verify success. Then restore `NIM_KEY_1` to a real key.

**Method 2 — Test-only endpoint:**
Add a `test-rotation` task to the Worker (gated by passcode) that makes one NIM call per key and returns `{ key_index, status }` for each attempt, without actually calling the real NIM endpoint (use `https://httpbin.org/status/429` instead). Remove before production.

**Method 3 — Cloudflare Workers logs:**
After a real request, check Worker logs (Cloudflare Dashboard → Worker → Logs → Live) to verify key index rotation is happening.

---

## Secret Hygiene

### .gitignore additions

```
# Wrangler local secrets — NEVER commit
.dev.vars
*.dev.vars

# Node install if wrangler is used locally
node_modules/
wrangler.lock
```

### Pre-commit hook

Create `.git/hooks/pre-commit`:

```sh
#!/bin/sh
# Reject commits containing NVIDIA API keys
if git diff --cached -U0 | grep -q 'nvapi-'; then
  echo "ERROR: Possible NVIDIA API key detected in staged files. Remove before committing."
  exit 1
fi
```

```sh
chmod +x .git/hooks/pre-commit
```

> Note: `.git/hooks/` is not committed to the repo (it's inside `.git/`). The setup guide must include this step.

### GitHub push protection

GitHub automatically scans public repositories for known secret patterns. NVIDIA NIM API keys starting with `nvapi-` are detected by GitHub Secret Scanning [ASSUMED — verify at github.com/settings/security-analysis]. If a key slips past the pre-commit hook, GitHub will block the push (or alert immediately after).

### Clean history check

```bash
# Check entire git history for any NVIDIA key pattern
git log -p --all | grep -i 'nvapi-'
# Should return nothing

# Also check current working tree
grep -r "nvapi-" . --include="*.js" --include="*.html" --include="*.json" --include="*.toml"
```

---

## Common Pitfalls

### Pitfall 1: Passcode in Committed JS
**What goes wrong:** Developer puts `const PASSCODE = "recall-train"` in `config.js` and commits it. Anyone who reads the public repo now has the passcode.
**How to avoid:** `config.js` holds only the Worker URL. Passcode is entered by the user and stored in `localStorage.passcode`. Never in any file.

### Pitfall 2: Origin Header Spoofable — Rate Cap Is the Real Guard
**What goes wrong:** Origin check is bypassed with `curl -H "Origin: https://saitejatiru.github.io"`. The passcode is in `localStorage` so a person who views source of the page can find the passcode pattern. The combo of origin + passcode is anti-bot, not anti-human.
**How to avoid:** Accept this limitation for a free personal tool. The KV daily cap (300 req/day default) caps the blast radius. Someone with the passcode can burn 300 calls; not catastrophic for NVIDIA free-tier credits. Keep `DAILY_CAP` conservative.

### Pitfall 3: KV `put` on Every Request Costs a Write
**What goes wrong:** KV free tier is 1,000 writes/day. If the app is hammered (e.g., abuse), writes exhaust and KV `put` starts throwing. The Worker silently stops counting and the cap is bypassed.
**How to avoid:** Wrap KV operations in try/catch. On KV failure, continue the request (better to serve than block). Log KV errors to the Worker logs. With normal use (~10 req/day), 1K writes is never reached.

### Pitfall 4: `enable_thinking` Omitted on Fallback Model
**What goes wrong:** `chat_template_kwargs` is sent to `nvidia/nemotron-3.5-lightning-30b-a3b` which may not support it, returning a 400 error. The fallback fails even though the model is live.
**How to avoid:** The Worker code (above) only adds `chat_template_kwargs` when the model name contains `super` or `ultra`. The lightning fallback gets simpler params.

### Pitfall 5: GitHub Pages Serves From Wrong Branch
**What goes wrong:** GitHub Pages is configured to serve from `gh-pages` branch (the GitHub default for many repos). The `main` branch has the actual files. Result: 404 at the Pages URL.
**How to avoid:** Explicitly set Settings → Pages → Branch to `main`, Folder to `/ (root)`. Verify at `https://saitejatiru.github.io/recall/index.html`.

### Pitfall 6: `wrangler.toml` Has Secrets in `[vars]`
**What goes wrong:** `[vars]` in `wrangler.toml` is committed to the repo. Putting NIM keys in `[vars]` = public keys.
**How to avoid:** `wrangler.toml` only defines non-sensitive config (account ID, route). Secrets go through Dashboard UI or `wrangler secret put`. The Worker code above reads secrets from `env.NIM_KEY_1` etc., which are only populated from Worker Secrets.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Key rotation across NIM API keys | Custom key pool manager | The 15-line loop in the Worker | The loop handles 429/5xx retry; complexity is in the index math, already solved |
| Rate limiting | Per-IP token bucket | KV daily global cap | Per-IP needs too many KV keys for the write budget; global cap is sufficient for a personal tool |
| Secret storage | Encrypted localStorage, obfuscated JS | Cloudflare Worker Secrets | Secrets are encrypted at rest in Cloudflare; browser can never reach them |
| CORS proxy | Custom Node.js server | Cloudflare Worker | Zero infra, zero maintenance, 100K req/day free |
| `<think>` block stripping | Custom XML parser | One-liner regex in Worker | `s.replace(/<think>[\s\S]*?<\/think>/g, '').trim()` |

---

## Validation Architecture

### Test Map (Phase 1 success criteria → verification steps)

| Success Criterion | Test Type | Command / Method | Who |
|-------------------|-----------|------------------|-----|
| App on GitHub Pages calls Worker and receives valid AI response | Integration | `curl` ping then `bakeoff.html` | Human (needs real keys + deployed Worker) |
| 429 on one NIM key → auto-advance to next, no visible failure | Integration | Set `NIM_KEY_1` to invalid value; run `bakeoff.html`; verify results come back | Human (needs deployed Worker) |
| Requests without passcode rejected | Automated | `curl -X POST {WORKER_URL} -H "Content-Type: application/json" -d '{"task":"ping"}' ` → 403 | Human after deploy |
| Requests from wrong origin rejected | Automated | `curl -X POST {WORKER_URL} -H "Origin: https://evil.com" -H "Content-Type: application/json" -d '{"passcode":"X","task":"ping"}'` → 403 | Human after deploy |
| No NVIDIA key in repo history | Automated | `git log -p --all | grep -i 'nvapi-'` → no output | Automated in CI or manual |
| No NVIDIA key visible in browser network tab | Manual | DevTools → Network → find Worker request → check request headers → `Authorization` absent | Human |
| Worker logs do not expose key | Manual | Cloudflare Dashboard → Worker Logs → verify no key string in log output | Human |
| Non-developer can deploy by following guide | Human test | Follow written guide from scratch on a fresh Cloudflare account | Human (the learner) |
| Model switchable without code change | Functional | Change `PRIMARY_MODEL` variable in Dashboard → run bakeoff → verify different model responds | Human |

### Curl Commands Reference

```bash
# 1. Ping test (basic connectivity + auth)
curl -s -X POST https://WORKER_URL \
  -H "Origin: https://saitejatiru.github.io" \
  -H "Content-Type: application/json" \
  -d '{"passcode":"YOUR_PASSCODE","task":"ping"}'
# Expected: {"ok":true,"ts":1731110400000}

# 2. Auth reject — no passcode
curl -s -X POST https://WORKER_URL \
  -H "Origin: https://saitejatiru.github.io" \
  -H "Content-Type: application/json" \
  -d '{"task":"ping"}'
# Expected: {"error":"auth_failed"} with HTTP 403

# 3. Auth reject — wrong origin
curl -s -X POST https://WORKER_URL \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"passcode":"YOUR_PASSCODE","task":"ping"}'
# Expected: {"error":"auth_failed"} with HTTP 403

# 4. Bakeoff test (confirms NIM end-to-end, key rotation, model, JSON parsing)
curl -s -X POST https://WORKER_URL \
  -H "Origin: https://saitejatiru.github.io" \
  -H "Content-Type: application/json" \
  -d '{"passcode":"YOUR_PASSCODE","task":"bakeoff","model":"nvidia/nemotron-3-super-120b-a12b","answers":["I would look at data.","Payment fell from 72% to 59%. I would segment by platform, check API latency, and rule out deploy regressions.","So like I would check everything and talk to everyone."]}'

# 5. Git history clean check
git log -p --all | grep -i 'nvapi-'
# Expected: no output

# 6. Working tree clean check
grep -r "nvapi-" . --include="*.js" --include="*.html" --include="*.json" --include="*.toml"
# Expected: no output
```

### CORS Preflight Check (browser)

```js
// Run in browser DevTools console from https://saitejatiru.github.io/recall/
fetch('https://WORKER_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ passcode: 'YOUR_PASSCODE', task: 'ping' })
}).then(r => r.json()).then(console.log);
// Expected: {ok: true, ts: ...}
// Network tab should show: OPTIONS (204) then POST (200)
```

### Which checks need the human

| Check | Requires human | Reason |
|-------|---------------|--------|
| Cloudflare setup | Yes | Needs real Cloudflare account + UI interaction |
| Real NIM key response | Yes | Needs valid API key |
| Browser DevTools network check | Yes | No keys in request headers from browser |
| Worker logs inspection | Yes | Cloudflare dashboard access |
| Failover test with invalid key | Yes | Must edit Worker secrets and redeploy |
| Git history clean | No (automated) | `git log` command |
| Working tree clean | No (automated) | `grep` command |
| Origin/passcode rejection | Partial | curl command is scripted; Worker must be deployed |

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Cloudflare account | Worker deploy | User must create | Free; cloudflare.com signup |
| NVIDIA NIM API keys | NIM calls | User must generate | build.nvidia.com; free trial |
| GitHub account with `saitejatiru/recall` repo | GitHub Pages | Exists | Repo already exists |
| Browser (Chrome/Edge) | bakeoff.html + app testing | Assumed available | App targets Chrome/Edge |
| curl | Validation commands | Available on Windows via Git Bash / WSL | Validation commands use curl |

---

## Open Questions (RESOLVED)

1. **Does `nvidia/nemotron-3.5-lightning-30b-a3b` accept `response_format: {type: "json_object"}`?**
   - What we know: Primary model supports it (OpenAI-compatible API); lightning model is simpler architecture
   - What's unclear: Whether lightning model honours the parameter or returns 400
   - Recommendation: Use prompt-only JSON instruction for the fallback; skip `response_format` for it
   - **RESOLVED:** `response_format` is not used for the fallback model; plan 01-01 uses prompt-only JSON instruction for the FALLBACK_MODEL path. Opted out explicitly in COVERAGE.md.

2. **Does `NIM_KEY_1` returning 401 (bad key) trigger the same retry path as 429?**
   - What we know: The Worker retries on 429 or 5xx only; 401 is a 4xx non-retriable error
   - Recommendation: For the failover test, use an actually rate-limited key (or add `|| resp.status === 401` to the retry condition temporarily)
   - This is a testing-only concern; in production, all keys are valid
   - **RESOLVED:** 401 and 403 are included in the permanent retry condition in plan 01-01 `nimRequest` (`resp.status === 401 || resp.status === 403`); this is a production code change, not a test-only edit.

3. **GitHub Pages custom domain needed?**
   - What we know: URL is `https://saitejatiru.github.io/recall/`; this is the value hard-coded in `ALLOWED_ORIGIN`
   - What's unclear: Whether the learner wants a custom domain later
   - Recommendation: Use the default GitHub Pages URL for Phase 1; custom domain is a later concern
   - **RESOLVED:** Default GitHub Pages URL used; `ALLOWED_ORIGIN` = `https://saitejatiru.github.io` as set in plan 01-01 and SETUP.md.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cloudflare Rate Limiting binding requires Workers Paid plan (free plan uses KV instead) | Standard Stack, KV Setup | If free plan supports Rate Limiting binding, the KV cap is unnecessary complexity; switch to binding |
| A2 | KV free tier: 100K reads/day, 1K writes/day | Standard Stack | If limits are lower, the daily cap pattern may exhaust writes sooner |
| A3 | GitHub Secret Scanning detects `nvapi-` pattern on public repos | Secret Hygiene | If not detected, the pre-commit hook becomes the only automated guard |
| A4 | `nvidia/nemotron-3.5-lightning-30b-a3b` does not support `chat_template_kwargs` | Worker Implementation | If it does support it and requires it, the fallback may return unexpected output |

---

## Sources

### Primary (HIGH confidence — from prior phase research, live-verified)
- `OPTIONS https://integrate.api.nvidia.com/v1/chat/completions` — CORS blocked confirmed (STACK.md)
- `https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b` — model card: `enable_thinking`, temperature params (STACK.md)
- `https://developers.cloudflare.com/workers/platform/pricing/` — 100K req/day, 10ms CPU (STACK.md)
- Existing app `index.html` — current localStorage structure, data model (direct read)
- ARCHITECTURE.md — task-based contract design, component boundaries (prior research)
- PITFALLS.md — secret hygiene patterns, CORS preflight, `<think>` stripping, key rotation failure modes (prior research)

### Secondary (ASSUMED — training knowledge, not live-verified this session)
- Cloudflare KV free tier read/write limits
- Cloudflare Rate Limiting binding plan requirements
- GitHub Secret Scanning NVIDIA key pattern detection

---

## Metadata

**Confidence breakdown:**
- Worker contract design: HIGH — grounded in live-verified CORS block, existing architecture research
- Key rotation implementation: HIGH — standard pattern; code is derived from prior research
- KV daily cap: MEDIUM — Cloudflare KV limits assumed, not live-verified this session
- Secret hygiene: HIGH — standard git/pre-commit patterns
- Bakeoff design: HIGH — derived from STACK.md sample answers and scoring rubric
- GitHub Pages setup: HIGH — standard GitHub Pages configuration

**Research date:** 2026-11-09
**Valid until:** 2027-01-09 (Cloudflare free-tier limits may change; NIM model availability may change)
