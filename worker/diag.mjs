// Run: node worker/diag.mjs [model ...]
// Runs the REAL worker.js locally against NVIDIA/Gemini with your keys from .dev.vars
// (git-ignored, never committed, never printed). Waits up to 90s per call so true latency shows.
import { readFileSync } from 'node:fs';
import worker from './worker.js';

let vars = {};
try {
  for (const line of readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m) vars[m[1]] = m[2].trim();
  }
} catch {
  console.error('Missing .dev.vars in the repo folder. Create it with lines like  NIM_KEY_1="..."  GEMINI_KEY_1="..."');
  process.exit(1);
}
const count = (p) => Object.keys(vars).filter(k => k.startsWith(p) && vars[k]).length;
console.log(`keys found: NIM=${count('NIM_KEY_')} GEMINI=${count('GEMINI_KEY_')} (values not shown)\n`);

const ORIGIN = 'https://diag.local';
const env = { ...vars, ALLOWED_ORIGIN: ORIGIN, PASSCODE: 'diag', KV: undefined, CALL_TIMEOUT_MS: '90000', TOTAL_BUDGET_MS: '95000' };
const answers = [
  'Payment conversion dropped 15%. I would look at the data and find the problem and fix it.',
  'Payment conversion fell from 72% to 59% in two weeks. I would segment by platform, payment method, and user cohort; check for latency spikes on the payments API; and rule out UX regressions from the recent deploy before proposing solutions.',
  "So, like, I would first check everything and also talk to stakeholders and also look at the data and then maybe do some user interviews and then probably fix it after figuring out the main thing that's wrong.",
];
const models = process.argv.slice(2).length ? process.argv.slice(2) : [
  'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash',
  'nvidia/nemotron-3.5-super-vl-120b-a12b', 'nvidia/nemotron-3-super-120b-a12b', 'z-ai/glm-5.3-flash',
];

for (const model of models) {
  console.log(`=== ${model}`);
  const req = new Request('https://diag.local', {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ task: 'bakeoff', passcode: 'diag', model, answers }),
  });
  const { results = [] } = await (await worker.fetch(req, env)).json();
  for (const r of results) {
    const fb = r.feedback || {};
    console.log(`  answer ${r.answer_index + 1}: ${r.latency_ms}ms  score=${fb.score ?? '-'}  json=${r.valid_json}` +
      (r.error ? `  error=${r.error}` : '') + (fb.fix ? `  fix="${String(fb.fix).slice(0, 90)}"` : '') +
      (fb.raw ? `  raw="${String(fb.raw).slice(0, 90)}"` : ''));
  }
  console.log('');
}
console.log('expected scores: answer 1 = 2-4, answer 2 = 7-9, answer 3 = 2-4');
