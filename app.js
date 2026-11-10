// app.js — Plan 02-01 stub
// Contains: passcode modal wiring, workerCall, AI status bar, checkAI
// Plan 02-02 replaces this with the full journey engine and step renderers.
// ponytail: minimal stub; Plan 02-02 adds the full journey engine

const $ = s => document.querySelector(s);
const today = () => new Date().toLocaleDateString('en-CA');
const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let data = {};
try { data = JSON.parse(localStorage.getItem('recallData') || '{}'); } catch(e) {}
// Run migration on load so v2 fields are present before any reads
if (typeof LOGIC !== 'undefined') LOGIC.migrate(data);

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
