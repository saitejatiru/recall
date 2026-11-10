// app.js — Plan 02-01 stub
// Contains: passcode modal wiring, workerCall, AI status bar, checkAI
// Plan 02-02 replaces this with the full journey engine and step renderers.
// ponytail: minimal stub; Plan 02-02 adds the full journey engine

const $ = s => document.querySelector(s);
const today = () => new Date().toLocaleDateString('en-CA');
const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let data = {};
let rawData = null;
try { rawData = localStorage.getItem('recallData'); data = JSON.parse(rawData || '{}') || {}; } catch(e) { data = {}; }
// v1 → v2 migration on load: keep a one-time copy of the untouched v1 data first, never delete keys, then persist
if (typeof LOGIC !== 'undefined' && !(data._version >= 2)) {
  try { if (rawData && localStorage.getItem('recallData_v1_backup') === null) localStorage.setItem('recallData_v1_backup', rawData); } catch(e) {}
  LOGIC.migrate(data);
  save();
}

function save() {
  try { localStorage.setItem('recallData', JSON.stringify(data)); } catch(e) {}
}

// passcode first-run setup
(function(){
  var m = document.getElementById('setupModal');
  if (!localStorage.getItem('passcode')) { m.style.display = 'flex'; }
  document.getElementById('savePasscode').addEventListener('click', function(){
    var v = document.getElementById('passcodeInput').value.trim();
    if (!v) return;
    localStorage.setItem('passcode', v);
    m.style.display = 'none';
    if (typeof checkAI === 'function') checkAI();
  });
})();

// ponytail: minimal wrapper; Phase 3 adds task-specific callers
function workerCall(task, payload) {
  return fetch(CONFIG.workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, task, passcode: localStorage.getItem('passcode') })
  }).then(async r => {
    const data = await r.json().catch(() => ({}));
    return { ...data, status: r.status, ok: r.ok && data.ok !== false };
  });
}

document.querySelector('.top').insertAdjacentHTML('beforeend', '<span id="aiStatus" class="small muted">AI: checking...</span>');

async function checkAI() {
  try {
    var result = await workerCall('ping', {});
    var el = document.getElementById('aiStatus');
    if (result && result.ok) {
      el.textContent = 'AI: Connected';
      el.style.color = 'var(--green)';
    } else {
      el.textContent = 'AI: Offline';
    }
  } catch(e) {
    document.getElementById('aiStatus').textContent = 'AI: Offline';
  }
}

checkAI();

// Journey mount point — Plan 02-02 renders the step UI here
document.getElementById('journey').innerHTML =
  '<div class="card" style="margin-top:24px"><p class="muted">Journey shell ready — Plan 02-02 mounts the step UI here.</p></div>';
