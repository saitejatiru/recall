// content.js — static curriculum data for RECALL
// No UMD wrapper needed: plain globals, no DOM refs, no Node test requirement.
// Load order: before logic.js and app.js.

// VOCAB[30][5] — 30 days × 5 terms per day
// Each term: { id, term, meaning, everyday, interview }
const VOCAB = [

// Day 1 — Discovery & User Research (terms 1–5)
[
  { id: 'jtbd', term: 'Jobs-to-be-done (JTBD)', meaning: 'The underlying goal a user has, not the feature they ask for', everyday: 'I hire a smoothie, not because I want a smoothie but because I want to get through a commute without getting hungry', interview: 'We re-framed the problem using jobs-to-be-done: users weren\'t asking for a faster payment screen, they needed confidence the payment went through' },
  { id: 'userPersona', term: 'User persona', meaning: 'A fictional but research-grounded profile of a target user type', everyday: 'Our main persona is Priya, a 28-year-old freelancer who invoices three clients a month', interview: 'We built two personas from 40 interviews to align the team on who we were building for' },
  { id: 'painPoint', term: 'Pain point', meaning: 'A specific frustration or obstacle a user experiences', everyday: 'The pain point is remembering to pay rent — not the act of paying', interview: 'We identified the primary pain point as trust: users abandoned at payment confirmation because they didn\'t believe the transaction had succeeded' },
  { id: 'empathyMap', term: 'Empathy map', meaning: 'A simple 2×2 showing what users think, feel, say, and do', everyday: 'We mapped what customers say in support tickets versus what they actually do in the app — they\'re different', interview: 'The empathy map showed users said they wanted more features but their behaviour showed they were overwhelmed by the ones we already had' },
  { id: 'userJourneyMap', term: 'User journey map', meaning: 'A step-by-step view of a user\'s experience across a process', everyday: 'Draw out every step from "I want to send money" to "I see the confirmation"', interview: 'The journey map revealed a 4-step gap between transaction initiation and confirmation that we hadn\'t instrumented' }
],

// Day 2 — Discovery & User Research (terms 6–10)
[
  { id: 'discoveryInterview', term: 'Discovery interview', meaning: 'A structured conversation to understand user problems before proposing solutions', everyday: 'Before designing anything, we did 15 discovery interviews — no mockups, no pitching', interview: 'In discovery interviews, we ask "walk me through the last time you…" not "would you use a feature that…"' },
  { id: 'assumption', term: 'Assumption', meaning: 'A belief you\'re treating as fact but haven\'t yet validated', everyday: 'Our biggest assumption was that users check their balance daily — turns out most check weekly', interview: 'We listed our top five assumptions and ranked them by risk before writing a single line of code' },
  { id: 'prototype', term: 'Prototype', meaning: 'A rough, testable version of an idea — not production code', everyday: 'We built a Figma prototype in a day and tested it with five users before engineering touched it', interview: 'We validated the new onboarding with a no-code prototype; it failed in testing, which saved us three sprints' },
  { id: 'usabilityTest', term: 'Usability test', meaning: 'Watching real users attempt tasks with a product, observing where they struggle', everyday: 'We sat in a room with five users and watched them try to pay a bill — nobody said anything, we just observed', interview: 'Usability tests on the payment flow showed three out of five users missed the confirm button entirely' },
  { id: 'voiceOfCustomer', term: 'Voice of the customer (VoC)', meaning: 'Systematic capture of what customers say about their needs and experiences', everyday: 'VoC is not reading NPS scores — it\'s tagging 500 support tickets to find the top five complaint themes', interview: 'Our VoC programme flagged "slow refund" as the number-one complaint three months before it showed up in churn' }
],

// Day 3 — Discovery & User Research (terms 11–15)
[
  { id: 'userStory', term: 'User story', meaning: 'A short description of a feature from the user\'s perspective: "As a [user], I want [action] so that [outcome]"', everyday: 'As a freelancer, I want to schedule payments in advance so that I don\'t miss due dates', interview: 'We wrote every requirement as a user story so engineers and designers shared a single vocabulary' },
  { id: 'acceptanceCriteria', term: 'Acceptance criteria', meaning: 'The specific conditions that must be true for a user story to be considered done', everyday: 'Acceptance criterion: the confirmation screen appears within 2 seconds of payment submission', interview: 'Without acceptance criteria, "done" means something different to engineering, design, and QA every time' },
  { id: 'insight', term: 'Insight', meaning: 'A non-obvious conclusion drawn from data or research — more than a fact', everyday: 'The data said 60% abandon checkout; the insight was that abandonment spikes specifically when payment takes more than 4 seconds', interview: 'Data told us users weren\'t completing onboarding; the insight was they were stopping at the bank-link step because they didn\'t trust the third-party provider' },
  { id: 'desirability', term: 'Desirability', meaning: 'Whether users actually want what you\'re building', everyday: 'Technically perfect but nobody wants it — desirability is the first filter', interview: 'The feature passed feasibility and viability checks but failed desirability — users told us in research they\'d never use it' },
  { id: 'feasibility', term: 'Feasibility', meaning: 'Whether the team can build it with current technology and resources', everyday: 'Great idea, but we don\'t have real-time payment rails — feasibility says "not yet"', interview: 'We scoped the feature for feasibility first; the ML component needed 6 months of data we didn\'t have' }
],

// Day 4 — Discovery & User Research (terms 16–20)
[
  { id: 'viability', term: 'Viability', meaning: 'Whether the business can sustain and profit from it', everyday: 'It\'s desirable and feasible, but if the unit economics don\'t work, it\'s not viable', interview: 'The enterprise version was viable only if we could land three anchor customers in quarter one' },
  { id: 'problemStatement', term: 'Problem statement', meaning: 'A clear, user-focused articulation of the problem you\'re solving, before any solution', everyday: 'Problem: new users cannot tell if their payment succeeded, so they submit twice, causing duplicate charges', interview: 'We spent the first day of the sprint writing a crisp problem statement — it changed what we built entirely' },
  { id: 'howMightWe', term: 'How-might-we (HMW)', meaning: 'A design-thinking question that reframes a problem as an opportunity', everyday: '"How might we make users confident a payment succeeded without requiring them to check their bank app?"', interview: 'We used HMW questions in the ideation session to shift the team from defending their existing ideas to generating new ones' },
  { id: 'affinityMapping', term: 'Affinity mapping', meaning: 'Grouping qualitative data (observations, quotes) into themes to find patterns', everyday: 'We wrote every user complaint on a sticky note and grouped them — 70% clustered around trust and speed', interview: 'After 20 interviews, affinity mapping revealed three distinct mental models of what "my money" meant to users' },
  { id: 'researchSynthesis', term: 'Research synthesis', meaning: 'The process of distilling raw research into prioritised, actionable findings', everyday: 'Synthesis is the step where you turn 300 interview quotes into five findings and one recommended next step', interview: 'I presented the research synthesis as three findings with a recommended problem to solve — not a data dump' }
],

// Day 5 — Metrics & Analytics (terms 21–25)
[
  { id: 'northStarMetric', term: 'North Star Metric (NSM)', meaning: 'The single metric that best captures the core value your product delivers to users', everyday: 'Airbnb\'s NSM is nights booked; Spotify\'s is time listening', interview: 'Our NSM was successful payments per active user per month — everything else was a lever that moved that' },
  { id: 'kpi', term: 'KPI', meaning: 'A measurable value that shows how well you\'re achieving a specific objective', everyday: 'Three KPIs for the payment feature: conversion rate, error rate, time-to-confirm', interview: 'I track five KPIs per feature; if any one goes red within 48 hours of launch, we rollback immediately' },
  { id: 'okr', term: 'OKR', meaning: 'A framework linking an inspiring Objective to 2–4 measurable Key Results with a time horizon', everyday: 'Objective: make payment feel instant. KR1: p95 latency under 1s. KR2: confirmation errors below 0.5%', interview: 'We set quarterly OKRs with engineering so everyone knew what success looked like before we started' },
  { id: 'dauMau', term: 'DAU / MAU', meaning: 'Daily Active Users / Monthly Active Users; how many users engage in a day or month', everyday: 'If DAU/MAU is 0.5, half your monthly users come back every day — strong engagement', interview: 'DAU/MAU was 0.3 at launch; after onboarding improvements it rose to 0.5 — a signal the product was becoming habit-forming' },
  { id: 'retentionRate', term: 'Retention rate', meaning: 'The percentage of users who return after their first use over a given period', everyday: 'Day-30 retention of 40% means 40 of every 100 users are still active a month later', interview: 'Retention at D7 was 55%; industry benchmark for fintech was 40% — we were ahead, but D30 drop-off needed work' }
],

// Day 6 — Metrics & Analytics (terms 26–30)
[
  { id: 'churnRate', term: 'Churn rate', meaning: 'The percentage of users or revenue lost in a period', everyday: 'Monthly churn of 5% sounds small, but over a year you lose more than half your base', interview: 'Churn was highest in the first 7 days — we fixed onboarding and churn dropped from 18% to 11% in that window' },
  { id: 'conversionRate', term: 'Conversion rate', meaning: 'The percentage of users who complete a desired action (purchase, sign-up, upgrade)', everyday: 'Checkout conversion of 72% means 28 out of every 100 users who start checkout don\'t finish', interview: 'Payment conversion dropped from 72% to 59% overnight; that 13-point drop mapped to a specific error code introduced in the last deploy' },
  { id: 'funnelAnalysis', term: 'Funnel analysis', meaning: 'Breaking a multi-step user flow into stages and measuring drop-off at each step', everyday: 'Payment funnel: 100 start → 90 enter card → 75 confirm → 72 succeed — step 3 is the problem', interview: 'Funnel analysis showed the biggest drop between "confirm" and "success" — a latency issue, not a UX one' },
  { id: 'cohortAnalysis', term: 'Cohort analysis', meaning: 'Tracking a group of users who share a start date to see how their behaviour changes over time', everyday: 'January sign-ups retained better than February sign-ups — something changed in onboarding between those months', interview: 'Cohort analysis showed users who completed the bank-link step in onboarding retained at 2× the rate of those who skipped it' },
  { id: 'abTest', term: 'A/B test', meaning: 'A controlled experiment where two variants (A and B) are shown to different user groups to measure which performs better', everyday: 'We showed half our users the green button and half the blue button — green won by 8%', interview: 'We A/B tested two confirmation screens; the one with the payment reference number lifted satisfaction by 12 points' }
],

// Day 7 — Metrics & Analytics (terms 31–35)
[
  { id: 'statisticalSignificance', term: 'Statistical significance', meaning: 'The threshold at which you\'re confident a test result is real, not random noise (usually p < 0.05)', everyday: 'If you flip a coin 10 times and get 7 heads, that\'s probably luck. 1,000 flips and 700 heads — that\'s real', interview: 'We didn\'t call the A/B test until we had statistical significance at 95% — stopped us from shipping a false positive twice' },
  { id: 'baseline', term: 'Baseline', meaning: 'The current performance level against which you measure improvement', everyday: 'Before the fix, baseline conversion was 59%. After, it was 71%. That\'s a 12-point lift', interview: 'Always establish the baseline metric before starting a sprint, or you won\'t know if you moved it' },
  { id: 'leadingIndicator', term: 'Leading indicator', meaning: 'A metric that predicts future outcomes (changes before the outcome you care about)', everyday: 'Support ticket volume about payment errors is a leading indicator of churn — it predicts it by about 3 weeks', interview: 'We used bank-link completion in onboarding as a leading indicator for 90-day retention — it predicted churn 6 weeks earlier than NPS did' },
  { id: 'laggingIndicator', term: 'Lagging indicator', meaning: 'A metric that reflects past performance (changes after the outcome has occurred)', everyday: 'Revenue is a lagging indicator — it shows what happened, not what\'s about to happen', interview: 'NPS is a lagging indicator; by the time it drops, we\'ve already lost users. We monitor leading indicators instead' },
  { id: 'arpu', term: 'ARPU', meaning: 'Average Revenue Per User; total revenue divided by number of active users', everyday: 'ARPU of ₹200/month means your average user pays ₹200. Growing ARPU means monetising better without acquiring more users', interview: 'We grew ARPU by 30% by moving the business tier down from ₹999 to ₹499 — more users upgraded, total revenue went up' }
],

// Day 8 — Metrics & Analytics (terms 36–40)
[
  { id: 'ltv', term: 'LTV (Lifetime Value)', meaning: 'The total revenue a customer is expected to generate over their entire relationship with the product', everyday: 'If a customer pays ₹500/month and stays 24 months, LTV = ₹12,000', interview: 'Our LTV was 3× our CAC — that\'s a healthy unit economics story; below 3× we\'d be losing money on acquisition' },
  { id: 'cac', term: 'CAC', meaning: 'Customer Acquisition Cost; the total cost to acquire one new paying customer', everyday: 'If we spend ₹10 lakh on marketing and acquire 1,000 customers, CAC = ₹1,000', interview: 'CAC was ₹800 against an LTV of ₹3,200 — a 4:1 ratio, which gave us confidence to increase the marketing budget' },
  { id: 'nps', term: 'NPS (Net Promoter Score)', meaning: 'A single-question survey (0–10, would you recommend us?) that buckets users as Promoters (9–10), Passives (7–8), or Detractors (0–6); score = % Promoters − % Detractors', everyday: 'An NPS of +50 is excellent; below 0 means more detractors than promoters', interview: 'NPS was +12 at launch; after the payment-speed improvement it rose to +34 — a 22-point gain correlated with the latency fix' },
  { id: 'csat', term: 'CSAT (Customer Satisfaction Score)', meaning: 'A transaction-level survey (1–5 or 1–10, how satisfied were you?) measured after a specific interaction', everyday: 'We show a CSAT survey after every payment completion — it tells us if that specific moment landed', interview: 'CSAT on the payment confirmation screen was 3.2/5; post-redesign it reached 4.4/5' },
  { id: 'activationRate', term: 'Activation rate', meaning: 'The percentage of new users who reach the "aha moment" — the point where they first experience core product value', everyday: 'If the aha moment is first successful payment, activation rate = % of sign-ups who complete one payment in their first session', interview: 'Activation was 35%; we identified the bank-link step as the barrier and improved it to 61% in one sprint' }
],

// Day 9 — Prioritization (terms 41–45)
[
  { id: 'rice', term: 'RICE', meaning: 'A scoring framework: Reach × Impact × Confidence / Effort; gives each initiative a comparable score', everyday: 'Feature A: Reach 500/week, Impact 2 (medium), Confidence 80%, Effort 4 weeks → RICE = 500×2×0.8/4 = 200', interview: 'We used RICE to stack-rank the Q2 roadmap; the low-effort, high-reach items rose to the top even though they felt boring' },
  { id: 'moscow', term: 'MoSCoW method', meaning: 'Priority tiers: Must have, Should have, Could have, Won\'t have — for a given release', everyday: 'Must: payment works. Should: receipt email. Could: receipt PDF. Won\'t: multi-currency in v1', interview: 'MoSCoW forced honest conversations — when everything was "Must", we knew we were doing wishful planning' },
  { id: 'iceScore', term: 'ICE score', meaning: 'Simpler than RICE: Impact × Confidence × Ease; quick scoring when you don\'t have reach data', everyday: 'Three-minute exercise in a planning meeting: score each idea 1–10 on impact, confidence, ease. Multiply. Sort.', interview: 'We used ICE for rapid backlog grooming — 20 items scored and sorted in under 30 minutes' },
  { id: 'opportunityCost', term: 'Opportunity cost', meaning: 'What you give up by choosing one option over another', everyday: 'Every sprint we spend on feature X is a sprint we\'re not spending on retention — that\'s the opportunity cost', interview: 'The stakeholder push for the reporting feature had an opportunity cost: three sprints not spent on the payment latency that was driving churn' },
  { id: 'backlog', term: 'Backlog', meaning: 'A prioritised list of work items (features, bugs, tech debt) not yet scheduled', everyday: 'The backlog is not a dumping ground — if it has 300 items, the bottom 250 are probably noise', interview: 'I keep the backlog to the top 20 items I\'d actually consider in the next two quarters; everything else is in an icebox' }
],

// Day 10 — Prioritization (terms 46–50)
[
  { id: 'techDebt', term: 'Tech debt', meaning: 'The future cost of quick solutions taken today; it compounds like financial debt', everyday: 'We hardcoded the currency symbol in 40 places to ship faster. That\'s tech debt — it\'ll cost more to fix later', interview: 'We negotiated one sprint per quarter for tech debt; without it, velocity was dropping 10% per quarter' },
  { id: 'mvp', term: 'MVP (Minimum Viable Product)', meaning: 'The smallest version of a product that lets you test your core hypothesis with real users', everyday: 'MVP is not "half the features" — it\'s the minimum to learn if the core value is real', interview: 'Our MVP was a manual payment confirmation sent via WhatsApp — no app, no code. It validated demand before we built anything' },
  { id: 'featureFlag', term: 'Feature flag', meaning: 'A code switch that turns a feature on or off without a new deployment', everyday: 'We shipped the new checkout behind a feature flag; turned it on for 1% of users, watched metrics, then expanded', interview: 'Feature flags let us decouple deployment from release — engineering ships safely, PM controls the rollout' },
  { id: 'dependency', term: 'Dependency', meaning: 'A constraint where one piece of work cannot start or complete until another is done', everyday: 'The reporting feature depends on the data pipeline — we can\'t build it until the pipeline is live', interview: 'I always map dependencies before committing to a roadmap; hidden dependencies are the number-one cause of sprint failures' },
  { id: 'tradeOff', term: 'Trade-off', meaning: 'A decision that gains something in one dimension by giving up something in another', everyday: 'Speed vs quality is the classic trade-off — ship fast and risk bugs, or test thoroughly and risk being late', interview: 'The stakeholder wanted both speed and zero defects. I explained the trade-off and asked which mattered more for this release' }
],

// Day 11 — Prioritization (terms 51–55)
[
  { id: 'effortEstimate', term: 'Effort estimate', meaning: 'A rough forecast of how much work an item requires (usually in story points or days)', everyday: 'If engineering says "that\'s a 2-week item", ask what assumptions are baked in — scope often triples', interview: 'I always ask for two estimates: best case and worst case. The gap tells you the uncertainty more than the number does' },
  { id: 'roi', term: 'ROI (Return on Investment)', meaning: 'The net benefit of a decision relative to its cost', everyday: 'We spent 2 sprints on payment latency and it reduced churn by 3% — that\'s a calculable ROI', interview: 'I frame prioritisation decisions in ROI terms so finance and leadership can compare them against other investments' },
  { id: 'priorityMatrix', term: 'Priority matrix', meaning: 'A 2×2 grid with Impact on one axis and Effort on the other; items in the high-impact, low-effort quadrant go first', everyday: 'Quick wins: high impact, low effort. Big bets: high impact, high effort. Time sinks: low impact, high effort — avoid', interview: 'We mapped 25 features on the priority matrix in a team exercise; it built alignment without anyone having to "win"' },
  { id: 'userValue', term: 'User value', meaning: 'The benefit a user directly receives from a feature', everyday: 'The "save payment details" feature delivers user value by cutting checkout time for repeat buyers', interview: 'I always separate user value from business value — sometimes they align, sometimes engineering has to build something users love that doesn\'t directly monetise' },
  { id: 'businessValue', term: 'Business value', meaning: 'The benefit the business receives (revenue, reduced cost, reduced risk, strategic positioning)', everyday: 'Reducing duplicate payment charges saves ₹5 lakh/month in support and refund costs — that\'s business value', interview: 'The feature had high user value but low business value at our current scale; we parked it for a later phase' }
],

// Day 12 — Prioritization (terms 56–60)
[
  { id: 'scopeCreep', term: 'Scope creep', meaning: 'The gradual expansion of a project\'s scope beyond what was agreed, usually without adjusting timeline or resources', everyday: 'We agreed on a payment confirmation screen. By week 3, it had grown to include receipt history, PDF export, and multi-currency. That\'s scope creep', interview: 'I protect scope by writing a "not in this sprint" list as explicitly as the sprint goal — it makes trade-offs visible' },
  { id: 'wsjf', term: 'WSJF (Weighted Shortest Job First)', meaning: 'A SAFe prioritisation method: Cost of Delay / Job Size; prioritise short, high-urgency items first', everyday: 'If two features both delay revenue, ship the smaller one first — it unblocks revenue sooner', interview: 'WSJF showed us the 3-day fix for payment errors should come before the 6-week reporting feature, even though reporting was louder' },
  { id: 'stackRanking', term: 'Stack ranking', meaning: 'Ordering all items in an absolute 1-to-N list; forces real prioritisation because nothing can be tied', everyday: 'If you have 10 items and ask which is #1, you get alignment. Stack ranking kills "everything is equal" planning', interview: 'I stack-rank the backlog quarterly with stakeholders in the room — it surfaces the actual disagreements before they become sprint conflicts' },
  { id: 'opportunityScoring', term: 'Opportunity scoring', meaning: 'Kano/JTBD-based: users rate how important a job is and how satisfied they are with current solutions; large importance/low satisfaction = opportunity', everyday: 'If users say "instant payment confirmation" is very important but very unsatisfied with today, that\'s a prioritised opportunity', interview: 'Opportunity scoring from 30 user interviews pointed us to trust and speed — not the feature requests we had been debating internally' },
  { id: 'mlp', term: 'MLP (Minimum Lovable Product)', meaning: 'A refinement of MVP: not just viable, but designed so users actually enjoy it', everyday: 'Users will tolerate a viable product once; they come back for a lovable one', interview: 'We shipped an MVP to validate the concept, then spent one more sprint making it lovable — the difference showed up in D7 retention' }
],

// Day 13 — Strategy (terms 61–65)
[
  { id: 'productVision', term: 'Product vision', meaning: 'A concise, inspiring description of what the product will become in 3–5 years', everyday: 'Amazon\'s early vision: "every book, ever printed, in any language, available in 60 seconds"', interview: 'The product vision anchors the team when every stakeholder pulls in a different direction — it\'s the tie-breaker' },
  { id: 'productStrategy', term: 'Product strategy', meaning: 'The set of choices about where to play and how to win, connecting the vision to the roadmap', everyday: 'Strategy is not a plan — it\'s a set of bets about which users, problems, and solutions will create durable value', interview: 'We set a strategy to own the small-business segment before expanding to enterprise — focus made our limited resources count' },
  { id: 'goToMarket', term: 'Go-to-market (GTM)', meaning: 'The plan for how a product reaches its target customers: channels, messaging, pricing, launch sequence', everyday: 'GTM for the new payment API: target fintech startups first, offer a free tier, convert at scale', interview: 'I owned the GTM for the AI document pipeline — we chose a bottom-up developer GTM, not a top-down enterprise sales motion' },
  { id: 'tam', term: 'TAM (Total Addressable Market)', meaning: 'The maximum total revenue opportunity if you captured 100% of a market', everyday: 'The global digital payments TAM is $10 trillion — but your realistic SAM is a fraction of that', interview: 'I frame TAM to show the ceiling, then immediately discuss SAM and SOM to show the realistic near-term opportunity' },
  { id: 'marketSegmentation', term: 'Market segmentation', meaning: 'Dividing a market into groups with similar characteristics, so you can focus on the most attractive segment first', everyday: 'Segment by company size: micro (1–10 employees), SMB (10–250), mid-market (250–2,000), enterprise (2,000+)', interview: 'We segmented by payment volume and found 20% of our users generated 80% of our revenue — the SMB segment' }
],

// Day 14 — Strategy (terms 66–70)
[
  { id: 'competitiveMoat', term: 'Competitive moat', meaning: 'A durable advantage that makes it hard for competitors to displace you', everyday: 'Network effects are a moat — the more users on a payment platform, the more valuable it becomes to each user', interview: 'Our moat was proprietary reconciliation data — once a customer\'s finance team built workflows around our exports, switching cost was very high' },
  { id: 'networkEffects', term: 'Network effects', meaning: 'The phenomenon where a product becomes more valuable as more people use it', everyday: 'WhatsApp\'s value is that everyone you need to reach is already on it — that\'s a network effect', interview: 'We designed the invoice feature with network effects: senders invite recipients, recipients become senders — the loop compounds' },
  { id: 'platformStrategy', term: 'Platform strategy', meaning: 'Building a product that enables third parties to create additional value on top of it', everyday: 'Shopify is a platform — merchants build stores, developers build apps, payment providers integrate. Shopify captures value from the whole ecosystem', interview: 'Our API-first approach was a deliberate platform strategy: we built the rails, then let partners build the user-facing applications' },
  { id: 'productMarketFit', term: 'Product-market fit (PMF)', meaning: 'The state where a product satisfies a strong market demand; users use it, love it, and would miss it', everyday: 'Sean Ellis test: "How would you feel if this product disappeared?" If 40%+ say "very disappointed", you have PMF', interview: 'We hadn\'t hit PMF until we saw organic referrals outpacing paid acquisition — users were selling it for us' },
  { id: 'positioning', term: 'Positioning', meaning: 'How you want your product perceived in the customer\'s mind relative to alternatives', everyday: 'Positioning statement: "For small businesses that invoice internationally, [Product] is the only payment tool that settles in 24 hours without hidden FX fees"', interview: 'We repositioned from "payment platform" to "working capital tool" — same product, different story, different buyer' }
],

// Day 15 — Strategy (terms 71–75)
[
  { id: 'differentiation', term: 'Differentiation', meaning: 'The specific ways your product is meaningfully different from alternatives in ways that matter to your target user', everyday: 'Same as the competitor but 2× faster and half the price — that\'s differentiation if speed and price are what users care about', interview: 'Our differentiation was not features — it was time-to-first-payment: 4 minutes versus 2 days for the incumbent' },
  { id: 'valueProposition', term: 'Value proposition', meaning: 'The specific benefits a user gets from your product and why they should choose you over alternatives', everyday: 'In one sentence: "[Product] helps [user] achieve [outcome] by [mechanism], unlike [alternative] which [falls short]"', interview: 'I write a value proposition before writing a spec — if I can\'t say why a user would choose this over what they do today, we\'re not ready to build' },
  { id: 'businessModel', term: 'Business model', meaning: 'How the product makes money: the mechanism for capturing value from the value it creates', everyday: 'Freemium model: free tier acquires users, paid tier converts the most engaged. Marketplace model: take a cut of every transaction', interview: 'We chose a transaction-fee model over a subscription because it aligned our revenue with our users\' success — we only earn when they do' },
  { id: 'landAndExpand', term: 'Land-and-expand', meaning: 'A sales/product motion where you win a customer with a narrow use case, then expand usage over time', everyday: 'Land with expense management, expand to payroll, then treasury — same customer, growing contract value', interview: 'Our land-and-expand motion started with API access; once engineering teams adopted it, we upsold the analytics dashboard to their finance teams' },
  { id: 'strategicBet', term: 'Strategic bet', meaning: 'A major resource commitment under uncertainty, based on a thesis about where the market is going', everyday: 'Betting on voice payments in 2018 was a strategic bet — most companies passed; a few are now ahead', interview: 'Moving to AI-generated document parsing was a strategic bet; we had 60% confidence and 18 months of runway to find out if we were right' }
],

// Day 16 — Strategy (terms 76–80)
[
  { id: 'ecosystem', term: 'Ecosystem', meaning: 'The network of partners, developers, customers, and complementary products that make your platform more valuable', everyday: 'iOS is not just an OS — the App Store, developers, and accessory makers are the ecosystem', interview: 'We designed for ecosystem from day one: open APIs, webhooks, and an app marketplace so partners could build on our rails' },
  { id: 'blueOcean', term: 'Blue ocean strategy', meaning: 'Competing in uncontested market space rather than fighting for share in an existing market', everyday: 'Instead of competing for the enterprise expense-management market, we targeted freelancers — nobody else was', interview: 'We applied blue ocean thinking: instead of building a better bank, we built a tool banks don\'t want to build — real-time payment reconciliation for finance teams' },
  { id: 'pricingStrategy', term: 'Pricing strategy', meaning: 'The approach to setting, communicating, and adjusting prices to maximise revenue and market share', everyday: 'Value-based pricing: charge based on the value you deliver, not the cost to build. Per-seat pricing vs per-use vs flat subscription', interview: 'We moved from per-seat to usage-based pricing and ARPU grew 40% because enterprise customers who used us heavily started paying proportionally' },
  { id: 'horizontalVsVertical', term: 'Horizontal vs vertical product', meaning: 'Horizontal: broad, works for many industries. Vertical: deep, purpose-built for one industry', everyday: 'Salesforce is horizontal CRM. Veeva is vertical CRM for pharma — same core, different depth', interview: 'We chose to go vertical in fintech rather than build a horizontal payment API — the domain depth was our moat against Stripe' },
  { id: 'competitiveMoat2', term: 'Competitive moat (second application)', meaning: 'Covered in term 66; in this lesson focus on types: switching costs, data network effects, brand, regulatory', everyday: 'Switching cost moat: once your accounting team is trained on our reports, switching costs 3 months of re-training', interview: 'Our moat is data — 2 years of a customer\'s transaction history makes our anomaly detection better for them than any new entrant could be' }
],

// Day 17 — Execution & Delivery (terms 81–85)
[
  { id: 'sprint', term: 'Sprint', meaning: 'A fixed time-box (typically 1–2 weeks) in which a team commits to delivering a defined scope of work', everyday: 'We run 2-week sprints; at the start of each sprint the team commits to a sprint goal, not a list of tasks', interview: 'The engineering delay meant we needed to descope; I ran a mid-sprint replanning with the team to protect the sprint goal' },
  { id: 'velocity', term: 'Velocity', meaning: 'The amount of work a team completes per sprint, measured in story points or similar units', everyday: 'Team velocity of 40 points/sprint lets you forecast: a 120-point epic takes about 3 sprints', interview: 'Velocity was dropping 10% per quarter; we identified tech debt as the root cause and negotiated a debt sprint' },
  { id: 'epic', term: 'Epic', meaning: 'A large body of work that spans multiple sprints and breaks down into individual user stories', everyday: 'Epic: "User can pay any vendor." Stories inside it: add payee, confirm payee, initiate payment, confirm receipt', interview: 'I group features into epics so stakeholders see the big-picture progress, not just individual tickets' },
  { id: 'definitionOfDone', term: 'Definition of done (DoD)', meaning: 'A shared checklist of criteria that must be true before a story is considered complete', everyday: 'DoD: code reviewed, automated tests passing, accessibility checked, product sign-off on staging', interview: 'Without a definition of done, "done" means "dev is done coding" — which is not the same as "ready to ship"' },
  { id: 'releasePlan', term: 'Release plan', meaning: 'A multi-sprint forecast of which features will be in which release, based on current velocity', everyday: 'Release plan: v1.2 in sprint 4 (payment confirmation), v1.3 in sprint 6 (receipt history), v2.0 in Q3', interview: 'I maintain a rolling 90-day release plan; it sets stakeholder expectations and flags risks 6 weeks before they become crises' }
],

// Day 18 — Execution & Delivery (terms 86–90)
[
  { id: 'rolloutStrategy', term: 'Rollout strategy', meaning: 'The plan for how a new feature reaches users: percentage rollout, beta group, geographic phasing', everyday: '1% → 10% → 50% → 100% rollout over 4 days, with automated rollback if error rate exceeds 0.5%', interview: 'We phased the rollout to 10% of users first; it caught a payment-processor timeout bug before it hit the whole user base' },
  { id: 'postLaunchReview', term: 'Post-launch review', meaning: 'A structured review of what happened after a release: metrics moved, what worked, what didn\'t', everyday: '24 hours after launch: conversion rate up 4 points. 7 days: D7 retention flat. 30 days: team retrospective on the process', interview: 'I run a post-launch review 2 weeks after every significant release; it\'s the data that informs the next sprint\'s priorities' },
  { id: 'sla', term: 'SLA (Service Level Agreement)', meaning: 'A commitment to a specific level of performance, usually with consequences if missed', everyday: 'SLA: 99.9% uptime, payment processing under 3 seconds, support response under 4 hours', interview: 'We set internal SLAs for payment latency; the engineering team got paged when p95 exceeded 3 seconds' },
  { id: 'escalationPath', term: 'Escalation path', meaning: 'A defined chain of people to contact when a problem exceeds a certain severity level', everyday: 'Severity 1: on-call engineer → engineering lead → VP Engineering, within 15 minutes of detection', interview: 'I documented the escalation path for payment failures before launch; when it happened at 2am, nobody had to figure out who to call' },
  { id: 'crossFunctionalTeam', term: 'Cross-functional team', meaning: 'A team with all the skills needed to design, build, and ship a product without depending on external teams', everyday: 'A cross-functional squad: PM, 2 engineers, 1 designer, 1 data analyst — they own the full problem', interview: 'Moving to a cross-functional model cut our cycle time by 40%; no more handing off between siloed teams' }
],

// Day 19 — Execution & Delivery (terms 91–95)
[
  { id: 'raciMatrix', term: 'RACI matrix', meaning: 'Responsibility assignment: who is Responsible, Accountable, Consulted, Informed for each decision', everyday: 'Payment security decision: Security is Responsible, VP Product is Accountable, Legal is Consulted, Engineering is Informed', interview: 'RACI is worth 30 minutes at the start of any project — it surfaces the ownership gaps before they become blockers' },
  { id: 'milestone', term: 'Milestone', meaning: 'A significant checkpoint in a project, usually tied to a deliverable or decision point', everyday: 'Milestone 1: backend API live. Milestone 2: beta with 10 users. Milestone 3: public launch', interview: 'I set milestones at points where we\'d learn something important — not just dates on a calendar' },
  { id: 'criticalPath', term: 'Critical path', meaning: 'The sequence of dependent tasks that determines the minimum time to complete a project', everyday: 'If backend takes 3 weeks and frontend takes 2 weeks but frontend depends on backend, the critical path is 3 weeks', interview: 'I always identify the critical path early; delays on non-critical tasks don\'t matter, delays on critical-path tasks push the launch' },
  { id: 'riskRegister', term: 'Risk register', meaning: 'A living document of identified risks, their probability, their impact, and the mitigation plan', everyday: 'Risk: payment processor goes down. Probability: low. Impact: critical. Mitigation: secondary processor integration', interview: 'I keep a risk register for every launch; it forces the team to think about what could go wrong before it does' },
  { id: 'retrospective', term: 'Retrospective', meaning: 'A team meeting after a sprint or project to reflect on what went well, what didn\'t, and what to change', everyday: 'Three questions: what should we start doing, stop doing, keep doing?', interview: 'Retrospectives revealed we were losing 2 days per sprint to unclear acceptance criteria — we fixed that one process change' }
],

// Day 20 — Execution & Delivery (terms 96–100)
[
  { id: 'shipAndIterate', term: 'Ship-and-iterate', meaning: 'The practice of shipping a good-enough version and improving based on real usage data', everyday: 'Better to ship 70% perfect and learn than to ship 100% perfect 3 months later', interview: 'We shipped the payment confirmation redesign to 10% of users, measured, iterated twice, then rolled out — the final version was better than what we\'d have designed in isolation' },
  { id: 'launchChecklist', term: 'Launch checklist', meaning: 'A pre-launch verification list covering technical, operational, and communication readiness', everyday: 'Launch checklist: monitoring set up, rollback plan documented, support team briefed, comms scheduled, feature flag configured', interview: 'We didn\'t launch until every item on the launch checklist was green — it saved us from two "almost ready" launches' },
  { id: 'incidentManagement', term: 'Incident management', meaning: 'The process for detecting, responding to, communicating about, and learning from production outages', everyday: 'Incident: payment processing down. Steps: detect → page on-call → triage → fix → communicate → post-mortem', interview: 'I ran the incident communications during the payment outage — keeping users and stakeholders informed reduced the trust damage significantly' },
  { id: 'blockers', term: 'Blockers', meaning: 'Things that prevent a team member or team from progressing on their work', everyday: 'Blocker: waiting for the legal team to approve the privacy policy update — sprint goal is at risk', interview: 'I have a daily check: "What\'s your biggest blocker?" If I can clear it, I do; if not, I escalate the same day' },
  { id: 'techDebt2', term: 'Tech debt (execution impact)', meaning: 'Every shortcut in the codebase is a future sprint\'s tax — tech debt compounds when left unmanaged', everyday: 'Every shortcut in the codebase is a future sprint\'s tax — tech debt compounds', interview: 'We tracked tech debt as a metric: each quarter it was costing us 15% of capacity. That number got it on the roadmap' }
],

// Day 21 — Stakeholder & Communication (terms 101–105)
[
  { id: 'executiveAlignment', term: 'Executive alignment', meaning: 'Getting senior leaders to agree on the problem, the approach, and the resources before you start', everyday: 'Alignment means the VP of Product and VP of Engineering have the same understanding of what "done" looks like', interview: 'I didn\'t start the sprint until I had executive alignment on the success metric — it prevented a rewrite three weeks later' },
  { id: 'stakeholderMap', term: 'Stakeholder map', meaning: 'A visual or list showing every person or group affected by or influencing a product decision', everyday: 'Stakeholder map for the payment redesign: users (impacted), engineering (builds it), finance (owns the numbers), legal (approves it), support (fields complaints)', interview: 'I build a stakeholder map at the start of every major initiative — it shows me who to involve, in what order, and what they each care about' },
  { id: 'influenceWithoutAuthority', term: 'Influence without authority', meaning: 'Getting people to act on your recommendations when you don\'t have direct control over them', everyday: 'PMs rarely manage engineers — they lead through shared goals, data, and relationships, not org-chart power', interview: 'I influenced the platform team\'s roadmap by showing them data on how their latency was driving our churn — they reprioritised within a week' },
  { id: 'buyIn', term: 'Buy-in', meaning: 'Active support — not just passive agreement — from a stakeholder or team', everyday: 'Buy-in is not "they said OK in the meeting." It\'s "they actively helped remove the blockers"', interview: 'I got buy-in from the finance team by showing them the cost of the problem, not just the vision for the solution' },
  { id: 'businessCase', term: 'Business case', meaning: 'A structured argument for why an initiative is worth the investment, including problem, options, recommendation, and financial impact', everyday: 'Business case format: problem → options considered → recommendation → expected return → risks', interview: 'I wrote a one-page business case for the AI document pipeline; the financial impact section is what got the headcount approved' }
],

// Day 22 — Stakeholder & Communication (terms 106–110)
[
  { id: 'bluf', term: 'BLUF (Bottom Line Up Front)', meaning: 'A communication structure where the conclusion or recommendation comes first, then the supporting detail', everyday: 'BLUF: "I recommend we delay the launch by 2 weeks. Here\'s why: the payment error rate is 3× our threshold"', interview: 'BLUF is my default for executive communication — they read the first two sentences; if the recommendation is buried on page 3, it won\'t land' },
  { id: 'dataStorytelling', term: 'Data storytelling', meaning: 'Using data to build a narrative that leads a listener to a conclusion', everyday: 'Don\'t say "conversion is 59%." Say "one in three users who starts checkout leaves before paying — and it\'s getting worse"', interview: 'I frame every data point in a customer story: "this 13% drop represents 4,200 users a week who wanted to pay and couldn\'t"' },
  { id: 'roadmapCommunication', term: 'Roadmap communication', meaning: 'The practice of presenting the product roadmap to different audiences in a form appropriate to each', everyday: 'Engineering roadmap: specific features and timelines. Executive roadmap: themes and outcomes. Customer roadmap: commitments and "coming soon"', interview: 'I maintain one internal roadmap and three different views of it — same content, different altitude for each audience' },
  { id: 'pushBack', term: 'Push-back', meaning: 'A stakeholder\'s objection to or disagreement with a recommendation', everyday: 'Push-back: "I think we should build the reporting feature first." Response: "Let me show you the data on where users are dropping off"', interview: 'I welcome push-back in the planning meeting — it\'s cheaper to surface disagreements there than mid-sprint' },
  { id: 'tradeOffCommunication', term: 'Trade-off communication', meaning: 'Explicitly naming what you\'re giving up in order to get what you\'re prioritising', everyday: 'Trade-off: "If we ship in 3 weeks, we can\'t do the PDF export. If we want PDF export, we ship in 5. Which matters more for this launch?"', interview: 'I never ask stakeholders to approve scope without naming the trade-off — it makes the choice real and prevents "why didn\'t you tell me?" later' }
],

// Day 23 — Stakeholder & Communication (terms 111–115)
[
  { id: 'daci', term: 'DACI', meaning: 'Decision-making framework: Driver (owns the process), Approver (has final say), Contributors (provide input), Informed (notified of outcome)', everyday: 'Payment pricing change: Finance is Driver, CEO is Approver, PM and Engineering are Contributors, Sales is Informed', interview: 'DACI cut our decision time from 2 weeks to 2 days — everyone knew who had final say' },
  { id: 'statusUpdate', term: 'Status update', meaning: 'A brief communication of what\'s on track, what\'s at risk, and what\'s been decided — not a progress report', everyday: 'Status update: "On track for May launch. Payment integration at risk — partner API delay. Mitigating with backup provider"', interview: 'I write status updates as "green/amber/red" on three dimensions: scope, timeline, quality. It takes 5 minutes; it saves 30-minute catch-up calls' },
  { id: 'recommendationFraming', term: 'Recommendation framing', meaning: 'Structuring a proposal as: situation → complication → recommendation → evidence → ask', everyday: 'Situation: conversion is at 59%. Complication: it\'s been declining for 3 weeks. Recommendation: prioritise the latency fix this sprint.', interview: 'I use recommendation framing for every decision I bring to leadership — it respects their time and makes the ask clear' },
  { id: 'townHallUpdate', term: 'Town hall update', meaning: 'A periodic all-hands communication of product direction, progress, and decisions', everyday: 'Town hall: 15 minutes of product update — what shipped, what\'s next, one metric that moved, one decision made', interview: 'I prep for town halls by translating engineering milestones into user outcomes — the company needs to understand what customers got, not what code was written' },
  { id: 'demoVsPresentation', term: 'Demo vs presentation', meaning: 'Demo: show the working product. Presentation: show slides about the product. Know when each is right', everyday: 'Executive demo at the end of a sprint builds more trust than a slide deck. A stakeholder who can\'t be there needs a recording, not a live demo', interview: 'I run demos, not presentations, for the internal team — seeing the product makes feedback concrete; slides make feedback abstract' }
],

// Day 24 — Growth (terms 116–120)
[
  { id: 'aarrr', term: 'AARRR (Pirate Metrics)', meaning: 'Acquisition → Activation → Retention → Referral → Revenue; a framework for mapping a growth funnel', everyday: 'Every growth problem maps to one of these five stages — diagnose which one is leaking first', interview: 'We mapped the payment product through AARRR: acquisition was strong, activation was the leak — we focused there' },
  { id: 'growthLoop', term: 'Growth loop', meaning: 'A self-reinforcing cycle where product usage drives more usage', everyday: 'Invoice sender invites recipient → recipient signs up to pay → recipient becomes a sender → they invite their customers. Loop', interview: 'We redesigned the invoice feature as a growth loop — each payment created a potential new user at no acquisition cost' },
  { id: 'viralCoefficient', term: 'Viral coefficient', meaning: 'The number of new users each existing user brings in; above 1.0 means exponential growth', everyday: 'If each user refers 1.2 new users who convert, viral coefficient = 1.2 — the product grows without paid acquisition', interview: 'Our viral coefficient was 0.4 — not viral, but enough to offset 40% of our CAC with organic growth' },
  { id: 'activation', term: 'Activation', meaning: 'The moment a new user first experiences the core value of the product', everyday: 'Activation for a payment app: first successful payment sent. Everything before this is onboarding; everything after is retention', interview: 'We ran 6 activation experiments in one quarter and moved activation from 35% to 61% — the biggest lever we\'d ever found' },
  { id: 'ahaMoment', term: 'Aha moment', meaning: 'The specific point in the user journey when users first understand why the product is valuable', everyday: 'Slack\'s aha moment: when a team sends 2,000 messages. At that point, search becomes indispensable and they don\'t leave', interview: 'We identified our aha moment: users who linked their bank account in onboarding retained at 2× the rate of those who didn\'t' }
],

// Day 25 — Growth (terms 121–125)
[
  { id: 'onboardingFlow', term: 'Onboarding flow', meaning: 'The sequence of steps that takes a new user from sign-up to their first successful action', everyday: 'Good onboarding ends at the aha moment, not at account creation. Account creation is not value; first payment is', interview: 'We rebuilt onboarding around a single goal: get users to send their first payment in under 4 minutes' },
  { id: 'churnIntervention', term: 'Churn intervention', meaning: 'A proactive action triggered when a user shows signs of leaving, designed to bring them back', everyday: 'If a user hasn\'t logged in for 7 days (unusual for them), trigger a re-engagement email with their last activity', interview: 'We set up churn interventions at D7 inactivity: a personalised email showing what they\'d missed. It recovered 12% of at-risk users' },
  { id: 'funnelOptimisation', term: 'Funnel optimisation', meaning: 'Systematically improving conversion at each step of a multi-step user flow', everyday: 'Funnel: 100 start → 90 enter details → 80 confirm → 72 complete. Optimise step 3 (confirm) first — biggest drop', interview: 'Funnel optimisation was our entire Q2 focus. We fixed the three biggest drop points and grew conversion 14 points' },
  { id: 'featureAdoption', term: 'Feature adoption', meaning: 'The percentage of active users who use a specific feature in a given period', everyday: '90% of users log in monthly, but only 15% use the receipt export — low adoption despite high traffic', interview: 'We tracked feature adoption monthly; anything below 10% after 90 days went on the deprecation list unless a clear segment loved it' },
  { id: 'referral', term: 'Referral', meaning: 'A mechanism by which existing users bring new users to the product, usually with an incentive', everyday: 'Refer a friend, both get ₹100 credit. Classic referral loop', interview: 'Our referral programme had a K-factor of 0.4; it wasn\'t viral, but it accounted for 25% of new user acquisition at zero marginal cost' }
],

// Day 26 — Growth (terms 126–130)
[
  { id: 'paidVsOrganicGrowth', term: 'Paid vs organic growth', meaning: 'Paid: users acquired through advertising spend. Organic: users who find you through word-of-mouth, SEO, or referral', everyday: 'If 70% of your users come from paid ads and you stop spending, you lose 70% of growth — that\'s a fragile model', interview: 'We were 80% paid when I joined. I shifted the mix to 50% organic over 18 months by investing in referral and content — CAC dropped 40%' },
  { id: 'engagementMetric', term: 'Engagement metric', meaning: 'A measure of how actively users interact with the product (session frequency, session length, actions per session)', everyday: 'DAU/MAU is an engagement metric. So is "payments initiated per active user per week"', interview: 'Our primary engagement metric was payments per active user per month — it captured both frequency and product depth' },
  { id: 'acquisition', term: 'Acquisition', meaning: 'Bringing new users to the product through any channel: paid, organic, referral, partnership', everyday: 'Acquisition channels: Google Ads, App Store search, referral programme, fintech partnerships, content marketing', interview: 'We prioritised acquisition channels by CAC and quality: referral had the lowest CAC and highest D30 retention by far' },
  { id: 'retention', term: 'Retention', meaning: 'The ongoing behaviour of users returning to the product after their first use', everyday: 'Retention is the most important growth lever. Acquiring users into a leaky bucket is expensive. Fix the bucket first', interview: 'We spent 2 quarters on retention before touching acquisition. D30 retention went from 22% to 41%. ARPU grew without adding new users' },
  { id: 'seoAso', term: 'SEO/ASO', meaning: 'Search Engine Optimisation / App Store Optimisation; improving visibility in search results to drive organic acquisition', everyday: 'ASO: optimise the app store listing title, description, and screenshots so users searching "send money" find you', interview: 'ASO improvements to our payment app listing tripled organic installs in 60 days at zero cost' }
],

// Day 27 — AI & Tech PM (terms 131–135)
[
  { id: 'llm', term: 'Large Language Model (LLM)', meaning: 'A type of AI trained on vast text data to understand and generate human language', everyday: 'GPT, Claude, and Llama are LLMs — they predict the next token given context, at scale', interview: 'We used an LLM to extract key fields from invoice PDFs — it replaced a brittle rule-based parser that broke on every new format' },
  { id: 'rag', term: 'RAG (Retrieval-Augmented Generation)', meaning: 'A technique where the model\'s response is grounded in documents retrieved at query time, reducing hallucination', everyday: 'Instead of asking the LLM to remember your company\'s refund policy, you retrieve the policy doc and include it in the prompt', interview: 'We used RAG for the customer support bot — it answered from our help centre, not from the model\'s training data, so answers were accurate and auditable' },
  { id: 'hallucination', term: 'Hallucination', meaning: 'When an LLM generates confident-sounding but factually incorrect output', everyday: 'The model said our refund policy allows 60 days. It doesn\'t. That\'s a hallucination — plausible but wrong', interview: 'Hallucination was the biggest trust risk in our AI document pipeline; we mitigated it with human-in-the-loop review for high-value extractions' },
  { id: 'latency', term: 'Latency', meaning: 'The time between a request and a response; in AI, the time from sending a prompt to receiving the first token', everyday: 'LLM latency is typically 1–5 seconds for a standard response; streaming reduces perceived latency', interview: 'We set a 3-second latency SLA for AI responses; exceeding it dropped user satisfaction scores by 30 points in our testing' },
  { id: 'apiProductContext', term: 'API (product context)', meaning: 'A defined interface that lets software systems communicate; for AI PMs, the boundary between your product and an AI service', everyday: 'We call the payment processor\'s API to initiate a transaction. We call the LLM API to generate a summary', interview: 'I spec\'d the API contract between our product and the AI service before engineering built either side — it let both teams work in parallel' }
],

// Day 28 — AI & Tech PM (terms 136–140)
[
  { id: 'modelEvaluation', term: 'Model evaluation', meaning: 'The systematic process of testing an AI model\'s outputs for quality, accuracy, safety, and alignment with requirements', everyday: 'Evaluation: we sent 500 real invoices through the extraction model and manually checked the output. Precision: 94%. Recall: 91%', interview: 'We set up an evaluation pipeline before shipping the AI feature — without it, we\'d have shipped 94% precision thinking it was 100%' },
  { id: 'aiGuardrails', term: 'AI guardrails', meaning: 'Rules or filters that prevent an AI system from producing harmful, off-topic, or incorrect outputs', everyday: 'Guardrail: if the model\'s confidence on an extraction is below 80%, flag for human review instead of auto-processing', interview: 'We built confidence-score guardrails into the document pipeline; anything below threshold went to a human reviewer — it reduced our error rate from 8% to 1.2%' },
  { id: 'responsibleAi', term: 'Responsible AI', meaning: 'The practice of designing AI systems that are fair, transparent, accountable, and safe', everyday: 'Responsible AI: who is harmed if the model is wrong? Can users contest the output? Is there a human override?', interview: 'Before launching the AI credit-decisioning feature, we ran a fairness audit across demographic segments — a step I\'d mandate on any AI product that affects access to financial services' },
  { id: 'dataPipeline', term: 'Data pipeline', meaning: 'The infrastructure that moves, transforms, and stores data from source to destination for use in a product or model', everyday: 'Data pipeline: payment events → Kafka → data warehouse → feature store → model → prediction → product', interview: 'The AI feature depended on a real-time data pipeline that didn\'t exist; I scoped that as a prerequisite in the roadmap' },
  { id: 'fineTuning', term: 'Fine-tuning', meaning: 'Additional training of a pre-trained model on domain-specific data to improve performance on a specific task', everyday: 'We fine-tuned an open-source LLM on 10,000 labelled invoice extraction examples — accuracy improved from 87% to 96%', interview: 'Fine-tuning was not in scope for v1; we used a foundation model with a good prompt. Fine-tuning is a phase-2 consideration if the accuracy target isn\'t met' }
],

// Day 29 — AI & Tech PM (terms 141–145)
[
  { id: 'inference', term: 'Inference', meaning: 'The act of running a trained AI model on new input to generate output; this is what happens in production', everyday: 'Every time a user submits a document, the model runs inference — that\'s the latency and compute cost you pay', interview: 'Inference cost was $0.02 per document; at 10,000 documents/day, that\'s $200/day — a line item I put in the business case' },
  { id: 'systemPrompt', term: 'System prompt', meaning: 'The instructions given to an LLM at the start of a conversation to define its role, constraints, and behaviour', everyday: 'System prompt: "You are a PM interview coach. Only answer questions about PM interviews. Do not discuss other topics."', interview: 'We used a detailed system prompt to constrain the AI coach persona — without it, the model would happily discuss recipes' },
  { id: 'promptEngineering', term: 'Prompt engineering', meaning: 'The craft of designing input text (prompts) that reliably produce high-quality, correctly-formatted AI output', everyday: 'Prompt engineering: "Extract the invoice total. Output JSON: {amount: number, currency: string}. If not found, return {amount: null}"', interview: 'Prompt engineering was a core skill in our AI product work — we iterated the extraction prompt 12 times before it hit our accuracy threshold' },
  { id: 'edgeCase', term: 'Edge case', meaning: 'An input or scenario that falls outside the normal range, often causing unexpected AI behaviour', everyday: 'Edge case for invoice extraction: a handwritten invoice, a table in an image, an invoice in a language the model wasn\'t trained on', interview: 'We built our edge-case test set from real data failures — every incident became a test case. The model\'s performance on edge cases improved every sprint' },
  { id: 'humanInTheLoop', term: 'Human-in-the-loop', meaning: 'A system design where humans review or approve AI decisions above a certain risk threshold', everyday: 'Human-in-the-loop: for payments above ₹1 lakh, the AI flags the transaction and a compliance officer approves', interview: 'Human-in-the-loop was our answer to the hallucination risk — we were transparent with customers that high-value extractions had a human review step' }
],

// Day 30 — AI & Tech PM (terms 146–150)
[
  { id: 'modelDrift', term: 'Model drift', meaning: 'The gradual degradation of a model\'s performance over time as the real-world data it encounters changes', everyday: 'An invoice extraction model trained on 2022 data starts failing on 2024 invoice formats — that\'s drift', interview: 'We set up a drift detection dashboard: if extraction accuracy dropped more than 2 points in a week, it triggered a re-evaluation sprint' },
  { id: 'token', term: 'Token', meaning: 'The unit of text an LLM processes; roughly 4 characters or 0.75 words in English', everyday: 'A 1,000-word document is roughly 1,300 tokens. LLM pricing is typically per 1,000 input + output tokens', interview: 'Token count drove our cost model: shorter prompts, same accuracy — that was an engineering optimisation worth a sprint' },
  { id: 'aiProductSpec', term: 'AI product spec', meaning: 'A product requirements document adapted for AI features, including data requirements, evaluation criteria, and fallback behaviour', everyday: 'AI spec includes: input format, expected output, accuracy target, latency SLA, fallback if confidence < threshold, evaluation dataset', interview: 'An AI spec without an accuracy target and a fallback behaviour is not a spec — you\'re asking engineering to build something with no definition of done' },
  { id: 'aiEvaluationMetric', term: 'AI evaluation metric', meaning: 'The specific measure used to judge an AI feature\'s quality: precision, recall, F1, BLEU, human preference score', everyday: 'For classification: precision (of what we flagged, how many were right?) and recall (of all the real cases, how many did we catch?)', interview: 'We chose recall over precision for fraud detection — better to flag a legitimate payment for review than to miss a fraud. The metric choice shaped the whole model' },
  { id: 'opportunityCostAi', term: 'Opportunity cost (AI context)', meaning: 'Building AI features has a high opportunity cost: data infrastructure, evaluation, maintenance, and risk — weigh against simpler alternatives', everyday: 'Before using an LLM for search, ask: would Elasticsearch with good ranking cover 80% of the cases at 10% of the cost?', interview: 'I always ask: "What\'s the non-AI version of this?" If the non-AI version covers 90% of the value at 20% of the complexity, we build that first' }
]

]; // end VOCAB

// DAYS[30] — extracted verbatim from index.html: [theme, focus, prompt]
const DAYS = [
['Foundation','Explain a familiar topic in your own words','What makes a product successful?'],
['Foundation','Recall three things you learned yesterday','What is the difference between output and outcome?'],
['Foundation','Explain a concept to a beginner','Why is customer retention important?'],
['Foundation','Summarise a short reading without notes','How do you measure customer satisfaction?'],
['Foundation','Describe a recent decision and its reasoning','What makes a good product metric?'],
['Foundation','Speak for 90 seconds without stopping','How would you improve a checkout experience?'],
['Review','Review your three biggest communication gaps','What did you learn this week?'],
['Projects','Explain a project you personally worked on','What was the original problem?'],
['Projects','Recall project decisions without looking at documents','What alternatives did you consider?'],
['Projects','Explain a measurable business outcome','How did you measure success?'],
['Projects','Defend a difficult product decision','Why did you choose this solution?'],
['Projects','Explain one failure and what changed','What would you do differently?'],
['Projects','Give a two-minute project walkthrough','How did you influence stakeholders?'],
['Review','Review your strongest project stories','Which story demonstrates your best product thinking?'],
['Thinking','Analyse a business problem independently','Payment completion falls from 72% to 59%. Diagnose it.'],
['Thinking','Identify assumptions and missing information','A new feature has low adoption. What would you investigate?'],
['Thinking','Prioritise competing opportunities','You have three features and limited engineering capacity. Decide.'],
['Thinking','Explain a trade-off','Would you prioritise growth or retention?'],
['Thinking','Propose an experiment','How would you test a new onboarding flow?'],
['Thinking','Think aloud while solving a problem','A product has high sign-ups but low activation. Why?'],
['Review','Review your hardest problem-solving exercise','What assumption did you change?'],
['Interview','Answer a behavioural question using a real example','Tell me about a time you disagreed with a stakeholder.'],
['Interview','Answer a product strategy question','How would you build a strategy for a new fintech product?'],
['Interview','Answer a metrics question','Payment conversion dropped by 15%. What would you do?'],
['Interview','Answer a prioritisation question','How would you prioritise a roadmap?'],
['Interview','Answer an execution question','Engineering says a launch will be delayed. How do you respond?'],
['Interview','Complete a 10-minute mock interview','Walk me through your most impactful project.'],
['Review','Review your weakest interview responses','What question made you freeze?'],
['Simulation','Conduct a stakeholder update','Explain a product recommendation in three minutes.'],
['Simulation','Final interview simulation','Why should we hire you as a Product Manager?']
];

// QUESTIONS[9] — extracted verbatim from index.html
const QUESTIONS = [
'Why should a company invest in customer retention?',
'Explain a project you are proud of.',
'What would you do if your manager disagreed with your recommendation?',
'How would you improve a fintech payment experience?',
'Explain why a product feature failed.',
'What makes you a good Product Manager?',
'How would you convince a stakeholder to change priorities?',
'Explain a technical concept to a non-technical person.',
'What would you do if you did not know the answer to a stakeholder question?'
];

// CASES[4] — extracted verbatim from index.html: [title, scenario, reasoning]
const CASES = [
['Payment conversion is falling','A fintech product sees payment completion fall from 72% to 59% over two weeks. Diagnose the problem before proposing solutions.','Segment by platform, payment method, user cohort and funnel step. Check technical failures, latency, UX changes and external payment-provider issues. Validate the cause before changing the product.'],
['Low feature adoption','A new rewards feature has 100,000 eligible users but only 8% use it. Diagnose the problem.','Check awareness, discoverability, eligibility, value proposition, onboarding, usability and repeat engagement. Interview users and analyse behaviour.'],
['Prioritisation conflict','Engineering wants reliability improvements, Sales wants three features and leadership wants growth. Capacity allows one initiative. Decide.','Assess customer impact, strategic fit, revenue, risk, effort and dependencies. Make assumptions explicit and align stakeholders on a decision framework.'],
['Poor onboarding','Only 35% of new users complete onboarding. What would you investigate?','Map each step, identify abandonment points, segment cohorts, inspect friction and test improvements. Track completion and downstream activation.']
];

// INTERVIEW[8] — extracted verbatim from index.html: [category, question]
const INTERVIEW = [
['Product sense','How would you improve a digital payments app?'],
['Metrics','Payment conversion dropped by 15% overnight. How would you investigate?'],
['Strategy','How would you create a product strategy for a new fintech product?'],
['Prioritisation','How do you prioritise features when every stakeholder says their request is urgent?'],
['Execution','Tell me about a time you took a product from idea to launch.'],
['Leadership','Tell me about a time you disagreed with a senior stakeholder.'],
['Failure','Tell me about a product decision that did not work.'],
['Analytics','How would you measure the success of a new feature?']
];

// FOLLOWUPS — static follow-up probes mapped by interview category (Phase 2)
// Phase 3 replaces with AI-generated contextual follow-ups
const FOLLOWUPS = {
  'Product sense': 'What metric would tell you that worked?',
  'Metrics':       'What\'s the baseline, and how much movement signals success?',
  'Strategy':      'How would you bring the engineering team along on this?',
  'Prioritisation':'What\'s the opportunity cost of that choice?',
  'Execution':     'How would you communicate the delay to stakeholders?',
  'Leadership':    'What would you do differently with more authority?',
  'Failure':       'How did that change how you approach similar decisions now?',
  'Analytics':     'What leading indicator would you check first?'
};
