# Stack Research

**Domain:** AI-coached interview training web app (vanilla JS, static hosting)
**Researched:** 2026-11-09 (model section updated after orchestrator review)
**Confidence:** HIGH for CORS/model-list (live-verified); MEDIUM for rate limits (inferred from API behaviour + community docs); HIGH for pdf.js/Web Speech API (MDN compat data + CDN verification)

---

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

---

## Model Selection Detail (Q1)

### Models confirmed live on `integrate.api.nvidia.com` as of 2026-11-09

The `/v1/models` endpoint (unauthenticated) + NIM API docs confirmed these candidates:

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

Nemotron-70B lacks published post-2024 benchmarks for direct comparison. The Super model's 2026 training (RL on structured output + instruction-following environments) makes it the clearly better choice for a JSON-producing PM coach.

### Models NOT present in the unauthenticated `/v1/models` endpoint

The following do not appear in the confirmed live list (may still be accessible with a valid API key — check the NIM docs API reference at `docs.api.nvidia.com`):
- `nvidia/llama-3.3-nemotron-super-49b-v1` / `v1.5` — in docs API reference but not in unauthenticated model list
- `qwen/qwen3-next-80b-a3b-instruct` — in docs API reference
- Llama 4 Maverick, DeepSeek R1/V3 — not present anywhere

### Primary pick: `nvidia/nemotron-3-super-120b-a12b`

**Why over `nvidia/llama-3.1-nemotron-70b-instruct`** (the original pick):
- **Newer**: March 2026 vs 2024 — trained with 2026 techniques (RL on structured output, MTP for speed, NVFP4 quantization)
- **12B active params vs 70B dense**: Similar or faster inference wall-time despite 120B total (MoE routing means only 12B activate per token)
- **Thinking toggle**: Can disable chain-of-thought for structured JSON tasks — avoids wasted tokens and latency that reasoning would add before the actual short answer
- **1M context vs 128K**: Resume + system prompt + 30-day conversation history fits with room to spare
- **Explicit structured output training**: The SFT stage included "structured outputs" data; RL included "structured output environments" — purpose-built for JSON tasks
- **Same API endpoint**: Drop-in; just change the model ID and add `chat_template_kwargs`

**Why not `nvidia/nemotron-3-ultra-550b-a55b`** (the strongest Nemotron):
- 55B active params (vs 12B) = much slower for interactive use — feedback latency matters for a daily trainer
- Better instruction following (IFBench 81.7 vs 72.56) but the gap doesn't justify 4× slower inference
- Likely lower RPM ceiling on free tier (larger model = more compute per request)
- For <80-word PM coaching feedback, Super's quality is more than sufficient

**Thinking toggle — exact request parameters:**

```json
{
  "model": "nvidia/nemotron-3-super-120b-a12b",
  "messages": [
    {"role": "system", "content": "You are a PM interview coach. Respond only with valid JSON: {\"score\": 1-10, \"right\": \"...\", \"fix\": \"...\", \"better\": \"...\", \"tags\": [\"...\"]}"},
    {"role": "user", "content": "Here is my answer: ..."}
  ],
  "temperature": 1.0,
  "top_p": 0.95,
  "max_tokens": 400,
  "chat_template_kwargs": {"enable_thinking": false}
}
```

**Important**: NVIDIA explicitly recommends `temperature=1.0, top_p=0.95` for ALL Nemotron-3 tasks (including non-reasoning), regardless of whether thinking is on or off. This is documented on the model card.

**`enable_thinking` options:**
- `{"enable_thinking": false}` — no reasoning trace; direct answer only; use this for JSON feedback
- `{"enable_thinking": true}` — full reasoning then answer; slower but higher quality for complex reasoning
- `{"enable_thinking": true, "low_effort": true}` — reduced reasoning tokens; compromise

**JSON / structured output**: Use prompt-level JSON instruction (as above) as the primary mechanism. `response_format: {"type": "json_object"}` may also work (OpenAI-compatible API) but is not guaranteed for every NIM model — test at Phase 1 bake-off and fall back to prompt-only if rejected.

**Context**: 1,000,000 tokens. This project will never come close to this limit.

**Free-tier rate limits**: NVIDIA NIM free accounts typically receive ~40 RPM per key (MEDIUM confidence — not officially published as a fixed number). With 3–4 keys round-robined, effective ceiling is ~120–160 RPM.

### Fast fallback: `nvidia/nemotron-3.5-lightning-30b-a3b`

**Why**: MoE with ~3B active parameters = sub-second inference. The model has no visible thinking toggle (simpler architecture). For producing <80-word structured feedback, it is adequate as a 429 failover. Use the same prompt-level JSON instruction; omit `chat_template_kwargs` (not needed for this model).

```json
{
  "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
  "messages": [...],
  "temperature": 0.5,
  "max_tokens": 400
}
```

### Phase 1 bake-off: how to pick definitively

Run the same 3 sample PM answers through each of the top 3 models using real API keys. Evaluate:

**Sample answers to test** (cover the key PM skill areas in the existing app):
1. A vague metrics answer: *"Payment conversion dropped 15%. I would look at the data and find the problem and fix it."* — tests whether the model identifies missing structure and no metric
2. A strong answer: *"Payment conversion fell from 72% to 59% in two weeks. I would segment by platform, payment method, and user cohort; check for latency spikes on the payments API; and rule out UX regressions from the recent deploy before proposing solutions."* — tests whether the model correctly scores high and doesn't over-criticise
3. A rambling answer: *"So, like, I would first check everything and also talk to stakeholders and also look at the data and then maybe do some user interviews and then probably fix it after figuring out the main thing that's wrong."* — tests whether the model correctly tags "no structure" and "rambling"

**Models to compare:**

| Model | Why include in bake-off |
|-------|------------------------|
| `nvidia/nemotron-3-super-120b-a12b` (thinking OFF) | Primary candidate |
| `nvidia/llama-3.1-nemotron-70b-instruct` | Baseline; previous pick |
| `nvidia/nemotron-3.5-lightning-30b-a3b` | Speed check; potential fallback |

**Evaluation rubric per response:**
- JSON validity (parse without error: Y/N)
- Field completeness (all 5 fields present: Y/N)
- Score accuracy (does the score match the answer quality: Y/N)
- Fix relevance (is the "one fix" actionable and PM-specific: Y/N)
- Better line quality (is the rewrite genuinely better: Y/N)
- Wall-time latency (measure with `Date.now()` around the fetch call)

If Super and Nemotron-70B are close on quality but Super is faster (expected from 12B vs 70B active), Super wins.

---

## CORS Verdict (Q2)

**CORS is blocked. A proxy is mandatory.**

Live verification via `OPTIONS https://integrate.api.nvidia.com/v1/chat/completions` with `Origin: https://saitejatiru.github.io`:

```
HTTP/1.1 200 OK
Vary: Origin
Vary: Access-Control-Request-Method
Vary: Access-Control-Request-Headers
(no Access-Control-Allow-Origin header)
```

The browser will block any direct `fetch()` to `integrate.api.nvidia.com` because no `Access-Control-Allow-Origin` header is present in the preflight response. The Worker proxy is the only viable solution without changing the hosting platform.

---

## Cloudflare Worker Proxy Pattern (Q3)

### Setup recommendation: Dashboard (no Wrangler install needed)

1. Go to `dash.cloudflare.com` → Workers & Pages → Create → Worker
2. Paste the proxy script (below) into the online editor
3. Deploy
4. Go to Settings → Variables → Secrets and add `NIM_KEY_1`, `NIM_KEY_2`, `NIM_KEY_3`, `NIM_KEY_4`, `PASSCODE`

### Minimal proxy pattern

```js
// ponytail: global round-robin counter; resets on cold start, fine for personal tool
let idx = 0;

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://saitejatiru.github.io',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type, X-Passcode',
        },
      });
    }

    // Origin + passcode guard
    const origin = request.headers.get('Origin') || '';
    if (origin !== 'https://saitejatiru.github.io') {
      return new Response('Forbidden', { status: 403 });
    }
    if (request.headers.get('X-Passcode') !== env.PASSCODE) {
      return new Response('Forbidden', { status: 403 });
    }

    // Build key pool from secrets
    const keys = [env.NIM_KEY_1, env.NIM_KEY_2, env.NIM_KEY_3, env.NIM_KEY_4]
      .filter(Boolean);

    const body = await request.text();
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://saitejatiru.github.io',
    };

    // Round-robin with 429/5xx failover
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = keys[idx % keys.length];
      idx = (idx + 1) % keys.length;

      const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (resp.status !== 429 && resp.status < 500) {
        // Pass response through with CORS headers
        const headers = new Headers(resp.headers);
        Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
        return new Response(resp.body, { status: resp.status, headers });
      }
      // 429 or 5xx — try next key
    }

    return new Response(JSON.stringify({ error: 'All keys exhausted' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
```

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

The 10ms CPU limit is the only meaningful constraint. The Worker spends nearly all its time waiting on the NIM network call (I/O, not CPU). The actual CPU — JSON parse, header copy — easily fits in 2–3ms. No paid plan needed.

---

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

1. **Chrome Android continuous mode is broken**: Setting `recognition.continuous = true` on Android Chrome is silently ignored. Recognition stops after each utterance. Must handle `onend` and restart programmatically.
2. **Network required**: Chrome's implementation sends audio to Google's speech servers. No offline support.
3. **60-second soft limit**: Chrome's continuous mode on desktop restarts silently approximately every 60 seconds. The `onend` event fires and you must call `start()` again if you want seamless long recording.
4. **HTTPS required**: `localhost` is exempted, but GitHub Pages (HTTPS) is fine.

### Recommended implementation pattern

```js
// ponytail: covers Chrome/Edge/Android; fallback to textarea for Firefox <160 and others
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  const r = new SR();
  r.lang = 'en-US';
  r.continuous = false;      // use single-shot + manual restart; works on Android too
  r.interimResults = true;
  r.onend = () => { if (listening) r.start(); };  // seamless restart
} else {
  // Show textarea-only fallback
}
```

Using `continuous: false` with `onend` restart works identically on desktop and Android. Avoid relying on `continuous: true` to avoid the Android silent-ignore bug.

---

## PDF Text Extraction (Q5)

### Confirmed versions

| CDN | Version | URL pattern | Verified |
|-----|---------|-------------|---------|
| jsdelivr | **6.5.438** (latest) | `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs` | 200 OK (1.27 MB) |
| cdnjs | 6.4.299 | `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.4.299/pdf.min.mjs` | 200 OK |

**Use jsdelivr 6.5.438** — it tracks npm latest; cdnjs lags behind by one minor version.

### ESM usage without a build step

```html
<script type="module">
import * as pdfjsLib from
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs';

async function extractText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) =>
      pdf.getPage(i + 1).then(p => p.getTextContent()).then(tc =>
        tc.items.map(it => it.str).join(' ')
      )
    )
  );
  return pages.join('\n');
}
</script>
```

**Why `type="module"`**: pdfjs-dist 4.x+ dropped the legacy UMD/CommonJS build. The `.min.mjs` files are native ES modules. `type="module"` is required; it has universal support in Chrome, Edge, Firefox, Safari.

**Worker is mandatory**: pdfjs will refuse to parse without a worker source set. The two-URL pattern (main + worker) is the minimum viable setup.

---

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

---

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

---

## Stack Patterns by Variant

**If a NIM key returns 429:**
- Round-robin to next key in the pool
- Worker handles this transparently; browser code is unaware

**If all NIM keys return 429:**
- Return `429` to the browser
- Show "Busy — try again in a minute" UI message; don't auto-retry (might hammer the API)

**If browser does not support SpeechRecognition:**
- Hide the microphone button
- Show the transcript textarea with a placeholder "Type your answer here"
- All downstream logic (AI assessment) works identically on the text

**If PDF upload fails to extract text:**
- Keep the textarea editable; user pastes their resume text manually
- Text extraction is a convenience, not a blocker

---

## CDN URLs (confirmed accessible as of research date)

```
# pdfjs main module
https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs

# pdfjs worker (must be set before any getDocument() call)
https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs
```

---

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

---

*Stack research for: RECALL PM interview coaching web app*
*Researched: 2026-11-09 | Model section updated: 2026-11-09 (orchestrator review)*
