---
phase: 01-proxy-hosting
plan: "02"
subsystem: deployment
tags: [cloudflare-worker, cloudflare-pages, github-pages-replaced, secret-scanning, nim-keys, kv-ratelimit, fail-closed]

dependency_graph:
  requires:
    - phase: 01-proxy-hosting/01-01
      provides: worker/worker.js, config.js, .githooks/pre-commit, index.html, bakeoff.html, docs/SETUP.md
  provides:
    - Live Cloudflare Worker `recall-proxy` at https://recall-proxy.saitejatirunagari.workers.dev
    - NIM_KEY_1..n, PASSCODE encrypted as Worker Secrets (never committed)
    - KV namespace `recall-ratelimit` bound as `KV`
    - Live site at https://recallnow.pages.dev (Cloudflare Pages, Git-connected to main)
    - GitHub Secret Protection + Push protection enabled on repo
    - worker.test.mjs self-check confirming Worker behaviour
  affects:
    - 01-03 (uses Worker URL https://recall-proxy.saitejatirunagari.workers.dev in config.js update)

tech-stack:
  added:
    - Cloudflare Pages (Git-connected, auto-deploys on push to main) — replaced GitHub Pages
    - GitHub Secret Scanning + Push Protection (enabled on saitejatiru/recall)
  patterns:
    - fail-closed passcode (Worker returns 403 when PASSCODE secret unset, not 200)
    - MODELS ordered list replaces PRIMARY_MODEL/FALLBACK_MODEL (user-defined priority; backward-compat vars retained)
    - 25s hard timeout on NIM requests (avoids Worker CPU-time errors on slow model responses)
    - non-2xx NIM response counts as key failure (triggers rotation, not just 429/5xx)

key-files:
  created:
    - worker/worker.test.mjs (self-check: fail-closed passcode, cap logic, non-2xx failure)
  modified:
    - worker/worker.js (fail-closed passcode, bakeoff cap 3, NIM timeout 25s, MODELS list, non-2xx failure, re-check after passcode save)

key-decisions:
  - "Cloudflare Pages (https://recallnow.pages.dev) replaces GitHub Pages — user already had it connected and working; no migration cost"
  - "MODELS ordered list (user-specified model priority) replaces PRIMARY_MODEL/FALLBACK_MODEL single-model variables; Worker iterates MODELS in order"
  - "fail-closed passcode: unset PASSCODE secret → 403 immediately (not a passthrough or 500)"
  - "25s NIM timeout hard-wired in Worker — prevents 50s+ stalls that would exhaust Worker CPU budget"
  - "bakeoff task fan-out capped at 3 answers to prevent accidental NIM quota burn"
  - "non-2xx (not just 429/5xx) counts as NIM key failure → rotation triggered immediately"
  - "ALLOWED_ORIGIN to be updated from https://recall.saitejatirunagari.workers.dev to https://recallnow.pages.dev (user action pending)"

patterns-established:
  - "fail-closed secrets: missing Cloudflare Secret → 403, never 200"
  - "MODELS list: comma-separated ordered string in Worker Variable; Worker splits and iterates"

requirements-completed: [PROXY-04, PROXY-06]

coverage:
  - id: D1
    description: "Phase 1 code on GitHub main — push protection active, secret scanning enabled, no key-format strings in history"
    requirement: PROXY-06
    verification:
      - kind: manual_procedural
        ref: "git log -p --all | grep nvapi- → no output; GitHub Secret Scanning enabled on repo"
        status: pass
    human_judgment: true
    rationale: "Secret scan requires human to run git log check; GitHub UI confirmation of secret scanning"
  - id: D2
    description: "Cloudflare Worker recall-proxy live with encrypted secrets, KV, auth confirmed working"
    requirement: PROXY-04
    verification:
      - kind: manual_procedural
        ref: "GET https://recall-proxy.saitejatirunagari.workers.dev → 403 auth_failed (orchestrator verified)"
        status: pass
      - kind: manual_procedural
        ref: "POST without passcode → 403 (orchestrator verified)"
        status: pass
    human_judgment: true
    rationale: "Secret values never seen by executor; Cloudflare deployment requires human action"
  - id: D3
    description: "Live site at https://recallnow.pages.dev serving RECALL app (Cloudflare Pages, Git-connected)"
    requirement: PROXY-06
    verification:
      - kind: manual_procedural
        ref: "https://recallnow.pages.dev loads RECALL app — user confirmed"
        status: pass
    human_judgment: true
    rationale: "Hosting deployment confirmed by user; executor cannot visit browser URLs"

duration: human-action plan (elapsed ~1 session)
completed: "2026-11-09"
status: complete
---

# Phase 01 Plan 02: Infrastructure Deploy Summary

**Cloudflare Worker `recall-proxy` live with encrypted NIM keys + KV rate cap; site serving at https://recallnow.pages.dev (Cloudflare Pages replacing GitHub Pages); Worker hardened with fail-closed passcode, 25s NIM timeout, MODELS list, and non-2xx failure rotation.**

## Performance

- **Duration:** Human-action plan — user executed over one session
- **Completed:** 2026-11-09
- **Tasks:** 3 human-action checkpoints (all resolved)
- **Files modified:** 2 (worker/worker.js, +worker/worker.test.mjs created)

## Accomplishments

- Cloudflare Worker `recall-proxy` deployed at https://recall-proxy.saitejatirunagari.workers.dev; NIM_KEY_1..n and PASSCODE stored as encrypted Secrets (never committed); KV `recall-ratelimit` bound as `KV`
- GitHub main pushed (now at c042c32); GitHub Secret Scanning + Push Protection enabled; pre-commit hook active (`core.hooksPath=.githooks`)
- Live site at https://recallnow.pages.dev (Cloudflare Pages, Git-connected to main, auto-deploys on push)
- Worker hardened: fail-closed when PASSCODE unset, 25s NIM timeout, bakeoff capped at 3 answers, non-2xx counts as key failure, AI status re-checks after passcode save
- MODELS ordered list (user-defined priority) replaces single PRIMARY_MODEL/FALLBACK_MODEL pattern; backward-compat vars retained
- worker/worker.test.mjs self-check covering fail-closed passcode, cap logic, and non-2xx rotation

## Files Created/Modified

- `worker/worker.js` — fail-closed passcode, bakeoff cap 3, 25s NIM timeout, MODELS list, non-2xx failure, re-check hook (commits c7c33ec, c042c32)
- `worker/worker.test.mjs` — self-check test (commit c7c33ec)

## Decisions Made

- **Cloudflare Pages over GitHub Pages** — user already had https://recallnow.pages.dev connected and auto-deploying; zero migration cost; no downside vs GitHub Pages for this stack
- **MODELS ordered list** — user specified own model priority: `mistralai/mistral-large-4-1t-a52b,z-ai/glm-5.3-flash,nvidia/nemotron-3.5-super-vl-120b-a12b`; Worker iterates in order, falls back down list; keeps PRIMARY_MODEL/FALLBACK_MODEL as silent fallback for forward compatibility
- **fail-closed passcode** — unset PASSCODE returns 403 immediately, not a passthrough (security default)
- **25s NIM timeout** — prevents Cloudflare Worker from exceeding CPU budget on slow model responses
- **non-2xx counts as failure** — any HTTP error triggers key rotation, not just 429/5xx

## Deviations from Plan

### Hosting Platform Change

**[Rule 4 acknowledged — user-directed] GitHub Pages replaced by Cloudflare Pages**
- **Found during:** Task 3 (Enable GitHub Pages checkpoint)
- **Issue / Context:** User had already set up Cloudflare Pages at https://recallnow.pages.dev, Git-connected to saitejatiru/recall, auto-deploys on push to main. A second Git-connected deployment also exists at https://recall.saitejatirunagari.workers.dev (separate Worker Pages deployment).
- **Decision:** User chose Cloudflare Pages. Executor accepted — equivalent capability, zero cost, already working.
- **Impact on 01-03:** Plan 01-03 references https://saitejatiru.github.io — replace with https://recallnow.pages.dev throughout. ALLOWED_ORIGIN in Cloudflare Worker must also be updated from https://recall.saitejatirunagari.workers.dev to https://recallnow.pages.dev (pending user action).
- **Commits:** No code change required (config.js URL update is Plan 01-03 scope)

### Auto-fixed Issues (committed during wave, not in original plan tasks)

**1. [Rule 2 - Missing Critical] fail-closed passcode when PASSCODE secret unset**
- **Found during:** Pre-deploy review (c7c33ec)
- **Issue:** Original Worker returned 200 on requests when PASSCODE secret was not yet set in Cloudflare — could allow unauthenticated calls during the brief window between deploy and secret setup
- **Fix:** `if (!env.PASSCODE) return json({error:'server_misconfigured'}, 403)`
- **Files modified:** worker/worker.js
- **Commit:** c7c33ec

**2. [Rule 2 - Missing Critical] Bakeoff fan-out capped at 3 answers**
- **Found during:** Pre-deploy review (c7c33ec)
- **Issue:** Uncapped array could drain NIM free-tier credits if bakeoff.html sent large answer arrays
- **Fix:** `answers.slice(0,3)` before dispatch
- **Files modified:** worker/worker.js
- **Commit:** c7c33ec

**3. [Rule 1 - Bug] 25s hard timeout on NIM requests**
- **Found during:** Pre-deploy review (c7c33ec)
- **Issue:** No timeout on NIM fetch — slow model responses could cause Worker to stall and exceed Cloudflare CPU time budget
- **Fix:** `AbortController` with 25s timeout on each NIM `fetch()` call
- **Files modified:** worker/worker.js
- **Commit:** c7c33ec

**4. [Rule 2 - Missing Critical] AI status re-check after passcode save**
- **Found during:** Pre-deploy review (c7c33ec)
- **Issue:** After user entered passcode and saved, AI status would remain stale ("checking..." or "Offline") until next full page load
- **Fix:** Worker triggers re-check ping after localStorage passcode is saved
- **Files modified:** worker/worker.js
- **Commit:** c7c33ec

**5. [Rule 1 - Bug] non-2xx NIM responses now counted as key failure**
- **Found during:** Model priority refactor (c042c32)
- **Issue:** Only 429/5xx triggered key rotation; a 400 or 401 from NIM would silently stop retrying with the same failing key
- **Fix:** Any `!response.ok` (non-2xx) triggers rotation to next key/model
- **Files modified:** worker/worker.js
- **Commit:** c042c32

**6. [User Decision] MODELS ordered list replaces PRIMARY_MODEL/FALLBACK_MODEL**
- **User-directed change:** User specified model priority list: `mistralai/mistral-large-4-1t-a52b,z-ai/glm-5.3-flash,nvidia/nemotron-3.5-super-vl-120b-a12b`
- **Implementation:** Worker reads MODELS env var (comma-split, iterates in order); PRIMARY_MODEL/FALLBACK_MODEL retained as silent fallback if MODELS is unset
- **Files modified:** worker/worker.js
- **Commit:** c042c32

---

**Total deviations:** 1 hosting platform change (user-directed), 5 auto-fixed code issues, 1 user model priority change
**Impact on plan:** All deviations improve correctness and security. Hosting change requires ALLOWED_ORIGIN update (pending) and 01-03 URL references to use https://recallnow.pages.dev.

## Known Stubs

None — all deployed infrastructure is functional. ALLOWED_ORIGIN update (Cloudflare Dashboard, Worker Variable) is a pending user action before 01-03 bakeoff runs.

## Threat Flags

None beyond the plan's existing threat model.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| Worker URL live (https://recall-proxy.saitejatirunagari.workers.dev) | CONFIRMED (orchestrator verified GET → 403, POST no-passcode → 403) |
| NIM keys + PASSCODE as encrypted Secrets | CONFIRMED (user action; never seen by executor) |
| KV recall-ratelimit bound as KV | CONFIRMED (user action) |
| Site live at https://recallnow.pages.dev | CONFIRMED (user) |
| GitHub Secret Scanning + Push Protection | CONFIRMED (screenshot) |
| core.hooksPath=.githooks | CONFIRMED (user) |
| c7c33ec commit | FOUND |
| c042c32 commit | FOUND |
