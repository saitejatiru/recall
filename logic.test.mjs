// Run: node logic.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const LOGIC = require('./logic.js');

const REF_DATE = '2026-11-10';

// ── advanceLeitner ────────────────────────────────────────────────────────

// box 1 correct → box 2, interval 2 days
var r1 = LOGIC.advanceLeitner({ box: 1, nextReview: REF_DATE, lastResult: null }, 'correct', REF_DATE);
assert.equal(r1.box, 2, 'box 1 correct → box 2');
assert.equal(r1.nextReview, LOGIC.addDays(REF_DATE, 2), 'box 1 correct → +2 days');
assert.equal(r1.lastResult, 'correct', 'lastResult = correct');

// box 2 wrong → box 1, interval 1 day
var r2 = LOGIC.advanceLeitner({ box: 2, nextReview: REF_DATE, lastResult: 'correct' }, 'wrong', REF_DATE);
assert.equal(r2.box, 1, 'box 2 wrong → box 1');
assert.equal(r2.nextReview, LOGIC.addDays(REF_DATE, 1), 'box 2 wrong → +1 day');
assert.equal(r2.lastResult, 'wrong', 'lastResult = wrong');

// box 4 correct → box 5, interval 999 days
var r3 = LOGIC.advanceLeitner({ box: 4, nextReview: REF_DATE, lastResult: 'correct' }, 'correct', REF_DATE);
assert.equal(r3.box, 5, 'box 4 correct → box 5');
assert.equal(r3.nextReview, LOGIC.addDays(REF_DATE, 999), 'box 4 correct → +999 days');

// box 5 correct → stays box 5 (capped at 5)
var r4 = LOGIC.advanceLeitner({ box: 5, nextReview: REF_DATE, lastResult: 'correct' }, 'correct', REF_DATE);
assert.equal(r4.box, 5, 'box 5 correct → stays box 5');
assert.equal(r4.nextReview, LOGIC.addDays(REF_DATE, 999), 'box 5 correct → +999 days');

// box 5 wrong → box 1
var r5 = LOGIC.advanceLeitner({ box: 5, nextReview: REF_DATE, lastResult: 'correct' }, 'wrong', REF_DATE);
assert.equal(r5.box, 1, 'box 5 wrong → box 1');
assert.equal(r5.nextReview, LOGIC.addDays(REF_DATE, 1), 'box 5 wrong → +1 day');

// ── initWord ──────────────────────────────────────────────────────────────

var iw = LOGIC.initWord('jtbd', REF_DATE);
assert.equal(iw.box, 1, 'initWord box = 1');
assert.equal(iw.nextReview, LOGIC.addDays(REF_DATE, 1), 'initWord nextReview = tomorrow');
assert.equal(iw.lastResult, null, 'initWord lastResult = null');

// ── selectReviewWords ─────────────────────────────────────────────────────

// Build a vocab state with 6 words due today (boxes 1–4), 1 box 5, 1 future
var vocabState = {
  word1: { box: 1, nextReview: REF_DATE, lastResult: 'wrong' },
  word2: { box: 2, nextReview: REF_DATE, lastResult: 'correct' },
  word3: { box: 1, nextReview: REF_DATE, lastResult: null },
  word4: { box: 4, nextReview: REF_DATE, lastResult: 'correct' },
  word5: { box: 3, nextReview: REF_DATE, lastResult: 'correct' },
  word6: { box: 2, nextReview: REF_DATE, lastResult: null },
  wordGraduated: { box: 5, nextReview: REF_DATE, lastResult: 'correct' }, // box 5 — excluded
  wordFuture: { box: 1, nextReview: '2026-12-01', lastResult: null }     // future — excluded
};

var reviews = LOGIC.selectReviewWords(vocabState, REF_DATE, 5);
assert.equal(reviews.length, 5, 'selectReviewWords returns at most 5');
assert.equal(reviews.includes('wordGraduated'), false, 'selectReviewWords excludes box 5');
assert.equal(reviews.includes('wordFuture'), false, 'selectReviewWords excludes future nextReview');

// Sorted by lowest box first: box 1 entries appear before box 2 entries in result
var idx1 = reviews.indexOf('word1'); // box 1
var idx2 = reviews.indexOf('word2'); // box 2
assert.equal(idx1 < idx2, true, 'selectReviewWords: box 1 before box 2');

// Smaller set test to verify box 1 before box 4
var smallVocab = {
  termA: { box: 4, nextReview: REF_DATE, lastResult: 'correct' },
  termB: { box: 1, nextReview: REF_DATE, lastResult: 'wrong' }
};
var smallReviews = LOGIC.selectReviewWords(smallVocab, REF_DATE, 5);
assert.equal(smallReviews[0], 'termB', 'selectReviewWords: box 1 before box 4 in small set');

// ── computeStreak ─────────────────────────────────────────────────────────

function makeData(dates) {
  var d = {};
  dates.forEach(function(date) {
    d['d-' + date] = { complete: true, step: 5 };
  });
  return d;
}

// 3 consecutive days → streak 3
var d3 = makeData(['2026-11-08', '2026-11-09', '2026-11-10']);
assert.equal(LOGIC.computeStreak(d3, '2026-11-10'), 3, '3 consecutive → streak 3');

// 3 days + 1 gap + 1 more = grace → streak 4 (3 complete + 1 grace day)
var dGrace = makeData(['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10']);
// Remove Nov 09 to create a gap: Nov 07, 08, (gap 09), 10
delete dGrace['d-2026-11-09'];
// Now: 10 (complete), 09 (gap, grace used), 08 (complete), 07 (complete) → streak = 3+1 = 3?
// Actually: walk from Nov 10 backward: 10 complete (streak=1, graceUsed=false), 09 missing (grace used, streak stays 1), 08 complete (streak=2, graceReset), 07 complete (streak=3), stop (06 missing, grace already not set... 06 is not in data)
// Wait: after 07 complete, grace reset. Then 06 is missing → grace used again. Then 05 missing → break. So streak = 3.
// But the plan says: "3 + 1 gap + 1 → 4 (grace)"
// Let me re-read: todayStr = 2026-11-10, days present: 07, 08, 10. Gap at 09.
// Walk: 10 complete→streak=1,graceUsed=false,go to 09; 09 missing→graceUsed=true,go to 08; 08 complete→streak=2,graceUsed=false,go to 07; 07 complete→streak=3,graceUsed=false,go to 06; 06 missing→graceUsed=true,go to 05; 05 missing→break. streak=3
// So 3+gap+1(before) = 3? The plan test says "3 consecutive → 3; 3 + 1 gap + 1 → 4 (grace)"
// Let me re-read: "3 + 1 gap + 1 → 4 (grace)" means 3 days + gap + 1 more day = 4 streak? That means today is AFTER the gap, but the 3 days ARE before the gap.
// Actually I think it means: today + prev 3 consecutive = 4 streak with one gap in between.
// Let me try: today=10, data: 10, 09 (gap), 08, 07, 06 → 5 complete days, 1 gap
// Walk from 10: 10→streak=1; 09 missing→grace; 08→streak=2; 07→streak=3; 06→streak=4; 05 missing→grace; 04 missing→break. streak=4
// That's "5 consecutive with 1 gap = 4"
// The plan says "N consecutive + one gap + 1 day = streak N+1" → 3+gap+1=4
// Let me try: today=10, data: 10, (09 gap), 08, 07, 06 → 4 complete, 1 gap in middle
// Walk: 10→streak=1; 09 missing→grace; 08→streak=2; 07→streak=3; 06→streak=4; 05 missing→grace; 04 missing→break. streak=4.
// OK so the scenario "3+gap+1=4" is: 3 complete + 1 gap + 1 more complete = 4 streak
var dGrace2 = makeData(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-10']);
// 10 complete, 09 gap, 08 complete, 07 complete, 06 complete → streak 4
assert.equal(LOGIC.computeStreak(dGrace2, '2026-11-10'), 4, '3 + gap + 1 → streak 4 (grace)');

// 3 days + 2 consecutive gaps → streak 3
var d3gaps = makeData(['2026-11-08', '2026-11-09', '2026-11-10']);
// but today has 2 consecutive prior gaps: data only has 10, 09, 08; before that is 07 and 06 missing
// Walk: 10→streak=1; 09→streak=2; 08→streak=3; 07 missing→grace; 06 missing→break. streak=3
assert.equal(LOGIC.computeStreak(d3gaps, '2026-11-10'), 3, '3 consecutive + 2 gaps after → streak 3');

// empty data → 0
assert.equal(LOGIC.computeStreak({}, '2026-11-10'), 0, 'empty data → streak 0');

// ── countFillers ──────────────────────────────────────────────────────────

assert.equal(LOGIC.countFillers('um like you know'), 3, '"um like you know" → 3');
assert.equal(LOGIC.countFillers('Um and uh'), 2, '"Um and uh" → 2');
assert.equal(LOGIC.countFillers('This is a clean sentence about products'), 0, 'clean sentence → 0');
assert.equal(LOGIC.countFillers('basically sort of honestly'), 3, '"basically sort of honestly" → 3');
assert.equal(LOGIC.countFillers(''), 0, 'empty string → 0');

// ── checkVocab ────────────────────────────────────────────────────────────

// term present in sentence → correct
var termId = 'jtbd', termText = 'Jobs-to-be-done (JTBD)';
var goodSentence = 'Using the jobs-to-be-done framework helped us understand what users really needed in that context.';
assert.equal(LOGIC.checkVocab(termId, termText, goodSentence, ''), 'correct', 'sentence with term → correct');

// < 6 words → wrong
assert.equal(LOGIC.checkVocab(termId, termText, 'JTBD is good', ''), 'wrong', '< 6 words → wrong');

// exact example sentence → wrong (Jaccard >= 0.80)
var example = 'I hire a smoothie not because I want a smoothie but because I want to get through a commute without getting hungry';
assert.equal(LOGIC.checkVocab(termId, termText, example, example), 'wrong', 'exact example → wrong');

// JTBD abbreviation → correct
var abbrevSentence = 'The concept of JTBD really changed how our team approached product discovery and user research.';
assert.equal(LOGIC.checkVocab(termId, termText, abbrevSentence, ''), 'correct', 'JTBD abbreviation → correct');

// no term, no root, too few words for a root match
var wrongSentence = 'The user wants to pay money quickly without issues happening in the system.';
assert.equal(LOGIC.checkVocab('northStarMetric', 'North Star Metric (NSM)', wrongSentence, ''), 'wrong', 'sentence without term/root → wrong');

// root word check: "retention" contains root "retent" (> 4 chars)
var rootSentence = 'The retention numbers improved significantly after we redesigned the onboarding for new users.';
assert.equal(LOGIC.checkVocab('retentionRate', 'Retention rate', rootSentence, ''), 'correct', 'root word match → correct');

// ── migrate ───────────────────────────────────────────────────────────────

// existing key preserved; _version set to 2; vocab and weakspots added
var v1 = { day: 5, 'recall-2026-01-01': 'some text', 'tasks-2026-01-01': [0, 1] };
var migrated = LOGIC.migrate(v1);
assert.equal(migrated._version, 2, 'migrate sets _version = 2');
assert.deepEqual(migrated.vocab, {}, 'migrate adds vocab = {}');
assert.deepEqual(migrated.weakspots, [], 'migrate adds weakspots = []');
assert.equal(migrated.day, 5, 'migrate preserves existing day key');
assert.equal(migrated['recall-2026-01-01'], 'some text', 'migrate preserves existing recall key');
assert.deepEqual(migrated['tasks-2026-01-01'], [0, 1], 'migrate preserves existing tasks key');

// second call on v2 data → no-op
var v2Already = { _version: 2, day: 3, vocab: { jtbd: { box: 2 } }, weakspots: ['a'] };
var migrated2 = LOGIC.migrate(v2Already);
assert.equal(migrated2._version, 2, 'migrate on v2 is no-op (version)');
assert.deepEqual(migrated2.vocab, { jtbd: { box: 2 } }, 'migrate on v2 preserves existing vocab');
assert.deepEqual(migrated2.weakspots, ['a'], 'migrate on v2 preserves existing weakspots');

// ── validateBackup ────────────────────────────────────────────────────────

assert.equal(LOGIC.validateBackup({ recallData: { day: 1 } }), true, 'minimal valid backup → true');
assert.equal(LOGIC.validateBackup({}), false, 'empty object → false (no recallData)');
assert.equal(LOGIC.validateBackup({ recallData: {} }), false, 'recallData without day → false');
assert.equal(LOGIC.validateBackup(null), false, 'null → false');
assert.equal(LOGIC.validateBackup({ recallData: { day: 'five' } }), false, 'day as string → false');
assert.equal(LOGIC.validateBackup({ recallData: { day: 5, vocab: {}, weakspots: [] } }), true, 'full v2 backup → true');

console.log('logic self-check: all passed');
