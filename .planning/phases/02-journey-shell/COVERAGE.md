# Plan 02-01 Coverage Declaration

## No External API Calls

Plan 02-01 (data, logic, and HTML shell) contains **zero external API calls**.

All deliverables are:
- `content.js` — static JS data arrays (VOCAB, DAYS, QUESTIONS, CASES, INTERVIEW, FOLLOWUPS)
- `logic.js` — pure functions (Leitner, streak, filler count, vocab check, migration, backup validation)
- `logic.test.mjs` — Node.js self-check test (uses only `node:assert` and `module`)
- `index.html` — static HTML/CSS shell refactor
- `app.js` — minimal stub with passcode modal and AI status bar (calls `CONFIG.workerUrl` for ping, but this is non-blocking and fails gracefully when Worker is offline)

## Verification

```bash
# No fetch() calls in content.js or logic.js
grep -c "fetch(" content.js    # → 0
grep -c "fetch(" logic.js      # → 0

# logic.test.mjs uses only node stdlib
node logic.test.mjs            # → logic self-check: all passed
```

## Phase 3 API Surface

External calls will be introduced in Phase 3 (AI Coach). That phase will route
all NIM API traffic through the Cloudflare Worker — never directly from the browser.
