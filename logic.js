// logic.js — pure functions for RECALL (no DOM, no fetch, no window refs inside wrapper)
// UMD export: browser sets the global LOGIC object; Node uses module.exports (for logic.test.mjs)
(function(exports) {
  'use strict';

  // ── Date helpers ──────────────────────────────────────────────────────────

  function today() {
    return new Date().toLocaleDateString('en-CA');
  }

  function addDays(dateStr, n) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toLocaleDateString('en-CA');
  }

  // ── Leitner 5-Box System ──────────────────────────────────────────────────
  // BOX_INTERVAL[box] = days until next review (1-indexed; index 0 unused)
  var BOX_INTERVAL = [0, 1, 2, 4, 8];

  function initWord(termId, todayStr) {
    return { box: 1, nextReview: addDays(todayStr, BOX_INTERVAL[1]), lastResult: null };
  }

  function advanceLeitner(termState, result, todayStr) {
    if (result === 'correct') {
      var newBox = Math.min(termState.box + 1, 5);
      var days = newBox < 5 ? BOX_INTERVAL[newBox] : 999;
      return { box: newBox, nextReview: addDays(todayStr, days), lastResult: 'correct' };
    } else {
      return { box: 1, nextReview: addDays(todayStr, BOX_INTERVAL[1]), lastResult: 'wrong' };
    }
  }

  function selectReviewWords(vocabState, todayStr, maxReviews) {
    return Object.entries(vocabState)
      .filter(function(entry) {
        var s = entry[1];
        return s.box < 5 && s.nextReview <= todayStr;
      })
      .sort(function(a, b) { return a[1].box - b[1].box; })
      .slice(0, maxReviews)
      .map(function(entry) { return entry[0]; });
  }

  // ── Filler-word count ─────────────────────────────────────────────────────

  var FILLERS = /\b(um|uh|like|you know|sort of|basically|honestly|literally)\b/gi;

  function countFillers(text) {
    var matches = text.match(FILLERS);
    return matches ? matches.length : 0;
  }

  // ── Vocab correctness heuristic ───────────────────────────────────────────

  function jaccardSimilarity(a, b) {
    var wa = new Set(a.split(/\s+/));
    var wb = new Set(b.split(/\s+/));
    var intersect = Array.from(wa).filter(function(w) { return wb.has(w); }).length;
    return intersect / (wa.size + wb.size - intersect);
  }

  function checkVocab(termId, termText, sentence, exampleSentence) {
    var s = sentence.trim().toLowerCase();
    var ex = (exampleSentence || '').trim().toLowerCase();

    // 1. Minimum word count
    if (s.split(/\s+/).filter(Boolean).length < 6) return 'wrong';

    // 2. Reject near-copies of the example sentence
    if (s === ex || jaccardSimilarity(s, ex) >= 0.80) return 'wrong';

    var termLower = termText.toLowerCase();

    // 3. Direct term inclusion (full term or term stripped of parenthetical)
    if (s.includes(termLower)) return 'correct';
    var termNoParens = termLower.replace(/\s*\([^)]+\)/, '').trim();
    if (termNoParens && s.includes(termNoParens)) return 'correct';

    // 4. Parenthetical abbreviation (e.g. "Jobs-to-be-done (JTBD)" → check "jtbd")
    var abbrevMatch = termText.match(/\(([A-Z]+)\)/);
    if (abbrevMatch && s.includes(abbrevMatch[1].toLowerCase())) return 'correct';

    // 5. Root words (significant words > 4 chars)
    var roots = termLower
      .replace(/\([^)]+\)/, '')
      .split(/[\s\-\/]+/)
      .filter(function(w) { return w.length > 4; });
    if (roots.some(function(root) { return s.includes(root); })) return 'correct';

    return 'wrong';
  }

  // ── Streak computation ────────────────────────────────────────────────────

  function computeStreak(data, todayStr) {
    var streak = 0;
    var graceUsed = false;
    var d = new Date(todayStr + 'T00:00:00');
    var todayEpoch = d.getTime();

    while (true) {
      var dateStr = d.toLocaleDateString('en-CA');
      var dayData = data['d-' + dateStr];
      var complete = dayData && (dayData.complete === true || dayData.step >= 5);

      if (complete) {
        streak++;
        graceUsed = false;
        d.setDate(d.getDate() - 1);
      } else if (!graceUsed) {
        graceUsed = true;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }

      // Safety cap: 90 days back
      var daysBack = (todayEpoch - d.getTime()) / 86400000;
      if (daysBack > 90) break;
    }

    return streak;
  }

  function computeLongestStreak(data) {
    var completedDates = Object.keys(data)
      .filter(function(k) { return k.startsWith('d-') && data[k] && data[k].complete; })
      .map(function(k) { return k.slice(2); })
      .sort();

    if (completedDates.length === 0) return 0;

    var longest = 1;
    var current = 1;

    for (var i = 1; i < completedDates.length; i++) {
      var prev = new Date(completedDates[i - 1] + 'T00:00:00');
      var curr = new Date(completedDates[i] + 'T00:00:00');
      var diff = (curr - prev) / 86400000;

      if (diff === 1) {
        current++;
      } else if (diff === 2) {
        // one-gap grace
        current++;
      } else {
        current = 1;
      }

      if (current > longest) longest = current;
    }

    return longest;
  }

  // ── Data migration (v1 → v2 → v3) ───────────────────────────────────────

  function migrate(data) {
    // v1 → v2: add vocab and weakspots
    if (!data._version || data._version < 2) {
      data._version = 2;
      if (!data.vocab) data.vocab = {};
      if (!data.weakspots) data.weakspots = [];
      // Do NOT touch any existing v1 flat keys
    }
    // v2 → v3: additive only (aiFeedback and lesson.concept land here in Phase 3)
    if (data._version < 3) {
      data._version = 3;
    }
    return data;
  }

  // ── Coach payload builder ─────────────────────────────────────────────────

  function buildCoachPayload(mode, inputs) {
    var base = { task: 'coach', mode: mode };
    var excerpt = inputs.resumeExcerpt ? inputs.resumeExcerpt.slice(0, 1500) : '';
    if (mode === 'answer') {
      return Object.assign({}, base, {
        question: inputs.question,
        framework: inputs.framework,
        answer: inputs.answer,
        attempt: inputs.attempt,
        todayWords: inputs.todayWords,
        learnedWords: inputs.learnedWords,
        resumeExcerpt: excerpt,
        stepType: inputs.stepType
      });
    }
    if (mode === 'retry') {
      return Object.assign({}, base, {
        question: inputs.question,
        framework: inputs.framework,
        answer: inputs.answer,
        attempt1Text: inputs.attempt1Text,
        todayWords: inputs.todayWords,
        resumeExcerpt: excerpt
      });
    }
    if (mode === 'model') {
      return Object.assign({}, base, {
        question: inputs.question,
        framework: inputs.framework,
        resumeExcerpt: excerpt
      });
    }
    if (mode === 'vocab') {
      return Object.assign({}, base, { sentences: inputs.sentences });
    }
    if (mode === 'teachback') {
      return Object.assign({}, base, { concept: inputs.concept, answer: inputs.answer });
    }
    return base;
  }

  // ── Coach response validator ───────────────────────────────────────────────

  function validateCoachResponse(json) {
    if (!json) return false;
    if (typeof json.score !== 'number') return false;
    if (!Number.isInteger(json.score)) return false;
    if (json.score < 1 || json.score > 10) return false;
    if (typeof json.fix !== 'string' || json.fix.length === 0) return false;
    if (typeof json.betterLine !== 'string' || json.betterLine.length === 0) return false;
    if (!Array.isArray(json.tags)) return false;
    return true;
  }

  // ── Weak-spot aggregation ─────────────────────────────────────────────────

  function computeTopWeakSpots(data, todayStr, days) {
    days = days !== undefined ? days : 7;
    var counts = {};
    for (var i = 0; i < days; i++) {
      var d = addDays(todayStr, -i);
      var dd = data['d-' + d];
      if (!dd) continue;
      ['speak', 'case', 'interview'].forEach(function(step) {
        var tags = (dd[step] && dd[step].aiFeedback && dd[step].aiFeedback.tags) || [];
        tags.forEach(function(t) { counts[t] = (counts[t] || 0) + 1; });
      });
    }
    return Object.entries(counts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .slice(0, 3)
      .map(function(e) { return e[0]; });
  }

  // ── Adaptive question selection ───────────────────────────────────────────

  function selectByWeakSpot(items, topTags) {
    var topTagsSet = new Set(topTags);
    for (var i = 0; i < items.length; i++) {
      var tags = items[i].targetsTags || [];
      if (tags.some(function(t) { return topTagsSet.has(t); })) return items[i];
    }
    return items[0];
  }

  // ── Word chip detection ───────────────────────────────────────────────────
  // Reuses same root-strip logic as checkVocab step 3

  function detectWordChips(text, todayWords) {
    var found = new Set();
    var lower = text.toLowerCase();
    todayWords.forEach(function(w) {
      var tl = w.term.toLowerCase().replace(/\s*\([^)]+\)/, '').trim();
      if (lower.includes(tl)) found.add(w.id);
    });
    return found;
  }

  // ── Backup validation ─────────────────────────────────────────────────────

  function validateBackup(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    var d = parsed.recallData;
    if (!d || typeof d !== 'object') return false;
    if (typeof d.day !== 'number') return false;
    return true;
  }

  // ── Day-rollover predicate ────────────────────────────────────────────────

  function shouldAdvanceProgrammeDay(dayStartedDate, dayData, todayStr) {
    if (!dayStartedDate) return false;
    if (dayStartedDate === todayStr) return false;
    if (!dayData || dayData.complete !== true) return false;
    return true;
  }

  // ── Endless mode (END-01 / END-02) ────────────────────────────────────────
  var FRAMEWORKS = ['STAR', 'CIRCLES', 'issue-tree', 'RICE', 'PREP'];
  var COACH_TAGS = ['no-metric','no-structure','rambling','no-impact','generic',
    'no-framework','jargon-misuse','vague-action','missing-stakeholder','no-data-backing'];
  function normText(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function okStr(v, max) { return typeof v === 'string' && v.trim().length > 0 && v.length <= max; }
  function okFw(f) { return FRAMEWORKS.indexOf(f) >= 0; }
  function okTags(t) { return Array.isArray(t) && t.length > 0 && t.every(function(x) { return COACH_TAGS.indexOf(x) >= 0; }); }

  // Review days: built-in LESSONS flags for 1-30; every 7th day after that.
  function isReviewDayNum(n, lessons) {
    if (n <= 30) { var l = lessons && lessons[n - 1]; return !!(l && l.isReview); }
    return n % 7 === 0;
  }

  // Every term / question the learner has already seen (all built-in + all stored packs).
  // c = {VOCAB, QUESTIONS, CASES, INTERVIEW}
  function collectSeen(c, endless) {
    var terms = [], questions = [];
    c.VOCAB.forEach(function(d) { d.forEach(function(w) { terms.push(w.term); }); });
    c.QUESTIONS.forEach(function(q) { questions.push(q.text); });
    c.CASES.forEach(function(x) { questions.push(x.title); });
    c.INTERVIEW.forEach(function(x) { questions.push(x.question); });
    Object.keys(endless || {}).forEach(function(k) {
      var p = endless[k];
      (p.words || []).forEach(function(w) { terms.push(w.term); });
      if (p.question) questions.push(p.question.text);
      if (p.case) questions.push(p.case.title);
      if (p.interview) questions.push(p.interview.question);
    });
    return { terms: terms, questions: questions };
  }

  // Validates an AI reply and returns a clean pack (whitelisted fields only), or null.
  // ponytail: one bad field rejects the whole pack → caller remixes; partial repair not worth it.
  function validateGeneratedDay(p, seen, dayNum) {
    if (!p || !Array.isArray(p.words) || p.words.length !== 5) return null;
    var seenT = new Set(seen.terms.map(normText)), seenQ = new Set(seen.questions.map(normText));
    var words = [];
    for (var i = 0; i < 5; i++) {
      var w = p.words[i];
      if (!w || !okStr(w.term, 60) || !okStr(w.meaning, 220) || !okStr(w.everyday, 320) || !okStr(w.interview, 320)) return null;
      if (seenT.has(normText(w.term))) return null;
      seenT.add(normText(w.term));
      words.push({ id: 'g' + dayNum + '-' + i, term: w.term.trim(), meaning: w.meaning, everyday: w.everyday, interview: w.interview });
    }
    var q = p.question, c = p.case, iv = p.interview, l = p.lesson;
    if (!q || !okStr(q.text, 300) || !okFw(q.framework) || seenQ.has(normText(q.text))) return null;
    if (!c || !okStr(c.title, 100) || !okStr(c.scenario, 700) || !okStr(c.reasoning, 500) || !okFw(c.framework) || !okTags(c.targetsTags) || seenQ.has(normText(c.title))) return null;
    if (!iv || !okStr(iv.category, 40) || !okStr(iv.question, 300) || !okFw(iv.framework) || !okTags(iv.targetsTags) || seenQ.has(normText(iv.question))) return null;
    if (!l || !okStr(l.concept, 100) || !okStr(l.detail, 700) || !okStr(l.workedExample, 700) || !okFw(l.framework)) return null;
    return {
      source: 'ai', words: words,
      question: { text: q.text, framework: q.framework },
      case: { title: c.title, scenario: c.scenario, reasoning: c.reasoning, framework: c.framework, targetsTags: c.targetsTags },
      interview: { category: iv.category, question: iv.question, framework: iv.framework, targetsTags: iv.targetsTags },
      lesson: { concept: l.concept, detail: l.detail, workedExample: l.workedExample, framework: l.framework, guidedStep: '', isReview: false }
    };
  }

  // Offline / failure fallback. Deterministic from dayNum. c = {VOCAB, QUESTIONS, CASES, INTERVIEW, LESSONS}
  function remixDay(dayNum, c, vocabState, topTags) {
    var pickFrom = function(arr, k) { return arr[(dayNum * k) % arr.length]; };
    var byWeak = function(items, k) {
      var hit = items.filter(function(x) { return (x.targetsTags || []).some(function(t) { return topTags.indexOf(t) >= 0; }); });
      return pickFrom(hit.length ? hit : items, k);
    };
    var all = [];
    c.VOCAB.forEach(function(d) { d.forEach(function(w) { all.push(w); }); });
    var st = vocabState || {};
    var known = all.filter(function(w) { return st[w.id]; }).sort(function(a, b) {
      return (st[a.id].box - st[b.id].box) || String(st[a.id].nextReview).localeCompare(String(st[b.id].nextReview));
    });
    var words = (known.length >= 5 ? known : all.filter(function(_, i) { return (i - dayNum * 5 % all.length + all.length) % all.length < 5; })).slice(0, 5);
    var lessons = c.LESSONS.filter(function(l) { return !l.isReview; });
    return {
      source: 'remix', words: words,
      question: pickFrom(c.QUESTIONS, 7),
      case: byWeak(c.CASES, 3),
      interview: byWeak(c.INTERVIEW, 5),
      lesson: pickFrom(lessons, 11)
    };
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  // ── Performance report aggregation (Phase 5) ───────────────────────────
  function computeDayReport(dayData) {
    if (!dayData) return null;
    var steps = ['speak', 'case', 'interview'];
    var scores = [];
    var totalFillers = 0;
    var retriedCount = 0;
    var rectifiedCount = 0;
    var strengths = [];
    var fixes = [];
    var stepAnalyses = [];

    steps.forEach(function(sKey) {
      var s = dayData[sKey];
      if (!s) return;
      if (typeof s.fillerCount === 'number') totalFillers += s.fillerCount;
      var fb = s.aiFeedback || null;
      var ret = s.retry || null;
      if (fb && typeof fb.score === 'number') scores.push(fb.score);
      if (fb && fb.landed) strengths.push({ step: sKey, text: fb.landed });
      if (fb && fb.fix) fixes.push({ step: sKey, fix: fb.fix, betterLine: fb.betterLine });
      if (ret) {
        retriedCount++;
        if (ret.improved) rectifiedCount++;
      }
      stepAnalyses.push({
        step: sKey,
        question: s.question || '',
        framework: s.framework || '',
        userAnswer: s.transcript || s.text || '',
        followupText: s.followupText || '',
        score: fb ? fb.score : null,
        landed: fb ? fb.landed : '',
        fix: fb ? fb.fix : '',
        betterLine: fb ? fb.betterLine : '',
        tags: fb ? (fb.tags || []) : [],
        wordsUsed: fb ? (fb.wordsUsed || []) : [],
        retry: ret ? {
          text: ret.text || '',
          improved: !!ret.improved,
          fix: ret.fix || '',
          betterLine: ret.betterLine || ''
        } : null
      });
    });

    var avgScore = scores.length > 0
      ? Math.round((scores.reduce(function(a, b) { return a + b; }, 0) / scores.length) * 10) / 10
      : null;

    var vocab = dayData.vocab || {};
    var vocabItems = [];
    var sents = vocab.sentences || {};
    var results = vocab.results || {};
    var aiResults = vocab.aiResults || {};
    Object.keys(sents).forEach(function(termId) {
      vocabItems.push({
        id: termId,
        sentence: sents[termId],
        localVerdict: results[termId] || 'saved',
        aiVerdict: aiResults[termId] ? aiResults[termId].verdict : null,
        correctedSentence: aiResults[termId] ? aiResults[termId].correctedSentence : null
      });
    });

    var recall = dayData.recall || {};
    var teachback = recall.teachback || null;

    return {
      averageScore: avgScore,
      scoredCount: scores.length,
      totalFillers: totalFillers,
      retriedCount: retriedCount,
      rectifiedCount: rectifiedCount,
      strengths: strengths,
      fixes: fixes,
      stepAnalyses: stepAnalyses,
      vocabItems: vocabItems,
      teachback: teachback
    };
  }

  exports.today = today;
  exports.addDays = addDays;
  exports.initWord = initWord;
  exports.advanceLeitner = advanceLeitner;
  exports.selectReviewWords = selectReviewWords;
  exports.countFillers = countFillers;
  exports.checkVocab = checkVocab;
  exports.computeStreak = computeStreak;
  exports.computeLongestStreak = computeLongestStreak;
  exports.migrate = migrate;
  exports.validateBackup = validateBackup;
  exports.shouldAdvanceProgrammeDay = shouldAdvanceProgrammeDay;
  exports.buildCoachPayload = buildCoachPayload;
  exports.validateCoachResponse = validateCoachResponse;
  exports.computeTopWeakSpots = computeTopWeakSpots;
  exports.selectByWeakSpot = selectByWeakSpot;
  exports.detectWordChips = detectWordChips;
  exports.isReviewDayNum = isReviewDayNum;
  exports.collectSeen = collectSeen;
  exports.validateGeneratedDay = validateGeneratedDay;
  exports.remixDay = remixDay;
  exports.computeDayReport = computeDayReport;

})(typeof module !== 'undefined' ? module.exports : (window.LOGIC = window.LOGIC || {}));
