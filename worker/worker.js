// worker/worker.js — Phase 1: auth, rotation, ping, bakeoff
// Phase 3 adds: case "coach" with system prompt injection

// ponytail: in-memory round-robin; resets on cold start, fine for personal tool
let idx = 0;

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

    // Passcode guard
    if (body.passcode !== env.PASSCODE) {
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
      const model = body.model || env.PRIMARY_MODEL || 'nvidia/nemotron-3-super-120b-a12b';
      const answers = Array.isArray(body.answers) ? body.answers : [];
      const keys = nimKeys(env);
      const results = [];

      for (let i = 0; i < answers.length; i++) {
        const t0 = Date.now();
        const { content, error, model: usedModel } = await callNIM(keys, model, [
          { role: 'system', content: BAKEOFF_SYSTEM },
          { role: 'user', content: answers[i] },
        ], env);
        const latency_ms = Date.now() - t0;

        let feedback = null, valid_json = false;
        if (content) {
          try { feedback = JSON.parse(stripThink(content)); valid_json = true; }
          catch { feedback = { raw: content }; }
        }
        results.push({ answer_index: i, model: usedModel || model, latency_ms, feedback, valid_json, error: error || null });
      }

      return json({ results }, 200, CORS(allowedOrigin));
    }

    // --- COACH (Phase 3 adds this) ---
    // case "coach": ... (system prompt injection goes here in Phase 3)

    return json({ error: 'unknown_task' }, 400, CORS(allowedOrigin));
  },
};

// Shared NIM call with key rotation + fallback model
async function callNIM(keys, model, messages, env) {
  const primary = model;
  const FALLBACK_MODEL = env.FALLBACK_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';

  // Try all keys on primary model
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = keys[idx % keys.length];
    idx = (idx + 1) % keys.length;
    const result = await nimRequest(key, primary, messages);
    if (result.content) return { content: result.content, model: primary };
    // only break on non-retriable errors (not 401, 403, 429, or 5xx)
    const retriable = result.status === 429 || result.status === 401 || result.status === 403 || result.status >= 500;
    if (!retriable) break;
  }

  // All primary keys exhausted → try FALLBACK_MODEL (same keys, one more pass)
  if (FALLBACK_MODEL && FALLBACK_MODEL !== primary) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = keys[idx % keys.length];
      idx = (idx + 1) % keys.length;
      const result = await nimRequest(key, FALLBACK_MODEL, messages);
      if (result.content) return { content: result.content, model: FALLBACK_MODEL };
    }
  }

  return { content: null, error: 'rate_limit', model: null };
}

async function nimRequest(key, model, messages) {
  try {
    const isThinkingModel = model.includes('super') || model.includes('ultra');
    const body = {
      model,
      messages,
      max_tokens: 400,
      temperature: isThinkingModel ? 1.0 : 0.5,
      top_p: isThinkingModel ? 0.95 : undefined,
      ...(isThinkingModel ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    };
    // Remove undefined keys
    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (resp.status === 429 || resp.status === 401 || resp.status === 403 || resp.status >= 500) {
      return { content: null, status: resp.status };
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    return { content: stripThink(raw), status: resp.status };
  } catch (e) {
    return { content: null, status: 0, error: 'timeout' };
  }
}

function nimKeys(env) {
  return [env.NIM_KEY_1, env.NIM_KEY_2, env.NIM_KEY_3, env.NIM_KEY_4].filter(Boolean);
}

function stripThink(s) {
  // ponytail: strip <think>...</think> blocks emitted by reasoning models
  return s.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers });
}

// Bake-off system prompt — evaluates PM interview answers
const BAKEOFF_SYSTEM = `You are a PM interview coach evaluating an answer.
Respond ONLY with valid JSON, no prose before or after:
{"score":1-10,"went_right":"...","fix":"...","rewrite":"...","tags":["..."]}
Score rubric: structure, clarity, PM vocabulary, metrics, impact, conciseness.
"fix" is one specific actionable improvement in plain language.
"rewrite" is one better sentence. Under 80 words total response.`;
