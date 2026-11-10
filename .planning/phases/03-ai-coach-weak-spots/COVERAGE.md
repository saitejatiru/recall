# API Coverage — NVIDIA NIM / Google Gemini (via Cloudflare Worker)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Phase 3 adds the `coach` task to the existing Worker; the same callAI / key-rotation / fallback
> infrastructure from Phase 1 handles both NIM and Gemini providers.

| capability | decision | reason |
|---|---|---|
| NIM `/v1/chat/completions` — answer mode coaching | INTEGRATE | |
| NIM `/v1/chat/completions` — retry scoring | INTEGRATE | |
| NIM `/v1/chat/completions` — model answer generation | INTEGRATE | |
| NIM `/v1/chat/completions` — vocab batch check | INTEGRATE | |
| NIM `/v1/chat/completions` — teach-back gap detection | INTEGRATE | |
| Gemini `generateContent` — same 5 modes via model fallback | INTEGRATE | |
| NIM server-sent events (streaming) | OPT-OUT | responses ≤80 words finish <1s; non-streaming via streamJSON keep-alive already handles connection stability |
| `enable_thinking: true` reasoning mode | OPT-OUT | JSON feedback tasks don't benefit from reasoning traces; adds latency; `enable_thinking: false` already set in nimBody() for super/ultra models |
| NIM embeddings API | OPT-OUT | weak-spot aggregation and word chip detection use local string matching; embeddings add API cost and latency for no quality gain on this use case |
| NIM fine-tuning / batch inference APIs | OPT-OUT | not applicable; personal tool with stateless per-request coaching |
