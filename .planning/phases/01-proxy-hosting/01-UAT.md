---
status: testing
phase: 01-proxy-hosting
source: [01-VERIFICATION.md]
started: 2026-11-09T17:01:46Z
updated: 2026-11-09T17:01:46Z
---

## Current Test

number: 1
name: Worker secrets restored after the root-directory deploy incident
expected: |
  recall-proxy → Settings → Variables and Secrets lists PASSCODE, NIM_KEY_*, GEMINI_KEY_* as Secrets.
  https://recallnow.pages.dev/bakeoff (Ctrl+F5) shows "Worker code: 2026-11-09 · clear auth errors ✓ up to date";
  Run connection diagnostics shows no "no_key" rows; bake-off with an empty model box scores ~2 / 8 / 2.
awaiting: user response

## Tests

### 1. Worker secrets restored after the root-directory deploy incident
expected: Live Worker no longer answers passcode_secret_missing; bake-off returns scores with the real keys.
result: [pending]

### 2. Browser never sends a key (DevTools, T19 in 01-VERIFICATION.md)
expected: On https://recallnow.pages.dev, DevTools → Network → the POST to recall-proxy has only Content-Type/Origin-type headers and a body with task + passcode; no Authorization header, no nvapi-/AIza value anywhere.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
