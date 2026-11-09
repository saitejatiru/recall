<!-- GSD:project-start source:PROJECT.md -->

## Project

**RECALL — PM Communication Coach**

RECALL is a personal, single-page daily training journey that builds product management interview skills: articulating answers clearly, handling unexpected questions on the spot, and using PM vocabulary naturally. Each day walks one learner (the repo owner, preparing for PM interviews) through one guided flow (5 PM words → recall → spoken answer → product case / unexpected interview question). An AI coach running on an NVIDIA NIM model reviews every answer, using the learner's own resume, and gives short, plain-language feedback on what went wrong and what to say instead.

**Core Value:** After every practice answer, the learner gets short, specific and personalised feedback (score, the one fix that matters most, and a better line to say) so each day's practice measurably improves how they articulate PM answers.

### Constraints

- **Security**: NVIDIA API keys must never be committed or shipped to the browser — public repo
- **Tech stack**: Static page (GitHub Pages) + one Cloudflare Worker; keep vanilla JS, no build step — matches existing app, zero hosting cost
- **Budget**: Free tiers only (NVIDIA NIM trial credits, Cloudflare Workers free, GitHub Pages)
- **Feedback length**: under ~80 words per response — user explicitly wants short, easy-to-understand feedback
- **Persona scope**: AI must stay inside PM/interview coaching
- **Privacy**: resume text stays in the learner's browser and is only sent to the model as part of a coaching request
- **Compatibility**: Must work in Chrome/Edge on desktop and Android; graceful fallback to typing where speech recognition is unavailable

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology | Version / ID | Purpose | Why Recommended |
|------------|-------------|---------|-----------------|
| NVIDIA NIM `nvidia/nemotron-3-super-120b-a12b` | live (March 2026) | Primary AI coach | 2026 LatentMoE model; 12B active params (fast like a small model, 120B total); 1M-token context; thinking OFF via `chat_template_kwargs: {"enable_thinking": false}` avoids reasoning overhead on structured JSON tasks; RL-trained explicitly on structured output environments; newer and stronger than 2024 Nemotron-70B |
| NVIDIA NIM `nvidia/nemotron-3.5-lightning-30b-a3b` | live | Fast failover model | MoE with only 3B active params = sub-second inference; adequate for <80-word structured feedback when primary is 429; same API signature; no thinking overhead |
| Cloudflare Worker | free tier | Proxy + key rotation | Only way to call CORS-blocked NIM API from a browser; stores 3–4 API keys as encrypted Secrets; free tier gives 100,000 req/day (CPU-only metering; network wait doesn't count) |
| Web Speech API (`webkitSpeechRecognition`) | browser-native | In-browser speech-to-text | Zero cost, zero dependency, works in Chrome/Edge/Android Chrome; transcript editable before submission |
| pdfjs-dist | 6.5.438 (npm/jsdelivr) | In-browser PDF text extraction | Official Mozilla library; ESM-importable with no build step via CDN; worker offloads heavy parsing from main thread |
| GitHub Pages | — | Static hosting | Free, already in use, no server config |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdfjs-dist (worker) | 6.5.438 | Offloads PDF parsing to a background thread | Required alongside the main module; set `GlobalWorkerOptions.workerSrc` to the CDN URL |
| None else | — | — | Existing app is intentionally zero-dependency; keep it that way |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Cloudflare Dashboard | Deploy Worker, store Secrets | Recommended over Wrangler for non-developers; full GUI, no CLI install needed; paste Worker code in the browser editor |
| Wrangler CLI (optional) | Local Worker testing | Install only if you want to test the proxy locally before deploy; `npx wrangler dev` works without global install |
| Git + GitHub | Version control + Pages deploy | Existing workflow; pushing to `main` auto-deploys Pages |

## Model Selection Detail (Q1)

### Models confirmed live on `integrate.api.nvidia.com` as of 2026-11-09

| Model ID | Architecture | Active Params | Context | Thinking Toggle | Release | Best Fit |
|----------|-------------|--------------|---------|-----------------|---------|----------|
| `nvidia/nemotron-3-super-120b-a12b` | LatentMoE (Mamba-2+MoE+Attn+MTP) | **12B** | 1M | `enable_thinking: false/true` | Mar 2026 | **PRIMARY** |
| `nvidia/nemotron-3-ultra-550b-a55b` | LatentMoE (Mamba-2+MoE+Attn+MTP) | **55B** | 1M | `enable_thinking: false/true` | Jun 2026 | Overkill for this use case |
| `nvidia/llama-3.1-nemotron-70b-instruct` | Dense (Llama 3.1 fine-tune) | 70B | 128K | None | 2024 | Former pick; superseded |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | MoE | **~3B** | — | None visible | — | **FALLBACK** — fastest |
| `deepseek-ai/deepseek-v4.1-flash` | Likely MoE | — | — | — | — | Alternative fallback |
| `moonshotai/kimi-k2.6` | MoE | — | — | — | — | Strong reasoner; slower |

### Benchmark comparison (from model cards, verified 2026-11-09)

| Benchmark | Nemotron-3-Super (12B active) | Nemotron-70B (2024) | Nemotron-3-Ultra (55B active) |
|-----------|------------------------------|--------------------|-----------------------------|
| IFBench (instruction following) | 72.56 | — | **81.7** |
| GPQA (reasoning) | 79.23 | — | 87.9 |
| AIME25 | 90.21 | — | — |
| Arena-Hard-V2 (chat quality) | 73.88 | — | — |
| Context window | 1M tokens | 128K | 1M tokens |

### Models NOT present in the unauthenticated `/v1/models` endpoint

- `nvidia/llama-3.3-nemotron-super-49b-v1` / `v1.5` — in docs API reference but not in unauthenticated model list
- `qwen/qwen3-next-80b-a3b-instruct` — in docs API reference
- Llama 4 Maverick, DeepSeek R1/V3 — not present anywhere

### Primary pick: `nvidia/nemotron-3-super-120b-a12b`

- **Newer**: March 2026 vs 2024 — trained with 2026 techniques (RL on structured output, MTP for speed, NVFP4 quantization)
- **12B active params vs 70B dense**: Similar or faster inference wall-time despite 120B total (MoE routing means only 12B activate per token)
- **Thinking toggle**: Can disable chain-of-thought for structured JSON tasks — avoids wasted tokens and latency that reasoning would add before the actual short answer
- **1M context vs 128K**: Resume + system prompt + 30-day conversation history fits with room to spare
- **Explicit structured output training**: The SFT stage included "structured outputs" data; RL included "structured output environments" — purpose-built for JSON tasks
- **Same API endpoint**: Drop-in; just change the model ID and add `chat_template_kwargs`
- 55B active params (vs 12B) = much slower for interactive use — feedback latency matters for a daily trainer
- Better instruction following (IFBench 81.7 vs 72.56) but the gap doesn't justify 4× slower inference
- Likely lower RPM ceiling on free tier (larger model = more compute per request)
- For <80-word PM coaching feedback, Super's quality is more than sufficient
- `{"enable_thinking": false}` — no reasoning trace; direct answer only; use this for JSON feedback
- `{"enable_thinking": true}` — full reasoning then answer; slower but higher quality for complex reasoning
- `{"enable_thinking": true, "low_effort": true}` — reduced reasoning tokens; compromise

### Fast fallback: `nvidia/nemotron-3.5-lightning-30b-a3b`

### Phase 1 bake-off: how to pick definitively

| Model | Why include in bake-off |
|-------|------------------------|
| `nvidia/nemotron-3-super-120b-a12b` (thinking OFF) | Primary candidate |
| `nvidia/llama-3.1-nemotron-70b-instruct` | Baseline; previous pick |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | Speed check; potential fallback |

- JSON validity (parse without error: Y/N)
- Field completeness (all 5 fields present: Y/N)
- Score accuracy (does the score match the answer quality: Y/N)
- Fix relevance (is the "one fix" actionable and PM-specific: Y/N)
- Better line quality (is the rewrite genuinely better: Y/N)
- Wall-time latency (measure with `Date.now()` around the fetch call)

## CORS Verdict (Q2)

## Cloudflare Worker Proxy Pattern (Q3)

### Setup recommendation: Dashboard (no Wrangler install needed)

### Minimal proxy pattern

### Key decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Streaming | No | <80-word responses finish in <1s; non-streaming is simpler (no SSE parsing in vanilla JS) |
| State | In-memory `idx` counter | Personal tool; resets on Worker cold start is fine; no KV overhead |
| Auth | Origin header + shared passcode | Prevents public abuse; passcode lives in browser localStorage (not committed) |
| Key count | Up to 4 | Beyond 4 adds marginal benefit; 4 keys = ~160 RPM ceiling, enough for any realistic personal use |

### Free-tier limits

| Resource | Free limit |
|----------|-----------|
| Requests | 100,000 / day |
| CPU time | 10ms / invocation (network wait to NIM does NOT count as CPU time) |
| Secrets | Up to 100 |

## Web Speech API (Q4)

### Browser support (from MDN compat data, verified 2026-11-09)

| Browser | Unprefixed (`SpeechRecognition`) | Prefixed (`webkitSpeechRecognition`) | Continuous mode |
|---------|----------------------------------|--------------------------------------|-----------------|
| Chrome desktop | v139+ | v33+ | Yes |
| Edge desktop | v139+ (mirrors Chrome) | v33+ | Yes |
| Firefox desktop | v160+ | No | Yes |
| Safari desktop | No | v14.1+ (macOS) | v17+ |
| Chrome Android | v139+ (mirrors Chrome) | v33+ | **Property accepts value but has NO EFFECT** (crbug/41297427) |
| Firefox Android | Not supported | Not supported | N/A |
| Safari iOS | No | v14.1+ | Limited |

### Critical limitations

### Recommended implementation pattern

## PDF Text Extraction (Q5)

### Confirmed versions

| CDN | Version | URL pattern | Verified |
|-----|---------|-------------|---------|
| jsdelivr | **6.5.438** (latest) | `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs` | 200 OK (1.27 MB) |
| cdnjs | 6.4.299 | `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.min.mjs` | 200 OK |

### ESM usage without a build step

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `nvidia/nemotron-3-super-120b-a12b` | `nvidia/llama-3.1-nemotron-70b-instruct` | 2024 model; 70B dense params (slower than 12B active MoE); no thinking toggle; 128K context; lacks 2026 RL training on structured outputs |
| `nvidia/nemotron-3-super-120b-a12b` | `nvidia/nemotron-3-ultra-550b-a55b` | 55B active vs 12B = 4× slower inference; better IFBench (81.7 vs 72.56) but gap doesn't justify latency for <80-word feedback |
| `nvidia/nemotron-3-super-120b-a12b` | `moonshotai/kimi-k2.6` | Strong reasoner but not NVIDIA-native; less predictable structured output on NIM infra |
| `nvidia/nemotron-3.5-lightning-30b-a3b` (fallback) | `deepseek-ai/deepseek-v4.1-flash` | Either works as fallback; lightning-30b is NVIDIA-native and more consistent on NIM infra |
| Cloudflare Worker | Netlify Functions / Vercel Edge | Already using GitHub Pages; Cloudflare free tier is more generous (100K req/day vs Netlify 125K/month) |
| Web Speech API | Whisper API (OpenAI) | Would require another API key + proxy; costs money; Web Speech API is free and in-browser |
| pdfjs-dist | PDF.co / Textract | Cloud PDF extraction leaks resume data to a third party; pdfjs is fully in-browser |
| Dashboard deploy | Wrangler CLI | Wrangler requires Node.js install + auth setup; not appropriate for a non-developer deploying a one-file Worker |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Direct `fetch()` to `integrate.api.nvidia.com` from browser | CORS blocked (confirmed: no `Access-Control-Allow-Origin` in preflight) | Cloudflare Worker proxy |
| `nvidia/llama-3.1-nemotron-70b-instruct` as primary | 2024 model superseded by Nemotron-3-Super; 70B dense slower than 12B active MoE; no thinking toggle; 128K context | `nvidia/nemotron-3-super-120b-a12b` |
| `nvidia/nemotron-3-ultra-550b-a55b` as primary | 55B active params = much slower interactive latency; overkill for <80-word PM coaching | `nvidia/nemotron-3-super-120b-a12b` |
| `recognition.continuous = true` on mobile | Silently ignored on Chrome Android (crbug/41297427) | `continuous: false` + `onend` restart loop |
| pdfjs-dist via UMD/`<script src>` without module type | pdfjs 4+ requires ES modules; UMD build no longer ships | `<script type="module">` with `.mjs` CDN files |
| Storing NIM API keys in `index.html` or any committed file | Repo is public; keys would be immediately visible | Cloudflare Worker Secrets |
| Streaming responses from NIM via the Worker | SSE proxy adds 30+ lines of Worker code; <80-word responses finish in <1s anyway | Non-streaming (simpler) |
| `enable_thinking: true` for JSON feedback tasks | Adds reasoning tokens before the answer; increases latency and costs tokens for no benefit when output is <80 words | `{"enable_thinking": false}` in `chat_template_kwargs` |

## Stack Patterns by Variant

- Round-robin to next key in the pool
- Worker handles this transparently; browser code is unaware
- Return `429` to the browser
- Show "Busy — try again in a minute" UI message; don't auto-retry (might hammer the API)
- Hide the microphone button
- Show the transcript textarea with a placeholder "Type your answer here"
- All downstream logic (AI assessment) works identically on the text
- Keep the textarea editable; user pastes their resume text manually
- Text extraction is a convenience, not a blocker

## CDN URLs (confirmed accessible as of research date)

# pdfjs main module

# pdfjs worker (must be set before any getDocument() call)

## Sources

- `https://integrate.api.nvidia.com/v1/models` — live models list, unauthenticated GET, verified 2026-11-09 (HIGH confidence)
- `OPTIONS https://integrate.api.nvidia.com/v1/chat/completions` with `Origin: https://saitejatiru.github.io` — CORS preflight, confirmed no `Access-Control-Allow-Origin` (HIGH confidence)
- `https://build.nvidia.com/nvidia/nemotron-3-super-120b-a12b` — model card: 120B/12B active, 1M context, `enable_thinking` toggle, benchmarks, temperature=1.0 recommendation (HIGH confidence, fetched 2026-11-09)
- `https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b` — model card: 550B/55B active, 1M context, Jun 2026, IFBench 81.7 (HIGH confidence, fetched 2026-11-09)
- `https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-super-120b-a12b` — NIM API reference confirming model endpoint and thinking toggle variants (HIGH confidence)
- `https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SpeechRecognition.json` — MDN compat data for Web Speech API and continuous mode (HIGH confidence)
- `https://api.cdnjs.com/libraries/pdf.js?fields=version,latest,filename` — cdnjs pdf.js version 6.4.299 (HIGH confidence)
- `https://data.jsdelivr.com/v1/packages/npm/pdfjs-dist` — jsdelivr pdfjs-dist latest 6.5.438 (HIGH confidence)
- `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs` — 200 OK, 1.27MB confirmed (HIGH confidence)
- `https://developers.cloudflare.com/workers/platform/pricing/` — Cloudflare Workers free tier 100K req/day, 10ms CPU (HIGH confidence)
- NVIDIA NIM rate limits ~40 RPM/key on free tier — inferred from API behaviour and community docs (MEDIUM confidence; verify at sign-up)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
