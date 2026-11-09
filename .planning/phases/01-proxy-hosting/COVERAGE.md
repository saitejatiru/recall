# API Coverage — NVIDIA NIM (integrate.api.nvidia.com)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Phase 1 uses the OpenAI-compatible `/v1/chat/completions` endpoint exclusively.

| capability | decision | reason |
|---|---|---|
| `POST /v1/chat/completions` (chat completions) | INTEGRATE | core capability — all proxy calls use this endpoint |
| `enable_thinking` via `chat_template_kwargs` | INTEGRATE | controlled per-model (guard: model name contains `super` or `ultra`) to disable CoT output for clean JSON responses |
| `GET /v1/models` (model enumeration) | OPT-OUT | models hardcoded as Worker variables (`PRIMARY_MODEL`, `FALLBACK_MODEL`); runtime enumeration not needed |
| `POST /v1/completions` (legacy completions) | OPT-OUT | using chat endpoint only; NIM recommends chat completions for instruction models |
| `POST /v1/embeddings` | OPT-OUT | text-only coaching use case; embeddings not in Phase 1–4 scope |
| `response_format: {type:"json_object"}` | OPT-OUT | prompt-only JSON instruction used for cross-model reliability; `response_format` support is not uniform across all NIM models (open question A1 from RESEARCH.md) |
| `stream: true` (streaming) | OPT-OUT | single-shot feedback for a personal tool; streaming adds complexity for no measurable UX gain at <3s target latency |
| `tools` / function calling | OPT-OUT | structured JSON output via system-prompt instruction is sufficient for PROXY-01..06; tool use is not in Phase 1–4 scope |
| Vision / multimodal inputs | OPT-OUT | text-only coaching use case; no image or audio inputs |
| Fine-tuned / custom model endpoints | OPT-OUT | using NVIDIA-hosted foundation models only; custom endpoints require a paid plan |
| `max_tokens` parameter | INTEGRATE | set to 400 in Worker; keeps responses concise and within KV/CPU budget |
| `temperature` parameter | INTEGRATE | 1.0 for thinking models (super/ultra), 0.5 for others; controlled in Worker |
| `top_p` parameter | INTEGRATE | 0.95 for thinking models only; omitted for others to avoid undefined keys |
