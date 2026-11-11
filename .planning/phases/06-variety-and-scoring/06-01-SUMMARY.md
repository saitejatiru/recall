# Phase 6: Question Variety & 1-100 Scoring Summary

## Delivered Capabilities

1. **Consecutive Question No-Repeat & Smart Cycling (`LOGIC.selectByWeakSpotNoRepeat`)**
   - Root cause identified: `dayCase()` and `dayInterview()` previously called `selectByWeakSpot()`, which defaulted to `items[0]` whenever no prior tags existed or tag history was empty. On Day 2 without tags, Day 1's case (Case 0) and interview (Interview 0) repeated.
   - Solution implemented: Added `selectByWeakSpotNoRepeat(items, topTags, lastIdx)` in `logic.js`.
   - Respects weak spots when available, but explicitly skips the prior day's item (`i !== lastIdx`).
   - If no weak-spot match exists, it smoothly advances to `(lastIdx + 1) % items.length`, ensuring continuous variety across all cases, interview questions, and speak prompts.
   - `dayCase()`, `dayInterview()`, and `dayQuestion()` now read yesterday's index from storage and persist their chosen index.

2. **1-100 Performance Report Rating**
   - In `logic.js`, `computeDayReport()` calculates `averageScore` as an integer on a 1-100 scale (e.g. 7.5/10 $\rightarrow$ 75/100).
   - In `app.js`:
     - Report header displays score out of 100 with adjusted green/accent thresholds ($\ge 70$, $\ge 50$).
     - Step-by-step analyses in the report display individual step scores as `/100`.
     - Live AI coach feedback chips and inline badges render scores out of 100.
     - Clipboard export (`copy-report`) formats the summary score as `/100`.

## Verification
- `node logic.test.mjs`: all passed (including `selectByWeakSpotNoRepeat` non-repeat, tag matching, cycling wrap-around, and 1-100 scoring).
- `node worker/worker.test.mjs`: all passed.
- `node --check app.js`: passed cleanly with zero errors.
- Simulation in Node verified Days 1-6 cycle cleanly through distinct cases, interview questions, and speak prompts without duplicates.
