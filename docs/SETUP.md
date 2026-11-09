# RECALL — Setup Guide

Deploy the Cloudflare Worker proxy and GitHub Pages site. No code writing required. Follow these nine sections in order.

---

## 1. Prerequisites

Before you start, have these ready:

- **Cloudflare account (free)** — sign up at [cloudflare.com](https://cloudflare.com). No credit card required for the free tier.
- **NVIDIA NIM API keys (3 recommended)** — get free trial keys at [build.nvidia.com](https://build.nvidia.com). Each key starts with `nvapi-`. Sign in with your NVIDIA account.
- **GitHub repo** — `https://github.com/saitejatiru/recall` already exists. You need push access.

---

## 2. Create and Deploy the Cloudflare Worker

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. In the left sidebar, click **Workers & Pages** → **Create** → **Worker**.
3. Name the Worker `recall-proxy` → click **Deploy**.
4. On the Worker page that appears, click **Edit Code**.
5. Delete all placeholder code in the editor.
6. Open `worker/worker.js` from your local repo (or from GitHub) and copy its entire contents.
7. Paste the contents into the Cloudflare editor → click **Save and Deploy**.
8. At the top of the Worker page, note the Worker URL (e.g. `https://recall-proxy.username.workers.dev`). You will use this in Section 5.

---

## 3. Worker Secrets and Variables

After deploying, add your secrets and configuration values.

Go to your Worker → **Settings** → **Variables**.

### Encrypted Secrets (never stored as plain text)

Add each of these as a **Secret** (check "Encrypt" or use the "Add Secret" button):

| Secret name | Value | Notes |
|-------------|-------|-------|
| `NIM_KEY_1` | Your first NVIDIA NIM API key | Paste key, check Encrypt, Save |
| `NIM_KEY_2` | Your second NVIDIA NIM API key | Repeat |
| `NIM_KEY_3` | Your third NVIDIA NIM API key | Repeat |
| `NIM_KEY_4` | Your fourth key (optional) | Repeat if you have a fourth |
| `PASSCODE` | A passcode you choose (e.g. `recall-train-2026`) | Remember this — you will enter it in the app on first visit |

> **Warning:** Never put NVIDIA API keys in the Variables section (plain text). Always use the **Secrets** (encrypted) section. Keys in Variables are visible to anyone with dashboard access and may appear in logs.

### Plain-text Variables (not sensitive)

Add each of these as a **Variable** (plain text, no encryption needed):

| Variable name | Value | Purpose |
|---------------|-------|---------|
| `ALLOWED_ORIGIN` | `https://saitejatiru.github.io` | Only this origin can call the Worker |
| `MODELS` | `gemini-3.8-flash,nvidia/nemotron-3.5-super-vl-120b-a12b,gemini-3.5-flash-lite,nvidia/nemotron-3-super-120b-a12b` | AI models in priority order, comma-separated. Names starting with `gemini-` go to Google (uses `GEMINI_KEY_*`); all others go to NVIDIA (uses `NIM_KEY_*`). The Worker tries the 1st model, then the next. |

**Gemini keys (optional):** add them as **Secrets** named `GEMINI_KEY_1` … `GEMINI_KEY_10`. Note: Google applies rate limits **per Google Cloud project, not per key** — several keys from the same project share one limit. On Google's free tier, prompts and replies may be used to improve Google's products (your answers and resume excerpts are in those prompts); enabling billing changes that.
| `DAILY_CAP` | `300` | Maximum requests per day; adjust freely |

After adding all variables and secrets, click **Save and Deploy**.

**To change models or their order later:** Dashboard → Worker → Settings → Variables → edit `MODELS` → Save → Deploy. Zero code change required.

---

## 4. KV Namespace for Daily Rate Cap

The Worker uses a KV store to count daily requests. Set it up once:

1. In the Cloudflare Dashboard sidebar, click **Storage** → **KV** → **Create Namespace**.
2. Name it `recall-ratelimit` → click **Add**.
3. Go back to your Worker → **Settings** → **KV Namespace Bindings** → **Add binding**.
4. Set **Variable name** to `KV` and **KV namespace** to `recall-ratelimit` → **Save**.
5. Click **Deploy**.

**How it works:** Each day, the Worker stores one counter key (`calls:YYYY-MM-DD`). It increments on each request and expires automatically after 24 hours (`expirationTtl: 86400`). With normal use (~10 requests/session), you will never approach the 1,000 writes/day free-tier limit.

**Non-atomic note:** The KV counter is a best-effort cap for a personal tool. Under concurrent requests, counts may be slightly under-counted, which means up to `DAILY_CAP` requests may pass through per day. This is an accepted trade-off — per the design, the passcode and origin check are the primary abuse guards; the KV cap is a secondary backstop.

---

## 5. Update config.js with Your Worker URL

1. Open `config.js` at the root of your local repo.
2. Replace the placeholder URL with your actual Worker URL from Section 2:

```js
// config.js — Worker URL only (not a secret)
const CONFIG = { workerUrl: 'https://recall-proxy.YOUR-SUBDOMAIN.workers.dev' };
```

3. Commit and push:

```bash
git add config.js
git commit -m "config: set Worker URL"
git push origin main
```

The Worker URL is not a secret — it's safe to commit.

---

## 6. Enable GitHub Pages

1. Go to your GitHub repo → **Settings** → **Pages**.
2. Under **Source**, select **Deploy from a branch**.
3. Set **Branch** to `main` and **Folder** to `/ (root)`.
4. Click **Save**.
5. Wait about 1 minute. The site will be live at: `https://saitejatiru.github.io/recall/`

---

## 7. First Visit and Passcode Setup

1. Open `https://saitejatiru.github.io/recall/` in Chrome or Edge.
2. A **First-time setup** modal appears. Enter the PASSCODE you set in Section 3.
3. Click **Save & continue**. The passcode is stored in your browser's `localStorage` and never sent anywhere directly — it is only included in the request body when calling the Worker.
4. The header should update to show **AI: Connected** (in green). If it still shows **AI: Offline**, check:
   - `config.js` Worker URL matches your actual Worker URL exactly (no trailing slash difference — `https://recall-proxy.username.workers.dev` not `https://recall-proxy.username.workers.dev/`)
   - The ALLOWED_ORIGIN variable in Cloudflare matches `https://saitejatiru.github.io` exactly
   - The PASSCODE secret in Cloudflare matches what you entered in the modal

---

## 8. Bake-off and Model Selection

The bake-off lets you compare how well each model scores PM interview answers before committing to a primary model.

### Running the bake-off

1. Open `bakeoff.html` from the GitHub Pages URL: `https://saitejatiru.github.io/recall/bakeoff.html`  
   (or open the file locally in Chrome/Edge).
2. The Worker URL and passcode should be pre-filled from `config.js` and `localStorage`.
3. Select a model from the dropdown (run once per model to compare).
4. Click **Run bake-off**. Results appear in the table below.

### Scoring sheet

| Criterion | Answer 1 expected score | Answer 2 expected score | Answer 3 expected score |
|-----------|------------------------|------------------------|------------------------|
| Score range | 2–4 (weak) | 7–9 (strong) | 2–4 (weak) |
| JSON valid | Y | Y | Y |
| All fields present | Y | Y | Y |
| Fix is PM-specific | check | check | check |
| Rewrite is concretely better | check | check | check |
| Latency < 3 seconds | check | check | check |

**Fail signals:** Score 6+ for Answer 1 or 3 = model is too lenient. Score below 6 for Answer 2 = model is too harsh. Generic "add more detail" in the `fix` field = prompt needs refinement.

### Setting your primary model

After comparing results, go to Cloudflare Dashboard → Worker → Settings → Variables → edit `MODELS` so the best-performing model comes first → Save → Deploy.

### Failover test (Method 1 — simplest)

To confirm key rotation works without burning quota:

1. In Cloudflare Dashboard, temporarily set `NIM_KEY_1` Secret to `nvapi-invalid-test-key-do-not-use`.
2. Run the bake-off. The Worker will get a 401 from NIM on the first key and automatically rotate to `NIM_KEY_2`.
3. Results should still appear (served by `NIM_KEY_2`). The `model` field in each result shows which model actually answered.
4. Restore `NIM_KEY_1` to your real key when done.

You can also confirm rotation by checking **Cloudflare Dashboard → Worker → Logs → Live** immediately after a request.

---

## 9. Security Hardening

### Versioned pre-commit hook

The repo includes `.githooks/pre-commit` — a git hook that scans staged files for NVIDIA API key-format strings before each commit, preventing accidental commits of real keys.

Activate it once per machine:

```bash
git config core.hooksPath .githooks
```

This tells git to look for hooks in `.githooks/` (versioned, in the repo) instead of `.git/hooks/` (local only). The hook runs automatically on every future commit.

**What the hook checks:** It scans the staged diff for the pattern `nvapi-[A-Za-z0-9_-]{40,}` — real NVIDIA key-format strings (40+ characters after the prefix). Prose mentions of `nvapi-` without the full key format will not trigger a false positive.

### GitHub Secret Scanning

Enable GitHub's automatic secret detection for the repo:

1. Go to your GitHub repo → **Settings** → **Code security**.
2. Enable **Secret scanning** → turn on.
3. Enable **Push protection** → turn on.

GitHub automatically detects known secret patterns (including NVIDIA NIM keys starting with `nvapi-`) in public repositories. With push protection enabled, GitHub blocks any push that would expose a detected secret.

### Verification commands

Run these after deploy to confirm the security boundary is working:

```bash
# 1. Ping test — basic connectivity and auth
curl -s -X POST https://WORKER_URL \
  -H "Origin: https://saitejatiru.github.io" \
  -H "Content-Type: application/json" \
  -d '{"passcode":"YOUR_PASSCODE","task":"ping"}'
# Expected: {"ok":true,"ts":1731110400000}

# 2. Auth reject — no passcode
curl -s -X POST https://WORKER_URL \
  -H "Origin: https://saitejatiru.github.io" \
  -H "Content-Type: application/json" \
  -d '{"task":"ping"}'
# Expected: {"error":"auth_failed"} with HTTP 403

# 3. Auth reject — wrong origin
curl -s -X POST https://WORKER_URL \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -d '{"passcode":"YOUR_PASSCODE","task":"ping"}'
# Expected: {"error":"auth_failed"} with HTTP 403

# 4. Git history clean check — should return nothing
git log -p --all | grep -i 'nvapi-'

# 5. Working tree clean check — should return nothing
grep -r "nvapi-" . --include="*.js" --include="*.html" --include="*.json" --include="*.toml"
```

### Common pitfalls to avoid

1. **Passcode in a committed file** — `config.js` holds only the Worker URL. The passcode is entered by the user and stored in `localStorage.passcode`. Never in any file.

2. **Origin header is spoofable via curl** — this is intentional and accepted. The origin check is anti-bot, not anti-human. The passcode provides a second factor. The KV daily cap (300 req/day default) limits the blast radius even if someone spoofs the origin and obtains the passcode.

3. **KV write exhaustion** — KV free tier allows 1,000 writes/day. KV operations are wrapped in try/catch; on KV failure the Worker continues serving the request rather than blocking it. With normal use (~10 req/day), this limit is never reached.

4. **`enable_thinking` on the fallback model** — the Worker code only adds `chat_template_kwargs` when the model name contains `super` or `ultra`. The lightning fallback (`nvidia/nemotron-3.5-lightning-30b-a3b`) does not receive this parameter, avoiding a 400 error.

5. **GitHub Pages serves the wrong branch** — ensure Pages is set to `main` branch, not `gh-pages`. Verify at `https://saitejatiru.github.io/recall/index.html`.

6. **Secrets in `wrangler.toml` `[vars]`** — `[vars]` in `wrangler.toml` is committed and public. Never put NIM keys there. Use Cloudflare Dashboard Secrets or `wrangler secret put`. The Worker reads secrets from `env.NIM_KEY_1` etc., which are only populated from encrypted Secrets.
