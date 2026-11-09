// Run: node worker/worker.test.mjs — self-check for auth, key rotation, fallback, cap. No real keys.
import assert from 'node:assert/strict';
import worker from './worker.js';

const ORIGIN = 'https://saitejatiru.github.io';
const base = { ALLOWED_ORIGIN: ORIGIN, PASSCODE: 'pw', NIM_KEY_1: 'k1', NIM_KEY_2: 'k2', PRIMARY_MODEL: 'nvidia/nemotron-3-super-120b-a12b', FALLBACK_MODEL: 'fast-model' };
const req = (body, origin = ORIGIN) => new Request('https://w.dev', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const call = async (body, env = base, origin) => { const r = await worker.fetch(req(body, origin), env); return { status: r.status, json: await r.json() }; };

// fake NIM: reply per (key, model) via a lookup; records calls
let calls = [];
const reply = (status, content = '{"score":5}') => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
const fakeNim = (table) => { globalThis.fetch = async (_url, init) => {
  const key = init.headers.Authorization.slice(7), model = JSON.parse(init.body).model;
  calls.push(`${key}:${model}`);
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

// 4. one request can't fan out past 3 answers
fakeNim(() => reply(200));
calls = [];
r = await call({ task: 'bakeoff', passcode: 'pw', answers: ['1', '2', '3', '4', '5'] });
assert.equal(r.json.results.length, 3);

// 5. daily cap: at the cap → 429
const kv = { v: '2', get: async () => kv.v, put: async (_k, v) => { kv.v = v; } };
assert.equal((await call({ task: 'ping', passcode: 'pw' }, { ...base, KV: kv, DAILY_CAP: '2' })).status, 429);

console.log('worker self-check: all passed');
