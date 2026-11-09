// worker/worker.js — Phase 1: auth, key rotation (NVIDIA NIM + Gemini), ping, bakeoff
// Phase 3 adds: case "coach" with system prompt injection

// ponytail: in-memory round-robin per provider; resets on cold start, fine for personal tool
const idx = { nim: 0, gemini: 0 };

const CORS = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
});

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://saitejatiru.github.io';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Origin guard
    const origin = request.headers.get('Origin') || '';
    if (origin !== allowedOrigin) {
      return json({ error: 'auth_failed' }, 403, CORS(allowedOrigin));
    }

    // Parse body
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'bad_request' }, 400, CORS(allowedOrigin)); }

    // Passcode guard — fail closed if the PASSCODE secret was never set
    if (!env.PASSCODE || body.passcode !== env.PASSCODE) {
      return json({ error: 'auth_failed' }, 403, CORS(allowedOrigin));
    }

    // Daily cap (KV counter)
    // ponytail: global lock, per-account locks if throughput matters; KV not atomic under concurrency — documented in SETUP.md
    if (env.KV) {
      try {
        const dateKey = 'calls:' + new Date().toISOString().slice(0, 10);
        const count = parseInt(await env.KV.get(dateKey) || '0', 10) || 0;
        const cap = parseInt(env.DAILY_CAP || '300', 10);
        if (count >= cap) {
          return json({ error: 'rate_limit', retry: false }, 429, CORS(allowedOrigin));
        }
        await env.KV.put(dateKey, String(count + 1), { expirationTtl: 86400 });
      } catch (e) {
        console.error('KV error:', e.message);
        // continue request on KV failure — better to serve than block
      }
    }

    const task = body.task || 'unknown';

    // --- PING ---
    if (task === 'ping') {
      return json({ ok: true, ts: Date.now() }, 200, CORS(allowedOrigin));
    }

    // --- BAKEOFF ---
    if (task === 'bakeoff') {
      // bake-off measures ONE model: a picked model is tested alone (no silent fallback)
      const models = body.model ? [String(body.model)] : modelList(env);
      // ponytail: max 3 answers per request so one call can't bypass DAILY_CAP
      const answers = Array.isArray(body.answers) ? body.answers.slice(0, 3).map(a => String(a).slice(0, 4000)) : [];
      const results = [];

      // answers scored in parallel, so the whole bake-off takes about as long as one answer
      results.push(...await Promise.all(answers.map(async (answer, i) => {
        const t0 = Date.now();
        const { content, error, model: usedModel } = await callAI(env, models, [
          { role: 'system', content: BAKEOFF_SYSTEM },
          { role: 'user', content: answer },
        ]);
        const latency_ms = Date.now() - t0;

        let feedback = null, valid_json = false;
        if (content) {
          try { feedback = parseJSONReply(content); valid_json = true; }
          catch { feedback = { raw: content }; }
        }
        return { answer_index: i, model: usedModel, latency_ms, feedback, valid_json, error: error || null };
      })));

      return json({ results }, 200, CORS(allowedOrigin));
    }

    // --- COACH (Phase 3 adds this) ---
    // case "coach": ... (system prompt injection goes here in Phase 3)

    return json({ error: 'unknown_task' }, 400, CORS(allowedOrigin));
  },
};

// Models in priority order: MODELS="a,b,c" (comma-separated), else PRIMARY_MODEL,FALLBACK_MODEL.
// A model requested by the caller (bake-off) is tried first.
function modelList(env, requested) {
  const raw = env.MODELS || [env.PRIMARY_MODEL, env.FALLBACK_MODEL].filter(Boolean).join(',') || DEFAULT_MODELS;
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return requested ? [requested, ...list.filter(m => m !== requested)] : list;
}

// Two providers, one OpenAI-compatible request shape. Model names starting with "gemini-"
// go to Google with GEMINI_KEY_*; everything else goes to NVIDIA NIM with NIM_KEY_*.
const ENDPOINT = {
  nim: 'https://integrate.api.nvidia.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};
const providerOf = (model) => model.startsWith('gemini-') ? 'gemini' : 'nim';
function keysFor(env, provider) {
  const prefix = provider === 'gemini' ? 'GEMINI_KEY_' : 'NIM_KEY_';
  return Array.from({ length: 10 }, (_, i) => env[prefix + (i + 1)]).filter(Boolean);
}

// Each model in order, each across its provider's keys, within one overall time budget.
// Key problem (401/403/429/5xx) → next key. Model problem (timeout, 400, empty reply) → next model:
// a slow model is slow on every key, so retrying it per key only multiplies the wait.
// User accepts 60-90s replies (thinking models on free tiers are slow): 85s per call, 110s per answer overall.
const CALL_TIMEOUT_MS = 85000, TOTAL_BUDGET_MS = 110000;
async function callAI(env, models, messages) {
  // timeouts can be raised via Worker variables (used by worker/diag.mjs to measure true latency)
  const callTimeout = Number(env.CALL_TIMEOUT_MS) || CALL_TIMEOUT_MS;
  const deadline = Date.now() + (Number(env.TOTAL_BUDGET_MS) || TOTAL_BUDGET_MS);
  let last = 'no_keys';
  for (const model of models) {
    const provider = providerOf(model);
    const keys = keysFor(env, provider);
    if (!keys.length) { last = `no_${provider}_keys`; continue; }
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const left = deadline - Date.now();
      if (left < 3000) return { content: null, error: 'out_of_time', model: null };
      const keyNo = (idx[provider] % keys.length) + 1;
      const key = keys[idx[provider] % keys.length];
      idx[provider] = (idx[provider] + 1) % keys.length;
      const t0 = Date.now();
      const result = await aiRequest(provider, key, model, messages, Math.min(callTimeout, left));
      // log status, timing, stop reason, token use and provider error text — never keys or message bodies
      console.log(`ai ${provider} model=${model} key#${keyNo} status=${result.status} ms=${Date.now() - t0}` +
        (result.finish ? ` finish=${result.finish}` : '') + (result.tokens ? ` tokens=${result.tokens}` : '') +
        (result.errText ? ` err="${result.errText}"` : ''));
      if (result.content) return { content: result.content, model };
      last = result.status === 0 ? 'timeout' : `status_${result.status}`;
      const keyProblem = result.status === 401 || result.status === 403 || result.status === 429 || result.status >= 500;
      if (!keyProblem) break;
    }
  }
  return { content: null, error: last, model: null };
}

function requestBody(provider, model, messages) {
  if (provider === 'gemini') {
    // Gemini 3.x can't switch thinking off; "low" is the fastest level every 3.x model accepts.
    // max_tokens includes thinking tokens, so leave headroom; the prompt keeps the answer short.
    return { model, messages, max_tokens: 2048, reasoning_effort: 'low' };
  }
  // 2048 because reasoning models (GLM, Mistral) spend tokens thinking first; at 400 they could stop
  // before writing any answer (empty reply). The prompt keeps the visible answer under 80 words.
  const isThinkingModel = model.includes('super') || model.includes('ultra');
  return isThinkingModel
    ? { model, messages, max_tokens: 2048, temperature: 1.0, top_p: 0.95, chat_template_kwargs: { enable_thinking: false } }
    : { model, messages, max_tokens: 2048, temperature: 0.5 };
}

async function aiRequest(provider, key, model, messages, timeoutMs = CALL_TIMEOUT_MS) {
  try {
    const resp = await fetch(ENDPOINT[provider], {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody(provider, model, messages)),
      signal: AbortSignal.timeout(timeoutMs), // slow model → status 0 → next model
    });

    if (!resp.ok) {
      // Google answers a bad/revoked key with 400 API_KEY_INVALID — that's a key problem, not a model problem
      const text = await resp.text().catch(() => '');
      const badKey = resp.status === 400 && /API_KEY_INVALID|API key not valid/i.test(text);
      return { content: null, status: badKey ? 401 : resp.status, errText: text.replace(/\s+/g, ' ').slice(0, 160) };
    }

    const data = await resp.json();
    const choice = data?.choices?.[0] || {};
    const u = data?.usage || {};
    const thinking = u.completion_tokens_details?.reasoning_tokens;
    return {
      content: stripThink(choice.message?.content || ''),
      status: resp.status,
      finish: choice.finish_reason,
      tokens: `in:${u.prompt_tokens ?? '?'} out:${u.completion_tokens ?? '?'}${thinking != null ? ` thinking:${thinking}` : ''}`,
    };
  } catch (e) {
    // status 0 = no reply in time, or the request itself failed (errText says which)
    return { content: null, status: 0, error: 'timeout', errText: `${e.name}: ${e.message}`.slice(0, 160) };
  }
}

// Model replies sometimes wrap JSON in ```json fences — accept both.
function parseJSONReply(s) {
  return JSON.parse(stripThink(s).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
}

function stripThink(s) {
  // ponytail: strip <think>...</think> blocks emitted by reasoning models
  return s.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}

const DEFAULT_MODELS = 'gemini-3.8-flash,nvidia/nemotron-3.5-super-vl-120b-a12b,gemini-3.5-flash-lite,nvidia/nemotron-3-super-120b-a12b';

// Bake-off system prompt — evaluates PM interview answers
const BAKEOFF_SYSTEM = `You are a PM interview coach evaluating an answer.
Respond ONLY with valid JSON, no prose before or after:
{"score":1-10,"went_right":"...","fix":"...","rewrite":"...","tags":["..."]}
Score rubric: structure, clarity, PM vocabulary, metrics, impact, conciseness.
"fix" is one specific actionable improvement in plain language.
"rewrite" is one better sentence. Under 80 words total response.`;
