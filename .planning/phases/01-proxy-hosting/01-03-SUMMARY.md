---
phase: 01-proxy-hosting
plan: "03"
subsystem: deployment
tags: [bakeoff, model-selection, failover, security-hardening, gemini, cloudflare-pages, pre-commit]

dependency_graph:
  requires:
    - phase: 01-proxy-hosting/01-02
      provides: Live Worker recall-proxy, Cloudflare Pages site, NIM + Gemini keys as Secrets, KV, auth confirmed
  provides:
    - DEFAULT_MODELS set to bake-off winner order (gemini-3.5-flash-lite first)
    - Live bake-off results documented in SETUP.md
    - Pre-commit hook blocks both NVIDIA and Gemini key formats
    - PROJECT.md Key Decisions updated with live evidence
    - PROXY-01..06 all marked complete in REQUIREMENTS.md
    - Phase 1 complete: secure proxy + live site + confirmed model + verified failover
  affects:
    - Phase 2 (uses confirmed model order and proxy; can proceed immediately)

tech-stack:
  added:
    - Google Gemini native generateContent API (8 keys as GEMINI_KEY_1..8; per-project rate limit)
    - Streamed keep-alive response (space every 10s) for long AI calls up to 295s total
    - Workers Builds auto-deploy (root dir worker/, wrangler.jsonc keep_vars)
  patterns:
    - DEFAULT_MODELS = gemini-3.5-flash-lite first (live bake-off winner)
    - Native Gemini API instead of OpenAI-compat endpoint (fails fast on 503, no silent hang)
    - Pre-commit hook covers both NVIDIA (nvapi-) and Gemini (AIza) key formats in one grep

key-files:
  modified:
    - worker/worker.js (DEFAULT_MODELS updated to bake-off winner order)
    - docs/SETUP.md (MODELS table value + live bake-off result table)
    - .githooks/pre-commit (extended to block Gemini API keys)
    - .planning/PROJECT.md (AI model choice + Hosting Key Decision rows updated)
    - .planning/REQUIREMENTS.md (PROXY-01..06 all marked complete; PROXY-06 Cloudflare Pages note)

key-decisions:
  - "DEFAULT_MODELS = gemini-3.5-flash-lite,nvidia/nemotron-3.5-super-vl-120b-a12b,gemini-3.8-flash — live bake-off winner; Flash-Lite scored 2/8/2 (expected ranges), JSON valid 3/3, avg ~1.7s"
  - "Hosting confirmed: recallnow.pages.dev (Cloudflare Pages) + recall-proxy.saitejatirunagari.workers.dev; both auto-deploy from GitHub main"
  - "Pre-commit hook now blocks both nvapi- (NVIDIA) and AIza (Gemini) key-format strings — single grep -qE"
  - "PROXY-01..06 complete: all Phase 1 security and proxy requirements verified live 2026-11-09"

metrics:
  duration: "continuation plan — human checkpoints resolved; code tasks ~15 min"
  completed: "2026-11-09"
  tasks: 5
  files: 5

status: complete
---

# Phase 01 Plan 03: Live Verification and Model Selection Summary

**Live bake-off picked gemini-3.5-flash-lite as primary model (2/8/2 scores, JSON 3/3, ~1.7s); failover proven live; all PROXY-01..06 requirements verified; Phase 1 sealed.**

## Performance

- **Duration:** Continuation — human checkpoints resolved; 5 code/doc tasks committed
- **Completed:** 2026-11-09
- **Tasks:** 5 atomic commits (DEFAULT_MODELS, SETUP.md, pre-commit hook, PROJECT.md, REQUIREMENTS.md)
- **Files modified:** 5

## Accomplishments

### Task 1 — DEFAULT_MODELS updated (commit d5f03fb)
`DEFAULT_MODELS` in `worker/worker.js` changed from NIM-first to `gemini-3.5-flash-lite,nvidia/nemotron-3.5-super-vl-120b-a12b,gemini-3.8-flash` — reflects bake-off winner. The Worker MODELS env variable (set in Cloudflare Dashboard) overrides this; DEFAULT_MODELS is the fallback when no variable is set.

### Task 2 — SETUP.md bake-off documentation (commit 586d4e9)
MODELS table value updated to match new order. Added a "Live bake-off result" table under Section 8 with real scores and latency for both tested models. Future operators can verify at a glance why Flash-Lite is first.

### Task 3 — Pre-commit hook extended (commit 8ace7ce)
`.githooks/pre-commit` now blocks both NVIDIA (`nvapi-[A-Za-z0-9_-]{40,}`) and Gemini (`AIza[0-9A-Za-z_-]{35}`) key-format strings in a single `grep -qE`. Verified against git history — 0 matches before committing the change.

### Task 4 — PROJECT.md Key Decisions updated (commit 1ca4e83)
"AI model choice" row: live bake-off evidence (Flash-Lite winner), confirmed DEFAULT_MODELS order, Gemini native API, 120s/295s timeout budget. Marked ✓ Good.
"Hosting" row: recallnow.pages.dev + auto-deploy Workers Builds. Marked ✓ Good.

### Task 5 — REQUIREMENTS.md PROXY-01..06 completed (commit e250608)
All 6 PROXY requirements marked complete with PROXY-06 amended to note Cloudflare Pages. Evidence for each:
- PROXY-01: secrets only in Worker Secrets; `git log -p --all | grep -E 'nvapi-...|AIza...'` → 0
- PROXY-02: live failover proven — GEMINI_KEY_2 returned 403 → Worker moved to key #4 (200, 2.0s); earlier run nemotron-3.5-super-vl answered when Flash-Lite was down
- PROXY-03: origin guard + passcode confirmed; 403 on wrong origin, 403 without passcode (live checks)
- PROXY-04: docs/SETUP.md step-by-step guide verified by user
- PROXY-05: bake-off on 3 sample answers with real keys; MODELS variable changed without code change
- PROXY-06: recallnow.pages.dev live; site 200; config.js → recall-proxy URL

## Deviations from Plan

### Deviations (all user-directed or driven by live evidence)

**1. [User-directed] Hosting changed from GitHub Pages to Cloudflare Pages**
- **Found during:** Plan 01-02 execution
- **Issue:** User already had recallnow.pages.dev serving the site via Cloudflare Pages (Git-connected); GitHub Pages was not needed.
- **Fix:** ALLOWED_ORIGIN updated to https://recallnow.pages.dev; SETUP.md reflects Cloudflare Pages; PROXY-06 amended with note.
- **Commits:** c1ee61b, 4c6704a (earlier plans), e250608 (requirements)

**2. [User-directed] Providers: Google Gemini added alongside NVIDIA NIM**
- **Found during:** Live diagnostics 2026-11-09
- **Issue:** `nvidia/nemotron-3-super-120b-a12b` returned 404 "Not found for account"; user added 8 Gemini keys (GEMINI_KEY_1..8).
- **Fix:** Worker calls Gemini via native generateContent (not OpenAI-compat which hangs on overload). MODELS ordered list covers both providers. Worker routes by model name prefix (`gemini-` → Gemini, else NIM).
- **Commits:** 1354155, e975b78 (earlier this plan)

**3. [Evidence-driven] PRIMARY_MODEL/FALLBACK_MODEL replaced by MODELS ordered list**
- **Found during:** Multi-provider support work
- **Issue:** Two-variable design (primary + single fallback) can't express a 3-model priority list across two providers.
- **Fix:** Single comma-separated MODELS variable; backward-compatible (old vars still work if MODELS unset).
- **Commits:** 1354155 (earlier this plan)

**4. [Evidence-driven] Bake-off winner is gemini-3.5-flash-lite (not nemotron-3-super as planned)**
- **Found during:** Live bake-off
- **Issue:** nemotron-3-super 404 on account; Flash-Lite scored correctly on all 3 answers, JSON valid every time.
- **Fix:** DEFAULT_MODELS updated; SETUP.md documents result; PROJECT.md updated.
- **Commits:** d5f03fb, 586d4e9, 1ca4e83

**5. [Evidence-driven] PROXY-05 bake-off used different models than planned**
- **Found during:** Live bake-off
- **Issue:** Plan specified testing nemotron-3-super + lightning-30b; lightning-30b not tested (nemotron-3-super unavailable on account); Flash-Lite and nemotron-3.5-super-vl tested instead.
- **Fix:** Bake-off completed with live-available models; plan requirement satisfied by real evidence.
- **Impact:** None — requirement is about confirming a model works on real keys, which was done.

**6. [Evidence-driven] Extended per-try timeout to 120s (plan said 25s)**
- **Found during:** Live testing with thinking models
- **Issue:** 25s hard timeout cut off some models; user accepts up to 5 min per answer.
- **Fix:** CALL_TIMEOUT_MS=120000, TOTAL_BUDGET_MS=295000; streamed keep-alive response (space every 10s) prevents connection drops.
- **Commits:** Earlier plan commits

**7. [Rule 2] Pre-commit hook extended to cover Gemini keys**
- **Found during:** Task 3 (Gemini keys now in use)
- **Issue:** Original hook only checked nvapi- format; Gemini keys (AIza...) now in scope.
- **Fix:** Single grep -qE covering both patterns.
- **Commits:** 8ace7ce

## Security Verification (all passed 2026-11-09)

| Check | Command | Result |
|-------|---------|--------|
| Git history clean (NIM keys) | `git log -p --all \| grep -E 'nvapi-[A-Za-z0-9_-]{40,}'` | 0 matches |
| Git history clean (Gemini keys) | `git log -p --all \| grep -E 'AIza[0-9A-Za-z_-]{35}'` | 0 matches |
| Working tree clean | grep scan of *.js *.html *.json *.md | 0 matches |
| .dev.vars git-ignored | — | Confirmed |
| Hooks path | `core.hooksPath=.githooks` | Active |
| Worker unit tests | `node worker/worker.test.mjs` | All passed |
| Live POST no passcode | curl → 403 | Pass |
| Live POST wrong origin | curl → 403 | Pass |
| Site 200 | https://recallnow.pages.dev | Pass |
| config.js → Worker URL | — | Pass |
| No client file has key patterns | index.html, bakeoff.html, config.js | Pass |

## Worker Tests

`node worker/worker.test.mjs` — all passed (run after final commit).

## Self-Check

### Created files exist
- [x] `.planning/phases/01-proxy-hosting/01-03-SUMMARY.md` — this file

### Commits exist
- [x] d5f03fb — DEFAULT_MODELS update
- [x] 586d4e9 — SETUP.md update
- [x] 8ace7ce — pre-commit hook
- [x] 1ca4e83 — PROJECT.md update
- [x] e250608 — REQUIREMENTS.md update

## Self-Check: PASSED
