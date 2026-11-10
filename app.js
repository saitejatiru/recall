// app.js — Plan 02-02 + 02-03 journey engine

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

// v1/v2 → v3 migration: backup genuine v1 (no _version) once, then migrate to current version
if (typeof LOGIC !== 'undefined' && !(data._version >= 3)) {
  try { if (_rawData && !data._version && localStorage.getItem('recallData_v1_backup') === null) localStorage.setItem('recallData_v1_backup', _rawData); } catch(e) {}
  LOGIC.migrate(data);
  save();
}

const todayStr = (typeof LOGIC !== 'undefined' && LOGIC.today) ? LOGIC.today() : new Date().toLocaleDateString('en-CA');

function currentDayNum() {
  return Math.max(1, +data.day || 1);
}

function activeDayNum() {
  return Math.max(1, +data.viewDay || currentDayNum());
}

const day = () => activeDayNum();

function dateKeyForDay(dayNum) {
  var cur = currentDayNum();
  if (dayNum === cur) {
    return 'd-' + todayStr;
  }
  for (var key in data) {
    if (key.indexOf('d-') === 0 && data[key] && data[key].dayNumber === dayNum) {
      return key;
    }
  }
  return 'd-' + (typeof LOGIC !== 'undefined' && LOGIC.addDays ? LOGIC.addDays(todayStr, dayNum - cur) : todayStr);
}

function activeDateKey() {
  return dateKeyForDay(activeDayNum());
}

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

// ── Timer + speech state ──────────────────────────────────────────────────
let timer = null;
let timerRunning = false;
let accumulated = '';
let listening = false;
let recognition = null;
let fromSpeech = false;
// interview state
let firstAnswerText = '';
let firstFromSpeech = false;
let firstFillerCount = 0;

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  timerRunning = false;
  stopRecording();
}

function stopRecording() {
  listening = false;
  if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
  var mb = document.getElementById('micBtn');
  var rl = document.getElementById('recLabel');
  if (mb) { mb.setAttribute('aria-pressed','false'); mb.setAttribute('aria-label','Start recording'); mb.textContent = '🎙 Start speaking'; mb.style.background = ''; }
  if (rl) rl.style.display = 'none';
}

function showTypingFallback(msg) {
  var ta = document.getElementById('transcript');
  if (!ta) return;
  ta.style.display = '';
  if (msg) {
    var existingNotice = document.getElementById('srFallbackNotice');
    if (!existingNotice) {
      var p = document.createElement('p');
      p.id = 'srFallbackNotice';
      p.className = 'small muted';
      p.textContent = msg;
      ta.parentNode.insertBefore(p, ta);
    }
  }
}

function startRecording() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  if (recognition) { try { recognition.stop(); } catch(e) {} }
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = function(e) {
    for (var i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) accumulated += (accumulated ? ' ' : '') + e.results[i][0].transcript;
    }
  };
  recognition.onend = function() {
    if (listening) {
      // Chrome ends recognition after each pause: keep restarting until the user presses Stop
      // (or a timer ends — that path calls stopRecording(), which clears `listening` first)
      try { recognition.start(); } catch(e) {}
    } else {
      // Flush to transcript
      listening = false;
      var ta = document.getElementById('transcript');
      if (ta) {
        if (accumulated.trim()) ta.value = accumulated.trim();
        ta.style.display = '';
        updateFillerChip(accumulated, true);
        enableSubmitIfReady();
      }
      stopRecording();
    }
  };
  recognition.onerror = function(e) {
    if (e.error === 'not-allowed' || e.error === 'permission-denied') {
      listening = false;
      showTypingFallback('Microphone access denied. Type your answer below.');
      stopRecording();
    } else if (e.error === 'network') {
      listening = false;
      var ta = document.getElementById('transcript');
      if (ta && accumulated.trim()) ta.value = accumulated.trim();
      showTypingFallback('Recording stopped. Edit the transcript below or type your answer.');
      stopRecording();
    }
  };
  recognition.start();
  listening = true;
  var mb = document.getElementById('micBtn');
  var rl = document.getElementById('recLabel');
  if (mb) { mb.setAttribute('aria-pressed','true'); mb.setAttribute('aria-label','Stop recording'); mb.textContent = 'Stop'; mb.style.background = 'var(--accent)'; }
  if (rl) rl.style.display = '';
}

function updateFillerChip(text, isSpeech) {
  var chip = document.getElementById('fillerChip');
  if (!chip) return;
  if (!isSpeech || !text.trim()) { chip.style.display = 'none'; return; }
  var count = LOGIC.countFillers(text);
  chip.style.display = '';
  if (count <= 2) {
    chip.textContent = count + ' filler word' + (count === 1 ? '' : 's') + ' — good';
    chip.style.color = 'var(--green)';
  } else if (count <= 5) {
    chip.textContent = count + ' filler words (um, uh, like, you know)';
    chip.style.color = '';
  } else {
    chip.textContent = count + ' filler words — aim for fewer next time';
    chip.style.color = '';
  }
}

function enableSubmitIfReady() {
  var ta = document.getElementById('transcript');
  if (!ta) return;
  var hasText = ta.value.trim().length > 0;
  ['speak-submit','case-submit','interview-submit'].forEach(function(a) {
    var btn = document.querySelector('[data-action="' + a + '"]');
    if (btn) btn.disabled = !hasText;
  });
}

function startSpeakCountdown(secs, onDone) {
  // secs: 30 (think) or 90 (speak)
  var el = document.getElementById(secs <= 30 ? 'thinkTimer' : 'speakTimer');
  if (timer) clearInterval(timer);
  var remaining = secs;
  timer = setInterval(function() {
    remaining--;
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    var display = m + ':' + (s < 10 ? '0' : '') + s;
    if (el) {
      el.textContent = display;
      if (secs > 30 && remaining <= 15) el.style.color = 'var(--text)';
    }
    if (remaining <= 0) {
      clearInterval(timer); timer = null;
      if (onDone) onDone();
    }
  }, 1000);
}

// ── Day rollover ──────────────────────────────────────────────────────────
if (!data.dayStartedDate) {
  data.dayStartedDate = todayStr;
  save();
} else if (LOGIC.shouldAdvanceProgrammeDay(data.dayStartedDate, data['d-' + data.dayStartedDate], todayStr)) {
  data.day = (data.day || 1) + 1;
  data.dayStartedDate = todayStr;
  save();
}

// ── Step registry names ───────────────────────────────────────────────────
const STEP_NAMES  = ['vocab', 'recall', 'speak', 'case', 'interview'];
const STEP_LABELS = ['Vocab', 'Recall', 'Speak', 'Case', 'Interview'];
const STEP_TIMES  = ['~8 min', '~5 min', '~5 min', '~7 min', '~5 min'];

// ── Backup import IIFE ────────────────────────────────────────────────────
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
      if (parsed.recallResumeProfile) localStorage.setItem('recallResumeProfile', parsed.recallResumeProfile);
      data = JSON.parse(localStorage.getItem('recallData')) || {};
      LOGIC.migrate(data);
      save();
      fi.value = '';
      renderApp();
    };
    reader.readAsText(file);
  });
})();

// ── Resume file input IIFE ────────────────────────────────────────────────
(function(){
  var fi = document.createElement('input');
  fi.type = 'file'; fi.accept = '.pdf'; fi.className = 'hidden'; fi.id = 'resumeFileInput';
  document.body.appendChild(fi);
  fi.addEventListener('change', function(){
    var file = fi.files[0]; fi.value = ''; if (!file) return;
    extractPDF(file);
  });
})();

// ── PDF helpers ───────────────────────────────────────────────────────────
let _pdfjs = null;

async function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  try {
    var lib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.min.mjs');
    lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.min.mjs';
    _pdfjs = lib;
    return lib;
  } catch(e) { return null; }
}

function setResumeLoading(isLoading) {
  ['resume-upload','resume-replace'].forEach(function(a) {
    var btn = document.querySelector('[data-action="' + a + '"]');
    if (btn) {
      btn.disabled = isLoading;
      if (!isLoading && btn.dataset.origText) { btn.textContent = btn.dataset.origText; delete btn.dataset.origText; }
      else if (isLoading) { btn.dataset.origText = btn.textContent; btn.textContent = 'Extracting text…'; }
    }
  });
}

function showResumePasteArea(msg) {
  var journey = document.getElementById('journey');
  if (!journey) return;
  var html = '<div class="card" id="resumePasteCard"><h3>Your resume</h3>';
  if (msg) html += '<p class="muted">' + esc(msg) + '</p>';
  html += '<textarea id="resumePasteArea" placeholder="Paste your resume text here…" aria-label="Paste resume text" style="min-height:200px"></textarea>';
  html += '<button class="btn primary" data-action="resume-save-paste" style="margin-top:8px">Save resume</button>';
  html += '</div>';
  // Replace existing paste card if any, else append
  var existing = document.getElementById('resumePasteCard');
  if (existing) { existing.outerHTML = html; } else { journey.insertAdjacentHTML('beforeend', html); }
  setResumeLoading(false);
}

async function extractPDF(file) {
  setResumeLoading(true);
  var lib = await loadPdfJs();
  if (!lib) {
    showResumePasteArea("Couldn't load PDF reader — paste your resume text instead.");
    return;
  }
  try {
    var arrayBuffer = await file.arrayBuffer();
    var pdf = await lib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    var allText = '';
    for (var p = 1; p <= pdf.numPages; p++) {
      var page = await pdf.getPage(p);
      var content = await page.getTextContent();
      allText += content.items.map(function(it) { return it.str; }).join(' ') + '\n';
    }
    var avgCharsPerPage = pdf.numPages > 0 ? allText.length / pdf.numPages : 0;
    if (avgCharsPerPage < 100) {
      showResumePasteArea('This PDF has no readable text. Paste your resume text in the box below instead.');
      return;
    }
    localStorage.setItem('recallResume', allText.trim());
    localStorage.setItem('recallResumeProfile', 'other');
    setResumeLoading(false);
    renderApp();
  } catch(e) {
    showResumePasteArea("Couldn't read this file — try another PDF or paste the text.");
  }
}

// ── Built-in profile: Saiteja Tirunagari ──────────────────────────────────
var SAITEJA_RESUME = 
  "SAITEJA TIRUNAGARI\n" +
  "AI-First Product Manager • 0→1 Builder • 6+ Years • Hyderabad, India\n" +
  "Contact details on file • Hyderabad, India\n\n" +
  "SUMMARY\n" +
  "AI-first Product Manager and former EdTech founder shipping 0→1 products at scale: acquisition funnels, LLM-powered platforms, " +
  "and high-volume automation serving 1M+ users, 100K+ payments, and a ₹1,120+ Cr annual pipeline. Architected LLM evaluation " +
  "engines (80% human parity), AI ingestion pipelines (1,800 apps/min, 10x cost reduction), and conversational AI that lifted payment " +
  "conversion 36 pp. Hands-on with LLM integration, prompt engineering, SQL, and REST APIs.\n\n" +
  "EXPERIENCE\n" +
  "NxtWave Disruptive Technologies (Jan 2023 – Present • Hyderabad)\n" +
  "Promoted twice in three years: Influencer Marketing Executive → Growth Manager → Product Manager\n" +
  "Product Manager (May 2024 – Present)\n" +
  "• Owned product strategy, roadmap, and Agile delivery for 6+ internal products across acquisition, admissions, and sales enablement: " +
  "1M+ users, 100K+ fee payments, ₹1,120+ Cr pipeline; improved feature delivery timelines 20%.\n" +
  "• NIAT Application Portal (1M+ users, 100K+ payments): Led end-to-end revamp of unified funnel (landing → OTP → payment → slot → exam → report → sales) " +
  "integrated with CRM, WebEngage, payment systems; scaled to 140K+ OTP-verified leads (97% detail-completion, 95% exam attendance). " +
  "Lifted 0–60 min payment completion 27% → 63% (+36 pp) via coupon urgency logic, behavioral nudges, frictionless WhatsApp payment flow; +7 pp overall conversion.\n" +
  "• Referral Platform (v1 & v2): Conceived and launched centralized referral platform across 3 verticals; delivered 25% of 2025 admissions intake as low-CAC organic channel. " +
  "Built no-code workflow configurator enabling non-technical teams to deploy custom criteria; 5x active referrers, 3x enrollments.\n" +
  "• AI-Powered Sales Audit Platform: Architected LLM evaluation engine assessing 100% of sales demos against standardized rubrics (80% human parity). " +
  "Migrated pipeline to Google STT + Gemini Flash (~50% lower cost, +20% transcription accuracy). Shipped manager dashboards across 6-tier sales hierarchy.\n" +
  "• AI Sales Chatbot: Redesigned landing-page chatbot into stage-wise conversion engine; 6,700+ leads, 113 enrollments. Designed Hot-Warm-Cold lead scoring " +
  "with real-time CRM routing (+10 pp call success, 50%+ lift in seat-reservation conversion).\n" +
  "• Offline Applications Processing: Built AI ingestion pipeline processing 1,800 applications/minute (300K+ total): 90% time reduction, 10x cost savings (₹4 → ₹0.10/page). " +
  "Engineered multi-version form support with dynamic routing and Salesforce CRM integration.\n" +
  "• Growth Infrastructure: Launched personalized NAT Results Report with 24-hr time-gated preview (visibility 18% → 69%, 3.8x, sharing up 2.5x). " +
  "Designed 8 landing pages on Unleash A/B engine (up to 38% Visit→OTP; cut lead leakage 25%, raised SQLs 18%).\n" +
  "• Shipped NIAT Launchpad: Mobile-first AI-learning MVP for Grades 9–12 built with single developer via AI-assisted development (428 users, 100% onboarding, 38.7% activation).\n\n" +
  "Growth Manager (Mar 2023 – May 2024)\n" +
  "• Built 300+ college partner network across AP, Telangana, Karnataka. Generated 15,000+ webinar registrations, 35,000 scholarship test leads. Launched 0→1 refer-and-earn campaign.\n\n" +
  "BYJU'S (Think & Learn) | Assistant Manager, User Experience (Aug 2019 – Dec 2022 • Bengaluru)\n" +
  "• Owned onboarding, engagement, retention for freemium K–12 online classes: 40,000 customers, 20-person CX team. " +
  "Built user-engagement dashboard for mentors. Redesigned onboarding via UX research and A/B testing (+8% retention). " +
  "Ran 0→1 Social-Emotional Learning pilot. Held refund rate <5%, CSAT >95%, sustained 95%+ MRR.\n\n" +
  "ML Edutech | Founder (Aug 2015 – Jul 2019 • Hyderabad)\n" +
  "• Launched EdTech app portfolio of 275 apps with 3M+ cumulative downloads; owned P&L, acquisition, strategic partnerships. " +
  "Built Android apps in Java/Kotlin with Firebase real-time database.\n\n" +
  "EDUCATION & SKILLS\n" +
  "• IIM Rohtak: Diploma, Product & Brand Management\n" +
  "• JNTU Hyderabad: B.E., Civil Engineering | Osmania University: Diploma, Business Management\n" +
  "• Product: Roadmap Prioritization, 0→1 Product Development, GTM, OKRs, RICE, MoSCoW, PRDs, User Stories, Stakeholder Management\n" +
  "• Technical & AI: AI/ML Product Development, LLM Integration (Gemini, Claude, GPT), Prompt Engineering, Evaluation Rubrics, STT/OCR, SQL, Python, REST APIs\n" +
  "• Analytics & Tools: Amplitude, Mixpanel, Google Analytics, Looker, Unleash A/B Testing, Segment, Figma, Jira, Salesforce, WebEngage";

function getActiveResume() {
  var profile = localStorage.getItem('recallResumeProfile') || 'saiteja';
  if (profile === 'saiteja') {
    return SAITEJA_RESUME;
  }
  return localStorage.getItem('recallResume') || '';
}

function renderResumeSection() {
  var profile = localStorage.getItem('recallResumeProfile') || 'saiteja';
  var customSaved = localStorage.getItem('recallResume') || '';
  var html = '<div class="card" id="resumeCard"><h3>Candidate Profile</h3>';
  html += '<div style="margin:8px 0 12px">';
  html += '<label class="small muted" for="resumeProfileSelect" style="display:block;margin-bottom:4px">Select Candidate Profile</label>';
  html += '<select id="resumeProfileSelect" style="width:100%;max-width:320px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px 12px;font-size:14px">';
  html += '<option value="saiteja"' + (profile === 'saiteja' ? ' selected' : '') + '>Saiteja Tirunagari (Configured)</option>';
  html += '<option value="other"' + (profile === 'other' ? ' selected' : '') + '>Other (Upload custom resume)</option>';
  html += '</select>';
  html += '</div>';

  if (profile === 'saiteja') {
    html += '<div style="border-left:3px solid var(--green);background:var(--panel2);padding:10px 14px;border-radius:0 8px 8px 0">';
    html += '<p style="margin:0 0 4px;font-weight:600;color:var(--green)">✓ Profile Active: Saiteja Tirunagari</p>';
    html += '<p class="small muted" style="margin:0">AI coach personalizes cases and interview contexts to your 0→1 EdTech &amp; AI PM background.</p>';
    html += '</div>';
  } else {
    if (!customSaved) {
      html += '<p class="muted">No custom resume saved</p>';
      html += '<p class="small">Upload a PDF or paste text to personalize feedback for a different profile.</p>';
      html += '<button class="btn" data-action="resume-upload">Upload PDF resume</button>';
    } else {
      html += '<div style="border-left:3px solid var(--accent);background:var(--panel2);padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:8px">';
      html += '<p style="margin:0 0 4px;font-weight:600;color:var(--accent)">✓ Custom Resume Loaded</p>';
      html += '<p class="small muted" style="margin:0">' + customSaved.length + ' characters configured on this device.</p>';
      html += '</div>';
      html += '<div class="row" style="margin-top:8px">';
      html += '<button class="btn" data-action="resume-replace">Replace resume</button>';
      html += '<button class="btn" data-action="resume-delete">Delete resume</button>';
      html += '</div>';
    }
  }
  html += '</div>';
  return html;
}

// ── Render: top toolbar (all pages) ───────────────────────────────────────
function renderTopToolbar() {
  var curDay = currentDayNum();
  var actDay = activeDayNum();
  var isPast = (actDay !== curDay);
  var maxDay = Math.max(curDay, actDay);

  var html = '<div class="card" style="margin-bottom:14px;padding:10px 14px;background:var(--panel2);border:1px solid var(--line);border-radius:12px">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">';

  // Left: Day dropdown & Revisit indicator
  html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  html += '<label for="dayNavSelect" class="small muted" style="font-weight:600">Day:</label>';
  html += '<select id="dayNavSelect" aria-label="Select day to visit" style="background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:5px 10px;font-size:13px;font-weight:700;cursor:pointer">';
  for (var d = 1; d <= maxDay; d++) {
    var label = 'Day ' + d + (d === curDay ? ' (Today)' : '');
    html += '<option value="' + d + '"' + (d === actDay ? ' selected' : '') + '>' + label + '</option>';
  }
  html += '<option value="jump">Jump to any day\u2026</option>';
  html += '</select>';

  if (isPast) {
    html += '<span class="tag" style="background:var(--panel);border-color:var(--accent);color:var(--accent);font-weight:600">Viewing Day ' + actDay + '</span>';
    html += '<button class="btn small" data-action="return-today" style="padding:4px 10px;font-size:12px;font-weight:600;background:var(--panel);border-color:var(--line)">Return to Today (Day ' + curDay + ') &rarr;</button>';
  }
  html += '</div>';

  // Right: Restart or Retake button
  html += '<div style="display:flex;align-items:center;gap:8px">';
  if (isPast) {
    html += '<button class="btn small" data-action="day-retake" style="padding:4px 12px;font-size:12px;font-weight:600;border-color:var(--accent);color:var(--accent)" title="Reset and retake Day ' + actDay + ' answers without touching other days">&#8635; Retake Day ' + actDay + '</button>';
  } else {
    html += '<button class="btn small" data-action="day-restart" style="padding:4px 12px;font-size:12px;font-weight:600" title="Reset today\'s answers and restart Day ' + actDay + ' from Step 1">&#8635; Restart Day ' + actDay + '</button>';
  }
  html += '</div>';

  html += '</div>';
  html += '</div>';
  return html;
}

// ── Render: stepper ───────────────────────────────────────────────────────
function renderStepper(currentStep) {
  var vd = data[activeDateKey()];
  var maxReached = (vd && vd.complete) ? 5 : ((vd && (vd.maxStep || vd.step)) || 0);
  var html = '<div class="stepper" role="list">';
  for (var i = 0; i < 5; i++) {
    var cls = i < currentStep ? 'step complete' : (i === currentStep ? 'step active' : 'step');
    var circle = i < currentStep ? '✓' : (i + 1);
    var aria = 'aria-label="Step ' + (i+1) + ' of 5: ' + STEP_LABELS[i] + '"' +
               (i === currentStep ? ' aria-current="step"' : '');
    var canClick = (vd && (vd.complete || (i + 1) <= maxReached));
    var clickAttr = canClick ? ' data-action="stepper-step" data-step="' + (i + 1) + '" style="cursor:pointer" title="Go to ' + esc(STEP_LABELS[i]) + '"' : '';
    html += '<div class="' + cls + '" role="listitem"' + clickAttr + '>';
    html += '<div class="step-circle" ' + aria + '>' + circle + '</div>';
    html += '<div class="step-label">' + esc(STEP_LABELS[i]) + '</div>';
    html += '</div>';
    if (i < 4) html += '<div class="step-line"></div>';
  }
  var sumCls = currentStep >= 5 ? 'step complete' : 'step';
  var canClickSum = (vd && vd.complete);
  var sumClickAttr = canClickSum ? ' data-action="view-summary" style="cursor:pointer" title="View Summary"' : '';
  html += '<div class="step-line"></div>';
  html += '<div class="' + sumCls + '" role="listitem"' + sumClickAttr + '>';
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
  var streakStr = streak === 0 ? 'Day 1 — streak starting' : (streak === 1 ? '1-day streak' : streak + '-day streak');
  var html = '<div class="row" style="margin:12px 0 8px">';
  html += '<span style="color:var(--green);font-weight:700;font-size:18px">' + esc(streakStr) + '</span>';
  if (longest > 0) html += '<span class="muted small">&nbsp;· longest: ' + longest + ' day' + (longest === 1 ? '' : 's') + '</span>';
  html += '</div>';
  html += '<details open><summary class="small muted" style="cursor:pointer;margin-bottom:6px">' + (day() > 30 ? 'Last 30 days' : '30-day progress') + '</summary>';
  html += '<div class="day-grid">';
  var off = Math.max(0, currentDayNum() - 30);
  for (var i = 1; i <= 30; i++) {
    var dNum = i + off;
    var dateKey = dateKeyForDay(dNum);
    var dd = data[dateKey];
    var complete = dd && (dd.complete === true || dd.step >= 5);
    var isCurrent = (dNum === currentDayNum());
    var isActive = (dNum === activeDayNum());
    var isFuture = (dNum > currentDayNum());
    var style = '';
    if (complete) style = 'background:var(--green);border-color:var(--green);';
    else if (isCurrent) style = 'background:var(--accent);border-color:var(--accent);';
    else if (isFuture) style = 'background:transparent;border-color:var(--line);';
    else style = 'background:var(--panel2);border-color:var(--line);';
    if (isActive) style += 'outline:2px solid var(--text);outline-offset:2px;';
    var clickAttr = '';
    if (dNum <= currentDayNum()) {
      style += 'cursor:pointer;';
      clickAttr = ' data-action="grid-day-click" data-day="' + dNum + '"';
    }
    html += '<div class="day-dot" title="Day ' + dNum + (isActive ? ' (active)' : '') + '" style="' + style + '"' + clickAttr + '></div>';
  }
  html += '</div></details>';
  return html;
}

// ── Render: feedback slot (self-check rubric) ─────────────────────────────
function renderFeedbackSlot(stepId) {
  var vd = data[activeDateKey()];
  var savedChecked = (vd && vd[stepId] && Array.isArray(vd[stepId].rubricChecked)) ? vd[stepId].rubricChecked : [];
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
    var checkedAttr = savedChecked.indexOf(idx) !== -1 ? ' checked' : '';
    html += '<label class="task"><input type="checkbox" data-rubric-idx="' + idx + '"' + checkedAttr + '> ' + esc(item) + '</label>';
  });
  html += '<button class="btn primary" data-action="step-done" style="margin-top:12px;width:100%">Done — move on</button>';

  var af = (vd && vd[stepId] && vd[stepId].aiFeedback) || null;
  if (af && af.score) {
    html += '<div id="aiFeedback" style="margin-top:12px">';
    html += '<div class="row" style="margin-bottom:8px">';
    html += '<span class="tag" style="background:var(--accent);color:#101827;border-color:var(--accent)">' + esc(String(af.score)) + '/10</span>';
    html += '</div>';
    if (af.fix) html += '<p><strong>One fix:</strong> ' + esc(af.fix) + '</p>';
    if (af.betterLine) html += '<div style="border-left:4px solid var(--accent);background:var(--panel2);padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0">' + esc(af.betterLine) + '</div>';
    html += '</div>';
  } else {
    html += '<div id="aiFeedback" class="hidden"></div>';
  }
  html += '</div>';
  return html;
}

// ── Render: entry screen ──────────────────────────────────────────────────
function renderEntry(dayData) {
  var step = (dayData && dayData.step) || 0;
  var stepperIdx = step > 0 ? step - 1 : 0;
  var html = renderStepper(stepperIdx);
  html += '<div class="card" style="margin-top:16px">';
  html += '<h1>Day ' + day() + (day() > 30 ? ' · Endless' : ' / 30') + (activeDayNum() !== currentDayNum() ? ' (Viewing)' : '') + '</h1>';
  html += renderGrid();
  // Weak-spot banner (WEAK-02)
  var weakTags = LOGIC.computeTopWeakSpots(data, todayStr);
  if (weakTags.length > 0) {
    html += '<div class="card" style="margin:12px 0;border-color:var(--accent)">';
    html += '<h3 style="margin:0 0 6px">Today\'s focus</h3>';
    html += '<p class="small">Your top weak spots (last 7 days): ' + weakTags.map(esc).join(', ') + '. Today\'s case and interview question target these.</p>';
    html += '</div>';
  }
  if (dayData && step > 0 && !dayData.complete) {
    html += '<button class="btn primary" data-action="journey-start" style="width:100%;margin-top:16px">Continue from Step ' + step + ' (' + esc(STEP_LABELS[step - 1] || '') + ')</button>';
  } else {
    html += '<button class="btn primary" data-action="journey-start" style="width:100%;margin-top:16px">' + (activeDayNum() !== currentDayNum() ? 'Start Day ' + day() + ' journey' : 'Start today\'s journey') + '</button>';
  }
  html += '</div>';
  html += renderResumeSection();
  return html;
}

// ── Render: daily performance report (Phase 5) ───────────────────────────
function renderDailyReport(dayData, dayNum) {
  if (!dayData || typeof LOGIC === 'undefined' || !LOGIC.computeDayReport) return '';
  var rpt = LOGIC.computeDayReport(dayData);
  if (!rpt) return '';

  var html = '<div class="card" style="margin:16px 0;border:1px solid var(--accent);background:var(--panel2)">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;border-bottom:1px solid var(--line);padding-bottom:12px">';
  html += '<div><h2 style="margin:0;font-size:20px">&#128202; Day ' + esc(String(dayNum)) + ' Performance Report</h2>';
  html += '<span class="small muted">Detailed breakdown of answers, feedback, strengths &amp; rectifications</span></div>';
  if (rpt.averageScore !== null) {
    var scoreColor = rpt.averageScore >= 7 ? 'var(--green)' : (rpt.averageScore >= 5 ? 'var(--accent)' : 'var(--muted)');
    html += '<div style="text-align:right">';
    html += '<div style="font-size:26px;font-weight:850;color:' + scoreColor + '">' + esc(String(rpt.averageScore)) + '<span style="font-size:16px;color:var(--muted)"> / 10</span></div>';
    html += '<span class="small muted">Average AI Score</span>';
    html += '</div>';
  }
  html += '</div>';

  // Metrics summary row
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-bottom:16px">';
  html += '<div style="background:var(--panel);padding:10px;border-radius:10px;border:1px solid var(--line);text-align:center">';
  html += '<div style="font-size:20px;font-weight:800;color:var(--text)">' + rpt.scoredCount + ' / 3</div>';
  html += '<div class="small muted">Answers Coached</div></div>';

  html += '<div style="background:var(--panel);padding:10px;border-radius:10px;border:1px solid var(--line);text-align:center">';
  html += '<div style="font-size:20px;font-weight:800;color:' + (rpt.totalFillers === 0 ? 'var(--green)' : 'var(--text)') + '">' + rpt.totalFillers + '</div>';
  html += '<div class="small muted">Filler Words</div></div>';

  html += '<div style="background:var(--panel);padding:10px;border-radius:10px;border:1px solid var(--line);text-align:center">';
  html += '<div style="font-size:20px;font-weight:800;color:' + (rpt.rectifiedCount > 0 ? 'var(--green)' : 'var(--muted)') + '">' + rpt.rectifiedCount + ' / ' + rpt.retriedCount + '</div>';
  html += '<div class="small muted">Retries Rectified</div></div>';

  html += '<div style="background:var(--panel);padding:10px;border-radius:10px;border:1px solid var(--line);text-align:center">';
  html += '<div style="font-size:20px;font-weight:800;color:var(--text)">' + (dayData.vocab && dayData.vocab.newWords ? dayData.vocab.newWords.length : 0) + '</div>';
  html += '<div class="small muted">Vocab Words</div></div>';
  html += '</div>';

  // 1. What Landed (Strengths / Good things done)
  if (rpt.strengths.length > 0) {
    html += '<div style="margin-bottom:16px;background:var(--panel);padding:14px;border-radius:12px;border-left:4px solid var(--green)">';
    html += '<h3 style="margin:0 0 8px;font-size:15px;color:var(--green)">&#10003; What Landed (Your Strengths)</h3>';
    html += '<ul style="margin:0;padding-left:18px;line-height:1.6">';
    rpt.strengths.forEach(function(st) {
      html += '<li><strong>' + esc(st.step.toUpperCase()) + ':</strong> ' + esc(st.text) + '</li>';
    });
    html += '</ul>';
    html += '</div>';
  }

  // 2. Step-by-Step Analysis (What you gave, mistakes, fixes, and rectifications)
  if (rpt.stepAnalyses.length > 0) {
    html += '<h3 style="margin:16px 0 10px;font-size:16px">Mistakes &amp; How to Improve</h3>';
    rpt.stepAnalyses.forEach(function(sa) {
      var stepTitle = sa.step === 'speak' ? 'Step 3: Spoken Answer' : (sa.step === 'case' ? 'Step 4: Product Case' : 'Step 5: Unexpected Interview');
      html += '<div class="card" style="margin-bottom:14px;background:var(--panel);border:1px solid var(--line);padding:14px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:8px">';
      html += '<div><strong>' + esc(stepTitle) + '</strong> <span class="tag" style="margin-left:6px">' + esc(sa.framework) + '</span></div>';
      if (sa.score !== null) {
        html += '<span class="tag" style="background:var(--accent);color:#101827;font-weight:700">' + esc(String(sa.score)) + '/10</span>';
      }
      html += '</div>';
      if (sa.question) {
        html += '<p class="small muted" style="margin:4px 0 10px"><em>Prompt: ' + esc(sa.question) + '</em></p>';
      }

      // What you gave
      if (sa.userAnswer) {
        html += '<div style="margin:8px 0;background:var(--bg);padding:10px 12px;border-radius:8px;border:1px solid var(--line)">';
        html += '<div class="small muted" style="font-weight:600;margin-bottom:4px">&#128483; What you gave:</div>';
        html += '<p style="margin:0;font-size:13px;line-height:1.5">' + esc(sa.userAnswer) + '</p>';
        if (sa.followupText) {
          html += '<p style="margin:6px 0 0;font-size:13px;color:var(--muted)"><em>Follow-up:</em> ' + esc(sa.followupText) + '</p>';
        }
        html += '</div>';
      }

      // Mistake / One fix
      if (sa.fix) {
        html += '<div style="margin:8px 0;padding:10px 12px;background:rgba(239, 68, 68, 0.08);border-left:3px solid #ef4444;border-radius:0 8px 8px 0">';
        html += '<div style="color:#f87171;font-weight:600;font-size:12px">&#9888; What went wrong / Needs fix:</div>';
        html += '<p style="margin:4px 0 0;font-size:13px">' + esc(sa.fix) + '</p>';
        html += '</div>';
      }

      // How to improve / rewritten line
      if (sa.betterLine) {
        html += '<div style="margin:8px 0;padding:10px 12px;background:rgba(98, 214, 164, 0.08);border-left:3px solid var(--green);border-radius:0 8px 8px 0">';
        html += '<div style="color:var(--green);font-weight:600;font-size:12px">&#9733; How to improve (Model phrasing):</div>';
        html += '<p style="margin:4px 0 0;font-size:13px;font-style:italic">"' + esc(sa.betterLine) + '"</p>';
        html += '</div>';
      }

      // Rectification (Try-again comparison)
      if (sa.retry && sa.retry.text) {
        var isImp = sa.retry.improved;
        html += '<div style="margin-top:10px;padding:10px 12px;background:var(--panel2);border:1px solid ' + (isImp ? 'var(--green)' : 'var(--line)') + ';border-radius:8px">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
        html += '<span class="tag" style="' + (isImp ? 'background:var(--green);color:#101827;font-weight:700' : 'background:var(--line)') + '">' + (isImp ? '&#10003; Mistake Rectified' : 'Retry Submitted') + '</span>';
        if (sa.retry.fix) html += '<span class="small muted">' + esc(sa.retry.fix) + '</span>';
        html += '</div>';
        html += '<div class="small" style="font-size:12px;color:var(--muted)"><strong>Retry attempt:</strong> ' + esc(sa.retry.text) + '</div>';
        if (sa.retry.betterLine) {
          html += '<div class="small" style="margin-top:4px;color:var(--green)">' + esc(sa.retry.betterLine) + '</div>';
        }
        html += '</div>';
      }

      html += '</div>';
    });
  }

  // 3. Vocab Sentences & AI Corrections
  if (rpt.vocabItems.length > 0) {
    html += '<h3 style="margin:16px 0 10px;font-size:16px">Vocabulary Check</h3>';
    html += '<div class="card" style="margin-bottom:14px;background:var(--panel);border:1px solid var(--line);padding:14px">';
    rpt.vocabItems.forEach(function(v) {
      var term = findTermById(v.id);
      var termName = term ? term.term : v.id;
      var isCorrect = v.aiVerdict === 'correct' || (v.aiVerdict === null && v.localVerdict === 'correct');
      html += '<div style="padding:8px 0;border-bottom:1px solid var(--line)">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<strong>' + esc(termName) + '</strong>';
      html += '<span class="tag" style="' + (isCorrect ? 'color:var(--green);border-color:var(--green)' : 'color:var(--accent);border-color:var(--accent)') + '">' + (isCorrect ? '&#10003; Correct' : 'Review needed') + '</span>';
      html += '</div>';
      html += '<p style="margin:4px 0 2px;font-size:13px"><em>Your sentence:</em> ' + esc(v.sentence) + '</p>';
      if (v.correctedSentence) {
        html += '<p class="small" style="margin:2px 0 0;color:var(--accent)">Suggested: ' + esc(v.correctedSentence) + '</p>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // 4. Teach-Back Analysis
  if (rpt.teachback && rpt.teachback.answer) {
    html += '<h3 style="margin:16px 0 10px;font-size:16px">Teach-Back Explanation</h3>';
    html += '<div class="card" style="margin-bottom:14px;background:var(--panel);border:1px solid var(--line);padding:14px">';
    if (rpt.teachback.concept) html += '<p class="small muted" style="margin:0 0 6px">Concept: <strong>' + esc(rpt.teachback.concept) + '</strong></p>';
    html += '<p style="margin:0 0 8px;font-size:13px"><strong>Your explanation:</strong> ' + esc(rpt.teachback.answer) + '</p>';
    if (rpt.teachback.gaps && rpt.teachback.gaps.length > 0) {
      html += '<div style="margin:6px 0;color:#f87171;font-size:12px"><strong>Gaps identified:</strong> ' + rpt.teachback.gaps.map(esc).join(', ') + '</div>';
    }
    if (rpt.teachback.betterExplanation) {
      html += '<div style="margin-top:6px;border-left:3px solid var(--accent);padding:6px 10px;background:var(--panel2);font-size:12px">' + esc(rpt.teachback.betterExplanation) + '</div>';
    }
    html += '</div>';
  }

  // Report actions: Print & Copy Summary
  html += '<div class="row" style="margin-top:14px;justify-content:flex-end">';
  html += '<button class="btn small" data-action="print-report" style="font-size:12px">&#128438; Print / Save PDF</button>';
  html += '<button class="btn small" data-action="copy-report" style="font-size:12px">&#128203; Copy Report Summary</button>';
  html += '</div>';

  html += '</div>';
  return html;
}

// ── Render: day summary ───────────────────────────────────────────────────
function isReviewDay() { return LOGIC.isReviewDayNum(day(), LESSONS); }

function renderSummary(dayData) {
  var streak = LOGIC.computeStreak(data, todayStr);
  var vocabDayData = dayData.vocab || {};
  var newWords = vocabDayData.newWords || [];
  var learnedCount = newWords.length;

  var html = '<h1>' + (activeDayNum() === currentDayNum() ? 'Done for today!' : 'Day ' + day() + ' Summary') + '</h1>';
  html += '<div class="row" style="margin:12px 0">';
  html += '<span>Day ' + day() + (day() > 30 ? ' · Endless' : '/30') + (activeDayNum() !== currentDayNum() ? ' (Past Day)' : '') + '</span>';
  html += '<span>· ' + learnedCount + ' word' + (learnedCount === 1 ? '' : 's') + ' learned</span>';
  html += '<span>· Streak: ' + streak + ' day' + (streak === 1 ? '' : 's') + '</span>';
  html += '</div>';

  html += renderDailyReport(dayData, day());

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

  var weakSummary = LOGIC.computeTopWeakSpots(data, todayStr);
  html += '<div class="card">';
  html += '<p><strong>Top weak spots:</strong> ' + (weakSummary.length ? weakSummary.map(esc).join(', ') : 'No weak spots yet') + '</p>';
  html += '</div>';

  if (isReviewDay()) {
    html += '<div class="card"><h2>Reflection</h2><p>What improved since your last review, and what will you drill next?</p>';
    html += '<textarea id="reflectionText" aria-label="Reflection" placeholder="Improved: … Next I will drill: …">' + esc(dayData.reflection || '') + '</textarea>';
    html += '<button class="btn" data-action="save-reflection">' + (dayData.reflection ? 'Saved ✓' : 'Save reflection') + '</button></div>';
  }
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

  html += '<div class="row" style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px">';
  if (activeDayNum() !== currentDayNum()) {
    html += '<button class="btn primary" data-action="return-today">Return to Today (Day ' + currentDayNum() + ') &rarr;</button>';
    html += '<button class="btn" data-action="day-retake" style="border-color:var(--accent);color:var(--accent)">&#8635; Retake Day ' + day() + '</button>';
  } else {
    html += '<button class="btn" data-action="day-restart">&#8635; Restart Day ' + day() + '</button>';
  }
  html += '</div>';
  return html;
}

// ── Helper: find term by id ───────────────────────────────────────────────
function findTermById(id) {
  for (var d = 0; d < VOCAB.length; d++) {
    for (var t = 0; t < VOCAB[d].length; t++) {
      if (VOCAB[d][t].id === id) return VOCAB[d][t];
    }
  }
  var packs = data.endless || {}; for (var k in packs) { var ws = packs[k].words || []; for (var j = 0; j < ws.length; j++) if (ws[j].id === id) return ws[j]; }
  return null;
}

// ── Helper: today's 5 vocab terms ────────────────────────────────────────
function todayTerms() {
  return dayWords();
}

// ── Helper: word IDs the user has reviewed at least once (box >= 2) ───────
function learnedWordIds() {
  return Object.keys(data.vocab || {}).filter(function(id) {
    return (data.vocab[id].box || 1) >= 2;
  });
}

// ── Day content (Phase 4): built-in for days 1-30, stored pack for 31+ ──
var BUILTIN = { VOCAB: VOCAB, QUESTIONS: QUESTIONS, CASES: CASES, INTERVIEW: INTERVIEW, LESSONS: LESSONS };
function dayPack() { return day() > 30 ? (data.endless || {})[day()] || null : null; }
function dayWords() { var p = dayPack(); return p ? p.words : (VOCAB[Math.min(day() - 1, VOCAB.length - 1)] || []); }
function dayQuestion() { var p = dayPack(); return p ? p.question : QUESTIONS[(day() - 1) % QUESTIONS.length]; }
function dayLesson() { var p = dayPack(); return p ? p.lesson : LESSONS[Math.min(day() - 1, LESSONS.length - 1)]; }
function dayCase() {
  var p = dayPack(); if (p) return p.case;
  var vd = data[activeDateKey()];
  if (!vd || vd.caseIdx === undefined) {
    var i = CASES.indexOf(LOGIC.selectByWeakSpot(CASES, LOGIC.computeTopWeakSpots(data, todayStr)));
    if (i < 0) i = (day() - 1) % CASES.length;
    if (!vd) return CASES[i];
    vd.caseIdx = i; save();
  }
  return CASES[vd.caseIdx];
}
function dayInterview() {
  var p = dayPack(); if (p) return p.interview;
  var vd = data[activeDateKey()];
  if (!vd || vd.interviewIdx === undefined) {
    var i = INTERVIEW.indexOf(LOGIC.selectByWeakSpot(INTERVIEW, LOGIC.computeTopWeakSpots(data, todayStr)));
    if (i < 0) i = (day() - 1) % INTERVIEW.length;
    if (!vd) return INTERVIEW[i];
    vd.interviewIdx = i; save();
  }
  return INTERVIEW[vd.interviewIdx];
}

// One AI call per endless day; any failure → remixed built-in day (END-02). Never rejects.
function buildEndlessDay() {
  var n = day(), topTags = LOGIC.computeTopWeakSpots(data, todayStr);
  var seen = LOGIC.collectSeen(BUILTIN, data.endless);
  var remix = function() { return LOGIC.remixDay(n, BUILTIN, data.vocab, topTags); };
  var th = document.getElementById('thinking');
  if (th) th.classList.remove('hidden');
  return workerCall('generate', {
    dayNum: n, topTags: topTags,
    seenTerms: seen.terms.slice(-500), seenQuestions: seen.questions.slice(-120),
    resumeExcerpt: getActiveResume().slice(0, 1500)
  }).then(function(res) { return LOGIC.validateGeneratedDay(res, seen, n) || remix(); }, remix)
    .then(function(p) {
      if (th) th.classList.add('hidden');
      data.endless = data.endless || {};
      data.endless[n] = p;
      save();
    });
}

// ── Helper: framework cheat card details element ──────────────────────────
function renderCheatCard(framework, dayNum) {
  var cc = typeof CHEAT_CARDS !== 'undefined' && CHEAT_CARDS[framework];
  if (!cc) return '';
  var open = dayNum <= 10 ? ' open' : '';
  var label = dayNum >= 21 ? 'Show framework hint' : 'Framework: ' + esc(framework);
  return '<details' + open + ' style="margin:8px 0"><summary class="small" style="cursor:pointer">' + label + '</summary>' +
    '<div style="background:var(--panel2);border-radius:8px;padding:10px;margin-top:4px">' +
    '<p class="small" style="margin:4px 0">' + esc(cc.l1) + '</p>' +
    '<p class="small" style="margin:4px 0">' + esc(cc.l2) + '</p>' +
    '<p class="small" style="margin:4px 0">' + esc(cc.l3) + '</p>' +
    '</div></details>';
}

// ── Helper: word chips row (5 terms) ──────────────────────────────────────
function renderWordChips() {
  var terms = todayTerms();
  if (!terms.length) return '';
  var html = '<div class="row" id="wordChips" style="flex-wrap:wrap;gap:6px;margin:8px 0">';
  terms.forEach(function(t) {
    html += '<span class="chip tag" data-term-id="' + esc(t.id) + '" title="' + esc(t.term) + '">' + esc(t.term.slice(0, 20)) + '</span>';
  });
  html += '</div>';
  return html;
}

// ── AI coach: show self-check fallback when AI unavailable ────────────────
function showSelfCheckFallback(stepId) {
  var af = document.getElementById('aiFeedback');
  if (!af) return;
  af.innerHTML = '<p class="small muted" style="margin-top:8px">AI unavailable — use the self-check below.</p>';
  af.classList.remove('hidden');
}

// ── AI coach: populate #aiFeedback with score/fix/betterLine ─────────────
function renderCoachFeedback(stepId, res) {
  var af = document.getElementById('aiFeedback');
  if (!af) return;
  if (!res || !LOGIC.validateCoachResponse(res)) { showSelfCheckFallback(stepId); return; }
  // Store full aiFeedback (Phase 5)
  var vd = data[activeDateKey()];
  if (!vd) return;
  if (!vd[stepId]) vd[stepId] = {};
  vd[stepId].aiFeedback = {
    score: res.score,
    landed: res.landed || '',
    fix: res.fix || '',
    betterLine: res.betterLine || '',
    tags: res.tags || [],
    wordsUsed: res.wordsUsed || []
  };
  save();
  var html = '<div style="margin-top:12px">';
  html += '<div class="row" style="margin-bottom:8px">';
  html += '<span class="tag" style="background:var(--accent);color:#101827;border-color:var(--accent)">' + esc(String(res.score)) + '/10</span>';
  if (res.landed) html += '<span class="small muted">&nbsp;' + esc(res.landed) + '</span>';
  html += '</div>';
  html += '<p><strong>One fix:</strong> ' + esc(res.fix) + '</p>';
  html += '<div style="border-left:4px solid var(--accent);background:var(--panel2);padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0">' + esc(res.betterLine) + '</div>';
  html += '<div class="row" style="margin-top:8px">';
  html += '<button class="btn" data-action="try-again" data-step-id="' + esc(stepId) + '">Try again with the fix</button>';
  html += '<button class="btn" data-action="show-model-answer" data-step-id="' + esc(stepId) + '">Show model answer</button>';
  html += '</div>';
  html += '</div>';
  af.innerHTML = html;
  af.classList.remove('hidden');
}

// ── AI coach: batch-check vocab sentences (fire-and-forget) ──────────────
function runVocabAICheck() {
  var vd = data[activeDateKey()];
  if (!vd || !vd.vocab || !vd.vocab.sentences) return;
  var sentences = [];
  Object.keys(vd.vocab.sentences).forEach(function(id) {
    var term = findTermById(id);
    if (!term) return;
    sentences.push({ id: id, term: term.term, sentence: vd.vocab.sentences[id] });
  });
  if (!sentences.length) return;
  var payload = LOGIC.buildCoachPayload('vocab', { sentences: sentences });
  workerCall('coach', payload).then(function(res) {
    if (!res || !Array.isArray(res.results)) return;
    var curVd = data[activeDateKey()];
    res.results.forEach(function(r) {
      var fb = document.getElementById('fb-' + r.id);
      if (fb) {
        fb.innerHTML = r.verdict === 'correct'
          ? '<span style="color:var(--green);font-weight:700">&#10003; Correct (AI verified)</span>'
          : '<span class="muted small">' + esc(r.correctedSentence || 'Review needed') + '</span>';
      }
      if (curVd && curVd.vocab) {
        if (!curVd.vocab.aiResults) curVd.vocab.aiResults = {};
        curVd.vocab.aiResults[r.id] = {
          verdict: r.verdict,
          correctedSentence: r.correctedSentence || ''
        };
      }
      if (data.vocab && data.vocab[r.id]) {
        data.vocab[r.id] = LOGIC.advanceLeitner(data.vocab[r.id], r.verdict, todayStr);
      }
    });
    save();
  }).catch(function() { /* fire-and-forget: vocab step completion not gated on AI */ });
}

// ── Render: vocab step ────────────────────────────────────────────────────
function renderVocab(container) {
  var newTerms = dayWords();
  var reviewIds = LOGIC.selectReviewWords(data.vocab || {}, todayStr, 5);
  reviewIds = reviewIds.filter(function(id) { return !newTerms.some(function(t) { return t.id === id; }); });

  var vd = data[activeDateKey()];
  if (!vd) vd = data[activeDateKey()] = { step: 1, complete: false, dayNumber: day() };
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

  if (!data.vocab) data.vocab = {};
  newTerms.forEach(function(t) {
    if (!data.vocab[t.id]) {
      data.vocab[t.id] = LOGIC.initWord(t.id, todayStr);
    }
  });
  save();

  var html = '';

  // Micro-lesson card (LEARN-07) — skip on review days (handled by 03-04)
  if (typeof LESSONS !== 'undefined') {
    var lesson = dayLesson();
    if (lesson && !lesson.isReview) {
      html += '<div class="card" style="margin-bottom:12px">';
      html += '<h2>' + esc(lesson.concept) + '</h2>';
      html += '<p>' + esc(lesson.detail) + '</p>';
      html += '<div style="border-left:4px solid var(--accent);background:var(--panel2);padding:12px 16px;border-radius:0 8px 8px 0;margin:8px 0">' + esc(lesson.workedExample) + '</div>';
      if (day() <= 10 && lesson.guidedStep) {
        html += '<p class="small muted">' + esc(lesson.guidedStep) + '</p>';
      }
      html += '</div>';
    }
  }

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

  if (newTerms.length > 0) {
    newTerms.forEach(function(term) {
      html += renderVocabCard(term, (dayPack() && dayPack().source === 'remix') ? 'Refresh (offline day)' : 'New word', vocabDayData);
    });
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
function renderRecall(container) {
  var prevKey = day() > 1 ? dateKeyForDay(day() - 1) : null;
  var yd = prevKey ? data[prevKey] : null;
  var html = '';

  if (day() <= 1 || !yd || !yd.vocab || !yd.vocab.newWords || yd.vocab.newWords.length === 0) {
    html += '<div class="card">';
    html += '<div class="row"><span class="tag">~5 min</span></div>';
    html += '<h2>' + (day() === 1 ? 'Day 1 — nothing to recall yet' : 'Nothing to recall from Day ' + (day() - 1)) + '</h2>';
    html += '<p class="muted">' + (day() === 1 ? 'Complete today\'s vocab and speaking steps. Tomorrow you\'ll recall what you learned here.' : 'No vocabulary words recorded for Day ' + (day() - 1) + '.') + '</p>';
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

    // Fix-recall quiz (LEARN-05): show if yesterday had an AI fix stored
    var yesterdayFix = null;
    if (yd.speak && yd.speak.aiFeedback && yd.speak.aiFeedback.fix) yesterdayFix = yd.speak.aiFeedback.fix;
    else if (yd.case && yd.case.aiFeedback && yd.case.aiFeedback.fix) yesterdayFix = yd.case.aiFeedback.fix;
    else if (yd.interview && yd.interview.aiFeedback && yd.interview.aiFeedback.fix) yesterdayFix = yd.interview.aiFeedback.fix;
    if (yesterdayFix) {
      html += '<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:12px">';
      html += '<h3>What was the main fix from yesterday\'s answer?</h3>';
      html += '<textarea id="fixRecallText" maxlength="400" placeholder="What do you remember?" style="margin-top:4px"></textarea>';
      html += '<button class="btn" data-action="recall-reveal-fix" style="margin-top:8px">Reveal fix</button>';
      html += '<div id="fixRevealPanel" class="hidden" style="margin-top:8px;border-left:4px solid var(--accent);background:var(--panel2);padding:12px 16px;border-radius:0 8px 8px 0">' + esc(yesterdayFix) + '</div>';
      html += '</div>';
    }

    // Teach-back section (LEARN-08): show if yesterday stored lesson.concept
    if (yd.lesson && yd.lesson.concept) {
      html += '<div style="margin-top:16px;border-top:1px solid var(--line);padding-top:12px">';
      html += '<h3>Teach it back</h3>';
      html += '<p>Explain \'' + esc(yd.lesson.concept) + '\' to a new teammate in 1-2 sentences.</p>';
      html += '<textarea id="teachbackText" maxlength="200" placeholder="Explain in 1-2 sentences…" style="margin-top:4px"></textarea>';
      html += '<button class="btn" data-action="teachback-submit" disabled style="margin-top:8px">Submit</button>';
      html += '<div id="teachbackResult"></div>';
      html += '</div>';
    }

    html += '<button class="btn primary" data-action="step-next" style="width:100%;margin-top:12px">Save &amp; continue →</button>';
    html += '</div>';
  }
  container.innerHTML = html;
}

// ── Render: speak step (Step 3) ───────────────────────────────────────────
function renderSpeakStep(container) {
  stop();
  accumulated = ''; fromSpeech = false;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var q = dayQuestion();
  var vd = data[activeDateKey()];
  var prevAns = (vd && vd.speak && (vd.speak.transcript || vd.speak.text)) || '';
  var hasAnswer = prevAns.length > 0;

  var html = '<div class="card">';
  html += '<div class="row"><span class="tag">~5 min</span></div>';
  html += '<h2>Spoken answer</h2>';
  html += '<p>' + esc(q.text) + '</p>';
  html += renderCheatCard(q.framework, day());
  html += renderWordChips();

  if (!SR) {
    html += '<p class="small muted">Microphone not available in this browser — type your answer below.</p>';
  }

  if (SR) {
    // Think phase (shown first, unless answer already exists)
    html += '<div id="thinkPhase"' + (hasAnswer ? ' style="display:none"' : '') + '>';
    html += '<p class="small muted" style="margin-top:12px">Think time</p>';
    html += '<div id="thinkTimer" class="timer" aria-live="polite" style="color:var(--muted)">0:30</div>';
    html += '<button class="btn primary" data-action="think-start" style="width:100%">Start — 30s to think</button>';
    html += '</div>';

    // Speak phase (shown after think ends or if already answered)
    html += '<div id="speakPhase"' + (hasAnswer ? '' : ' style="display:none"') + '>';
    html += '<div id="speakTimer" class="timer" aria-live="polite" style="color:var(--accent)">1:30</div>';
    html += '<button id="micBtn" class="btn" data-action="mic-toggle" aria-pressed="false" aria-label="Start recording" style="margin-top:8px;min-height:44px">🎙 Start speaking</button>';
    html += '<span id="recLabel" style="display:none;margin-left:8px" class="small muted">Recording… <span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>';
    html += '<textarea id="transcript" aria-label="Your answer transcript" placeholder="Edit your transcript here" style="' + (hasAnswer ? '' : 'display:none;') + 'margin-top:12px;min-height:120px">' + esc(prevAns) + '</textarea>';
    html += '<div id="fillerChip" class="tag" style="display:none;margin-top:8px"></div>';
    html += '</div>';
  } else {
    html += '<textarea id="transcript" aria-label="Your answer transcript" placeholder="Type your answer here" style="margin-top:12px;min-height:120px">' + esc(prevAns) + '</textarea>';
    html += '<div id="fillerChip" class="tag" style="display:none;margin-top:8px"></div>';
  }

  html += '</div>';
  html += '<button class="btn primary" data-action="speak-submit"' + (hasAnswer ? '' : ' disabled') + ' style="width:100%;margin-top:8px">Submit answer</button>';
  container.innerHTML = html;
}

// ── Render: case step (Step 4) ────────────────────────────────────
function renderCaseStep(container) {
  stop();
  accumulated = ''; fromSpeech = false;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var c = dayCase();
  var vd = data[activeDateKey()];
  var prevAns = (vd && vd.case && (vd.case.transcript || vd.case.text)) || '';
  var hasAnswer = prevAns.length > 0;

  var html = '<div class="card">';
  html += '<div class="row"><span class="tag">~7 min</span></div>';
  html += '<h2>Product case</h2>';
  html += '<h3>' + esc(c.title) + '</h3>';
  html += '<p>' + esc(c.scenario) + '</p>';
  html += renderCheatCard(c.framework, day());
  html += renderWordChips();

  if (!SR) {
    html += '<p class="small muted">Microphone not available in this browser — type your answer below.</p>';
  } else {
    html += '<button id="micBtn" class="btn" data-action="mic-toggle" aria-pressed="false" aria-label="Start recording" style="margin-top:8px;min-height:44px">🎙 Start speaking</button>';
    html += '<span id="recLabel" style="display:none;margin-left:8px" class="small muted">Recording… <span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>';
  }

  html += '<textarea id="transcript" aria-label="Your answer transcript" placeholder="' + (SR ? 'Edit your transcript here' : 'Type your answer here') + '" style="margin-top:12px;min-height:120px">' + esc(prevAns) + '</textarea>';
  html += '<div id="fillerChip" class="tag" style="display:none;margin-top:8px"></div>';

  html += '<button class="btn" data-action="case-reasoning" style="margin-top:8px">Show suggested reasoning</button>';
  html += '<div id="caseReasoning" style="display:none;margin-top:8px;padding:12px;background:var(--panel2);border-radius:10px"><p>' + esc(c.reasoning) + '</p></div>';
  html += '</div>';
  html += '<button class="btn primary" data-action="case-submit"' + (hasAnswer ? '' : ' disabled') + ' style="width:100%;margin-top:8px">Submit answer</button>';
  container.innerHTML = html;
}

// ── Render: interview step (Step 5) ───────────────────────────────────────
function renderInterviewStep(container) {
  stop();
  accumulated = ''; fromSpeech = false;
  firstAnswerText = ''; firstFromSpeech = false; firstFillerCount = 0;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var q = dayInterview();
  var vd = data[activeDateKey()];
  var prevAns = (vd && vd.interview && (vd.interview.transcript || vd.interview.text)) || '';
  var hasAnswer = prevAns.length > 0;

  var html = '<div class="card" id="interviewCard">';
  html += '<div class="row"><span class="tag">~5 min</span></div>';
  html += '<h2>Unexpected question</h2>';
  html += renderCheatCard(q.framework, day());
  html += '<p class="muted">Take a breath. Reveal the question when you\'re ready.</p>';
  html += '<button class="btn primary" data-action="interview-reveal"' + (hasAnswer ? ' style="display:none;width:100%;margin-top:12px"' : ' style="width:100%;margin-top:12px"') + '>Reveal question</button>';
  html += '<div id="questionText" style="' + (hasAnswer ? '' : 'display:none;') + 'margin-top:12px"><p><strong>' + esc(q.question) + '</strong></p></div>';

  // Think phase (hidden until reveal)
  html += '<div id="thinkPhase" style="display:none">';
  html += '<p class="small muted" style="margin-top:12px">Think time</p>';
  html += '<div id="thinkTimer" class="timer" aria-live="polite" style="color:var(--muted)">0:30</div>';
  html += '</div>';

  // Speak phase (hidden until think ends)
  html += '<div id="speakPhase" style="' + (hasAnswer ? '' : 'display:none') + '">';
  html += '<div id="speakTimer" class="timer" aria-live="polite" style="color:var(--accent)">1:30</div>';
  if (SR) {
    html += '<button id="micBtn" class="btn" data-action="mic-toggle" aria-pressed="false" aria-label="Start recording" style="margin-top:8px;min-height:44px">🎙 Start speaking</button>';
    html += '<span id="recLabel" style="display:none;margin-left:8px" class="small muted">Recording… <span class="dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span>';
  } else {
    html += '<p class="small muted">Microphone not available in this browser — type your answer below.</p>';
  }
  html += renderWordChips();
  html += '<textarea id="transcript" aria-label="Your answer transcript" placeholder="' + (SR ? 'Edit your transcript here' : 'Type your answer here') + '" style="' + (SR && !hasAnswer ? 'display:none;' : '') + 'margin-top:12px;min-height:120px">' + esc(prevAns) + '</textarea>';
  html += '<div id="fillerChip" class="tag" style="display:none;margin-top:8px"></div>';
  html += '</div>';

  html += '</div>'; // end #interviewCard
  html += '<button class="btn primary" data-action="interview-submit"' + (hasAnswer ? '' : ' disabled') + ' style="width:100%;margin-top:8px">Submit answer</button>';
  container.innerHTML = html;
}

// ── STEPS registry ────────────────────────────────────────────────────────
var STEPS = {
  vocab:     { render: renderVocab,     submit: function() {} },
  recall:    { render: renderRecall,    submit: function() {} },
  speak:     { render: renderSpeakStep, submit: function() {} },
  case:      { render: renderCaseStep,  submit: function() {} },
  interview: { render: renderInterviewStep, submit: function() {} }
};

// ── Core ──────────────────────────────────────────────────────────────────
function saveStepAnswer(stepId, answerObj) {
  var vd = data[activeDateKey()];
  if (!vd) vd = data[activeDateKey()] = { step: 0, complete: false, dayNumber: day() };
  vd.dayNumber = day();
  vd[stepId] = answerObj;
  save();
}

// Answer saved: lock the submit button and send the learner to the self-check; "Done — move on" advances.
function answerSaved(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Saved ✓'; }
  var slot = document.querySelector('[id^="rubricSlot-"]');
  if (slot) {
    slot.insertAdjacentHTML('afterbegin', '<p class="small" style="color:var(--green)">Answer saved — tick the self-check, then Done — move on.</p>');
    slot.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function goToStep(n) {
  var vd = data[activeDateKey()];
  if (!vd) vd = data[activeDateKey()] = { step: 0, complete: false, dayNumber: day() };
  vd.step = n;
  vd.dayNumber = day();
  if (!vd.maxStep || n > vd.maxStep) vd.maxStep = n;
  if (n > 5) {
    vd.complete = true;
    // Store lesson concept for tomorrow's teach-back (LEARN-08)
    if (typeof LESSONS !== 'undefined') {
      vd.lesson = { concept: (dayLesson() || {}).concept || '' };
    }
  }
  save();
  renderApp();
  window.scrollTo(0, 0);
}

function renderApp() {
  var dayData = data[activeDateKey()] || null;
  var container = document.getElementById('journey');
  if (!container) return;

  var topToolbar = renderTopToolbar();

  if (dayData && dayData.complete) {
    container.innerHTML = topToolbar + renderStepper(5) + renderSummary(dayData);
    return;
  }

  var step = (dayData && dayData.step) || 0;

  if (!dayData || step === 0) {
    container.innerHTML = topToolbar + renderEntry(dayData);
    return;
  }

  var stepIdx = step - 1;
  var stepName = STEP_NAMES[stepIdx] || STEP_NAMES[4];
  container.innerHTML = topToolbar + renderStepper(stepIdx) + '<div id="stepContent"></div>' + renderFeedbackSlot(stepName);
  if (stepName === 'vocab') {
    renderVocab(document.getElementById('stepContent'));
  } else if (stepName === 'recall') {
    renderRecall(document.getElementById('stepContent'));
  } else {
    STEPS[stepName].render(document.getElementById('stepContent'));
    // ponytail: review days reuse the normal steps (coach, mic, chips); questions already span frameworks
    if (isReviewDay()) document.getElementById('stepContent').insertAdjacentHTML('afterbegin', '<p class="tag" style="margin-bottom:10px">Review day ' + day() + ' — questions mix every framework so far; spot which one fits before you answer.</p>');
  }
}

// ── Event delegation ──────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  var el = e.target.closest('[data-action]');
  if (!el) return;
  var action = el.dataset.action;
  var dayData = data[activeDateKey()] || { step: 0, complete: false };
  var currentStep = dayData.step || 0;
  var stepIdx = currentStep - 1;
  var stepName = STEP_NAMES[stepIdx] || '';

  if (action === 'return-today') {
    delete data.viewDay;
    save();
    renderApp();
    return;
  }

  if (action === 'print-report') {
    window.print();
    return;
  }

  if (action === 'copy-report') {
    var curDayData = data[activeDateKey()];
    if (!curDayData || typeof LOGIC === 'undefined' || !LOGIC.computeDayReport) return;
    var r = LOGIC.computeDayReport(curDayData);
    if (!r) return;
    var summary = 'RECALL Day ' + day() + ' Performance Report\n' +
      'Score: ' + (r.averageScore !== null ? r.averageScore + '/10' : 'N/A') + '\n' +
      'Fillers: ' + r.totalFillers + '\n' +
      'Retries Rectified: ' + r.rectifiedCount + '/' + r.retriedCount + '\n\n' +
      'STRENGTHS:\n' + (r.strengths.length ? r.strengths.map(function(s){ return '• ' + s.step.toUpperCase() + ': ' + s.text; }).join('\n') : 'None recorded') + '\n\n' +
      'MISTAKES & FIXES:\n' + (r.fixes.length ? r.fixes.map(function(f){ return '• ' + f.step.toUpperCase() + ': ' + f.fix + (f.betterLine ? '\n  Suggested: ' + f.betterLine : ''); }).join('\n') : 'None recorded');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary).then(function() {
        el.textContent = 'Copied ✓';
        setTimeout(function() { el.textContent = '\uD83D\uDCCB Copy Report Summary'; }, 2000);
      }).catch(function() {
        prompt('Copy your report summary:', summary);
      });
    } else {
      prompt('Copy your report summary:', summary);
    }
    return;
  }

  if (action === 'day-restart' || action === 'day-retake') {
    var dNum = activeDayNum();
    var isPast = (dNum !== currentDayNum());
    var msg = isPast
      ? ('Retake Day ' + dNum + ' from the beginning? Your existing answers for Day ' + dNum + ' will be reset, but other days will not be affected.')
      : ('Restart Day ' + dNum + ' from Step 1? Your answers for today will be reset.');
    if (confirm(msg)) {
      stop();
      var key = activeDateKey();
      data[key] = { step: 0, complete: false, dayNumber: dNum };
      save();
      goToStep(1);
    }
    return;
  }

  if (action === 'stepper-step') {
    var targetStep = parseInt(el.dataset.step, 10);
    if (targetStep >= 1 && targetStep <= 5) {
      goToStep(targetStep);
    }
    return;
  }

  if (action === 'view-summary') {
    goToStep(6);
    return;
  }

  if (action === 'grid-day-click') {
    var targetDay = parseInt(el.dataset.day, 10);
    if (targetDay === currentDayNum()) {
      delete data.viewDay;
    } else {
      data.viewDay = targetDay;
    }
    save();
    renderApp();
    return;
  }

  if (action === 'journey-start') {
    if (!data[activeDateKey()]) data[activeDateKey()] = { step: 0, complete: false, dayNumber: day() };
    stop();
    var savedStep = data[activeDateKey()].step || 0;
    if (day() > 30 && !dayPack()) {
      el.disabled = true; el.textContent = 'Preparing today\'s fresh practice…';
      buildEndlessDay().then(function() { goToStep(savedStep > 0 ? savedStep : 1); });
      return;
    }
    goToStep(savedStep > 0 ? savedStep : 1);
    return;
  }

  if (action === 'step-next') {
    stop();
    if (stepName && STEPS[stepName]) STEPS[stepName].submit();
    if (stepName) saveStepAnswer(stepName, dayData[stepName] || {});
    if (stepName === 'vocab') runVocabAICheck(); // fire-and-forget
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

  if (action === 'save-reflection') {
    var rfEl = document.getElementById('reflectionText');
    if (!rfEl) return;
    var vdRef = data[activeDateKey()];
    if (!vdRef) return;
    vdRef.reflection = rfEl.value.trim();
    save();
    el.textContent = 'Saved ✓';
    el.disabled = true;
    return;
  }

  if (action === 'recall-reveal') {
    var rm = document.getElementById('recallMeanings');
    if (rm) rm.classList.remove('hidden');
    el.textContent = 'Meanings shown';
    return;
  }

  if (action === 'recall-reveal-fix') {
    var fpanel = document.getElementById('fixRevealPanel');
    if (fpanel) fpanel.classList.remove('hidden');
    el.textContent = 'Fix revealed';
    el.disabled = true;
    return;
  }

  if (action === 'teachback-submit') {
    var tbEl = document.getElementById('teachbackText');
    if (!tbEl || !tbEl.value.trim()) return;
    el.disabled = true; el.textContent = 'Checking…';
    var prevKeyTb = day() > 1 ? dateKeyForDay(day() - 1) : null;
    var ydTb = prevKeyTb ? data[prevKeyTb] : null;
    var conceptTb = (ydTb && ydTb.lesson && ydTb.lesson.concept) || '';
    var tbPayload = LOGIC.buildCoachPayload('teachback', { concept: conceptTb, answer: tbEl.value.trim() });
    workerCall('coach', tbPayload).then(function(res) {
      var tbResult = document.getElementById('teachbackResult');
      if (tbResult) {
        var tbHtml = '';
        if (res && Array.isArray(res.gaps) && typeof res.betterExplanation === 'string') {
          tbHtml = '<div style="margin-top:8px">';
          if (res.gaps.length > 0) {
            tbHtml += '<p><strong>Gaps found:</strong></p><ul>';
            res.gaps.forEach(function(g) { tbHtml += '<li>' + esc(g) + '</li>'; });
            tbHtml += '</ul>';
          }
          tbHtml += '<div style="border-left:4px solid var(--accent);background:var(--panel2);padding:12px 16px;border-radius:0 8px 8px 0;margin-top:8px">' + esc(res.betterExplanation) + '</div>';
          tbHtml += '</div>';
        } else {
          tbHtml = '<p class="small muted">AI unavailable — good effort.</p>';
        }
        tbResult.innerHTML = tbHtml;
      }
      var curVd = data[activeDateKey()];
      if (curVd) {
        if (!curVd.recall) curVd.recall = {};
        curVd.recall.teachback = {
          concept: conceptTb,
          answer: tbEl.value.trim(),
          gaps: (res && Array.isArray(res.gaps)) ? res.gaps : [],
          betterExplanation: (res && typeof res.betterExplanation === 'string') ? res.betterExplanation : ''
        };
        save();
      }
      el.disabled = false; el.textContent = 'Submit';
    }).catch(function() {
      var tbResult2 = document.getElementById('teachbackResult');
      if (tbResult2) tbResult2.innerHTML = '<p class="small muted">AI unavailable — good effort.</p>';
      el.disabled = false; el.textContent = 'Submit';
    });
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
    var vd = data[activeDateKey()];
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

  // ── Think-start (speak step) ──
  if (action === 'think-start') {
    el.disabled = true;
    startSpeakCountdown(30, function() {
      var thinkPhase = document.getElementById('thinkPhase');
      var speakPhase = document.getElementById('speakPhase');
      if (thinkPhase) thinkPhase.style.display = 'none';
      if (speakPhase) speakPhase.style.display = '';
      // Start 90s speak timer
      timerRunning = true;
      startSpeakCountdown(90, function() {
        timerRunning = false;
        stopRecording();
        var ta = document.getElementById('transcript');
        if (ta) {
          if (!ta.value.trim()) {
            if (accumulated.trim()) {
              ta.value = accumulated.trim();
            } else {
              ta.value = 'Nothing was captured — speak again or type your answer.';
            }
          }
          ta.style.display = '';
          updateFillerChip(accumulated, fromSpeech);
          enableSubmitIfReady();
        }
      });
    });
    return;
  }

  // ── Mic toggle ──
  if (action === 'mic-toggle') {
    if (el.getAttribute('aria-pressed') === 'true') {
      stopRecording();
      var ta2 = document.getElementById('transcript');
      if (ta2) {
        if (accumulated.trim() && !ta2.value.trim()) ta2.value = accumulated.trim();
        ta2.style.display = '';
        fromSpeech = !!accumulated.trim();
        updateFillerChip(accumulated, fromSpeech);
        enableSubmitIfReady();
      }
    } else {
      startRecording();
      fromSpeech = true;
    }
    return;
  }

  // ── Speak submit ──
  if (action === 'speak-submit') {
    var ta3 = document.getElementById('transcript');
    if (!ta3 || !ta3.value.trim()) return;
    var text3 = ta3.value.trim();
    fromSpeech = !!(accumulated.trim());
    var spQ = dayQuestion();
    saveStepAnswer('speak', {
      question: spQ.text,
      framework: spQ.framework,
      transcript: text3,
      fromSpeech: fromSpeech,
      fillerCount: fromSpeech ? LOGIC.countFillers(accumulated) : 0,
      rubricChecked: []
    });
    stop();
    answerSaved(el); // ponytail: Submit saves; only "Done — move on" advances
    // Fire AI coaching async (non-blocking — user can proceed immediately)
    var spPayload = LOGIC.buildCoachPayload('answer', {
      question: spQ.text,
      framework: spQ.framework,
      answer: text3,
      attempt: 1,
      todayWords: todayTerms(),
      learnedWords: learnedWordIds(),
      resumeExcerpt: getActiveResume().slice(0, 1500),
      stepType: 'speak'
    });
    var spTh = document.getElementById('thinking');
    if (spTh) spTh.classList.remove('hidden');
    workerCall('coach', spPayload).then(function(res) {
      if (spTh) spTh.classList.add('hidden');
      renderCoachFeedback('speak', res);
    }).catch(function() {
      if (spTh) spTh.classList.add('hidden');
      showSelfCheckFallback('speak');
    });
    return;
  }

  // ── Case reasoning toggle ──
  if (action === 'case-reasoning') {
    var cr = document.getElementById('caseReasoning');
    if (!cr) return;
    var showing = cr.style.display !== 'none';
    cr.style.display = showing ? 'none' : '';
    el.textContent = showing ? 'Show suggested reasoning' : 'Hide reasoning';
    return;
  }

  // ── Case submit ──
  if (action === 'case-submit') {
    var ta4 = document.getElementById('transcript');
    if (!ta4 || !ta4.value.trim()) return;
    var cObj = dayCase();
    fromSpeech = !!(accumulated.trim());
    var caseText = ta4.value.trim();
    var caseQ = cObj.title + ': ' + cObj.scenario;
    saveStepAnswer('case', {
      caseIndex: CASES.indexOf(cObj),
      question: caseQ,
      framework: cObj.framework,
      text: caseText,
      fromSpeech: fromSpeech,
      fillerCount: fromSpeech ? LOGIC.countFillers(accumulated) : 0,
      rubricChecked: []
    });
    stop();
    answerSaved(el); // ponytail: Submit saves; only "Done — move on" advances
    // Fire AI coaching async (non-blocking)
    var caPayload = LOGIC.buildCoachPayload('answer', {
      question: caseQ,
      framework: cObj.framework,
      answer: caseText,
      attempt: 1,
      todayWords: todayTerms(),
      learnedWords: learnedWordIds(),
      resumeExcerpt: getActiveResume().slice(0, 1500),
      stepType: 'case'
    });
    var caTh = document.getElementById('thinking');
    if (caTh) caTh.classList.remove('hidden');
    workerCall('coach', caPayload).then(function(res) {
      if (caTh) caTh.classList.add('hidden');
      renderCoachFeedback('case', res);
    }).catch(function() {
      if (caTh) caTh.classList.add('hidden');
      showSelfCheckFallback('case');
    });
    return;
  }

  // ── Interview reveal ──
  if (action === 'interview-reveal') {
    el.style.display = 'none';
    var qt = document.getElementById('questionText');
    if (qt) qt.style.display = '';
    var thinkPhaseI = document.getElementById('thinkPhase');
    if (thinkPhaseI) thinkPhaseI.style.display = '';
    // Start 30s think timer automatically
    startSpeakCountdown(30, function() {
      var thinkPhaseI2 = document.getElementById('thinkPhase');
      var speakPhaseI = document.getElementById('speakPhase');
      if (thinkPhaseI2) thinkPhaseI2.style.display = 'none';
      if (speakPhaseI) speakPhaseI.style.display = '';
      timerRunning = true;
      startSpeakCountdown(90, function() {
        timerRunning = false;
        stopRecording();
        var ta5 = document.getElementById('transcript');
        if (ta5) {
          if (!ta5.value.trim()) {
            if (accumulated.trim()) ta5.value = accumulated.trim();
            else ta5.value = 'Nothing was captured — speak again or type your answer.';
          }
          ta5.style.display = '';
          updateFillerChip(accumulated, fromSpeech);
          // enable interview-submit
          var isub = document.querySelector('[data-action="interview-submit"]');
          if (isub && ta5.value.trim()) isub.disabled = false;
        }
      });
    });
    return;
  }

  // ── Interview first answer submit ──
  if (action === 'interview-submit') {
    var ta6 = document.getElementById('transcript');
    if (!ta6 || !ta6.value.trim()) return;
    firstAnswerText = ta6.value.trim();
    firstFromSpeech = !!(accumulated.trim());
    firstFillerCount = firstFromSpeech ? LOGIC.countFillers(accumulated) : 0;
    stop();

    // Hide speak phase and submit button
    var speakPhaseI2 = document.getElementById('speakPhase');
    if (speakPhaseI2) speakPhaseI2.style.display = 'none';
    el.style.display = 'none';

    // Render follow-up card
    var q3 = dayInterview();
    var followup = FOLLOWUPS[q3.category] || 'What would you do differently next time?';
    var fuHtml = '<div class="card" style="margin-top:12px"><h3>Follow-up</h3>';
    fuHtml += '<p id="followupQuestion">' + esc(followup) + '</p>';
    fuHtml += '<textarea id="followupText" placeholder="Your answer…" aria-label="Follow-up answer" style="margin-top:8px;min-height:120px"></textarea>';
    fuHtml += '</div>';
    fuHtml += '<button class="btn primary" data-action="interview-final-submit" disabled style="width:100%;margin-top:8px">Submit answer</button>';
    var sc = document.getElementById('stepContent');
    if (sc) sc.insertAdjacentHTML('beforeend', fuHtml);
    return;
  }

  // ── Interview follow-up submit ──
  if (action === 'interview-final-submit') {
    var fuEl = document.getElementById('followupText');
    if (!fuEl || !fuEl.value.trim()) return;
    var ifQ = dayInterview();
    var fuText = fuEl.value.trim();
    saveStepAnswer('interview', {
      questionIndex: INTERVIEW.indexOf(ifQ),
      question: ifQ.question,
      framework: ifQ.framework,
      text: firstAnswerText,
      followupText: fuText,
      fromSpeech: firstFromSpeech,
      fillerCount: firstFillerCount,
      rubricChecked: []
    });
    stop();
    answerSaved(el); // ponytail: Submit saves; only "Done — move on" advances
    // Fire AI coaching async (non-blocking)
    var ifPayload = LOGIC.buildCoachPayload('answer', {
      question: ifQ.question,
      framework: ifQ.framework,
      answer: firstAnswerText,
      attempt: 1,
      todayWords: todayTerms(),
      learnedWords: learnedWordIds(),
      resumeExcerpt: getActiveResume().slice(0, 1500),
      stepType: 'interview'
    });
    var ifTh = document.getElementById('thinking');
    if (ifTh) ifTh.classList.remove('hidden');
    workerCall('coach', ifPayload).then(function(res) {
      if (ifTh) ifTh.classList.add('hidden');
      renderCoachFeedback('interview', res);
      if (res && res.socratiQ) {
        var fqEl = document.getElementById('followupQuestion');
        if (fqEl) fqEl.textContent = res.socratiQ; // safe: textContent, no innerHTML
      }
    }).catch(function() {
      if (ifTh) ifTh.classList.add('hidden');
      showSelfCheckFallback('interview');
    });
    return;
  }

  // ── Try-again (LEARN-03) ──
  if (action === 'try-again') {
    var taStepId = el.dataset.stepId;
    el.style.display = 'none';
    var vdTry = data[activeDateKey()];
    var tryFix = (vdTry && vdTry[taStepId] && vdTry[taStepId].aiFeedback && vdTry[taStepId].aiFeedback.fix) || '';
    var retryDiv = '<div id="retryArea" style="margin-top:12px">';
    retryDiv += '<textarea id="retryTranscript" placeholder="Try incorporating: ' + esc(tryFix) + '" aria-label="Retry answer" style="min-height:120px"></textarea>';
    retryDiv += '<button class="btn primary" data-action="retry-submit" data-step-id="' + esc(taStepId) + '" disabled style="width:100%;margin-top:8px">Submit retry</button>';
    retryDiv += '</div>';
    el.insertAdjacentHTML('afterend', retryDiv);
    return;
  }

  if (action === 'retry-submit') {
    var rsStepId = el.dataset.stepId;
    var rtEl = document.getElementById('retryTranscript');
    if (!rtEl || !rtEl.value.trim()) return;
    var retryText = rtEl.value.trim();
    var vdRetry = data[activeDateKey()];
    if (!vdRetry || !vdRetry[rsStepId]) return;
    var sd = vdRetry[rsStepId];
    var retryPayload = LOGIC.buildCoachPayload('retry', {
      question: sd.question || '',
      framework: sd.framework || '',
      answer: retryText,
      attempt1Text: sd.transcript || sd.text || '',
      todayWords: todayTerms(),
      resumeExcerpt: getActiveResume().slice(0, 1500)
    });
    el.disabled = true; el.textContent = 'Checking…';
    workerCall('coach', retryPayload).then(function(res) {
      var rHtml = '<div style="margin-top:8px;padding:12px;background:var(--panel2);border-radius:10px">';
      rHtml += '<p><strong>' + ((res && res.improved) ? '&#10003; Improved' : '&#8594; Keep working on it') + '</strong></p>';
      if (res && res.fix) rHtml += '<p class="small">' + esc(res.fix) + '</p>';
      if (res && res.betterLine) rHtml += '<div style="border-left:4px solid var(--accent);padding:8px 12px;margin-top:8px">' + esc(res.betterLine) + '</div>';
      rHtml += '</div>';
      var ra = document.getElementById('retryArea');
      if (ra) ra.insertAdjacentHTML('beforeend', rHtml);
      el.remove();
      sd.retry = {
        text: retryText,
        improved: !!(res && res.improved),
        fix: (res && res.fix) || '',
        betterLine: (res && res.betterLine) || ''
      };
      save();
    }).catch(function() { el.disabled = false; el.textContent = 'Submit retry'; });
    return;
  }

  // ── Show model answer (LEARN-04) ──
  if (action === 'show-model-answer') {
    var smaStepId = el.dataset.stepId;
    var vdModel = data[activeDateKey()];
    if (!vdModel || !vdModel[smaStepId]) return;
    var smd = vdModel[smaStepId];
    el.disabled = true; el.textContent = 'Loading…';
    var modelPayload = LOGIC.buildCoachPayload('model', {
      question: smd.question || '',
      framework: smd.framework || '',
      resumeExcerpt: getActiveResume().slice(0, 1500)
    });
    workerCall('coach', modelPayload).then(function(res) {
      var mHtml = '<div style="margin-top:8px;border-left:4px solid var(--green);background:var(--panel2);padding:12px 16px;border-radius:0 8px 8px 0">';
      mHtml += (res && res.modelAnswer) ? esc(res.modelAnswer) : '<span class="muted small">Could not generate model answer</span>';
      mHtml += '</div>';
      el.insertAdjacentHTML('afterend', mHtml);
      el.remove();
    }).catch(function() { el.disabled = false; el.textContent = 'Show model answer'; });
    return;
  }

  // ── Resume actions ──
  if (action === 'resume-upload' || action === 'resume-replace') {
    var rfi = document.getElementById('resumeFileInput');
    if (rfi) rfi.click();
    return;
  }

  if (action === 'resume-delete') {
    if (window.confirm('Delete your saved resume? Your practice history is not affected.')) {
      localStorage.removeItem('recallResume');
      renderApp();
    }
    return;
  }

  if (action === 'resume-save-paste') {
    var pasteEl = document.getElementById('resumePasteArea');
    if (!pasteEl || !pasteEl.value.trim()) return;
    localStorage.setItem('recallResume', pasteEl.value.trim());
    localStorage.setItem('recallResumeProfile', 'other');
    renderApp();
    return;
  }

  if (action === 'export-backup') {
    var payload = {
      recallData: data,
      recallResume: localStorage.getItem('recallResume') || '',
      recallResumeProfile: localStorage.getItem('recallResumeProfile') || 'saiteja'
    };
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

// ── Profile & Day navigation selector change delegation ──────────────────
document.addEventListener('change', function(e) {
  if (e.target && e.target.id === 'resumeProfileSelect') {
    localStorage.setItem('recallResumeProfile', e.target.value);
    renderApp();
    return;
  }
  if (e.target && e.target.id === 'dayNavSelect') {
    var val = e.target.value;
    if (val === 'jump') {
      var maxPossible = Math.max(currentDayNum(), activeDayNum()) + 10;
      var target = prompt('Enter day number to visit (1 to ' + maxPossible + '):', String(activeDayNum()));
      if (target && !isNaN(+target) && +target >= 1) {
        var tNum = Math.floor(+target);
        if (tNum === currentDayNum()) {
          delete data.viewDay;
        } else {
          data.viewDay = tNum;
        }
        save();
        renderApp();
      } else {
        renderApp();
      }
      return;
    }
    var targetDay = parseInt(val, 10);
    if (!isNaN(targetDay) && targetDay >= 1) {
      if (targetDay === currentDayNum()) {
        delete data.viewDay;
      } else {
        data.viewDay = targetDay;
      }
      save();
      renderApp();
    }
  }
});

// ── Input delegation ──────────────────────────────────────────────────────
document.addEventListener('input', function(e) {
  var id = e.target.id || '';
  var val = e.target.value || '';

  // Vocab sentence textarea → enable Save button
  if (e.target.tagName === 'TEXTAREA' && id.startsWith('sent-')) {
    var termId2 = id.slice(5);
    var btn2 = document.querySelector('[data-action="vocab-save"][data-term-id="' + CSS.escape(termId2) + '"]');
    if (btn2) btn2.disabled = !val.trim();
    return;
  }

  // Transcript textarea → enable step submit + update word chips
  if (id === 'transcript') {
    enableSubmitIfReady();
    var wc = document.getElementById('wordChips');
    if (wc) {
      var active = LOGIC.detectWordChips(val, todayTerms());
      wc.querySelectorAll('[data-term-id]').forEach(function(span) {
        span.classList.toggle('chip-active', active.has(span.dataset.termId));
      });
    }
    return;
  }

  // Retry textarea → enable retry-submit button
  if (id === 'retryTranscript') {
    var rsBtn = document.querySelector('[data-action="retry-submit"]');
    if (rsBtn) rsBtn.disabled = !val.trim();
    return;
  }

  // Teach-back textarea → enable teachback-submit button
  if (id === 'teachbackText') {
    var tbBtn = document.querySelector('[data-action="teachback-submit"]');
    if (tbBtn) tbBtn.disabled = !val.trim();
    return;
  }

  // Follow-up textarea → enable interview-final-submit
  if (id === 'followupText') {
    var fsub = document.querySelector('[data-action="interview-final-submit"]');
    if (fsub) fsub.disabled = !val.trim();
    return;
  }

  // Resume text textarea → auto-save + update char count
  if (id === 'resumeText') {
    localStorage.setItem('recallResume', val);
    var cc = document.getElementById('resumeCharCount');
    if (cc) cc.textContent = val.length + ' characters';
    return;
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────
checkAI();
renderApp();
