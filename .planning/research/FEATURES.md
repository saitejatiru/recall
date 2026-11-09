# Feature Research

**Domain:** AI-coached PM interview / speaking-practice / vocabulary training app (single-user, browser-only)
**Researched:** 2026-11-09
**Confidence:** HIGH (domain: spaced repetition, interview-coaching UX, PM curriculum — well-established patterns)

---

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Step-by-step daily flow (single tab) | Every modern learning app (Duolingo, Speeko) uses a linear daily path; a tab soup feels like work, not coaching | MEDIUM | 6 steps in sequence; step index persisted in localStorage |
| Resume mid-session ("continue where you left off") | Interruptions are inevitable; losing progress on a 25-min session kills motivation permanently | LOW | Store `{day, step, stepData}` in localStorage; restore on load |
| Day completion state + visual confirmation | Users need a clear "done for today" signal; ambiguity causes re-doing steps or feeling incomplete | LOW | Mark day complete when all steps submitted; show summary card |
| Streak counter (current + longest) | Expected by anyone who has used Duolingo, Headspace, or any habit app — absence feels like a missing feature | LOW | Date-based; don't reset on a single missed day (grace day reduces churn) |
| Timed answer with countdown | Every interview coaching app (Exponent, Final Round AI, the existing app) shows a timer; users expect it | LOW | Already exists in index.html; carry forward |
| Editable transcript before submit | Web Speech API makes errors; users must fix before AI sees the answer — otherwise feedback is on wrong text | LOW | Textarea pre-filled with transcript, fully editable |
| AI feedback after each spoken/written answer | Core value of the product; without it this is just a timer and a text box | HIGH | NIM model call per answer; short format (score + fix + better line) |
| Score (1–10) per answer | Every coaching app surfaces a number; users anchor on it to track improvement over days | LOW | Part of feedback prompt; display prominently |
| Vocabulary: meaning + everyday example per word | Duolingo and Memrise both show meaning + example sentence; learning without context does not stick | LOW | Static content; store in JS data structure per day |
| Learner writes/speaks a sentence using the word | Active recall > passive reading; every effective vocab tool (Anki, Duolingo) requires production, not recognition | MEDIUM | Per-word text input + AI check of usage correctness |
| PDF resume upload, browser-parsed, locally stored | Users of AI coaching tools (Final Round AI, Exponent AI mock) expect personalization; generic advice feels dismissive | MEDIUM | PDF.js in-browser parse; store extracted text in localStorage; never sent to server except inside a coaching prompt |
| Weak-spot tracking visible to user | Users want to know their patterns; absence makes the AI feel like a black box | MEDIUM | Show top 2–3 tags on day summary and in Journey step intro |
| Progress across the 30-day arc | Calendar/grid view of completed days is expected (Duolingo streaks, Speeko progress) | LOW | Day grid in a collapsible section; already partially in index.html |
| Graceful fallback when speech recognition is unavailable | Safari, Firefox, and some Android browsers partially support Web Speech API; a hard fail loses those sessions | LOW | Detect `SpeechRecognition` on load; show typing-only mode with a one-line notice |
| JSON backup export/import | Users of a single-device personal tool need a manual escape hatch; already in the existing app | LOW | Already in index.html; carry forward unchanged |

---

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Resume-grounded "better line" in feedback | Yoodli and Final Round AI give generic rewrites; a rewrite that quotes *your* project ("as you did in the AI document pipeline…") is 10× more useful and memorable | MEDIUM | Inject resume excerpt into feedback prompt; strict rule: only quote what is in the resume text, never invent |
| PM vocabulary embedded in the interview answer feedback | No competitor ties vocab learning directly to answer feedback ("you could have used 'leading indicator' here instead of 'early sign'") | MEDIUM | Feedback prompt includes today's vocab list; ask model to call out missed opportunities |
| Spaced review of earlier vocab alongside new words | Duolingo does this for language; no PM interview tool does it for PM terminology | MEDIUM | Leitner 5-box system (see PM Vocabulary Curriculum below); review words surfaced daily alongside 5 new ones |
| Unexpected question with AI follow-up probe | Exponent does static question banks; Final Round AI does real-time help during the interview (which is cheating practice). A single follow-up question from the AI ("What metric would tell you that worked?") better simulates a real interview panel | MEDIUM | Two-turn conversation: answer → AI sends one follow-up → learner responds → final feedback on both turns |
| Weak-spot tags drive what the journey shows next | Most apps track streaks but not error patterns; surfacing "you have tagged 'no-metric' 4 times this week — today's unexpected question will push on that" makes the tool feel like it knows the user | HIGH | Tag frequency stored per day; journey intro references top tags; at minimum inject into the unexpected question selection |
| AI-generated endless days after day 30 | Most 30-day programs end and users stop; generating new days removes the cliff | HIGH | Prompt-driven day generation using the learner's weak-spot history and resume; treat as a later sub-feature |
| PM-only coach persona with hard rails | General AI assistants drift off-topic; a strict system prompt that refuses to discuss anything outside PM interview coaching is a trust signal for a focused learner | LOW | System prompt defines persona, scope, refusal language; test with common off-topic probes |
| Cloudflare Worker key rotation with failover | Consumer-facing AI products (not personal tools) usually ship with single-key integrations that break on rate limits; transparent failover across 3–4 keys is invisible to the user and reliable | MEDIUM | Worker-side round-robin; retry on 429; return error only if all keys exhausted |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Leaderboards / social comparison | Duolingo uses them; they look engaging | Single-user personal tool — there is nobody to compare to; adding a fake leaderboard is hollow; real one requires accounts and a user base | Personal bests only: "your longest streak," "best score this week" |
| Audio recording + voice-tone analysis (pace, pitch, filler detection from audio) | Yoodli's signature feature; sounds impressive | Requires a different model class (audio/speech), is not supported by NIM's text models, adds complexity out of scope, and transcript-based filler detection covers 80% of the value | Count filler words from the transcript text (um, uh, like, you know, sort of) — simple string scan, no audio |
| Unlimited AI feedback per session | Users want to iterate endlessly | Key rate limits are real (NIM free tier); each extra call burns quota; more than one feedback round per step does not meaningfully improve a single session | One feedback call per step; "try again" just re-enters the step, same call budget |
| Video recording for body language feedback | Looks like a Yoodli feature | Requires camera permissions, storage, a video-understanding model, and significant UX complexity — far outside this stack | Note: "body language is outside this tool's scope; focus on structure and vocabulary" in the UI |
| DOCX resume support | Some users have .docx | Adds a parser (mammoth.js) for marginal gain; PDF covers 90%+ of professional resumes | PDF only; note in UI |
| Spaced repetition for interview questions (not just vocab) | Sounds systematic | Interview questions are not rote recall; repeating the same question verbatim teaches memorization, not thinking; weak-spot tagging + unexpected questions is strictly better | Weak-spot-driven question selection instead |
| Multi-device sync / cloud accounts | Users want to practice on phone and laptop | Requires auth, a database, a backend — this is a free static site for one person; scope explosion for one learner | JSON export/import is enough for one person |
| Real-time transcription overlay while speaking | Yoodli shows live text | Adds visual complexity; the learner should be thinking about the answer, not reading a transcript on screen | Transcription shown after the timer ends, editable before submit |
| Detailed analytics dashboard (charts, trends over 30 days) | Looks professional | A chart page nobody visits adds code weight; the weak-spot tag summary and streak are sufficient feedback loops | Show top 3 weak-spot tags + streak on day summary; keep the progress grid simple |
| Streaks that break on a single missed day (punitive streaks) | Duolingo default | Causes anxiety and shame spirals; a personal tool for someone in job-search mode should not punish a missed day | Grace-day: streak survives one missed day; show "missed yesterday — streak protected" once |

---

## Feature Dependencies

```
Resume upload (PDF parse)
    └──enables──> Resume-grounded "better line" in feedback
                      └──requires──> AI feedback call with resume context

Weak-spot tagging (AI assigns tags per answer)
    └──enables──> Weak-spot-driven unexpected question selection
    └──enables──> Weak-spot summary on day completion
    └──enables──> AI-generated endless days (after day 30)

PM vocabulary curriculum (static data, 150 terms)
    └──enables──> Daily vocab step (5 new words)
    └──enables──> Leitner spaced review (needs per-word box/date state)
    └──enables──> Vocab cross-reference in AI feedback

Cloudflare Worker proxy (key rotation)
    └──required by──> Any AI feedback call (NIM CORS blocks direct browser calls)

Web Speech API transcription
    └──enables──> Spoken answer step
    └──fallback──> Typing-only mode (no dependency, runs in parallel)

Day completion state
    └──requires──> All step submissions recorded in localStorage
    └──enables──> Streak counter
    └──enables──> Progress grid

AI feedback call (NIM via Worker)
    └──requires──> Cloudflare Worker proxy
    └──requires──> PM-only system prompt / coach persona
    └──consumes──> Resume text (optional, enhances output)
    └──consumes──> Weak-spot tag history (optional, enhances output)
    └──produces──> Score + fix + better line + weak-spot tags

AI-generated endless days (day 31+)
    └──requires──> Weak-spot tag history (to personalize)
    └──requires──> AI feedback call (same NIM pipeline)
    └──deferred──> Until day 30 arc is working
```

### Dependency Notes

- **Resume upload is optional but unlocks personalization:** the feedback system works without it; personalization is degraded but not broken. Build the pipeline with or without resume from day 1.
- **Worker proxy is a hard prerequisite for any AI call:** NIM blocks CORS from browser; without the Worker nothing AI-related works. This must be built before any AI feature is testable end-to-end.
- **Leitner state is per-word, stored in localStorage:** `vocab[termId] = {box: 1..5, nextReview: "YYYY-MM-DD"}`. New words start in box 1. Correct → next box. Wrong → box 1. Daily vocab step pulls new words + all words where nextReview <= today.
- **Unexpected-question follow-up is a 2-turn AI call:** first turn = answer evaluation + follow-up question; second turn = learner's response + final feedback. Both turns share the same conversation context in the NIM API call.

---

## PM Vocabulary Curriculum — Concrete 150-Term Scheme

### Design Rationale

- 30 days × 5 words = 150 terms
- 8 themes; each theme is a contiguous block of days (not interleaved) so the learner builds a mental model per domain before moving on
- Each term has: plain-language meaning (1 sentence) + everyday-conversation example (1 sentence) + PM interview example (1 sentence)
- Spaced review via Leitner 5-box system (see below)

### Theme Distribution

| Days | Theme | Term Count | Rationale |
|------|-------|------------|-----------|
| 1–4 | Discovery & User Research | 20 | Foundation: learners must ground every answer in user need |
| 5–8 | Metrics & Analytics | 20 | Most common PM interview failure: no numbers |
| 9–12 | Prioritization | 20 | Most common PM interview category |
| 13–16 | Strategy | 20 | Senior PM questions; needed for "why this product?" answers |
| 17–20 | Execution & Delivery | 20 | Covers "tell me about a launch" stories |
| 21–23 | Stakeholder & Communication | 15 | Covers behavioural questions |
| 24–26 | Growth | 15 | Fintech-relevant; maps to learner's existing case studies |
| 27–30 | AI & Tech PM | 20 | Differentiating theme for AI-era PM roles |

### Term List by Theme

#### Theme 1: Discovery & User Research (Days 1–4)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 1 | Jobs-to-be-done (JTBD) | The underlying goal a user has, not the feature they ask for | "I hire a smoothie, not because I want a smoothie but because I want to get through a commute without getting hungry" | "We re-framed the problem using jobs-to-be-done: users weren't asking for a faster payment screen, they needed confidence the payment went through" |
| 2 | User persona | A fictional but research-grounded profile of a target user type | "Our main persona is Priya, a 28-year-old freelancer who invoices three clients a month" | "We built two personas from 40 interviews to align the team on who we were building for" |
| 3 | Pain point | A specific frustration or obstacle a user experiences | "The pain point is remembering to pay rent — not the act of paying" | "We identified the primary pain point as trust: users abandoned at payment confirmation because they didn't believe the transaction had succeeded" |
| 4 | Empathy map | A simple 2×2 showing what users think, feel, say, and do | "We mapped what customers say in support tickets versus what they actually do in the app — they're different" | "The empathy map showed users said they wanted more features but their behaviour showed they were overwhelmed by the ones we already had" |
| 5 | User journey map | A step-by-step view of a user's experience across a process | "Draw out every step from 'I want to send money' to 'I see the confirmation'" | "The journey map revealed a 4-step gap between transaction initiation and confirmation that we hadn't instrumented" |
| 6 | Discovery interview | A structured conversation to understand user problems before proposing solutions | "Before designing anything, we did 15 discovery interviews — no mockups, no pitching" | "In discovery interviews, we ask 'walk me through the last time you…' not 'would you use a feature that…'" |
| 7 | Assumption | A belief you're treating as fact but haven't yet validated | "Our biggest assumption was that users check their balance daily — turns out most check weekly" | "We listed our top five assumptions and ranked them by risk before writing a single line of code" |
| 8 | Prototype | A rough, testable version of an idea — not production code | "We built a Figma prototype in a day and tested it with five users before engineering touched it" | "We validated the new onboarding with a no-code prototype; it failed in testing, which saved us three sprints" |
| 9 | Usability test | Watching real users attempt tasks with a product, observing where they struggle | "We sat in a room with five users and watched them try to pay a bill — nobody said anything, we just observed" | "Usability tests on the payment flow showed three out of five users missed the confirm button entirely" |
| 10 | Voice of the customer (VoC) | Systematic capture of what customers say about their needs and experiences | "VoC is not reading NPS scores — it's tagging 500 support tickets to find the top five complaint themes" | "Our VoC programme flagged 'slow refund' as the number-one complaint three months before it showed up in churn" |
| 11 | User story | A short description of a feature from the user's perspective: "As a [user], I want [action] so that [outcome]" | "As a freelancer, I want to schedule payments in advance so that I don't miss due dates" | "We wrote every requirement as a user story so engineers and designers shared a single vocabulary" |
| 12 | Acceptance criteria | The specific conditions that must be true for a user story to be considered done | "Acceptance criterion: the confirmation screen appears within 2 seconds of payment submission" | "Without acceptance criteria, 'done' means something different to engineering, design, and QA every time" |
| 13 | Insight | A non-obvious conclusion drawn from data or research — more than a fact | "The data said 60% abandon checkout; the insight was that abandonment spikes specifically when payment takes more than 4 seconds" | "Data told us users weren't completing onboarding; the insight was they were stopping at the bank-link step because they didn't trust the third-party provider" |
| 14 | Desirability | Whether users actually want what you're building | "Technically perfect but nobody wants it — desirability is the first filter" | "The feature passed feasibility and viability checks but failed desirability — users told us in research they'd never use it" |
| 15 | Feasibility | Whether the team can build it with current technology and resources | "Great idea, but we don't have real-time payment rails — feasibility says 'not yet'" | "We scoped the feature for feasibility first; the ML component needed 6 months of data we didn't have" |
| 16 | Viability | Whether the business can sustain and profit from it | "It's desirable and feasible, but if the unit economics don't work, it's not viable" | "The enterprise version was viable only if we could land three anchor customers in quarter one" |
| 17 | Problem statement | A clear, user-focused articulation of the problem you're solving, before any solution | "Problem: new users cannot tell if their payment succeeded, so they submit twice, causing duplicate charges" | "We spent the first day of the sprint writing a crisp problem statement — it changed what we built entirely" |
| 18 | How-might-we (HMW) | A design-thinking question that reframes a problem as an opportunity | "'How might we make users confident a payment succeeded without requiring them to check their bank app?'" | "We used HMW questions in the ideation session to shift the team from defending their existing ideas to generating new ones" |
| 19 | Affinity mapping | Grouping qualitative data (observations, quotes) into themes to find patterns | "We wrote every user complaint on a sticky note and grouped them — 70% clustered around trust and speed" | "After 20 interviews, affinity mapping revealed three distinct mental models of what 'my money' meant to users" |
| 20 | Research synthesis | The process of distilling raw research into prioritised, actionable findings | "Synthesis is the step where you turn 300 interview quotes into five findings and one recommended next step" | "I presented the research synthesis as three findings with a recommended problem to solve — not a data dump" |

#### Theme 2: Metrics & Analytics (Days 5–8)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 21 | North Star Metric (NSM) | The single metric that best captures the core value your product delivers to users | "Airbnb's NSM is nights booked; Spotify's is time listening" | "Our NSM was successful payments per active user per month — everything else was a lever that moved that" |
| 22 | KPI | A measurable value that shows how well you're achieving a specific objective | "Three KPIs for the payment feature: conversion rate, error rate, time-to-confirm" | "I track five KPIs per feature; if any one goes red within 48 hours of launch, we rollback immediately" |
| 23 | OKR | A framework linking an inspiring Objective to 2–4 measurable Key Results with a time horizon | "Objective: make payment feel instant. KR1: p95 latency under 1s. KR2: confirmation errors below 0.5%" | "We set quarterly OKRs with engineering so everyone knew what success looked like before we started" |
| 24 | DAU / MAU | Daily Active Users / Monthly Active Users; how many users engage in a day or month | "If DAU/MAU is 0.5, half your monthly users come back every day — strong engagement" | "DAU/MAU was 0.3 at launch; after onboarding improvements it rose to 0.5 — a signal the product was becoming habit-forming" |
| 25 | Retention rate | The percentage of users who return after their first use over a given period | "Day-30 retention of 40% means 40 of every 100 users are still active a month later" | "Retention at D7 was 55%; industry benchmark for fintech was 40% — we were ahead, but D30 drop-off needed work" |
| 26 | Churn rate | The percentage of users or revenue lost in a period | "Monthly churn of 5% sounds small, but over a year you lose more than half your base" | "Churn was highest in the first 7 days — we fixed onboarding and churn dropped from 18% to 11% in that window" |
| 27 | Conversion rate | The percentage of users who complete a desired action (purchase, sign-up, upgrade) | "Checkout conversion of 72% means 28 out of every 100 users who start checkout don't finish" | "Payment conversion dropped from 72% to 59% overnight; that 13-point drop mapped to a specific error code introduced in the last deploy" |
| 28 | Funnel analysis | Breaking a multi-step user flow into stages and measuring drop-off at each step | "Payment funnel: 100 start → 90 enter card → 75 confirm → 72 succeed — step 3 is the problem" | "Funnel analysis showed the biggest drop between 'confirm' and 'success' — a latency issue, not a UX one" |
| 29 | Cohort analysis | Tracking a group of users who share a start date to see how their behaviour changes over time | "January sign-ups retained better than February sign-ups — something changed in onboarding between those months" | "Cohort analysis showed users who completed the bank-link step in onboarding retained at 2× the rate of those who skipped it" |
| 30 | A/B test | A controlled experiment where two variants (A and B) are shown to different user groups to measure which performs better | "We showed half our users the green button and half the blue button — green won by 8%" | "We A/B tested two confirmation screens; the one with the payment reference number lifted satisfaction by 12 points" |
| 31 | Statistical significance | The threshold at which you're confident a test result is real, not random noise (usually p < 0.05) | "If you flip a coin 10 times and get 7 heads, that's probably luck. 1,000 flips and 700 heads — that's real" | "We didn't call the A/B test until we had statistical significance at 95% — stopped us from shipping a false positive twice" |
| 32 | Baseline | The current performance level against which you measure improvement | "Before the fix, baseline conversion was 59%. After, it was 71%. That's a 12-point lift" | "Always establish the baseline metric before starting a sprint, or you won't know if you moved it" |
| 33 | Leading indicator | A metric that predicts future outcomes (changes before the outcome you care about) | "Support ticket volume about payment errors is a leading indicator of churn — it predicts it by about 3 weeks" | "We used bank-link completion in onboarding as a leading indicator for 90-day retention — it predicted churn 6 weeks earlier than NPS did" |
| 34 | Lagging indicator | A metric that reflects past performance (changes after the outcome has occurred) | "Revenue is a lagging indicator — it shows what happened, not what's about to happen" | "NPS is a lagging indicator; by the time it drops, we've already lost users. We monitor leading indicators instead" |
| 35 | ARPU | Average Revenue Per User; total revenue divided by number of active users | "ARPU of ₹200/month means your average user pays ₹200. Growing ARPU means monetising better without acquiring more users" | "We grew ARPU by 30% by moving the business tier down from ₹999 to ₹499 — more users upgraded, total revenue went up" |
| 36 | LTV (Lifetime Value) | The total revenue a customer is expected to generate over their entire relationship with the product | "If a customer pays ₹500/month and stays 24 months, LTV = ₹12,000" | "Our LTV was 3× our CAC — that's a healthy unit economics story; below 3× we'd be losing money on acquisition" |
| 37 | CAC | Customer Acquisition Cost; the total cost to acquire one new paying customer | "If we spend ₹10 lakh on marketing and acquire 1,000 customers, CAC = ₹1,000" | "CAC was ₹800 against an LTV of ₹3,200 — a 4:1 ratio, which gave us confidence to increase the marketing budget" |
| 38 | NPS (Net Promoter Score) | A single-question survey (0–10, would you recommend us?) that buckets users as Promoters (9–10), Passives (7–8), or Detractors (0–6); score = % Promoters − % Detractors | "An NPS of +50 is excellent; below 0 means more detractors than promoters" | "NPS was +12 at launch; after the payment-speed improvement it rose to +34 — a 22-point gain correlated with the latency fix" |
| 39 | CSAT (Customer Satisfaction Score) | A transaction-level survey (1–5 or 1–10, how satisfied were you?) measured after a specific interaction | "We show a CSAT survey after every payment completion — it tells us if that specific moment landed" | "CSAT on the payment confirmation screen was 3.2/5; post-redesign it reached 4.4/5" |
| 40 | Activation rate | The percentage of new users who reach the 'aha moment' — the point where they first experience core product value | "If the aha moment is first successful payment, activation rate = % of sign-ups who complete one payment in their first session" | "Activation was 35%; we identified the bank-link step as the barrier and improved it to 61% in one sprint" |

#### Theme 3: Prioritization (Days 9–12)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 41 | RICE | A scoring framework: Reach × Impact × Confidence / Effort; gives each initiative a comparable score | "Feature A: Reach 500/week, Impact 2 (medium), Confidence 80%, Effort 4 weeks → RICE = 500×2×0.8/4 = 200" | "We used RICE to stack-rank the Q2 roadmap; the low-effort, high-reach items rose to the top even though they felt boring" |
| 42 | MoSCoW method | Priority tiers: Must have, Should have, Could have, Won't have — for a given release | "Must: payment works. Should: receipt email. Could: receipt PDF. Won't: multi-currency in v1" | "MoSCoW forced honest conversations — when everything was 'Must', we knew we were doing wishful planning" |
| 43 | ICE score | Simpler than RICE: Impact × Confidence × Ease; quick scoring when you don't have reach data | "Three-minute exercise in a planning meeting: score each idea 1–10 on impact, confidence, ease. Multiply. Sort." | "We used ICE for rapid backlog grooming — 20 items scored and sorted in under 30 minutes" |
| 44 | Opportunity cost | What you give up by choosing one option over another | "Every sprint we spend on feature X is a sprint we're not spending on retention — that's the opportunity cost" | "The stakeholder push for the reporting feature had an opportunity cost: three sprints not spent on the payment latency that was driving churn" |
| 45 | Backlog | A prioritised list of work items (features, bugs, tech debt) not yet scheduled | "The backlog is not a dumping ground — if it has 300 items, the bottom 250 are probably noise" | "I keep the backlog to the top 20 items I'd actually consider in the next two quarters; everything else is in an icebox" |
| 46 | Tech debt | The future cost of quick solutions taken today; it compounds like financial debt | "We hardcoded the currency symbol in 40 places to ship faster. That's tech debt — it'll cost more to fix later" | "We negotiated one sprint per quarter for tech debt; without it, velocity was dropping 10% per quarter" |
| 47 | MVP (Minimum Viable Product) | The smallest version of a product that lets you test your core hypothesis with real users | "MVP is not 'half the features' — it's the minimum to learn if the core value is real" | "Our MVP was a manual payment confirmation sent via WhatsApp — no app, no code. It validated demand before we built anything" |
| 48 | Feature flag | A code switch that turns a feature on or off without a new deployment | "We shipped the new checkout behind a feature flag; turned it on for 1% of users, watched metrics, then expanded" | "Feature flags let us decouple deployment from release — engineering ships safely, PM controls the rollout" |
| 49 | Dependency | A constraint where one piece of work cannot start or complete until another is done | "The reporting feature depends on the data pipeline — we can't build it until the pipeline is live" | "I always map dependencies before committing to a roadmap; hidden dependencies are the number-one cause of sprint failures" |
| 50 | Trade-off | A decision that gains something in one dimension by giving up something in another | "Speed vs quality is the classic trade-off — ship fast and risk bugs, or test thoroughly and risk being late" | "The stakeholder wanted both speed and zero defects. I explained the trade-off and asked which mattered more for this release" |
| 51 | Effort estimate | A rough forecast of how much work an item requires (usually in story points or days) | "If engineering says 'that's a 2-week item', ask what assumptions are baked in — scope often triples" | "I always ask for two estimates: best case and worst case. The gap tells you the uncertainty more than the number does" |
| 52 | ROI (Return on Investment) | The net benefit of a decision relative to its cost | "We spent 2 sprints on payment latency and it reduced churn by 3% — that's a calculable ROI" | "I frame prioritisation decisions in ROI terms so finance and leadership can compare them against other investments" |
| 53 | Priority matrix | A 2×2 grid with Impact on one axis and Effort on the other; items in the high-impact, low-effort quadrant go first | "Quick wins: high impact, low effort. Big bets: high impact, high effort. Fill-ins: low impact, low effort. Time sinks: low impact, high effort — avoid" | "We mapped 25 features on the priority matrix in a team exercise; it built alignment without anyone having to 'win'" |
| 54 | User value | The benefit a user directly receives from a feature | "The 'save payment details' feature delivers user value by cutting checkout time for repeat buyers" | "I always separate user value from business value — sometimes they align, sometimes engineering has to build something users love that doesn't directly monetise" |
| 55 | Business value | The benefit the business receives (revenue, reduced cost, reduced risk, strategic positioning) | "Reducing duplicate payment charges saves ₹5 lakh/month in support and refund costs — that's business value" | "The feature had high user value but low business value at our current scale; we parked it for a later phase" |
| 56 | Scope creep | The gradual expansion of a project's scope beyond what was agreed, usually without adjusting timeline or resources | "We agreed on a payment confirmation screen. By week 3, it had grown to include receipt history, PDF export, and multi-currency. That's scope creep" | "I protect scope by writing a 'not in this sprint' list as explicitly as the sprint goal — it makes trade-offs visible" |
| 57 | WSJF (Weighted Shortest Job First) | A SAFe prioritisation method: Cost of Delay / Job Size; prioritise short, high-urgency items first | "If two features both delay revenue, ship the smaller one first — it unblocks revenue sooner" | "WSJF showed us the 3-day fix for payment errors should come before the 6-week reporting feature, even though reporting was louder" |
| 58 | Stack ranking | Ordering all items in an absolute 1-to-N list; forces real prioritisation because nothing can be tied | "If you have 10 items and ask which is #1, you get alignment. Stack ranking kills 'everything is equal' planning" | "I stack-rank the backlog quarterly with stakeholders in the room — it surfaces the actual disagreements before they become sprint conflicts" |
| 59 | Opportunity scoring | Kano/JTBD-based: users rate how important a job is and how satisfied they are with current solutions; large importance/low satisfaction = opportunity | "If users say 'instant payment confirmation' is very important but very unsatisfied with today, that's a prioritised opportunity" | "Opportunity scoring from 30 user interviews pointed us to trust and speed — not the feature requests we had been debating internally" |
| 60 | MLP (Minimum Lovable Product) | A refinement of MVP: not just viable, but designed so users actually enjoy it | "Users will tolerate a viable product once; they come back for a lovable one" | "We shipped an MVP to validate the concept, then spent one more sprint making it lovable — the difference showed up in D7 retention" |

#### Theme 4: Strategy (Days 13–16)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 61 | Product vision | A concise, inspiring description of what the product will become in 3–5 years | "Amazon's early vision: 'every book, ever printed, in any language, available in 60 seconds'" | "The product vision anchors the team when every stakeholder pulls in a different direction — it's the tie-breaker" |
| 62 | Product strategy | The set of choices about where to play and how to win, connecting the vision to the roadmap | "Strategy is not a plan — it's a set of bets about which users, problems, and solutions will create durable value" | "We set a strategy to own the small-business segment before expanding to enterprise — focus made our limited resources count" |
| 63 | Go-to-market (GTM) | The plan for how a product reaches its target customers: channels, messaging, pricing, launch sequence | "GTM for the new payment API: target fintech startups first, offer a free tier, convert at scale" | "I owned the GTM for the AI document pipeline — we chose a bottom-up developer GTM, not a top-down enterprise sales motion" |
| 64 | TAM (Total Addressable Market) | The maximum total revenue opportunity if you captured 100% of a market | "The global digital payments TAM is $10 trillion — but your realistic SAM is a fraction of that" | "I frame TAM to show the ceiling, then immediately discuss SAM and SOM to show the realistic near-term opportunity" |
| 65 | Market segmentation | Dividing a market into groups with similar characteristics, so you can focus on the most attractive segment first | "Segment by company size: micro (1–10 employees), SMB (10–250), mid-market (250–2,000), enterprise (2,000+)" | "We segmented by payment volume and found 20% of our users generated 80% of our revenue — the SMB segment" |
| 66 | Competitive moat | A durable advantage that makes it hard for competitors to displace you | "Network effects are a moat — the more users on a payment platform, the more valuable it becomes to each user" | "Our moat was proprietary reconciliation data — once a customer's finance team built workflows around our exports, switching cost was very high" |
| 67 | Network effects | The phenomenon where a product becomes more valuable as more people use it | "WhatsApp's value is that everyone you need to reach is already on it — that's a network effect" | "We designed the invoice feature with network effects: senders invite recipients, recipients become senders — the loop compounds" |
| 68 | Platform strategy | Building a product that enables third parties to create additional value on top of it | "Shopify is a platform — merchants build stores, developers build apps, payment providers integrate. Shopify captures value from the whole ecosystem" | "Our API-first approach was a deliberate platform strategy: we built the rails, then let partners build the user-facing applications" |
| 69 | Product-market fit (PMF) | The state where a product satisfies a strong market demand; users use it, love it, and would miss it | "Sean Ellis test: 'How would you feel if this product disappeared?' If 40%+ say 'very disappointed', you have PMF" | "We hadn't hit PMF until we saw organic referrals outpacing paid acquisition — users were selling it for us" |
| 70 | Positioning | How you want your product perceived in the customer's mind relative to alternatives | "Positioning statement: 'For small businesses that invoice internationally, [Product] is the only payment tool that settles in 24 hours without hidden FX fees'" | "We repositioned from 'payment platform' to 'working capital tool' — same product, different story, different buyer" |
| 71 | Differentiation | The specific ways your product is meaningfully different from alternatives in ways that matter to your target user | "Same as the competitor but 2× faster and half the price — that's differentiation if speed and price are what users care about" | "Our differentiation was not features — it was time-to-first-payment: 4 minutes versus 2 days for the incumbent" |
| 72 | Value proposition | The specific benefits a user gets from your product and why they should choose you over alternatives | "In one sentence: '[Product] helps [user] achieve [outcome] by [mechanism], unlike [alternative] which [falls short]'" | "I write a value proposition before writing a spec — if I can't say why a user would choose this over what they do today, we're not ready to build" |
| 73 | Business model | How the product makes money: the mechanism for capturing value from the value it creates | "Freemium model: free tier acquires users, paid tier converts the most engaged. Marketplace model: take a cut of every transaction" | "We chose a transaction-fee model over a subscription because it aligned our revenue with our users' success — we only earn when they do" |
| 74 | Land-and-expand | A sales/product motion where you win a customer with a narrow use case, then expand usage over time | "Land with expense management, expand to payroll, then treasury — same customer, growing contract value" | "Our land-and-expand motion started with API access; once engineering teams adopted it, we upsold the analytics dashboard to their finance teams" |
| 75 | Strategic bet | A major resource commitment under uncertainty, based on a thesis about where the market is going | "Betting on voice payments in 2018 was a strategic bet — most companies passed; a few are now ahead" | "Moving to AI-generated document parsing was a strategic bet; we had 60% confidence and 18 months of runway to find out if we were right" |
| 76 | Ecosystem | The network of partners, developers, customers, and complementary products that make your platform more valuable | "iOS is not just an OS — the App Store, developers, and accessory makers are the ecosystem" | "We designed for ecosystem from day one: open APIs, webhooks, and an app marketplace so partners could build on our rails" |
| 77 | Blue ocean strategy | Competing in uncontested market space rather than fighting for share in an existing market | "Instead of competing for the enterprise expense-management market, we targeted freelancers — nobody else was" | "We applied blue ocean thinking: instead of building a better bank, we built a tool banks don't want to build — real-time payment reconciliation for finance teams" |
| 78 | Pricing strategy | The approach to setting, communicating, and adjusting prices to maximise revenue and market share | "Value-based pricing: charge based on the value you deliver, not the cost to build. Per-seat pricing vs per-use vs flat subscription" | "We moved from per-seat to usage-based pricing and ARPU grew 40% because enterprise customers who used us heavily started paying proportionally" |
| 79 | Horizontal vs vertical product | Horizontal: broad, works for many industries. Vertical: deep, purpose-built for one industry | "Salesforce is horizontal CRM. Veeva is vertical CRM for pharma — same core, different depth" | "We chose to go vertical in fintech rather than build a horizontal payment API — the domain depth was our moat against Stripe" |
| 80 | Competitive moat (second application) | Covered in term 66; in this lesson focus on types: switching costs, data network effects, brand, regulatory | "Switching cost moat: once your accounting team is trained on our reports, switching costs 3 months of re-training" | "Our moat is data — 2 years of a customer's transaction history makes our anomaly detection better for them than any new entrant could be" |

#### Theme 5: Execution & Delivery (Days 17–20)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 81 | Sprint | A fixed time-box (typically 1–2 weeks) in which a team commits to delivering a defined scope of work | "We run 2-week sprints; at the start of each sprint the team commits to a sprint goal, not a list of tasks" | "The engineering delay meant we needed to descope; I ran a mid-sprint replanning with the team to protect the sprint goal" |
| 82 | Velocity | The amount of work a team completes per sprint, measured in story points or similar units | "Team velocity of 40 points/sprint lets you forecast: a 120-point epic takes about 3 sprints" | "Velocity was dropping 10% per quarter; we identified tech debt as the root cause and negotiated a debt sprint" |
| 83 | Epic | A large body of work that spans multiple sprints and breaks down into individual user stories | "Epic: 'User can pay any vendor.' Stories inside it: add payee, confirm payee, initiate payment, confirm receipt" | "I group features into epics so stakeholders see the big-picture progress, not just individual tickets" |
| 84 | Definition of done (DoD) | A shared checklist of criteria that must be true before a story is considered complete | "DoD: code reviewed, automated tests passing, accessibility checked, product sign-off on staging" | "Without a definition of done, 'done' means 'dev is done coding' — which is not the same as 'ready to ship'" |
| 85 | Release plan | A multi-sprint forecast of which features will be in which release, based on current velocity | "Release plan: v1.2 in sprint 4 (payment confirmation), v1.3 in sprint 6 (receipt history), v2.0 in Q3" | "I maintain a rolling 90-day release plan; it sets stakeholder expectations and flags risks 6 weeks before they become crises" |
| 86 | Rollout strategy | The plan for how a new feature reaches users: percentage rollout, beta group, geographic phasing | "1% → 10% → 50% → 100% rollout over 4 days, with automated rollback if error rate exceeds 0.5%" | "We phased the rollout to 10% of users first; it caught a payment-processor timeout bug before it hit the whole user base" |
| 87 | Post-launch review | A structured review of what happened after a release: metrics moved, what worked, what didn't | "24 hours after launch: conversion rate up 4 points. 7 days: D7 retention flat. 30 days: team retrospective on the process" | "I run a post-launch review 2 weeks after every significant release; it's the data that informs the next sprint's priorities" |
| 88 | SLA (Service Level Agreement) | A commitment to a specific level of performance, usually with consequences if missed | "SLA: 99.9% uptime, payment processing under 3 seconds, support response under 4 hours" | "We set internal SLAs for payment latency; the engineering team got paged when p95 exceeded 3 seconds" |
| 89 | Escalation path | A defined chain of people to contact when a problem exceeds a certain severity level | "Severity 1: on-call engineer → engineering lead → VP Engineering, within 15 minutes of detection" | "I documented the escalation path for payment failures before launch; when it happened at 2am, nobody had to figure out who to call" |
| 90 | Cross-functional team | A team with all the skills needed to design, build, and ship a product without depending on external teams | "A cross-functional squad: PM, 2 engineers, 1 designer, 1 data analyst — they own the full problem" | "Moving to a cross-functional model cut our cycle time by 40%; no more handing off between siloed teams" |
| 91 | RACI matrix | Responsibility assignment: who is Responsible, Accountable, Consulted, Informed for each decision | "Payment security decision: Security is Responsible, VP Product is Accountable, Legal is Consulted, Engineering is Informed" | "RACI is worth 30 minutes at the start of any project — it surfaces the ownership gaps before they become blockers" |
| 92 | Milestone | A significant checkpoint in a project, usually tied to a deliverable or decision point | "Milestone 1: backend API live. Milestone 2: beta with 10 users. Milestone 3: public launch" | "I set milestones at points where we'd learn something important — not just dates on a calendar" |
| 93 | Critical path | The sequence of dependent tasks that determines the minimum time to complete a project | "If backend takes 3 weeks and frontend takes 2 weeks but frontend depends on backend, the critical path is 3 weeks" | "I always identify the critical path early; delays on non-critical tasks don't matter, delays on critical-path tasks push the launch" |
| 94 | Risk register | A living document of identified risks, their probability, their impact, and the mitigation plan | "Risk: payment processor goes down. Probability: low. Impact: critical. Mitigation: secondary processor integration" | "I keep a risk register for every launch; it forces the team to think about what could go wrong before it does" |
| 95 | Retrospective | A team meeting after a sprint or project to reflect on what went well, what didn't, and what to change | "Three questions: what should we start doing, stop doing, keep doing?" | "Retrospectives revealed we were losing 2 days per sprint to unclear acceptance criteria — we fixed that one process change" |
| 96 | Ship-and-iterate | The practice of shipping a good-enough version and improving based on real usage data | "Better to ship 70% perfect and learn than to ship 100% perfect 3 months later" | "We shipped the payment confirmation redesign to 10% of users, measured, iterated twice, then rolled out — the final version was better than what we'd have designed in isolation" |
| 97 | Launch checklist | A pre-launch verification list covering technical, operational, and communication readiness | "Launch checklist: monitoring set up, rollback plan documented, support team briefed, comms scheduled, feature flag configured" | "We didn't launch until every item on the launch checklist was green — it saved us from two 'almost ready' launches" |
| 98 | Incident management | The process for detecting, responding to, communicating about, and learning from production outages | "Incident: payment processing down. Steps: detect → page on-call → triage → fix → communicate → post-mortem" | "I ran the incident communications during the payment outage — keeping users and stakeholders informed reduced the trust damage significantly" |
| 99 | Blockers | Things that prevent a team member or team from progressing on their work | "Blocker: waiting for the legal team to approve the privacy policy update — sprint goal is at risk" | "I have a daily check: 'What's your biggest blocker?' If I can clear it, I do; if not, I escalate the same day" |
| 100 | Tech debt | (Second context: execution impact) | "Every shortcut in the codebase is a future sprint's tax — tech debt compounds" | "We tracked tech debt as a metric: each quarter it was costing us 15% of capacity. That number got it on the roadmap" |

#### Theme 6: Stakeholder & Communication (Days 21–23)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 101 | Executive alignment | Getting senior leaders to agree on the problem, the approach, and the resources before you start | "Alignment means the VP of Product and VP of Engineering have the same understanding of what 'done' looks like" | "I didn't start the sprint until I had executive alignment on the success metric — it prevented a rewrite three weeks later" |
| 102 | Stakeholder map | A visual or list showing every person or group affected by or influencing a product decision | "Stakeholder map for the payment redesign: users (impacted), engineering (builds it), finance (owns the numbers), legal (approves it), support (fields complaints)" | "I build a stakeholder map at the start of every major initiative — it shows me who to involve, in what order, and what they each care about" |
| 103 | Influence without authority | Getting people to act on your recommendations when you don't have direct control over them | "PMs rarely manage engineers — they lead through shared goals, data, and relationships, not org-chart power" | "I influenced the platform team's roadmap by showing them data on how their latency was driving our churn — they reprioritised within a week" |
| 104 | Buy-in | Active support — not just passive agreement — from a stakeholder or team | "Buy-in is not 'they said OK in the meeting.' It's 'they actively helped remove the blockers'" | "I got buy-in from the finance team by showing them the cost of the problem, not just the vision for the solution" |
| 105 | Business case | A structured argument for why an initiative is worth the investment, including problem, options, recommendation, and financial impact | "Business case format: problem → options considered → recommendation → expected return → risks" | "I wrote a one-page business case for the AI document pipeline; the financial impact section is what got the headcount approved" |
| 106 | BLUF (Bottom Line Up Front) | A communication structure where the conclusion or recommendation comes first, then the supporting detail | "BLUF: 'I recommend we delay the launch by 2 weeks. Here's why: the payment error rate is 3× our threshold'" | "BLUF is my default for executive communication — they read the first two sentences; if the recommendation is buried on page 3, it won't land" |
| 107 | Data storytelling | Using data to build a narrative that leads a listener to a conclusion | "Don't say 'conversion is 59%.' Say 'one in three users who starts checkout leaves before paying — and it's getting worse'" | "I frame every data point in a customer story: 'this 13% drop represents 4,200 users a week who wanted to pay and couldn't'" |
| 108 | Roadmap communication | The practice of presenting the product roadmap to different audiences (engineering, executives, customers) in a form appropriate to each | "Engineering roadmap: specific features and timelines. Executive roadmap: themes and outcomes. Customer roadmap: commitments and 'coming soon'" | "I maintain one internal roadmap and three different views of it — same content, different altitude for each audience" |
| 109 | Push-back | A stakeholder's objection to or disagreement with a recommendation | "Push-back: 'I think we should build the reporting feature first.' Response: 'Let me show you the data on where users are dropping off'" | "I welcome push-back in the planning meeting — it's cheaper to surface disagreements there than mid-sprint" |
| 110 | Trade-off communication | Explicitly naming what you're giving up in order to get what you're prioritising | "Trade-off: 'If we ship in 3 weeks, we can't do the PDF export. If we want PDF export, we ship in 5. Which matters more for this launch?'" | "I never ask stakeholders to approve scope without naming the trade-off — it makes the choice real and prevents 'why didn't you tell me?' later" |
| 111 | DACI | Decision-making framework: Driver (owns the process), Approver (has final say), Contributors (provide input), Informed (notified of outcome) | "Payment pricing change: Finance is Driver, CEO is Approver, PM and Engineering are Contributors, Sales is Informed" | "DACI cut our decision time from 2 weeks to 2 days — everyone knew who had final say" |
| 112 | Status update | A brief communication of what's on track, what's at risk, and what's been decided — not a progress report | "Status update: 'On track for May launch. Payment integration at risk — partner API delay. Mitigating with backup provider'" | "I write status updates as 'green/amber/red' on three dimensions: scope, timeline, quality. It takes 5 minutes; it saves 30-minute catch-up calls" |
| 113 | Recommendation framing | Structuring a proposal as: situation → complication → recommendation → evidence → ask | "Situation: conversion is at 59%. Complication: it's been declining for 3 weeks. Recommendation: prioritise the latency fix this sprint. Evidence: p95 latency doubled after the last deploy. Ask: approve the scope change" | "I use recommendation framing for every decision I bring to leadership — it respects their time and makes the ask clear" |
| 114 | Town hall update | A periodic all-hands communication of product direction, progress, and decisions | "Town hall: 15 minutes of product update — what shipped, what's next, one metric that moved, one decision made" | "I prep for town halls by translating engineering milestones into user outcomes — the company needs to understand what customers got, not what code was written" |
| 115 | Demo vs presentation | Demo: show the working product. Presentation: show slides about the product. Know when each is right | "Executive demo at the end of a sprint builds more trust than a slide deck. A stakeholder who can't be there needs a recording, not a live demo" | "I run demos, not presentations, for the internal team — seeing the product makes feedback concrete; slides make feedback abstract" |

#### Theme 7: Growth (Days 24–26)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 116 | AARRR (Pirate Metrics) | Acquisition → Activation → Retention → Referral → Revenue; a framework for mapping a growth funnel | "Every growth problem maps to one of these five stages — diagnose which one is leaking first" | "We mapped the payment product through AARRR: acquisition was strong, activation was the leak — we focused there" |
| 117 | Growth loop | A self-reinforcing cycle where product usage drives more usage | "Invoice sender invites recipient → recipient signs up to pay → recipient becomes a sender → they invite their customers. Loop" | "We redesigned the invoice feature as a growth loop — each payment created a potential new user at no acquisition cost" |
| 118 | Viral coefficient | The number of new users each existing user brings in; above 1.0 means exponential growth | "If each user refers 1.2 new users who convert, viral coefficient = 1.2 — the product grows without paid acquisition" | "Our viral coefficient was 0.4 — not viral, but enough to offset 40% of our CAC with organic growth" |
| 119 | Activation | The moment a new user first experiences the core value of the product | "Activation for a payment app: first successful payment sent. Everything before this is onboarding; everything after is retention" | "We ran 6 activation experiments in one quarter and moved activation from 35% to 61% — the biggest lever we'd ever found" |
| 120 | Aha moment | The specific point in the user journey when users first understand why the product is valuable | "Slack's aha moment: when a team sends 2,000 messages. At that point, search becomes indispensable and they don't leave" | "We identified our aha moment: users who linked their bank account in onboarding retained at 2× the rate of those who didn't" |
| 121 | Onboarding flow | The sequence of steps that takes a new user from sign-up to their first successful action | "Good onboarding ends at the aha moment, not at account creation. Account creation is not value; first payment is" | "We rebuilt onboarding around a single goal: get users to send their first payment in under 4 minutes" |
| 122 | Churn intervention | A proactive action triggered when a user shows signs of leaving, designed to bring them back | "If a user hasn't logged in for 7 days (unusual for them), trigger a re-engagement email with their last activity" | "We set up churn interventions at D7 inactivity: a personalised email showing what they'd missed. It recovered 12% of at-risk users" |
| 123 | Funnel optimisation | Systematically improving conversion at each step of a multi-step user flow | "Funnel: 100 start → 90 enter details → 80 confirm → 72 complete. Optimise step 3 (confirm) first — biggest drop" | "Funnel optimisation was our entire Q2 focus. We fixed the three biggest drop points and grew conversion 14 points" |
| 124 | Feature adoption | The percentage of active users who use a specific feature in a given period | "90% of users log in monthly, but only 15% use the receipt export — low adoption despite high traffic" | "We tracked feature adoption monthly; anything below 10% after 90 days went on the deprecation list unless a clear segment loved it" |
| 125 | Referral | A mechanism by which existing users bring new users to the product, usually with an incentive | "Refer a friend, both get ₹100 credit. Classic referral loop" | "Our referral programme had a K-factor of 0.4; it wasn't viral, but it accounted for 25% of new user acquisition at zero marginal cost" |
| 126 | Paid vs organic growth | Paid: users acquired through advertising spend. Organic: users who find you through word-of-mouth, SEO, or referral | "If 70% of your users come from paid ads and you stop spending, you lose 70% of growth — that's a fragile model" | "We were 80% paid when I joined. I shifted the mix to 50% organic over 18 months by investing in referral and content — CAC dropped 40%" |
| 127 | Engagement metric | A measure of how actively users interact with the product (session frequency, session length, actions per session) | "DAU/MAU is an engagement metric. So is 'payments initiated per active user per week'" | "Our primary engagement metric was payments per active user per month — it captured both frequency and product depth" |
| 128 | Acquisition | Bringing new users to the product through any channel: paid, organic, referral, partnership | "Acquisition channels: Google Ads, App Store search, referral programme, fintech partnerships, content marketing" | "We prioritised acquisition channels by CAC and quality: referral had the lowest CAC and highest D30 retention by far" |
| 129 | Retention | The ongoing behaviour of users returning to the product after their first use | "Retention is the most important growth lever. Acquiring users into a leaky bucket is expensive. Fix the bucket first" | "We spent 2 quarters on retention before touching acquisition. D30 retention went from 22% to 41%. ARPU grew without adding new users" |
| 130 | SEO/ASO | Search Engine Optimisation / App Store Optimisation; improving visibility in search results to drive organic acquisition | "ASO: optimise the app store listing title, description, and screenshots so users searching 'send money' find you" | "ASO improvements to our payment app listing tripled organic installs in 60 days at zero cost" |

#### Theme 8: AI & Tech PM (Days 27–30)

| # | Term | Plain Meaning | Everyday Example | PM Interview Usage |
|---|------|---------------|------------------|--------------------|
| 131 | Large Language Model (LLM) | A type of AI trained on vast text data to understand and generate human language | "GPT, Claude, and Llama are LLMs — they predict the next token given context, at scale" | "We used an LLM to extract key fields from invoice PDFs — it replaced a brittle rule-based parser that broke on every new format" |
| 132 | RAG (Retrieval-Augmented Generation) | A technique where the model's response is grounded in documents retrieved at query time, reducing hallucination | "Instead of asking the LLM to remember your company's refund policy, you retrieve the policy doc and include it in the prompt" | "We used RAG for the customer support bot — it answered from our help centre, not from the model's training data, so answers were accurate and auditable" |
| 133 | Hallucination | When an LLM generates confident-sounding but factually incorrect output | "The model said our refund policy allows 60 days. It doesn't. That's a hallucination — plausible but wrong" | "Hallucination was the biggest trust risk in our AI document pipeline; we mitigated it with human-in-the-loop review for high-value extractions" |
| 134 | Latency | The time between a request and a response; in AI, the time from sending a prompt to receiving the first token | "LLM latency is typically 1–5 seconds for a standard response; streaming reduces perceived latency" | "We set a 3-second latency SLA for AI responses; exceeding it dropped user satisfaction scores by 30 points in our testing" |
| 135 | API (product context) | A defined interface that lets software systems communicate; for AI PMs, the boundary between your product and an AI service | "We call the payment processor's API to initiate a transaction. We call the LLM API to generate a summary" | "I spec'd the API contract between our product and the AI service before engineering built either side — it let both teams work in parallel" |
| 136 | Model evaluation | The systematic process of testing an AI model's outputs for quality, accuracy, safety, and alignment with requirements | "Evaluation: we sent 500 real invoices through the extraction model and manually checked the output. Precision: 94%. Recall: 91%" | "We set up an evaluation pipeline before shipping the AI feature — without it, we'd have shipped 94% precision thinking it was 100%" |
| 137 | AI guardrails | Rules or filters that prevent an AI system from producing harmful, off-topic, or incorrect outputs | "Guardrail: if the model's confidence on an extraction is below 80%, flag for human review instead of auto-processing" | "We built confidence-score guardrails into the document pipeline; anything below threshold went to a human reviewer — it reduced our error rate from 8% to 1.2%" |
| 138 | Responsible AI | The practice of designing AI systems that are fair, transparent, accountable, and safe | "Responsible AI: who is harmed if the model is wrong? Can users contest the output? Is there a human override?" | "Before launching the AI credit-decisioning feature, we ran a fairness audit across demographic segments — a step I'd mandate on any AI product that affects access to financial services" |
| 139 | Data pipeline | The infrastructure that moves, transforms, and stores data from source to destination for use in a product or model | "Data pipeline: payment events → Kafka → data warehouse → feature store → model → prediction → product" | "The AI feature depended on a real-time data pipeline that didn't exist; I scoped that as a prerequisite in the roadmap" |
| 140 | Fine-tuning | Additional training of a pre-trained model on domain-specific data to improve performance on a specific task | "We fine-tuned an open-source LLM on 10,000 labelled invoice extraction examples — accuracy improved from 87% to 96%" | "Fine-tuning was not in scope for v1; we used a foundation model with a good prompt. Fine-tuning is a phase-2 consideration if the accuracy target isn't met" |
| 141 | Inference | The act of running a trained AI model on new input to generate output; this is what happens in production | "Every time a user submits a document, the model runs inference — that's the latency and compute cost you pay" | "Inference cost was $0.02 per document; at 10,000 documents/day, that's $200/day — a line item I put in the business case" |
| 142 | System prompt | The instructions given to an LLM at the start of a conversation to define its role, constraints, and behaviour | "System prompt: 'You are a PM interview coach. Only answer questions about PM interviews. Do not discuss other topics.'" | "We used a detailed system prompt to constrain the AI coach persona — without it, the model would happily discuss recipes" |
| 143 | Prompt engineering | The craft of designing input text (prompts) that reliably produce high-quality, correctly-formatted AI output | "Prompt engineering: 'Extract the invoice total. Output JSON: {amount: number, currency: string}. If not found, return {amount: null}'" | "Prompt engineering was a core skill in our AI product work — we iterated the extraction prompt 12 times before it hit our accuracy threshold" |
| 144 | Edge case | An input or scenario that falls outside the normal range, often causing unexpected AI behaviour | "Edge case for invoice extraction: a handwritten invoice, a table in an image, an invoice in a language the model wasn't trained on" | "We built our edge-case test set from real data failures — every incident became a test case. The model's performance on edge cases improved every sprint" |
| 145 | Human-in-the-loop | A system design where humans review or approve AI decisions above a certain risk threshold | "Human-in-the-loop: for payments above ₹1 lakh, the AI flags the transaction and a compliance officer approves" | "Human-in-the-loop was our answer to the hallucination risk — we were transparent with customers that high-value extractions had a human review step" |
| 146 | Model drift | The gradual degradation of a model's performance over time as the real-world data it encounters changes | "An invoice extraction model trained on 2022 data starts failing on 2024 invoice formats — that's drift" | "We set up a drift detection dashboard: if extraction accuracy dropped more than 2 points in a week, it triggered a re-evaluation sprint" |
| 147 | Token | The unit of text an LLM processes; roughly 4 characters or 0.75 words in English | "A 1,000-word document is roughly 1,300 tokens. LLM pricing is typically per 1,000 input + output tokens" | "Token count drove our cost model: shorter prompts, same accuracy — that was an engineering optimisation worth a sprint" |
| 148 | AI product spec | A product requirements document adapted for AI features, including data requirements, evaluation criteria, and fallback behaviour | "AI spec includes: input format, expected output, accuracy target, latency SLA, fallback if confidence < threshold, evaluation dataset" | "An AI spec without an accuracy target and a fallback behaviour is not a spec — you're asking engineering to build something with no definition of done" |
| 149 | AI evaluation metric | The specific measure used to judge an AI feature's quality: precision, recall, F1, BLEU, human preference score | "For classification: precision (of what we flagged, how many were right?) and recall (of all the real cases, how many did we catch?)" | "We chose recall over precision for fraud detection — better to flag a legitimate payment for review than to miss a fraud. The metric choice shaped the whole model" |
| 150 | Opportunity cost (AI context) | Building AI features has a high opportunity cost: data infrastructure, evaluation, maintenance, and risk — weigh against simpler alternatives | "Before using an LLM for search, ask: would Elasticsearch with good ranking cover 80% of the cases at 10% of the cost?" | "I always ask: 'What's the non-AI version of this?' If the non-AI version covers 90% of the value at 20% of the complexity, we build that first" |

---

### Spaced Review: Leitner 5-Box System

**How it works:**

```
Box 1 → Review every day
Box 2 → Review every 2 days
Box 3 → Review every 4 days
Box 4 → Review every 8 days
Box 5 → Graduated (no review in 30-day window)

Correct answer → move up one box (nextReview = today + box interval)
Wrong answer   → back to Box 1 (nextReview = tomorrow)
New word       → Box 1 (nextReview = tomorrow)
```

**Daily vocab step pulls:**
1. Today's 5 new words (by day number in curriculum)
2. All words where `nextReview <= today`, sorted by box number ascending (lowest-box first = weakest first)
3. Cap total at 10 items per session (5 new + up to 5 reviews) to fit time budget

**Data structure per word (localStorage):**
```json
{
  "jtbd": {"box": 2, "nextReview": "2026-11-11", "lastResult": "correct"},
  "northStarMetric": {"box": 1, "nextReview": "2026-11-10", "lastResult": "wrong"}
}
```

**AI usage check per word:**
- Learner types a sentence using the word in conversation (not just a definition)
- Short AI call: "Did the learner use '[term]' correctly and naturally in this sentence? Answer YES or NO and in one sentence explain why."
- Classify: YES → advance box. NO → back to Box 1. Show brief explanation.

---

## Feedback Rubric

### Dimensions (6 total — AI evaluates all, reports only most-relevant 2–3)

| Dimension | What It Checks | How Detected |
|-----------|----------------|--------------|
| Structure | Did the answer follow a framework (STAR, PREP, CIRCLES, or diagnosis→hypothesis→test)? Did it have a clear point up front? | Structural markers in transcript ("the situation was", "my recommendation", "the outcome") |
| Clarity | Is the main point clear in the first 20 seconds? Is there one throughline? | Transcript analysis: does the first sentence state the conclusion? |
| PM Vocabulary | Did the answer use relevant PM terms (from the curriculum or beyond)? Were they used correctly? | Cross-check transcript against PM term list; note missed opportunities |
| Metrics | Did the answer include numbers: percentages, timelines, user counts, revenue figures? | Simple: does the transcript contain any numbers? |
| Impact | Did the answer name a business or user outcome, not just an action taken? | Transition words: "as a result", "which led to", "that reduced" |
| Conciseness | Was the answer within the target time (90s for speaking, ~200 words for writing)? Were there filler words? | Word count / time + filler word scan: "um", "uh", "like", "you know", "sort of", "basically" |

### Output Format (hard constraint: under 80 words total)

```
Score: [1–10]
What landed: [1 sentence — the strongest thing they did]
One fix: [1 sentence — the single most important improvement]
Better line: "[a rewritten version of their weakest moment, using their resume where possible]"
```

**Filler word scan (no AI call needed):** Count occurrences of `um`, `uh`, `like`, `you know`, `sort of`, `basically`, `honestly`, `literally` in the transcript. If total > 5 in a 90-second answer, add to feedback: "Filler words: [N] in this answer. Record yourself and listen back once."

**PM vocabulary cross-reference (injected into AI prompt):** Include today's 5 vocab words in the feedback prompt. Ask the model to note if any were applicable and unused. Example output: "You described the drop in sign-ups without naming it as a 'retention' problem — using the term signals PM fluency to interviewers."

---

## Unexpected Question Drill

### Flow

```
Step 1: Question displayed (random from expanded question bank, weighted toward weak-spot tags)
Step 2: Think timer — 30 seconds, cannot submit early
Step 3: Speak or type answer — 90-second target, timer visible
Step 4: Transcript shown, editable
Step 5: Submit → AI sends back: score + fix + better line + ONE follow-up probe
Step 6: Learner answers the follow-up (no timer, type only — it's a probe, not a full answer)
Step 7: Final feedback on both answers combined
```

### Follow-up Probe Examples (AI generates contextually)

The AI follow-up is a single question that goes one level deeper. Patterns:

| Learner Answer Type | Likely AI Follow-up |
|---------------------|---------------------|
| Gave a solution without diagnosis | "What data would you check first to confirm that's the right problem?" |
| Named a metric but no baseline | "What's the baseline, and how much movement would signal success?" |
| Good structure, no stakeholder mention | "How would you bring the engineering team along on this prioritisation?" |
| Generic answer without personal example | "Can you give me a specific example from your own work?" |
| Mentioned a risk but no mitigation | "What's your plan if that risk materialises?" |

**Question Bank (expanded from existing 8 questions):**

The app should have ~40 questions across the 8 PM categories from the existing interview data, weighted by weak-spot tags. If the learner has 4 "no-metric" tags this week, 50% of unexpected questions should be metrics questions. If tags are even, random selection.

---

## Weak-Spot Tag Taxonomy

### Fixed Tag List (10 tags — fixed vocabulary prevents fragmentation)

| Tag | What It Means | Typical Trigger |
|-----|---------------|-----------------|
| `no-metric` | Answer lacked any numbers, percentages, or quantified impact | "conversion improved" with no number |
| `no-structure` | Answer was free-form with no discernible framework | No STAR/PREP/CIRCLES markers in transcript |
| `rambling` | Answer exceeded 2× target length or lost its main thread | Word count or time > 2× target |
| `weak-opening` | First sentence did not state the main point | First sentence was setup/context, not conclusion |
| `vague-impact` | Mentioned outcome but did not quantify it | "it improved significantly" |
| `no-example` | Stayed abstract; no concrete story or project reference | No personal story or specific scenario cited |
| `wrong-vocab` | Used generic language where PM terms applied | "people" instead of "users", "goal" instead of "OKR" |
| `filler-heavy` | 5+ filler words in a 90-second spoken answer | Transcript scan: um, uh, like, you know > 5 |
| `assumption-leap` | Jumped to a solution without diagnosing the problem | No diagnosis/hypothesis step in answer |
| `no-tradeoff` | Did not acknowledge alternatives or what was given up | Presented one option as obvious without discussing alternatives |

### How Tags Flow Through the Journey

```
AI feedback call
    └──produces──> 1–2 tags per answer (most relevant)
                       └──stored in dailyData[day].tags[]

Tag frequency aggregated weekly
    └──top 2 tags shown on day completion card ("this week's patterns")
    └──top 1 tag injected into next day's journey intro ("Yesterday you had no metrics — today, try to include one number per answer")
    └──top 1–2 tags used to weight unexpected question selection
    └──if same tag appears 5+ times in 7 days → show "focused drill" prompt ("let's spend extra time on metrics today")
```

**Re-testing weak vocab words:** Any vocab term marked wrong (back to Box 1) is surfaced again in tomorrow's review step. The weak-spot tag `wrong-vocab` additionally queues a vocab review for the specific term that was missed in the answer.

---

## Resume Personalisation

### What to Extract (browser-side, PDF.js)

| Data Type | Examples | How Used in Feedback |
|-----------|----------|---------------------|
| Project names | "AI document pipeline", "Payment conversion initiative" | Referenced by name in "better line": "…as you did in the AI document pipeline…" |
| Quantified outcomes | "Reduced refunds by 30%", "Increased conversion from 59% to 71%" | Injected into better-line rewrites: "…achieving a 12-point lift similar to your payment work…" |
| Job titles / roles | "Product Manager at [Company]", "Associate PM" | Used to calibrate feedback: seniority informs how much structure to expect |
| Company names | Fintech, B2B, consumer — the category matters | Calibrates analogy selection in feedback: "in a fintech context, this matters because…" |
| Skill areas / tech | "experience with SQL", "worked with ML teams" | Used when discussing AI/metrics questions to reference relevant background |

### Rules for Resume Use

1. **Only quote what is in the extracted text.** The AI prompt must include the extracted resume text and an explicit instruction: "Only reference projects, metrics, and roles that appear in the resume text below. Do not invent or infer projects."
2. **If no relevant resume detail exists for a feedback point, say so:** "Ground this in a real project from your experience — the more specific, the better."
3. **Resume text injected per feedback call, not stored server-side.** It is part of the prompt payload to the NIM model and never stored outside the learner's browser.
4. **Fallback when no resume uploaded:** feedback uses generic PM examples instead of personalised ones; show a one-time prompt to upload resume.

---

## MVP Definition

### Launch With (v1 — the milestone being planned)

- [x] Single-tab journey flow (6 steps, sequential, progress bar)
- [x] Resume mid-session (localStorage step state)
- [x] Day completion state + streak counter
- [x] PM vocabulary curriculum (all 150 terms, static JS data)
- [x] Daily vocab step: 5 new words + AI usage check per word
- [x] Leitner spaced review (box state in localStorage, pulls due words daily)
- [x] Recall prompt step (retrieval from yesterday, text submit)
- [x] Spoken answer step (Web Speech API, editable transcript, 90s timer)
- [x] Unexpected question drill (single question, 30s think, 90s answer, AI follow-up probe)
- [x] AI feedback (score + fix + better line, <80 words, NIM via Cloudflare Worker)
- [x] Weak-spot tag tracking (10 fixed tags, stored per day)
- [x] PM-only coach persona (system prompt, off-topic refusal)
- [x] PDF resume upload, browser-parsed, stored locally
- [x] Resume-grounded "better line" in feedback
- [x] Filler word scan (transcript-based, no extra AI call)
- [x] Graceful speech fallback (typing-only mode)
- [x] JSON export/import

### Add After Validation (v1.x)

- [ ] Vocab cross-reference in AI feedback ("you could have said 'retention' here") — trigger: vocab system is working end-to-end
- [ ] Weak-spot-driven unexpected question weighting — trigger: 2+ weeks of tag data accumulated
- [ ] "Focused drill" day when a tag fires 5+ times in a week — trigger: tag aggregation working
- [ ] Progress grid showing all 30 days with completion dots — trigger: day completion state stable

### Future Consideration (v2+)

- [ ] AI-generated endless days (day 31+) — defer until 30-day arc is proven
- [ ] Vocab cross-reference expanded to full 150-term list in every feedback call — high token cost; defer until proxy is stable and cost is understood
- [ ] Confidence interval display on scores ("based on 5 days of data, your average score on metrics questions is 5.4") — nice, not needed to start

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Step-by-step daily flow | HIGH | MEDIUM | P1 |
| AI feedback (score + fix + better line) | HIGH | HIGH | P1 |
| PM vocabulary curriculum (static data) | HIGH | LOW | P1 |
| Leitner spaced review | HIGH | MEDIUM | P1 |
| Cloudflare Worker proxy (prerequisite for AI) | HIGH | MEDIUM | P1 |
| Resume upload + grounded feedback | HIGH | MEDIUM | P1 |
| Weak-spot tags (10 fixed) | HIGH | MEDIUM | P1 |
| Unexpected question + AI follow-up probe | HIGH | MEDIUM | P1 |
| Resume mid-session / streak counter | MEDIUM | LOW | P1 |
| PDF resume parser (PDF.js) | MEDIUM | MEDIUM | P1 |
| Filler word scan (transcript) | MEDIUM | LOW | P1 |
| Vocab usage AI check (per word) | MEDIUM | MEDIUM | P2 |
| Vocab cross-reference in answer feedback | MEDIUM | LOW | P2 |
| Weak-spot-driven question weighting | MEDIUM | LOW | P2 |
| Focused drill on repeat weak spots | MEDIUM | LOW | P2 |
| Day 31+ AI-generated endless content | HIGH | HIGH | P3 |
| Analytics charts / trend views | LOW | MEDIUM | P3 |

---

## Competitor Feature Analysis

| Feature | Yoodli | Exponent | Final Round AI | RECALL (this app) |
|---------|--------|----------|----------------|-------------------|
| AI answer feedback | Yes (audio-based) | Yes (text rubric) | Yes (real-time) | Yes (text transcript, <80 words) |
| Vocabulary curriculum | No | No | No | Yes — 150 PM terms, Leitner review |
| Resume personalisation | Partial | No | Yes | Yes — strict, no invention |
| Weak-spot tracking | Partial (filler words, pace) | No | Partial | Yes — 10 fixed tags, journey-integrated |
| Follow-up probe | No | No | Yes (simulated panel) | Yes — single AI-generated probe |
| Spaced repetition | No | No | No | Yes — Leitner 5-box |
| Daily guided journey | No | No | No | Yes — 6-step linear flow |
| Endless generated content | No | No | No | Planned (v2) |
| Free / no server costs | No | No | No | Yes — static site + Worker free tier |
| Single-file, no build | No | No | No | Yes |

---

## Sources

- Yoodli product (yoodli.ai) — real-time speech coaching, filler word tracking, delivery metrics
- Exponent (tryexponent.com) — PM interview question bank, structured rubrics, community
- Final Round AI — real-time interview assistance, AI mock interviews, resume coach
- Speeko — daily speaking lessons, structured curriculum, streak mechanics
- Duolingo — streak design (grace day), spaced repetition integration, daily goal UX
- Anki / Leitner system — 5-box spaced repetition mechanics, interval design
- PM interview frameworks: STAR, PREP, CIRCLES, Sean Ellis PMF test, AARRR (Dave McClure)
- NIM API documentation — CORS behaviour, rate limits, model capabilities
- Web Speech API MDN documentation — browser support matrix, transcript accuracy patterns

---
*Feature research for: AI-coached PM interview / speaking-practice / vocabulary training app*
*Researched: 2026-11-09*
*Confidence: HIGH — patterns from established products (Duolingo spaced repetition, Leitner system, Yoodli feedback UX, PM curriculum design) are well-documented; curriculum term selection and tag taxonomy are domain-expert recommendations, not empirical data*
