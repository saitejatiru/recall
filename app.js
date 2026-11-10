// app.js — Plan 02-02 journey engine
// Replaces the 02-01 stub. Covers: passcode modal, workerCall, checkAI (verbatim),
// day-rollover via LOGIC.shouldAdvanceProgrammeDay, STEPS registry, renderApp.

const $ = s => document.querySelector(s);
const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ── Storage ───────────────────────────────────────────────────────────────
let data = {};
let _rawData = null;
try { _rawData = localStorage.getItem('recallData'); data = JSON.parse(_rawData || '{}') || {}; } catch(e) { data = {}; }

function save() {
  try {
    localStorage.setItem('recallData', JSON.stringify(data));
  } catch(e) {
    if (e.name === 'QuotaExceededError') { alert('Storage full — download a backup to free space.'); }
  }
}

// v1 → v2 migration: backup once, then migrate
if (typeof LOGIC !== 'undefined' && !( data._version >= 2)) {
  try { if (_rawData && localStorage.getItem('recallData_v1_backup') === null) localStorage.setItem('recallData_v1_backup', _rawData); } catch(e) {}
  LOGIC.migrate(data);
  save();
}

const day = () => Math.max(1, Math.min(30, +data.day || 1));

// ── Passcode modal ────────────────────────────────────────────────────────
(function(){
  var m = document.getElementById('setupModal');
  if (!localStorage.getItem('passcode')) { m.style.display = 'flex'; }
  document.getElementById('savePasscode').addEventListener('click', function(){
    var v = document.getElementById('passcodeInput').value.trim();
    if (!v) return;
    localStorage.setItem('passcode', v);
    m.style.display = 'none';
    checkAI();
  });
})();

// ── Worker proxy ──────────────────────────────────────────────────────────
function workerCall(task, payload) {
  return fetch(CONFIG.workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, task, passcode: localStorage.getItem('passcode') })
  }).then(async r => {
    const d = await r.json().catch(() => ({}));
    return { ...d, status: r.status, ok: r.ok && d.ok !== false };
  });
}

// ── AI status bar ─────────────────────────────────────────────────────────
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

// ── Timer ─────────────────────────────────────────────────────────────────
let timer = null;
function stop() { if (timer) clearInterval(timer); timer = null; }

// ── Day rollover ──────────────────────────────────────────────────────────
const todayStr = LOGIC.today();
if (!data.dayStartedDate) {
  data.dayStartedDate = todayStr;
  save();
} else if (LOGIC.shouldAdvanceProgrammeDay(data.dayStartedDate, data['d-' + data.dayStartedDate], todayStr)) {
  data.day = Math.min(30, (data.day || 1) + 1);
  data.dayStartedDate = todayStr;
  save();
}

// ── Step registry ─────────────────────────────────────────────────────────
const STEP_NAMES = ['vocab', 'recall', 'speak', 'case', 'interview'];
const STEP_LABELS = ['Vocab', 'Recall', 'Speak', 'Case', 'Interview'];
const STEP_TIMES  = ['~8 min', '~5 min', '~5 min', '~7 min', '~5 min'];

// Inject hidden file input for backup import (single instance, never in innerHTML)
(function(){
  var fi = document.createElement('input');
  fi.type = 'file'; fi.accept = '.json'; fi.className = 'hidden'; fi.id = 'importFileInput';
  document.body.appendChild(fi);
  fi.addEventListener('change', function(){
    var file = fi.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      var parsed;
      try { parsed = JSON.parse(ev.target.result); } catch(e) { parsed = null; }
      if (!LOGIC.validateBackup(parsed)) {
        alert("This isn't a RECALL backup file — your data is unchanged.");
        fi.value = '';
        return;
      }
      var statusEl = document.getElementById('importStatus');
      if (statusEl) statusEl.textContent = 'Restoring…';
      localStorage.setItem('recallData', JSON.stringify(parsed.recallData));
      if (parsed.recallResume) localStorage.setItem('recallResume', parsed.recallResume);
      data = JSON.parse(localStorage.getItem('recallData')) || {};
      LOGIC.migrate(data);
      save();
      fi.value = '';
      renderApp();
    };
    reader.readAsText(file);
  });
})();

// ── Render: stepper ───────────────────────────────────────────────────────
function renderStepper(currentStep) {
  var html = '<div class="stepper" role="list">';
  for (var i = 0; i < 5; i++) {
    var cls = i < currentStep ? 'step complete' : (i === currentStep ? 'step active' : 'step');
    var circle = i < currentStep ? '✓' : (i + 1);
    var aria = 'aria-label="Step ' + (i+1) + ' of 5: ' + STEP_LABELS[i] + '"' +
               (i === currentStep ? ' aria-current="step"' : '');
    html += '<div class="' + cls + '" role="listitem">';
    html += '<div class="step-circle" ' + aria + '>' + circle + '</div>';
    html += '<div class="step-label">' + esc(STEP_LABELS[i]) + '</div>';
    html += '</div>';
    if (i < 4) html += '<div class="step-line"></div>';
  }
  // summary circle
  var sumCls = currentStep >= 5 ? 'step complete' : 'step';
  html += '<div class="step-line"></div>';
  html += '<div class="' + sumCls + '" role="listitem">';
  html += '<div class="step-circle" aria-label="Summary">✓</div>';
  html += '<div class="step-label">Done</div>';
  html += '</div>';
  html += '</div>';
  return html;
}

// ── Render: 30-day grid ───────────────────────────────────────────────────
function renderGrid() {
  var streak = LOGIC.computeStreak(data, todayStr);
  var longest = LOGIC.computeLongestStreak(data);
  var streakStr = streak === 0
    ? 'Day 1 — streak starting'
    : (streak === 1 ? '1-day streak' : streak + '-day streak');
  var html = '<div class="row" style="margin:12px 0 8px">';
  html += '<span style="color:var(--green);font-weight:700;font-size:18px">' + esc(streakStr) + '</span>';
  if (longest > 0) html += '<span class="muted small">&nbsp;· longest: ' + longest + ' day' + (longest === 1 ? '' : 's') + '</span>';
  html += '</div>';
  // grid: 30 dots
  html += '<details open><summary class="small muted" style="cursor:pointer;margin-bottom:6px">30-day progress</summary>';
  html += '<div class="day-grid">';
  for (var i = 1; i <= 30; i++) {
    var dateForDay = LOGIC.addDays(todayStr, i - day());
    var dd = data['d-' + dateForDay];
    var complete = dd && (dd.complete === true || dd.step >= 5);
    var isToday = (i === day());
    var isFuture = (i > day());
    var style;
    if (complete) style = 'background:var(--green);border-color:var(--green)';
    else if (isToday) style = 'background:var(--accent);border-color:var(--accent)';
    else if (isFuture) style = 'background:transparent;border-color:var(--line)';
    else style = 'background:var(--panel2);border-color:var(--line)';
    html += '<div class="day-dot" title="Day ' + i + '" style="' + style + '"></div>';
  }
  html += '</div></details>';
  return html;
}

// ── Render: feedback slot (self-check rubric) ─────────────────────────────
function renderFeedbackSlot(stepId) {
  var rubricItems = [
    'Structure — Did I give a clear opening and conclusion?',
    'Clarity — Would a non-PM understand my answer?',
    'PM vocabulary — Did I use PM terms correctly?',
    'Metrics — Did I include a number or measurement?',
    'Impact — Did I say what changed and by how much?',
    'Conciseness — Was my answer under 90 seconds?'
  ];
  var html = '<div class="card" id="rubricSlot-' + esc(stepId) + '">';
  html += '<h2>Self-check</h2>';
  rubricItems.forEach(function(item, idx) {
    html += '<label class="task"><input type="checkbox" data-rubric-idx="' + idx + '"> ' + esc(item) + '</label>';
  });
  html += '<button class="btn primary" data-action="step-done" style="margin-top:12px;width:100%">Done — move on</button>';
  html += '<div id="aiFeedback" class="hidden"></div>';
  html += '</div>';
  return html;
}

// ── Render: entry screen ──────────────────────────────────────────────────
function renderEntry(dayData) {
  var step = (dayData && dayData.step) || 0;
  // On entry, show next step (vocab) as active if not started, else show current 0-indexed
  var stepperIdx = step > 0 ? step - 1 : 0;
  var html = renderStepper(stepperIdx);
  html += '<div class="card" style="margin-top:16px">';
  html += '<h1>Day ' + day() + ' / 30</h1>';
  html += renderGrid();
  if (dayData && step > 0 && !dayData.complete) {
    html += '<button class="btn primary" data-action="journey-start" style="width:100%;margin-top:16px">Continue from Step ' + step + ' (' + esc(STEP_LABELS[step - 1] || '') + ')</button>';
  } else {
    html += '<button class="btn primary" data-action="journey-start" style="width:100%;margin-top:16px">Start today\'s journey</button>';
  }
  html += '</div>';
  return html;
}

// ── Render: day summary ───────────────────────────────────────────────────
function renderSummary(dayData) {
  var streak = LOGIC.computeStreak(data, todayStr);
  var vocabDayData = dayData.vocab || {};
  var newWords = vocabDayData.newWords || [];
  var wordCount = newWords.filter(function(id) {
    return vocabDayData.results && vocabDayData.results[id] === 'correct';
  }).length;
  // Count all vocab new words displayed (not just correct ones) for "learned"
  // Plan says: "N word(s) learned" — use newWords saved in dayData
  var learnedCount = newWords.length;

  var html = '<h1>Done for today!</h1>';
  html += '<div class="row" style="margin:12px 0">';
  html += '<span>Day ' + day() + '/30</span>';
  html += '<span>· ' + learnedCount + ' word' + (learnedCount === 1 ? '' : 's') + ' learned</span>';
  html += '<span>· Streak: ' + streak + ' day' + (streak === 1 ? '' : 's') + '</span>';
  html += '</div>';

  // Word list
  html += '<div class="card">';
  if (newWords.length === 0) {
    html += '<p class="muted">No new words saved today</p>';
  } else {
    html += '<p><strong>Today\'s words:</strong></p>';
    newWords.forEach(function(id) {
      var term = findTermById(id);
      if (term) html += '<p>' + esc(term.term) + '</p>';
    });
  }
  html += '</div>';

  // Skipped steps summary
  var skipped = [];
  ['recall','speak','case','interview'].forEach(function(s) {
    if (!dayData[s]) skipped.push(s);
  });
  if (skipped.length > 0) {
    html += '<p class="muted small">Skipped: ' + skipped.map(esc).join(', ') + '</p>';
  }

  html += '<div class="row" style="margin-top:16px">';
  html += '<button class="btn" data-action="export-backup">Download backup</button>';
  html += '<button class="btn" data-action="import-backup">Import backup</button>';
  html += '</div>';
  html += '<div id="importStatus" class="small muted" style="margin-top:8px"></div>';
  return html;
}

// ── Helper: find term by id across all VOCAB days ─────────────────────────
function findTermById(id) {
  for (var d = 0; d < VOCAB.length; d++) {
    for (var t = 0; t < VOCAB[d].length; t++) {
      if (VOCAB[d][t].id === id) return VOCAB[d][t];
    }
  }
  return null;
}

// ── Render: vocab step ────────────────────────────────────────────────────
function renderVocab(container) {
  var dayIdx = Math.min(day() - 1, VOCAB.length - 1);
  var newTerms = dayIdx < VOCAB.length ? VOCAB[dayIdx] : [];
  var reviewIds = LOGIC.selectReviewWords(data.vocab || {}, todayStr, 5);

  // Init day vocab record if needed
  var vd = data['d-' + todayStr];
  if (!vd.vocab) {
    vd.vocab = {
      newWords: newTerms.map(function(t) { return t.id; }),
      reviewWords: reviewIds.slice(),
      sentences: {},
      results: {}
    };
    save();
  }
  var vocabDayData = vd.vocab;

  // Init Leitner state for new words
  if (!data.vocab) data.vocab = {};
  newTerms.forEach(function(t) {
    if (!data.vocab[t.id]) {
      data.vocab[t.id] = LOGIC.initWord(t.id, todayStr);
    }
  });
  save();

  var html = '';

  // Reviews section
  if (reviewIds.length > 0) {
    html += '<div class="card" style="margin-bottom:8px">';
    html += '<h2>Reviewing ' + reviewIds.length + ' earlier word' + (reviewIds.length === 1 ? '' : 's') + '</h2>';
    html += '</div>';
    reviewIds.forEach(function(id) {
      var term = findTermById(id);
      if (!term) return;
      var box = (data.vocab[id] && data.vocab[id].box) || 1;
      html += renderVocabCard(term, 'Review — Box ' + box, vocabDayData);
    });
  }

  // New word cards (or endless mode notice)
  if (newTerms.length > 0) {
    newTerms.forEach(function(term) {
      html += renderVocabCard(term, 'New word', vocabDayData);
    });
  } else {
    // Day 31+
    if (reviewIds.length > 0) {
      html += '<p class="muted" style="margin-top:12px">Endless mode arrives later — keep reviewing your words</p>';
    }
  }

  html += '<button class="btn primary" data-action="step-next" style="width:100%;margin-top:8px">Save &amp; continue →</button>';
  container.innerHTML = html;
}

function renderVocabCard(term, badge, vocabDayData) {
  var saved = vocabDayData.sentences && vocabDayData.sentences[term.id];
  var result = vocabDayData.results && vocabDayData.results[term.id];
  var html = '<div class="card" data-term-id="' + esc(term.id) + '" style="margin-bottom:12px">';
  html += '<div class="row" style="margin-bottom:8px"><span class="tag">' + esc(badge) + '</span><h3 style="margin:0 0 0 8px">' + esc(term.term) + '</h3></div>';
  html += '<p>' + esc(term.meaning) + '</p>';
  html += '<p class="muted">' + esc(term.everyday) + '</p>';
  html += '<div style="border-left:4px solid var(--accent);background:var(--panel2);padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0">' + esc(term.interview) + '</div>';
  html += '<label>Your sentence:<br><textarea id="sent-' + esc(term.id) + '" aria-label="Sentence for ' + esc(term.term) + '" placeholder="Write a sentence using this word" style="margin-top:4px">' + (saved ? esc(saved) : '') + '</textarea></label>';
  var disAttr = saved ? '' : ' disabled';
  html += '<button class="btn" data-action="vocab-save" data-term-id="' + esc(term.id) + '"' + disAttr + '>Save</button>';
  html += '<div id="fb-' + esc(term.id) + '" style="margin-top:6px">';
  if (result === 'correct') {
    html += '<span style="color:var(--green);font-weight:700">✓ Correct</span>';
  } else if (result === 'wrong') {
    html += '<span class="muted">Try again — example: ' + esc(term.everyday) + '</span>';
  }
  html += '</div>';
  html += '</div>';
  return html;
}

// ── Render: recall step ───────────────────────────────────────────────────
// renderFeedbackSlot('recall') appended by renderApp for the recall step (and all other steps)
function renderRecall(container) {
  var yesterdayStr = LOGIC.addDays(todayStr, -1);
  var yd = data['d-' + yesterdayStr];
  var html = '';

  if (!yd || !yd.vocab || !yd.vocab.newWords || yd.vocab.newWords.length === 0) {
    // Day 1 empty state
    html += '<div class="card">';
    html += '<div class="row"><span class="tag">~5 min</span></div>';
    html += '<h2>Day 1 — nothing to recall yet</h2>';
    html += '<p class="muted">Complete today\'s vocab and speaking steps. Tomorrow you\'ll recall what you learned here.</p>';
    html += '<button class="btn primary" data-action="recall-skip" style="width:100%;margin-top:12px">Skip to Step 3</button>';
    html += '</div>';
  } else {
    var yWords = yd.vocab.newWords;
    html += '<div class="card">';
    html += '<div class="row"><span class="tag">~5 min</span></div>';
    html += '<h2>What do you remember?</h2>';
    html += '<p class="muted">Try to recall yesterday\'s words from memory before revealing meanings.</p>';
    html += '<ul style="margin:12px 0">';
    yWords.forEach(function(id) {
      var term = findTermById(id);
      if (term) html += '<li>' + esc(term.term) + '</li>';
    });
    html += '</ul>';
    html += '<textarea id="recallText" placeholder="Write what you remember about these words..." style="margin:8px 0"></textarea>';
    html += '<div class="row" style="margin-top:8px">';
    html += '<button class="btn" data-action="recall-reveal">Reveal meanings</button>';
    html += '</div>';
    html += '<div id="recallMeanings" class="hidden" style="margin-top:12px">';
    yWords.forEach(function(id) {
      var term = findTermById(id);
      if (term) html += '<p><strong>' + esc(term.term) + ':</strong> ' + esc(term.meaning) + '</p>';
    });
    html += '</div>';
    html += '<button class="btn primary" data-action="step-next" style="width:100%;margin-top:12px">Save &amp; continue →</button>';
    html += '</div>';
  }
  container.innerHTML = html;
}

// ── STEPS registry ────────────────────────────────────────────────────────
function placeholderStep(label, timeHint) {
  return {
    render: function(container) {
      container.innerHTML = '<div class="card"><div class="row"><span class="tag">' + esc(timeHint) + '</span></div><h2>' + esc(label) + '</h2><p class="muted">Coming in the next update</p><button class="btn primary" data-action="step-next" style="width:100%">Continue →</button></div>';
    },
    submit: function() {}
  };
}

var STEPS = {
  vocab: {
    render: renderVocab,
    submit: function() {}
  },
  recall: {
    render: renderRecall,
    submit: function() {}
  },
  speak: placeholderStep('Speak', '~5 min'),
  case: placeholderStep('Case', '~7 min'),
  interview: placeholderStep('Interview', '~5 min')
};

// ── Core ──────────────────────────────────────────────────────────────────
function saveStepAnswer(stepId, answerObj) {
  var vd = data['d-' + todayStr];
  if (!vd) vd = data['d-' + todayStr] = { step: 0, complete: false };
  vd[stepId] = answerObj;
  save();
}

// Steps are 1-indexed externally: step=0 → entry, step=1 → vocab, ..., step=5 → interview, step>=6 or complete → summary
// But plan uses 5 steps with n>=5 → complete. We use step=1..5 for the 5 journey steps.
// STEP_NAMES[step-1] gives the step key.
// Steps are 1-indexed: step=1=vocab, step=2=recall, ..., step=5=interview.
// Navigating PAST interview (n>5) sets complete=true and shows summary.
function goToStep(n) {
  var vd = data['d-' + todayStr];
  if (!vd) vd = data['d-' + todayStr] = { step: 0, complete: false };
  vd.step = n;
  if (n > 5) vd.complete = true; // only after all 5 steps done; never modifies data.day
  save();
  renderApp();
  window.scrollTo(0, 0);
}

function renderApp() {
  var dayData = data['d-' + todayStr] || null;
  var container = document.getElementById('journey');
  if (!container) return;

  if (dayData && dayData.complete) {
    container.innerHTML = renderStepper(5) + renderSummary(dayData);
    return;
  }

  var step = (dayData && dayData.step) || 0;

  if (!dayData || step === 0) {
    container.innerHTML = renderEntry(dayData); // renderEntry draws its own stepper
    return;
  }

  // step 1-5: active steps (1=vocab ... 5=interview). STEP_NAMES is 0-indexed.
  var stepIdx = step - 1; // 0-indexed into STEP_NAMES
  var stepName = STEP_NAMES[stepIdx] || STEP_NAMES[4];
  // renderStepper uses 0-indexed comparison; pass stepIdx so active circle matches
  container.innerHTML = renderStepper(stepIdx) + '<div id="stepContent"></div>' + renderFeedbackSlot(stepName);
  if (stepName === 'vocab') {
    renderVocab(document.getElementById('stepContent'));
  } else if (stepName === 'recall') {
    renderRecall(document.getElementById('stepContent'));
  } else {
    STEPS[stepName].render(document.getElementById('stepContent'));
  }
}

// ── Event delegation ──────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var dayData = data['d-' + todayStr] || { step: 0, complete: false };
  var currentStep = dayData.step || 0;
  var stepIdx = currentStep - 1;
  var stepName = STEP_NAMES[stepIdx] || '';

  if (action === 'journey-start') {
    if (!data['d-' + todayStr]) data['d-' + todayStr] = { step: 0, complete: false };
    stop();
    var savedStep = data['d-' + todayStr].step || 0;
    goToStep(savedStep > 0 ? savedStep : 1);
    return;
  }

  if (action === 'step-next') {
    stop();
    if (stepName && STEPS[stepName]) STEPS[stepName].submit();
    if (stepName) saveStepAnswer(stepName, dayData[stepName] || {});
    goToStep(currentStep + 1);
    return;
  }

  if (action === 'step-done') {
    var rubricSlot = document.getElementById('rubricSlot-' + (stepName || ''));
    var checked = [];
    if (rubricSlot) {
      rubricSlot.querySelectorAll('input[type=checkbox]:checked').forEach(function(cb) {
        checked.push(parseInt(cb.dataset.rubricIdx, 10));
      });
    }
    var existingAnswer = dayData[stepName] || {};
    existingAnswer.rubricChecked = checked;
    saveStepAnswer(stepName, existingAnswer);
    stop();
    goToStep(currentStep + 1);
    return;
  }

  if (action === 'recall-skip') {
    saveStepAnswer('recall', { skipped: true });
    stop();
    goToStep(currentStep + 1);
    return;
  }

  if (action === 'recall-reveal') {
    var rm = document.getElementById('recallMeanings');
    if (rm) rm.classList.remove('hidden');
    el.textContent = 'Meanings shown';
    return;
  }

  if (action === 'vocab-save') {
    var termId = el.dataset.termId;
    var ta = document.getElementById('sent-' + termId);
    if (!ta || !ta.value.trim()) return;
    var sentence = ta.value.trim();
    var term = findTermById(termId);
    if (!term) return;
    var vocabResult = LOGIC.checkVocab(termId, term.term, sentence, term.everyday);
    if (!data.vocab) data.vocab = {};
    if (!data.vocab[termId]) data.vocab[termId] = LOGIC.initWord(termId, todayStr);
    data.vocab[termId] = LOGIC.advanceLeitner(data.vocab[termId], vocabResult, todayStr);
    var vd = data['d-' + todayStr];
    if (!vd.vocab) vd.vocab = { newWords: [], reviewWords: [], sentences: {}, results: {} };
    vd.vocab.sentences[termId] = sentence;
    vd.vocab.results[termId] = vocabResult;
    saveStepAnswer('vocab', vd.vocab);
    var fb = document.getElementById('fb-' + termId);
    if (fb) {
      fb.innerHTML = vocabResult === 'correct'
        ? '<span style="color:var(--green);font-weight:700">&#10003; Correct</span>'
        : '<span class="muted">Try again &mdash; example: ' + esc(term.everyday) + '</span>';
    }
    return;
  }

  if (action === 'export-backup') {
    var payload = { recallData: data, recallResume: localStorage.getItem('recallResume') || '' };
    var u = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = u; a.download = 'recall-backup.json'; a.click();
    URL.revokeObjectURL(u);
    return;
  }

  if (action === 'import-backup') {
    document.getElementById('importFileInput').click();
    return;
  }
});

// Enable/disable vocab Save button on input
document.addEventListener('input', function(e) {
  if (e.target.tagName === 'TEXTAREA' && e.target.id && e.target.id.startsWith('sent-')) {
    var termId = e.target.id.slice(5);
    var btn = document.querySelector('[data-action="vocab-save"][data-term-id="' + CSS.escape(termId) + '"]');
    if (btn) btn.disabled = !e.target.value.trim();
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────
checkAI();
renderApp();
