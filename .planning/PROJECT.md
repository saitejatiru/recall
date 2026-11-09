# RECALL — PM Communication Coach

## What This Is

RECALL is a personal, single-page daily training journey that builds product management interview skills: articulating answers clearly, handling unexpected questions on the spot, and using PM vocabulary naturally. Each day walks one learner (the repo owner, preparing for PM interviews) through one guided flow (5 PM words → recall → spoken answer → product case / unexpected interview question). An AI coach running on an NVIDIA NIM model reviews every answer, using the learner's own resume, and gives short, plain-language feedback on what went wrong and what to say instead.

## Core Value

After every practice answer, the learner gets short, specific and personalised feedback (score, the one fix that matters most, and a better line to say) so each day's practice measurably improves how they articulate PM answers.

## Requirements

### Validated

<!-- Inferred from the existing index.html (commit 09eb206). -->

- ✓ 30-day programme arc: Foundation → Projects → Thinking → Interview → Simulation, with a daily focus and prompt per day — existing
- ✓ Memory Gym: daily retrieval prompt, written recall saved per day — existing
- ✓ Speaking Studio: 90-second timed answer, PREP framework, professional phrases — existing
- ✓ Thinking Lab: 4 product case studies with suggested reasoning you can reveal — existing
- ✓ Interview Arena: 2-minute timer, question of the day, 8-question bank by category — existing
- ✓ Local persistence in localStorage + JSON backup download — existing
- ✓ Dark, responsive single-file UI (no build step) — existing

### Active

- [ ] Single-tab **journey mode**: replace the 7 independent tabs with one guided daily flow (step-by-step, progress across the steps, resumes where left off)
- [ ] **Daily 5 PM vocabulary words**: each day 5 PM terms usable in daily conversation (meaning, example sentence); learner writes/speaks their own sentence and the AI checks usage; earlier words come back for review
- [ ] **Recall + Speaking step**: recall prompt and a timed spoken answer, transcribed in the browser (Web Speech API), editable before submit
- [ ] **Thinking case + unexpected interview question step**: one product case and one surprise interview question per day, both AI-assessed
- [ ] **AI coach on NVIDIA NIM**: research-chosen model best suited to PM reasoning and coaching; reviews every journey activity
- [ ] **Feedback format**: 1–10 score, what went right, the single most important fix, and a stronger rewritten line using the learner's own projects; under ~80 words, plain language
- [ ] **PM-only coach persona with written guidelines**: stays within product management/interview coaching, refuses off-topic requests, never invents resume facts, consistent rubric (structure, clarity, PM vocabulary, metrics, impact, confidence)
- [ ] **Resume upload (PDF)**: text extracted in the browser, editable, saved locally; used to personalise feedback and suggested answers
- [ ] **Weak-spot tracking**: AI tags each mistake (e.g. "no metric", "rambling", "no structure"); journey brings back top weak spots and reviews earlier vocab
- [ ] **30 days, then endless**: keep the 30-day arc, then continue with AI-generated daily practice
- [ ] **Secure key handling via Cloudflare Worker proxy**: 3–4 NIM keys stored as Worker secrets, round-robin with failover on 429/errors; Worker locked to the GitHub Pages origin + passcode; keys never in the repo or browser
- [ ] **Hosting on GitHub Pages** from https://github.com/saitejatiru/recall, with step-by-step Cloudflare setup guide for the learner
- [ ] Backup export/import JSON so progress can move between devices

### Out of Scope

- Focus & Detox (screen-time log, boundaries, distraction journal) — user chose to keep the journey focused on PM skills
- Cross-device sync / accounts / database — one device + JSON backup is enough; avoids auth and storage infrastructure
- Audio recording / voice-tone analysis — only the transcript is assessed; tone analysis needs a different model class
- DOCX resume upload — PDF only for v1
- Multi-user support — personal tool for one learner
- Native mobile app — responsive web page covers phone use

## Context

- Existing app: one file `index.html` (~19 KB, vanilla JS, no dependencies), localStorage key `recallData`. Content already written for 30 days, 9 speaking questions, 4 cases, 8 interview questions.
- Repo is **public** (https://github.com/saitejatiru/recall) — anything committed is visible to everyone.
- NVIDIA NIM hosted API (`integrate.api.nvidia.com`, OpenAI-compatible `/v1/chat/completions`) is expected to block direct browser (CORS) calls and has per-key rate limits — hence the proxy and key rotation. Needs confirmation in research.
- Browser speech-to-text (Web Speech API) works best in Chrome/Edge; Safari/Firefox support is partial.
- Learner's interview prep themes already in the app: payment conversion, AI document pipeline, refund reduction, stakeholder disagreement, fintech.
- Daily time budget: 20–30 minutes.

## Constraints

- **Security**: NVIDIA API keys must never be committed or shipped to the browser — public repo
- **Tech stack**: Static page (GitHub Pages) + one Cloudflare Worker; keep vanilla JS, no build step — matches existing app, zero hosting cost
- **Budget**: Free tiers only (NVIDIA NIM trial credits, Cloudflare Workers free, GitHub Pages)
- **Feedback length**: under ~80 words per response — user explicitly wants short, easy-to-understand feedback
- **Persona scope**: AI must stay inside PM/interview coaching
- **Privacy**: resume text stays in the learner's browser and is only sent to the model as part of a coaching request
- **Compatibility**: Must work in Chrome/Edge on desktop and Android; graceful fallback to typing where speech recognition is unavailable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-tab journey instead of 7 tabs | User wants a guided daily path, not separate tools | — Pending |
| Drop Focus & Detox | Not core to PM articulation goal | — Pending |
| GitHub Pages + Cloudflare Worker proxy | Access from any device; keys hidden as Worker secrets; works around CORS | — Pending |
| Key rotation with failover in Worker | Use all 3–4 keys, survive per-key rate limits | — Pending |
| Web Speech API transcription | Free, in-browser, no extra service; transcript is editable | — Pending |
| PDF resume parsed in-browser | No server storage of personal data | — Pending |
| localStorage + JSON backup (no sync) | Avoids accounts/DB | — Pending |
| Feedback = score + 1 fix + better line, <80 words | User wants short, actionable feedback | — Pending |
| NIM model choice | To be decided by research (PM reasoning + instruction following + speed) | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-09 after initialization*
