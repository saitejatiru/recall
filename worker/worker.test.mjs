// Run: node worker/worker.test.mjs — self-check for auth, key rotation, fallback, cap. No real keys.
import assert from 'node:assert/strict';
import worker from './worker.js';

const ORIGIN = 'https://saitejatiru.github.io';
const base = { ALLOWED_ORIGIN: ORIGIN, PASSCODE: 'pw', NIM_KEY_1: 'k1', NIM_KEY_2: 'k2', PRIMARY_MODEL: 'nvidia/nemotron-3-super-120b-a12b', FALLBACK_MODEL: 'fast-model' };
const req = (body, origin = ORIGIN) => new Request('https://w.dev', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const call = async (body, env = base, origin) => { const r = await worker.fetch(req(body, origin), env); return { status: r.status, json: await r.json() }; };

// fake providers: reply per (key, model) via a lookup; records calls. A reply carries both the
// NIM (choices) and Gemini-native (candidates) shapes so either parser finds the content.
let calls = [], sent = [];
const reply = (status, content = '{"score":5}') => new Response(JSON.stringify({
  choices: [{ message: { content } }], candidates: [{ content: { parts: [{ text: content }] } }] }), { status });
const callInfo = (url, init) => {
  const body = JSON.parse(init.body);
  const key = init.headers['x-goog-api-key'] || init.headers.Authorization.slice(7);
  const model = body.model || String(url).match(/models\/([^:]+):generateContent/)[1];
  return { key, model, body };
};
const fakeNim = (table) => { globalThis.fetch = async (url, init) => {
  const { key, model, body } = callInfo(url, init);
  calls.push(`${key}:${model}`);
  sent.push({ url: String(url), body, headers: init.headers });
  return table(key, model);
}; };

// 1. auth fails closed: missing PASSCODE secret, wrong passcode, wrong origin
assert.equal((await call({ task: 'ping' }, { ...base, PASSCODE: undefined })).status, 403);
assert.equal((await call({ task: 'ping', passcode: 'nope' })).status, 403);
assert.equal((await call({ task: 'ping', passcode: 'pw' }, base, 'https://evil.example')).status, 403);
assert.equal((await call({ task: 'ping', passcode: 'pw' })).json.ok, true);

// 2. rotation: whichever key is tried first returns 401, the other answers
fakeNim((key) => key === 'k1' ? reply(401) : reply(200));
calls = [];
let r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] });
assert.equal(r.json.results[0].valid_json, true, 'bad key must fail over to next key');

// 3. every key fails on primary → fallback model answers
fakeNim((_k, model) => model === 'fast-model' ? reply(200) : reply(429));
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] });
assert.equal(r.json.results[0].model, 'fast-model');

// 3b. MODELS priority list: 1st model rejects the request (400), 2nd is rate-limited on every key, 3rd answers
fakeNim((_k, model) => model === 'm1' ? reply(400) : model === 'm2' ? reply(429) : reply(200));
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] }, { ...base, MODELS: 'm1, m2, m3' });
assert.equal(r.json.results[0].model, 'm3');

// 3c. a timed-out model is skipped after ONE try (not once per key) and the next model answers
fakeNim((_k, model) => { if (model === 'slow') throw new Error('timeout'); return reply(200); });
calls = [];
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] }, { ...base, MODELS: 'slow,quick' });
assert.equal(r.json.results[0].model, 'quick');
assert.equal(calls.filter(c => c.endsWith(':slow')).length, 1, 'slow model must not be retried on every key');

// 3d. a model picked in the bake-off is tested alone: no silent fallback, the error is reported
fakeNim((_k, model) => model === 'picked' ? reply(400) : reply(200));
calls = [];
r = await call({ task: 'bakeoff', passcode: 'pw', model: 'picked', answers: ['a'] });
assert.equal(r.json.results[0].model, null);
assert.equal(r.json.results[0].error, 'status_400');
assert.ok(calls.every(c => c.endsWith(':picked')), 'no other model may be called');

// 3e. gemini-* models go to Google's NATIVE API with GEMINI_KEY_*: system prompt as systemInstruction,
// thinking "low", JSON output requested, no NIM-only params; fenced JSON still parses
const gEnv = { ...base, GEMINI_KEY_1: 'g1', GEMINI_KEY_2: 'g2', MODELS: 'gemini-3.8-flash,nvidia/nemotron-3-super-120b-a12b' };
fakeNim(() => reply(200, '```json\n{"score":3}\n```'));
calls = []; sent = [];
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] }, gEnv);
assert.equal(r.json.results[0].model, 'gemini-3.8-flash');
assert.equal(r.json.results[0].valid_json, true, 'fenced JSON must parse');
assert.equal(sent[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
assert.ok(/^g[12]:/.test(calls[0]) && !sent[0].headers.Authorization, 'gemini uses GEMINI_KEY_* via x-goog-api-key');
assert.equal(sent[0].body.generationConfig.thinkingConfig.thinkingLevel, 'low');
assert.equal(sent[0].body.generationConfig.responseMimeType, 'application/json');
assert.ok(sent[0].body.systemInstruction.parts[0].text.includes('PM interview coach'));
assert.deepEqual(sent[0].body.contents, [{ role: 'user', parts: [{ text: 'a' }] }]);
assert.equal(sent[0].body.chat_template_kwargs, undefined);

// 3e2. an overloaded model (503) moves to the NEXT MODEL at once — not to the other keys of the same model
fakeNim((_k, model) => model === 'gemini-3.8-flash' ? new Response('{"error":{"code":503,"status":"UNAVAILABLE"}}', { status: 503 }) : reply(200));
calls = [];
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] }, { ...gEnv, MODELS: 'gemini-3.8-flash,nvidia/nemotron-3.5-super-vl-120b-a12b' });
assert.equal(r.json.results[0].model, 'nvidia/nemotron-3.5-super-vl-120b-a12b');
assert.equal(calls.filter(c => c.endsWith(':gemini-3.8-flash')).length, 1, 'overloaded model tried once, not once per key');

// 3f. Google reports a bad key as 400 API_KEY_INVALID → treated as a key problem: next Gemini key, same model
globalThis.fetch = async (_url, init) => {
  const key = init.headers['x-goog-api-key'];
  calls.push(key);
  return key === 'g1' // g1 is a revoked key, g2 works
    ? new Response('{"error":{"status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}', { status: 400 })
    : reply(200);
};
calls = [];
for (let n = 0; n < 2; n++) { // run twice so rotation starts on g1 at least once
  r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] }, { ...gEnv, MODELS: 'gemini-3.8-flash' });
  assert.equal(r.json.results[0].model, 'gemini-3.8-flash', 'bad Gemini key must fail over to the next key');
}
assert.ok(calls.includes('g1'), 'the revoked key was actually tried');

// 3g. no Gemini keys configured → skip straight to the next model
fakeNim(() => reply(200));
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['a'] }, { ...base, MODELS: 'gemini-3.8-flash,m2' });
assert.equal(r.json.results[0].model, 'm2');

// 3h. diag probes every model in parallel through the same request path the app uses
fakeNim(() => reply(200, 'OK'));
sent = [];
r = await call({ task: 'diag', passcode: 'pw' }, gEnv);
assert.ok(r.json.probes.length >= 4 && r.json.probes.every(p => p.status === 200 && p.reply === 'OK'), 'all probes answer OK');
assert.ok(sent.some(s => s.url.endsWith('gemini-3.8-flash:generateContent') && s.headers['x-goog-api-key']), 'native Gemini call shape');
assert.ok(sent.some(s => s.url.endsWith('/v1/chat/completions') && s.body.model.startsWith('nvidia/')), 'NIM call shape');
assert.equal((await call({ task: 'diag', passcode: 'wrong' }, gEnv)).status, 403, 'diag needs the passcode');

// 4. one request can't fan out past 3 answers
fakeNim(() => reply(200));
calls = [];
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['1', '2', '3', '4', '5'] });
assert.equal(r.json.results.length, 3);

// 5. daily cap: at the cap → 429
const kv = { v: '2', get: async () => kv.v, put: async (_k, v) => { kv.v = v; } };
assert.equal((await call({ task: 'ping', passcode: 'pw' }, { ...base, KV: kv, DAILY_CAP: '2' })).status, 429);

console.log('worker self-check: all passed');
