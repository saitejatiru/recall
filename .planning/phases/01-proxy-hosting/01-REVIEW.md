---
phase: 01-proxy-hosting
reviewed: 2026-11-09T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - worker/worker.js
  - worker/worker.test.mjs
  - worker/diag.mjs
  - worker/wrangler.jsonc
  - config.js
  - index.html
  - bakeoff.html
  - .githooks/pre-commit
  - .gitignore
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-11-09
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the Cloudflare Worker proxy (`worker.js`), its self-test (`worker.test.mjs`) and local
diagnostic runner (`diag.mjs`), plus both static pages (`index.html`, `bakeoff.html`) for the
additions in this phase: passcode modal, `workerCall`, AI-status badge, bakeoff UI, and streaming
keep-alive. The pre-commit hook and gitignore were checked for key-exposure risks.

The auth model (Origin header + passcode), key rotation, fan-out cap, daily KV cap, and streaming
pattern all implement the stated design correctly. All nine self-tests pass. One security
vulnerability was found: unencoded user input in a Gemini API URL path. Four warnings cover dead
code, a structural race, and two defensive-coding gaps that will become bugs in Phase 3.

---

## Critical Issues

### CR-01: Gemini URL constructed by raw string interpolation of user-supplied `model` — path traversal SSRF

**File:** `worker/worker.js:197`

**Issue:** `model` from `body.model` (authenticated bakeoff caller) is spliced directly into the
Generative Language API URL path without encoding or format validation:

```js
`${ENDPOINT.gemini}/${model}:generateContent`
```

A `model` value of `gemini-3.5-flash-lite/../../v1beta/files` resolves to:

```
https://generativelanguage.googleapis.com/v1beta/files:generateContent
```

The Files API (and other sub-paths — `tunedModels`, `corpora`, etc.) responds to `GET` and `POST`
under the same base URL, authenticated by the same `x-goog-api-key`. An authenticated caller who
knows the Worker passcode could read file listings or metadata from Google AI Studio using the
Worker's Gemini credentials without the Worker owner intending it.

The `providerOf` check only requires `model.startsWith('gemini-')`, which the traversal payload
satisfies.

**Fix:** Add a format guard before building the URL. Standard Gemini model IDs are
`gemini-<word>[-<word>]*` with no slashes:

```js
// In aiRequest, before the fetch:
if (gemini && !/^gemini-[\w.-]+$/.test(model)) {
  return { content: null, status: 400, errText: 'invalid gemini model id' };
}
```

Alternatively, replace the raw interpolation with `encodeURIComponent(model)`:

```js
const resp = await fetch(
  gemini
    ? `${ENDPOINT.gemini}/${encodeURIComponent(model)}:generateContent`
    : ENDPOINT.nim,
  { ... }
);
```

Both fixes are one-liners. The regex guard is preferable because it also catches typos early with a
legible error rather than a 404 from Google.

---

## Warnings

### WR-01: `modelList`'s `requested` parameter is dead code

**File:** `worker/worker.js:112-116`

**Issue:** The function signature is `modelList(env, requested)`. When `requested` is truthy the
function prepends it to the list. No caller ever passes the second argument — the bakeoff handler
(line 76) builds the single-model array itself:

```js
const models = body.model ? [String(body.model)] : modelList(env);
```

The `requested` branch (`[requested, ...list.filter(m => m !== requested)]`) is unreachable. It
sits in the codebase implying a contract that is never exercised and never tested. If Phase 3 or a
bake-off refactor calls `modelList(env, body.model)` expecting silent fallback, it will get it —
silently contradicting the stated "bake-off tests ONE model" design (test 3d).

**Fix:** Remove the `requested` parameter and its branch entirely; the caller already owns that
logic:

```js
function modelList(env) {
  const raw = env.MODELS || [env.PRIMARY_MODEL, env.FALLBACK_MODEL].filter(Boolean).join(',') || DEFAULT_MODELS;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
```

---

### WR-02: KV daily-cap counter is non-atomic — concurrent requests can exceed `DAILY_CAP`

**File:** `worker/worker.js:51-63`

**Issue:** The counter uses a read-then-write pattern:

```js
const count = parseInt(await env.KV.get(dateKey) || '0', 10) || 0;
if (count >= cap) return 429;
await env.KV.put(dateKey, String(count + 1), { expirationTtl: 86400 });
```

Cloudflare KV `get` and `put` are not transactional. If N requests land at the same Worker
invocation boundary before any `put` has propagated (KV eventual consistency can lag hundreds of
ms), all N see the same `count`, all pass the cap check, and all write `count + 1` — not
`count + N`. Under realistic personal-tool load this rarely matters; under a scripted burst (or if
the Worker scales to multiple isolates) the cap can be exceeded by an unbounded multiplier.

The comment documents the gap but not the ceiling.

**Fix:** Accept the limitation for a personal tool (the comment already says so), but add an
explicit cap in the ponytail comment so a future reader knows the upgrade path:

```js
// ponytail: get-then-put is not atomic; concurrent bursts can exceed cap by up to 10×.
// Upgrade path: Cloudflare Durable Object counter if strict enforcement is needed.
```

If strict enforcement is required sooner, replace with a Durable Object transactional counter.

---

### WR-03: `workerCall` resolves to JSON body regardless of HTTP status — callers cannot distinguish errors

**File:** `index.html:95-101`

**Issue:**

```js
function workerCall(task, payload) {
  return fetch(CONFIG.workerUrl, { ... })
    .then(r => r.json());   // r.ok is never checked
}
```

A 403 auth failure, 429 rate limit, and 200 success all resolve to `r.json()`. The JSON body
differs (`{error:'auth_failed'}` vs `{error:'rate_limit',retry:false}` vs `{ok:true}`), but the
caller has no programmatic way to know the HTTP tier of the failure without inspecting the JSON
error field string.

The existing `checkAI` caller only tests `result.ok`, which works for the ping response. Phase 3
coach callers will need to surface rate-limit vs auth failure differently (e.g., "busy — try in a
minute" vs "check your passcode"). Without the status code they must pattern-match on
`result.error` strings, which couples them to the Worker's error vocabulary.

**Fix:**

```js
function workerCall(task, payload) {
  return fetch(CONFIG.workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passcode: localStorage.getItem('passcode'), task, ...payload }),
  }).then(async r => {
    const data = await r.json();
    return { ok: r.ok, status: r.status, ...data };
  });
}
```

Callers can then `if (!result.ok && result.status === 429)` without string-matching.

---

### WR-04: Payload spread in `workerCall` can silently override `passcode` or `task`

**File:** `index.html:98-100`

**Issue:**

```js
body: JSON.stringify({ passcode: localStorage.getItem('passcode'), task, ...payload })
```

Properties in `payload` are spread AFTER `passcode` and `task`, so a caller that passes
`{ task: 'diag' }` or `{ passcode: 'x' }` in the payload silently wins the conflict. No current
caller does this, but the spread order is a trap for Phase 3 contributors adding new task callers.

**Fix:** Put `task` and `passcode` last so they always govern:

```js
body: JSON.stringify({ ...payload, task, passcode: localStorage.getItem('passcode') })
```

---

## Info

### IN-01: Pre-commit hook requires a manual `git config` step per fresh clone

**File:** `.githooks/pre-commit`

**Issue:** The hook only fires after `git config core.hooksPath .githooks` is run in the local
clone. SETUP.md documents this step, but nothing in the repo enforces it on clone (no install
script, no `.gitconfig` template). A developer who skips setup has no key-scanning protection and
could accidentally commit NVIDIA or Gemini keys without any warning.

**Fix:** Add a one-liner to any existing setup script or document the step more prominently.
Alternatively, add a CI check (`git diff HEAD~1.. | grep -qE 'nvapi-...|AIza...'`) as a
belt-and-suspenders fallback.

---

### IN-02: `parseJSONReply` fence-stripping handles only one code fence pair; prose with two JSON objects fails

**File:** `worker/worker.js:254-262`

**Issue:** The regex strips at most one leading/trailing fence. If the model quotes the prompt's
JSON before providing its own (e.g., `"The input was {...} — here is my scoring: {...}"`) the
fallback `indexOf('{')` / `lastIndexOf('}')` extracts from the first `{` to the last `}`,
producing `{...} — here is my scoring: {...}`, which is not valid JSON. `valid_json` becomes
`false` and the page shows the raw string. The test suite covers the happy path (prose before one
JSON object) but not this edge case.

**Fix:** Replace the two-regex strip with a function that finds the outermost valid JSON object by
trying `JSON.parse` on progressively narrowed substrings, or instruct the model to output ONLY
JSON (the system prompt already says this; the issue is compliance). Acceptable to leave as-is for
a personal tool with a note.

---

### IN-03: `trail()` in `bakeoff.html` accesses `x.model.split('/')` without a null guard

**File:** `bakeoff.html:115`

**Issue:**

```js
esc(x.model.split('/').pop() + ...)
```

If a future Worker code path ever pushes an attempts entry where `model` is `null` or `undefined`
(e.g., the `no_keys` early-exit path adds `{ model, status: last, ms: 0 }` — `model` is always a
string today, but could change), `null.split('/')` throws and the results table is never rendered.

**Fix:** One-word guard:

```js
esc((x.model || '').split('/').pop() + ...)
```

---

_Reviewed: 2026-11-09_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
