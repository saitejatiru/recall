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

  // ── Data migration (v1 → v2) ──────────────────────────────────────────────

  function migrate(data) {
    if (data._version >= 2) return data;
    data._version = 2;
    if (!data.vocab) data.vocab = {};
    if (!data.weakspots) data.weakspots = [];
    // Do NOT touch any existing v1 flat keys
    return data;
  }

  // ── Backup validation ─────────────────────────────────────────────────────

  function validateBackup(parsed) {
    if (!parsed || typeof parsed !== 'object') return false;
    var d = parsed.recallData;
    if (!d || typeof d !== 'object') return false;
    if (typeof d.day !== 'number') return false;
    return true;
  }

  // ── Exports ───────────────────────────────────────────────────────────────

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

})(typeof module !== 'undefined' ? module.exports : (window.LOGIC = window.LOGIC || {}));
