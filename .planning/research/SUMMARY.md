# Project Research Summary

**Project:** RECALL - PM Communication Coach
**Domain:** Single-page AI-coached PM interview training app (vanilla JS, GitHub Pages, Cloudflare Worker)
**Researched:** 2026-11-09
**Confidence:** HIGH

## Executive Summary

RECALL is a personal, single-page daily PM interview coaching app that transforms an existing static multi-tab tool into a guided 30-day journey. Research confirms the entire product can be delivered as three plain JS files on GitHub Pages, proxied through a single Cloudflare Worker with no build step, no database, and no accounts. The recommended AI backbone is nvidia/nemotron-3-super-120b-a12b (12B active params via MoE, 1M token context, thinking toggle OFF for fast structured JSON), with nvidia/nemotron-3.5-lightning-30b-a3b as a hot failover. CORS from the browser to NIM is confirmed blocked, making the Worker a hard architectural requirement.

The recommended build order is: Worker proxy first, then storage with schema migration, then resume module, then journey shell with all offline steps, then AI integration, then weak-spot tracking, and finally AI-generated endless days. This order means 7 of 11 build steps require zero API credits. The 150-term PM vocabulary curriculum, Leitner spaced-review system, and 5-step daily arc (Vocab > Recall > Speaking > Case > Interview) are fully specified in research and ready to implement.

The top risks are: (1) API keys committed to the public repo - mitigated by Cloudflare Worker secrets and a pre-commit hook; (2) NIM rate-limit 429s breaking the user daily flow - mitigated by round-robin key rotation with per-step self-assess fallback; and (3) the AI giving generically flattering feedback - mitigated by a strict rubric-anchored system prompt with score floors and a prohibition on praise openers. All three risks have concrete mitigations documented in PITFALLS.md (not yet tested).

## Key Findings

### Recommended Stack

The entire stack is zero-cost and zero-dependency on the browser side. The Cloudflare Worker (free tier: 100K req/day, 10ms CPU) is the only server component - a ~120-line JS file deployed via the Cloudflare Dashboard UI without CLI tools. Browser-native Web Speech API handles speech-to-text (Chrome/Edge full; typed fallback for Firefox/Safari). pdf.js v6.5.438 from jsDelivr handles resume extraction via ESM import. All NIM API keys live as Cloudflare Worker Secrets and never touch any file or the browser.

**Core technologies:**
- `nvidia/nemotron-3-super-120b-a12b`: Primary AI coach - 2026 LatentMoE, 12B active params, 1M context, `enable_thinking: false` for fast structured JSON; RL-trained on structured output environments
- `nvidia/nemotron-3.5-lightning-30b-a3b`: Failover - ~3B active params, sub-second inference, adequate for <80-word feedback on 429
- Cloudflare Worker (free): CORS proxy + key rotation - round-robin 3-4 keys, 429 failover, auth guard
- Web Speech API (browser-native): In-browser STT, `continuous: false` + `onend` restart to avoid Android Chrome silent-ignore bug
- pdfjs-dist 6.5.438 (jsDelivr CDN): Resume extraction - ESM import, `GlobalWorkerOptions.workerSrc` required, editable textarea before saving
- GitHub Pages: Static hosting - push-to-deploy on main

**Locked decision:** Model is `nvidia/nemotron-3-super-120b-a12b` with `chat_template_kwargs: {"enable_thinking": false}`, `temperature: 1.0`, `top_p: 0.95`. Chosen from model cards; to be confirmed by the Phase 1 bake-off with real keys (swap to fallback if it fails JSON/quality checks).

### Expected Features

The 5-step daily journey (Vocab > Recall > Speaking > Thinking case > Unexpected interview Q) is locked. Focus and Detox is out of scope. The 30-day arc followed by AI-generated endless days is in scope but is the last feature to build.

**Must have (table stakes):**
- Step-by-step daily flow with resume-where-left-off
- Streak counter with grace-day (no punitive single-missed-day resets)
- Editable transcript before AI submit - Web Speech API makes errors
- AI feedback per step: score 1-10, what landed, single fix, better rewritten line using real resume projects; <80 words
- PDF resume upload parsed in-browser, editable textarea, stored locally
- Weak-spot tag tracking (AI assigns tags; top tags surface in journey intro)
- Day completion state + visual confirmation
- JSON backup export/import (carry forward from existing app)
- Graceful typed-answer fallback when SpeechRecognition is unavailable

**Should have (differentiators):**
- Resume-grounded rewritten line - rewrites that quote the learner actual projects, not generic templates
- PM vocabulary cross-referenced in answer feedback
- Leitner 5-box spaced review - earlier vocab resurfaces daily alongside 5 new words
- Unexpected interview question with one AI follow-up probe (2-turn conversation)
- Weak-spot tags drive question selection
- PM-only coach persona with hard rails (strict system prompt, rubric-anchored scoring, no praise openers)

**Defer (last phase, in scope):**
- AI-generated endless days (day 31+) - depends on weak-spot history; builds on all prior phases

**Anti-features (do not build):**
- Leaderboards, video recording, voice-tone analysis, DOCX support, multi-device sync, real-time transcription overlay, punitive streaks, detailed analytics dashboard

### Architecture Approach

Three browser files plus one Worker file, no build step. `content.js` (pure static data) loads before `app.js` (all runtime logic). The Worker owns the system prompt, key rotation, and JSON validation - the browser sends only user content, never the system prompt or keys. All new per-day data lives under `d-YYYY-MM-DD` in localStorage with schema versioning; existing flat keys are preserved via migration.

**Major components:**
1. **Journey Engine** (app.js) - Step state machine (0-4), resume-where-left-off, step transitions
2. **Storage Module** (app.js) - Versioned localStorage read/write, v1->v2 migration, JSON export/import
3. **Coach Client** (app.js) - POST to Worker with answer + resume excerpt (capped 1500 chars), parses feedback, 1 retry on bad JSON
4. **Speech Module** (app.js) - Web Speech API wrapper, `continuous: false` + `onend` restart, typed fallback
5. **Resume Module** (app.js) - pdf.js extraction, editable textarea, save to localStorage; shown to user before first AI call
6. **Static Content** (content.js) - 150 vocab terms, 30-day prompts/cases/questions as plain JS arrays
7. **Cloudflare Worker** (worker/worker.js) - Origin auth + passcode, system prompt injection, key rotation, NIM call, think-block stripping, JSON validation with 1 retry

**Key architectural constraints:**
- System prompt lives in Worker only - page cannot override it
- Resume excerpt capped at 1500 chars before sending
- Each AI call is stateless (no conversation history across steps) - prevents persona drift
- Model ID stored as Worker `[vars]` (not hardcoded) so model swaps require only `wrangler deploy`

### Critical Pitfalls

1. **API keys in git history** - `wrangler secret put` for all NIM keys; pre-commit hook grepping for `nvapi-`; never use `[vars]` for key values. Recovery cost is HIGH if violated.
2. **NIM 429 silently breaking the journey** - Failover in Worker (try key 1 -> key 2 -> key 3 on 429); every AI step must have a visible self-assess fallback button built *before* AI integration.
3. **Generic flattering feedback eroding trust** - System prompt must include explicit rubric with score floors, prohibit praise openers, require fix to be a specific rewrite. Test against a deliberately weak answer; score must not exceed 5.
4. **NIM reasoning think-blocks breaking JSON parsing** - Strip `<think>...</think>` in Worker before forwarding. Set `max_tokens: 400`, use `response_format: {type: "json_object"}` where supported, wrap JSON.parse in try/catch.
5. **localStorage migration destroying existing progress** - Add `_version: 2` check on load; migration adds new keys with defaults and never deletes old flat keys. Test on a copy of existing data before shipping.

## Implications for Roadmap

Based on research, the architecture build-order dependency chain maps directly to 7 phases. 7 of 11 build steps are offline-testable before any NIM credits are spent.

### Phase 1: Infrastructure - Cloudflare Worker Proxy
**Rationale:** NIM CORS is confirmed blocked; nothing AI-related works without the Worker. Must establish auth, key rotation, 429 failover, and CORS preflight from day one.
**Delivers:** Deployed Worker with mock response; tested from GitHub Pages domain; CORS confirmed; 429 rotation confirmed with a deliberately exhausted key; Cloudflare setup guide for the learner.
**Avoids:** Key-in-git pitfall (Pitfall 1), CORS block (Pitfall 3), 429 silent failure (Pitfall 4).
**Research flag:** Standard patterns - skip research phase. Worker code fully specified in STACK.md.

### Phase 2: Storage + Schema Migration
**Rationale:** Every subsequent phase reads and writes localStorage. The v1->v2 migration must run before any new data is written.
**Delivers:** Versioned `recallData` schema, `d-YYYY-MM-DD` per-day structure, migration preserving all v1 flat keys, JSON export/import, `QuotaExceededError` handling.
**Avoids:** localStorage migration pitfall (Pitfall 15).
**Research flag:** Standard patterns - skip research phase. Schema fully specified in ARCHITECTURE.md.

### Phase 3: Resume Module (PDF Extraction)
**Rationale:** Resume personalises all AI feedback. Building it before AI integration validates the extraction/editing/storage pipeline before it flows into prompts.
**Delivers:** File picker -> pdf.js extraction -> editable textarea -> save to localStorage. Scanned-PDF warning. Two-column layout edit prompt.
**Uses:** pdfjs-dist 6.5.438 from jsDelivr CDN; ESM import with `GlobalWorkerOptions.workerSrc`.
**Avoids:** pdf.js scanned PDF / multi-column pitfalls (Pitfall 14); hallucination risk (Pitfall 11).
**Research flag:** Standard patterns - skip research phase.

### Phase 4: Journey Shell + Content (Offline Steps)
**Rationale:** The step state machine, all 5 step renderers, vocab Leitner logic, speech transcription, and static content can be built and tested without spending API credits. Self-assess fallback paths must exist before Phase 5.
**Delivers:** 5-step journey (Vocab, Recall, Speaking, Case, Interview); resume-where-left-off; step progress bar; streak counter with grace-day; day completion state; 150-term vocab with Leitner 5-box logic; Web Speech API with typed fallback; `content.js` with all 30-day static data; self-assess fallback checklists on AI steps.
**Avoids:** Session-too-long pitfall (Pitfall 16) - time full flow here before AI latency added; AI-blocks-journey pitfall (Pitfall 17) - self-assess path built in this phase.
**Research flag:** Standard patterns. Web Speech auto-restart must be tested on Chrome Android before marking done.

### Phase 5: AI Coach Integration
**Rationale:** All prior phases establish the data pipeline. This phase wires real NIM calls for all 4 activity types, validates the system prompt, and confirms JSON parsing robustness.
**Delivers:** Live AI feedback for all steps; think-block stripping in Worker; JSON validation with 1 retry; system prompt with rubric-anchored scoring and hallucination guard; model ID in Worker `[vars]`; 402/403 graceful degradation showing self-assess rubric; full error handling.
**Uses:** `nvidia/nemotron-3-super-120b-a12b` (thinking OFF), `temperature: 1.0`, `top_p: 0.95`, `max_tokens: 400`; fallback to `nvidia/nemotron-3.5-lightning-30b-a3b`.
**Avoids:** Generic feedback (Pitfall 10), hallucination (Pitfall 11), prompt injection (Pitfall 12), persona drift (Pitfall 13), think-block parse failure (Pitfall 5), model deprecation (Pitfall 6).
**Research flag:** Needs attention - validate system prompt against 3 sample answers (weak, strong, rambling) before wiring to journey UI. System prompt quality is the highest-risk deliverable.

### Phase 6: Weak-Spot Tracking
**Rationale:** Weak-spot tags require AI feedback to exist; natural follow-on to Phase 5.
**Delivers:** AI assigns tags per answer; tag frequency in `weakspots[]`; top 2-3 tags on day summary and injected into journey step intros; unexpected question selection biased toward top weak spots.
**Research flag:** Standard patterns - tag taxonomy and injection points specified in FEATURES.md.

### Phase 7: AI-Generated Endless Days (Day 31+)
**Rationale:** Depends on weak-spot history (Phase 6) and full AI pipeline (Phase 5). Deferred to keep earlier phases simpler. User confirmed this is in scope.
**Delivers:** Worker endpoint generates new day content from weak-spot history and resume; `customDays[]` stored in localStorage; journey continues past day 30.
**Research flag:** Moderate complexity - generation prompt needs iteration. Plan to test 3 generated days before marking complete.

### Phase Ordering Rationale

- Worker before everything - CORS block is a hard constraint; no AI feature is testable without it
- Storage before resume/journey - migration must run before any new data is written
- Resume before AI - hallucination guard requires the user to review extracted text first
- Journey shell before AI - self-assess fallback paths must exist before AI is wired (Pitfall 17); validates full session timing before AI latency is added
- AI before weak-spots - weak-spot tags are produced by AI feedback
- Endless days last - depends on weak-spot history and full AI pipeline; safest to defer

### Research Flags

Needs attention during planning/implementation:
- **Phase 5 (AI Integration):** System prompt quality is highest-risk. Validate against the 3 sample answers from STACK.md bake-off rubric. The prompt spec in PITFALLS.md Pitfall 10 is a starting point, not a final answer.
- **Phase 7 (Endless Days):** Day-generation prompt needs iteration. Plan for 2-3 test runs before shipping.

Standard patterns (skip research phase):
- **Phase 1 (Worker):** Code fully specified in STACK.md. Cloudflare Dashboard deploy documented.
- **Phase 2 (Storage):** Schema fully specified in ARCHITECTURE.md. Standard migration pattern.
- **Phase 3 (Resume):** CDN URLs confirmed, extraction pattern specified in STACK.md.
- **Phase 4 (Journey Shell):** Step machine pattern in ARCHITECTURE.md; 150-term vocab fully written in FEATURES.md.
- **Phase 6 (Weak-spots):** Tag taxonomy and injection points in FEATURES.md.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | CORS confirmed via live preflight; models confirmed live; CDN URLs verified 200 OK; Cloudflare pricing from official docs |
| Features | HIGH | Well-established domain; 150-term curriculum fully written; Leitner logic well-documented; journey arc locked by user decisions |
| Architecture | HIGH | Existing codebase read directly; all component boundaries specified; data model and API contract fully defined |
| Pitfalls | HIGH | Drawn from production incidents; NIM think-block behaviour confirmed; Web Speech Android bug confirmed (crbug/41297427) |

**Overall confidence:** HIGH

### Gaps to Address

- **NIM free-tier RPM ceiling:** ~40 RPM/key (MEDIUM confidence - inferred, not officially published). Test key exhaustion explicitly during Phase 1.
- **`response_format: {type: "json_object"}` on Nemotron-3-Super:** Test at Phase 5; fall back to prompt-only JSON instruction if rejected.
- **NIM trial credit volume:** Not published. Monitor dashboard during Phase 5. Offline self-assess fallback (Phase 4) ensures credit exhaustion never blocks daily practice.
- **Web Speech API on Android Chrome:** `continuous: false` + `onend` restart pattern specified; must be verified on a real Android device during Phase 4.

## Sources

### Primary (HIGH confidence)
- `https://integrate.api.nvidia.com/v1/models` - live models list; nemotron-3-super-120b-a12b and fallback confirmed live
- OPTIONS https://integrate.api.nvidia.com/v1/chat/completions with GitHub Pages origin - CORS block confirmed
- `https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b` - model card: 120B/12B active, 1M context, enable_thinking toggle, benchmarks
- `https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b` - NIM API reference
- MDN browser-compat-data SpeechRecognition.json - Web Speech API support table including Android Chrome bug
- jsDelivr data endpoint - pdfjs-dist 6.5.438 latest confirmed; CDN URL 200 OK
- `https://developers.cloudflare.com/workers/platform/pricing/` - Cloudflare Workers free tier
- Existing codebase index.html - direct read; existing features and localStorage structure confirmed

### Secondary (MEDIUM confidence)
- NVIDIA NIM rate limits ~40 RPM/key on free tier - inferred from API behaviour and community docs
- pdf.js multi-column ordering behaviour - from GitHub issues

### Tertiary (LOW confidence)
- NIM trial credit volume per new account - not published; monitor dashboard

---
*Research completed: 2026-11-09*
*Ready for roadmap: yes*
