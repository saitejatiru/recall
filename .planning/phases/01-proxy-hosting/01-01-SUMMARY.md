---
phase: 01-proxy-hosting
plan: "01"
subsystem: proxy-security-boundary
tags: [cloudflare-worker, nim-api, key-rotation, passcode-auth, kv-rate-cap, github-pages, bakeoff]
dependency_graph:
  requires: []
  provides:
    - worker/worker.js (ping + bakeoff tasks; coach placeholder)
    - config.js (CONFIG.workerUrl)
    - .githooks/pre-commit (key-leak guard)
    - index.html (workerCall helper, passcode modal, AI status)
    - bakeoff.html (model comparison tool)
    - docs/SETUP.md (no-code deploy guide)
  affects:
    - Phase 3 (adds case "coach" to worker.js without touching wire format)
tech_stack:
  added:
    - Cloudflare Worker (free tier) — NIM proxy, auth, key rotation
    - Workers KV — daily request counter, persists across cold starts
    - Web Speech API — already in app; workerCall enables Phase 3 integration
  patterns:
    - Task-based Worker contract (task field dispatches ping/bakeoff/coach)
    - In-memory round-robin key index (resets on cold start, fine for personal tool)
    - 401/403/429/5xx retry with FALLBACK_MODEL escalation
    - KV global daily cap with parseInt||0 NaN guard and try/catch
key_files:
  created:
    - worker/worker.js
    - config.js
    - .gitignore
    - .githooks/pre-commit
    - bakeoff.html
    - docs/SETUP.md
  modified:
    - index.html (config.js tag, passcode modal, workerCall helper, AI status)
decisions:
  - "Task-based Worker contract locks Phase 3 extension point: adding coach requires only one new case block"
  - "401/403 included in nimRequest retry condition (not just 429/5xx) to enable failover testing with invalid NIM_KEY_1"
  - "KV daily cap uses parseInt(val||'0',10)||0 double guard against NaN bypass from non-numeric KV values"
  - "Versioned pre-commit hook in .githooks/ uses extended regex nvapi-[A-Za-z0-9_-]{40,} to prevent false positives on prose"
  - "FALLBACK_MODEL escalation returns model field in response so bakeoff can detect which model actually answered"
  - "KV operations wrapped in try/catch — on KV failure request continues (better to serve than block)"
metrics:
  duration_minutes: 9
  completed: "2026-11-09T09:42:59Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 1
status: complete
---

# Phase 01 Plan 01: Worker Security Boundary Summary

Cloudflare Worker proxy + browser integration establishing the security boundary between the public browser app and NVIDIA NIM. All secrets (NIM keys, passcode) live exclusively in Cloudflare Worker Secrets; browser has only a placeholder Worker URL (config.js) and a user-entered passcode (localStorage).

## Tasks Completed

| # | Name | Type | Commit | Key Files |
|---|------|------|--------|-----------|
| 1 | Worker security boundary — auth, rotation, ping, bakeoff tasks | tracer | 9672052 | worker/worker.js, config.js, .gitignore, .githooks/pre-commit |
| 2 | Browser integration — passcode modal, workerCall helper, AI status, bakeoff.html | auto | cd54579 | index.html (modified), bakeoff.html |
| 3 | No-code deployment guide — docs/SETUP.md | auto | c10e78d | docs/SETUP.md |

## What Was Built

**worker/worker.js** — Cloudflare Worker with:
- Deterministic guard order: CORS preflight → origin check → body parse → passcode check → KV daily cap → task dispatch
- `ping` task returns `{ok:true,ts:Date.now()}`
- `bakeoff` task accepts `{model,answers:[...]}`, returns per-answer feedback with actual model used
- Key rotation across NIM_KEY_1..4; retries on 401, 403, 429, and >=500 (401/403 added per plan requirement for failover testing)
- FALLBACK_MODEL escalation when all primary-model keys fail; response includes `model` field identifying which model answered
- KV daily cap with `parseInt(val||'0',10)||0` double guard; KV ops in try/catch (continues on KV failure)

**config.js** — placeholder Worker URL; committed (not secret); user replaces in Plan 01-03.

**.gitignore** — excludes .dev.vars, *.dev.vars, node_modules/, wrangler.lock.

**.githooks/pre-commit** — versioned hook scanning staged diffs for `nvapi-[A-Za-z0-9_-]{40,}` (extended regex prevents false positives on prose references to the prefix). Activated via `git config core.hooksPath .githooks` (one-time user step, documented in SETUP.md).

**index.html** — four additions only: config.js script tag, passcode setup modal (shown when localStorage.passcode is null), workerCall() POST helper, AI status span with ping on load. No new nav items; no existing section functions modified.

**bakeoff.html** — standalone model comparison tool with Worker URL/passcode inputs pre-filled from config.js and localStorage, three-model selector (Primary/Baseline/Speed), three verbatim RESEARCH.md sample answers, hidden results table shown after bakeoff task.

**docs/SETUP.md** — nine-section no-code deploy guide covering prerequisites through security hardening.

## Verification Results

| Check | Result |
|-------|--------|
| `node --check worker/worker.js` | PASS (exit 0) |
| `grep -cF 'nvapi-[A-Za-z0-9_-]{40,}' .githooks/pre-commit` | 1 |
| `grep -c 'src="config.js"' index.html` | 1 |
| `grep -c "workerCall" index.html` | 2 |
| `grep -c "setupModal" index.html` | 2 |
| `test -f docs/SETUP.md` | PASS |
| `grep -c "core.hooksPath" docs/SETUP.md` | 1 |
| `grep -rE "nvapi-[A-Za-z0-9_-]{40,}" all committed files` | PASS (no matches) |
| `grep -c "recall-ratelimit" docs/SETUP.md` | 2 |
| `grep -v "^#" worker/worker.js \| grep -c "FALLBACK_MODEL"` | 5 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed duplicate display property in passcode modal initial style**
- **Found during:** Task 2 (implementing passcode modal from PATTERNS.md)
- **Issue:** PATTERNS.md modal style had `display:none` followed by `display:flex` in the same attribute. The last value wins, making the modal always visible regardless of localStorage state.
- **Fix:** Initial style uses `display:none` only (removed the conflicting `display:flex`). The IIFE sets `display:flex` conditionally when localStorage.passcode is null.
- **Files modified:** index.html
- **Commit:** cd54579

**2. [Rule 2 - Missing Critical Functionality] Added try/catch around KV operations**
- **Found during:** Task 1 (reviewing threat model entry T-01-08)
- **Issue:** Threat model specifies `mitigate` for KV write exhaustion with "KV put() is wrapped in try/catch; on KV failure the request continues". RESEARCH.md code omits this try/catch.
- **Fix:** KV daily-cap block wrapped in try/catch; on KV failure logs error and continues request.
- **Files modified:** worker/worker.js
- **Commit:** 9672052

**3. [Rule 1 - Bug] Fixed callNIM break condition for 401/403 retriable statuses**
- **Found during:** Task 1 (applying 401/403 retry per plan requirement)
- **Issue:** RESEARCH.md callNIM has `if (result.status !== 429 && result.status < 500) break`. With 401/403 now retriable in nimRequest, this break condition would still break out of the retry loop on 401/403 (since they're not 429 and are < 500), defeating the rotation.
- **Fix:** Break condition updated to `const retriable = ...; if (!retriable) break` excluding 401, 403, 429, and >=500 from the break.
- **Files modified:** worker/worker.js
- **Commit:** 9672052

**4. [Rule 2 - Missing Feature] Added `model` field to callNIM return value**
- **Found during:** Task 1 (reviewing acceptance criteria requiring model field in bakeoff response)
- **Issue:** RESEARCH.md callNIM returns `{ content, error }` without tracking which model actually answered. Plan acceptance criteria and must_have truth require the response to include which model (PRIMARY or FALLBACK) answered.
- **Fix:** callNIM returns `{ content, model: primaryOrFallback }`. Bakeoff results use `result.model` (actual model used) rather than `body.model` (requested model).
- **Files modified:** worker/worker.js
- **Commit:** 9672052

## Known Stubs

None. All artifacts are complete and functional for their intended purpose.

- `config.js` placeholder URL is intentional — not a stub. Plan 01-03 is designated to replace it.
- Worker coach task placeholder comment is intentional — Phase 3 adds the implementation.

## Threat Flags

None beyond the threat model already defined in the plan.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| worker/worker.js | FOUND |
| config.js | FOUND |
| .gitignore | FOUND |
| .githooks/pre-commit | FOUND |
| index.html | FOUND |
| bakeoff.html | FOUND |
| docs/SETUP.md | FOUND |
| Commit 9672052 (Task 1) | FOUND |
| Commit cd54579 (Task 2) | FOUND |
| Commit c10e78d (Task 3) | FOUND |
