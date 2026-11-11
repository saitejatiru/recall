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

// existing key preserved; _version set to 3 (v1→v2→v3 chain); vocab and weakspots added
var v1 = { day: 5, 'recall-2026-01-01': 'some text', 'tasks-2026-01-01': [0, 1] };
var migrated = LOGIC.migrate(v1);
assert.equal(migrated._version, 3, 'migrate sets _version = 3 (v1 migrates to latest)');
assert.deepEqual(migrated.vocab, {}, 'migrate adds vocab = {}');
assert.deepEqual(migrated.weakspots, [], 'migrate adds weakspots = []');
assert.equal(migrated.day, 5, 'migrate preserves existing day key');
assert.equal(migrated['recall-2026-01-01'], 'some text', 'migrate preserves existing recall key');
assert.deepEqual(migrated['tasks-2026-01-01'], [0, 1], 'migrate preserves existing tasks key');

// v2 data → migrates to v3
var v2Already = { _version: 2, day: 3, vocab: { jtbd: { box: 2 } }, weakspots: ['a'] };
var migrated2 = LOGIC.migrate(v2Already);
assert.equal(migrated2._version, 3, 'migrate on v2 → v3');
assert.deepEqual(migrated2.vocab, { jtbd: { box: 2 } }, 'migrate on v2 preserves existing vocab');
assert.deepEqual(migrated2.weakspots, ['a'], 'migrate on v2 preserves existing weakspots');

// ── validateBackup ────────────────────────────────────────────────────────

assert.equal(LOGIC.validateBackup({ recallData: { day: 1 } }), true, 'minimal valid backup → true');
assert.equal(LOGIC.validateBackup({}), false, 'empty object → false (no recallData)');
assert.equal(LOGIC.validateBackup({ recallData: {} }), false, 'recallData without day → false');
assert.equal(LOGIC.validateBackup(null), false, 'null → false');
assert.equal(LOGIC.validateBackup({ recallData: { day: 'five' } }), false, 'day as string → false');
assert.equal(LOGIC.validateBackup({ recallData: { day: 5, vocab: {}, weakspots: [] } }), true, 'full v2 backup → true');

// ── shouldAdvanceProgrammeDay ─────────────────────────────────────────────

// 1. null dayStartedDate → false (first run, nothing to advance)
assert.equal(LOGIC.shouldAdvanceProgrammeDay(null, { complete: true }, '2026-11-10'), false,
  'shouldAdvanceProgrammeDay: null dayStartedDate → false');

// 2. dayStartedDate === todayStr → false (same-day reload after session complete: no double-advance)
assert.equal(LOGIC.shouldAdvanceProgrammeDay('2026-11-10', { complete: true }, '2026-11-10'), false,
  'shouldAdvanceProgrammeDay: same-day reload → false');

// 3. next calendar day, session was complete → true (advance exactly once)
assert.equal(LOGIC.shouldAdvanceProgrammeDay('2026-11-09', { complete: true }, '2026-11-10'), true,
  'shouldAdvanceProgrammeDay: next day + complete → true');

// 4. next calendar day but session was NOT complete → false
assert.equal(LOGIC.shouldAdvanceProgrammeDay('2026-11-09', { complete: false }, '2026-11-10'), false,
  'shouldAdvanceProgrammeDay: next day + incomplete → false');

// 5. startup called again same day after advance already set dayStartedDate=todayStr: no second advance
assert.equal(LOGIC.shouldAdvanceProgrammeDay('2026-11-10', { complete: true }, '2026-11-10'), false,
  'shouldAdvanceProgrammeDay: dayStartedDate already updated to today → false');

// ── migrate v2→v3 and v3 no-op (Phase 3) ────────────────────────────────────

// v2 data → _version becomes 3, existing keys preserved
var v2data = { _version: 2, day: 5, weakspots: ['a'] };
var migrated3 = LOGIC.migrate(v2data);
assert.equal(migrated3._version, 3, 'migrate: v2 → _version = 3');
assert.deepEqual(migrated3.weakspots, ['a'], 'migrate: v2 → weakspots preserved');
assert.equal(migrated3.day, 5, 'migrate: v2 → day preserved');

// v3 data → no-op (idempotent)
var v3data = { _version: 3, day: 7, vocab: { jtbd: { box: 3 } } };
var migrated3noop = LOGIC.migrate(v3data);
assert.equal(migrated3noop._version, 3, 'migrate: v3 is no-op');
assert.deepEqual(migrated3noop.vocab, { jtbd: { box: 3 } }, 'migrate: v3 no-op preserves vocab');

// ── buildCoachPayload ─────────────────────────────────────────────────────

var answerPayload = LOGIC.buildCoachPayload('answer', {
  question: 'Q', framework: 'STAR', answer: 'A', attempt: 1,
  todayWords: [], learnedWords: [], resumeExcerpt: 'R', stepType: 'speak'
});
assert.equal(answerPayload.task, 'coach', 'buildCoachPayload: task = coach');
assert.equal(answerPayload.mode, 'answer', 'buildCoachPayload: mode = answer');
assert.equal(answerPayload.resumeExcerpt, 'R', 'buildCoachPayload: resumeExcerpt passed through');
assert.equal(answerPayload.question, 'Q', 'buildCoachPayload: question present');
assert.equal(answerPayload.framework, 'STAR', 'buildCoachPayload: framework present');

// resumeExcerpt sliced to 1500 chars
var longResume = 'x'.repeat(2000);
var slicedPayload = LOGIC.buildCoachPayload('answer', { question: 'Q', framework: 'STAR', answer: 'A', attempt: 1, todayWords: [], learnedWords: [], resumeExcerpt: longResume });
assert.equal(slicedPayload.resumeExcerpt.length, 1500, 'buildCoachPayload: resumeExcerpt capped at 1500');

// model mode omits answer/attempt
var modelPayload = LOGIC.buildCoachPayload('model', { question: 'Q', framework: 'STAR', resumeExcerpt: 'R' });
assert.equal(modelPayload.task, 'coach', 'buildCoachPayload model: task = coach');
assert.equal(modelPayload.mode, 'model', 'buildCoachPayload model: mode = model');
assert.equal(modelPayload.answer, undefined, 'buildCoachPayload model: no answer field');

// teachback mode uses concept + answer
var teachPayload = LOGIC.buildCoachPayload('teachback', { concept: 'JTBD', answer: 'The job is the goal' });
assert.equal(teachPayload.concept, 'JTBD', 'buildCoachPayload teachback: concept present');

// ── validateCoachResponse ─────────────────────────────────────────────────

assert.equal(LOGIC.validateCoachResponse({ score: 7, fix: 'x', betterLine: 'y', tags: [] }), true, 'validateCoachResponse: valid response → true');
assert.equal(LOGIC.validateCoachResponse({ score: 10, fix: 'do this', betterLine: 'say this', tags: ['no-metric'] }), true, 'validateCoachResponse: score 10 → true');
assert.equal(LOGIC.validateCoachResponse({ score: 11, fix: 'x', betterLine: 'y', tags: [] }), false, 'validateCoachResponse: score 11 → false (out of range)');
assert.equal(LOGIC.validateCoachResponse({ score: 0, fix: 'x', betterLine: 'y', tags: [] }), false, 'validateCoachResponse: score 0 → false');
assert.equal(LOGIC.validateCoachResponse({ score: 7.5, fix: 'x', betterLine: 'y', tags: [] }), false, 'validateCoachResponse: float score → false');
assert.equal(LOGIC.validateCoachResponse({ score: 7, fix: '', betterLine: 'y', tags: [] }), false, 'validateCoachResponse: empty fix → false');
assert.equal(LOGIC.validateCoachResponse({ score: 7, fix: 'x', betterLine: 'y' }), false, 'validateCoachResponse: missing tags → false');
assert.equal(LOGIC.validateCoachResponse(null), false, 'validateCoachResponse: null → false');

// ── computeTopWeakSpots ───────────────────────────────────────────────────

// Build 7 days of mock data: no-metric 5×, rambling 3×, generic 1×
var mockData = {};
// Day 1-5: no-metric appears in speak, case (and sometimes interview) → 5 total
mockData['d-2026-11-10'] = { speak: { aiFeedback: { tags: ['no-metric'] } } };
mockData['d-2026-11-09'] = { speak: { aiFeedback: { tags: ['no-metric', 'rambling'] } } };
mockData['d-2026-11-08'] = { case:  { aiFeedback: { tags: ['no-metric', 'rambling'] } } };
mockData['d-2026-11-07'] = { interview: { aiFeedback: { tags: ['no-metric', 'rambling'] } } };
mockData['d-2026-11-06'] = { speak: { aiFeedback: { tags: ['no-metric', 'generic'] } } };
// days 5 and 6 (back from today): only have no-data entries
// totals: no-metric: 5, rambling: 3, generic: 1

var topSpots = LOGIC.computeTopWeakSpots(mockData, '2026-11-10', 7);
assert.deepEqual(topSpots, ['no-metric', 'rambling', 'generic'], 'computeTopWeakSpots: correct order');

// empty data → []
assert.deepEqual(LOGIC.computeTopWeakSpots({}, '2026-11-10', 7), [], 'computeTopWeakSpots: empty data → []');

// default days=7 parameter
var topSpotsDefault = LOGIC.computeTopWeakSpots(mockData, '2026-11-10');
assert.equal(topSpotsDefault[0], 'no-metric', 'computeTopWeakSpots: default days works');

// ── selectByWeakSpot ──────────────────────────────────────────────────────

var items = [
  { id: 'a', targetsTags: ['no-metric'] },
  { id: 'b', targetsTags: ['rambling'] },
  { id: 'c', targetsTags: ['generic'] }
];

var selected = LOGIC.selectByWeakSpot(items, ['no-metric']);
assert.equal(selected.id, 'a', 'selectByWeakSpot: picks first item with matching tag');

var selectedSecond = LOGIC.selectByWeakSpot(items, ['rambling']);
assert.equal(selectedSecond.id, 'b', 'selectByWeakSpot: picks item matching rambling');

// no overlap → fallback to items[0]
var selectedFallback = LOGIC.selectByWeakSpot(items, []);
assert.equal(selectedFallback.id, 'a', 'selectByWeakSpot: no topTags → fallback to items[0]');

var selectedNoMatch = LOGIC.selectByWeakSpot(items, ['jargon-misuse']);
assert.equal(selectedNoMatch.id, 'a', 'selectByWeakSpot: no match → fallback to items[0]');

// items without targetsTags → fallback
var plainItems = [{ id: 'x' }, { id: 'y' }];
var selectedPlain = LOGIC.selectByWeakSpot(plainItems, ['no-metric']);
assert.equal(selectedPlain.id, 'x', 'selectByWeakSpot: items without targetsTags → fallback');

// ── detectWordChips ───────────────────────────────────────────────────────

var todayWords = [
  { id: 'jtbd', term: 'Jobs-to-be-done (JTBD)' },
  { id: 'northStarMetric', term: 'North Star Metric (NSM)' },
  { id: 'retentionRate', term: 'Retention rate' }
];

var chips1 = LOGIC.detectWordChips('using the jobs-to-be-done framework here', todayWords);
assert.equal(chips1.has('jtbd'), true, 'detectWordChips: finds jtbd in text');
assert.equal(chips1.has('northStarMetric'), false, 'detectWordChips: does not find NSM');

var chips2 = LOGIC.detectWordChips('I tracked north star metric and retention rate', todayWords);
assert.equal(chips2.has('northStarMetric'), true, 'detectWordChips: finds north star metric');
assert.equal(chips2.has('retentionRate'), true, 'detectWordChips: finds retention rate');
assert.equal(chips2.has('jtbd'), false, 'detectWordChips: jtbd not in second text');

// empty text → empty set
var chipsEmpty = LOGIC.detectWordChips('', todayWords);
assert.equal(chipsEmpty.size, 0, 'detectWordChips: empty text → empty set');

// ── Endless mode ──
var L = LOGIC;
var mkW = function(d, i) { return { id: 'w' + d + i, term: 'Word ' + d + '-' + i, meaning: 'm', everyday: 'e', interview: 'i' }; };
var c = {
  VOCAB: [0, 1].map(function(d) { return [0,1,2,3,4].map(function(i) { return mkW(d, i); }); }),
  QUESTIONS: [{ text: 'Q1?', framework: 'STAR' }, { text: 'Q2?', framework: 'PREP' }],
  CASES: [{ title: 'C1', scenario: 's', reasoning: 'r', framework: 'RICE', targetsTags: ['no-metric'] },
          { title: 'C2', scenario: 's', reasoning: 'r', framework: 'issue-tree', targetsTags: ['rambling'] }],
  INTERVIEW: [{ category: 'behavioural', question: 'I1?', framework: 'STAR', targetsTags: ['no-impact'] },
              { category: 'product', question: 'I2?', framework: 'CIRCLES', targetsTags: ['rambling'] }],
  LESSONS: [{ concept: 'L1', detail: 'd', workedExample: 'w', framework: 'STAR', guidedStep: '', isReview: false },
            { concept: 'R', isReview: true, frameworks: [] }]
};
assert.equal(L.remixDay(32, c, {}, ['rambling']).case.title, 'C2', 'remix case follows weak spot');
assert.equal(L.isReviewDayNum(35, []), true); assert.equal(L.isReviewDayNum(36, []), false);
var seenX = { terms: ['North Star metric'], questions: ['Old question?'] };
var good = { words: [0,1,2,3,4].map(function(i){ return { term: 'Term ' + i, meaning: 'm', everyday: 'e', interview: 'i' }; }),
  question: { text: 'New question?', framework: 'STAR' },
  case: { title: 'New case', scenario: 's', reasoning: 'r', framework: 'RICE', targetsTags: ['no-metric'] },
  interview: { category: 'behavioural', question: 'New interview?', framework: 'PREP', targetsTags: ['rambling'] },
  lesson: { concept: 'c', detail: 'd', workedExample: 'w', framework: 'CIRCLES' } };
var v = L.validateGeneratedDay(good, seenX, 31);
assert.ok(v && v.words[0].id === 'g31-0' && v.source === 'ai', 'valid pack accepted with ids');
assert.equal(L.validateGeneratedDay(Object.assign({}, good, { words: good.words.slice(0, 4) }), seenX, 31), null, '4 words rejected');
var dup = JSON.parse(JSON.stringify(good)); dup.words[2].term = 'north-star METRIC'; assert.equal(L.validateGeneratedDay(dup, seenX, 31), null, 'seen term rejected (normalised)');
var badFw = JSON.parse(JSON.stringify(good)); badFw.case.framework = 'SWOT'; assert.equal(L.validateGeneratedDay(badFw, seenX, 31), null, 'unknown framework rejected');
assert.equal(L.validateGeneratedDay({ error: 'ai_error' }, seenX, 31), null, 'worker error body rejected');
var rm1 = L.remixDay(31, c, {}, []), rm2 = L.remixDay(31, c, {}, []);
assert.equal(rm1.words.length, 5); assert.deepEqual(rm1, rm2, 'remix is deterministic');
assert.ok(rm1.question.text && rm1.case.title && rm1.interview.question && rm1.lesson.concept, 'remix pack complete');
var st = {}; c.VOCAB[1].forEach(function(w, i) { st[w.id] = { box: i === 3 ? 1 : 3, nextReview: '2026-12-01' }; });
c.VOCAB[0].forEach(function(w) { st[w.id] = { box: 4, nextReview: '2026-12-01' }; });
assert.equal(L.remixDay(31, c, st, []).words[0].id, 'w13', 'remix picks weakest learned word first');
var seenAll = L.collectSeen(c, { '31': v });
assert.ok(seenAll.terms.indexOf('Term 0') >= 0 && seenAll.questions.indexOf('New case') >= 0, 'collectSeen includes packs');

// ── computeDayReport (Phase 5) ───────────────────────────────────────────
assert.equal(L.computeDayReport(null), null, 'null dayData returns null');
var sampleDay = {
  dayNumber: 3,
  vocab: {
    sentences: { 'v1': 'User story for checkout', 'v2': 'Acceptance criteria defined' },
    results: { 'v1': 'correct', 'v2': 'correct' },
    aiResults: {
      'v1': { verdict: 'correct', correctedSentence: '' },
      'v2': { verdict: 'review', correctedSentence: 'The acceptance criteria were defined by the PM.' }
    }
  },
  recall: {
    teachback: {
      answer: 'JTBD explains why customers buy products.',
      gaps: ['Mention emotional vs functional jobs'],
      betterExplanation: 'JTBD focuses on the underlying progress a user is trying to make.'
    }
  },
  speak: {
    question: 'How would you measure success?',
    framework: 'STAR',
    transcript: 'I measured success by looking at North Star metric.',
    fillerCount: 2,
    aiFeedback: {
      score: 7,
      landed: 'Clear opening framework and crisp metric choice',
      fix: 'Tie the metric directly to business impact',
      betterLine: 'At NxtWave, I tracked 0-60 min payment conversion lifting from 27% to 63%.',
      tags: ['no-impact'],
      wordsUsed: ['northStarMetric']
    },
    retry: {
      text: 'I measured success by lifting 0-60 min conversion from 27% to 63%.',
      improved: true,
      fix: 'Strong metric integration',
      betterLine: ''
    }
  },
  case: {
    question: 'Design an app for runners',
    framework: 'CIRCLES',
    text: 'First I would segment users into casual vs marathoners.',
    fillerCount: 1,
    aiFeedback: {
      score: 8,
      landed: 'Great segmentation and user persona empathy',
      fix: 'Prioritize one segment before detailing features',
      betterLine: 'I will prioritize casual runners who need habit formation.',
      tags: ['generic'],
      wordsUsed: ['userPersona']
    }
  }
};

var rpt = L.computeDayReport(sampleDay);
assert.ok(rpt, 'report generated');
assert.equal(rpt.averageScore, 75, 'average score computed correctly (7+8)/2 = 7.5 * 10 = 75');
assert.equal(rpt.totalFillers, 3, 'total fillers summed (2+1 = 3)');
assert.equal(rpt.retriedCount, 1, 'retried count = 1');
assert.equal(rpt.rectifiedCount, 1, 'rectified count = 1');
assert.equal(rpt.strengths.length, 2, '2 strengths extracted');
assert.equal(rpt.fixes.length, 2, '2 fixes extracted');
assert.equal(rpt.vocabItems.length, 2, '2 vocab items');
assert.equal(rpt.vocabItems[1].aiVerdict, 'review', 'aiVerdict mapped');
assert.ok(rpt.teachback && rpt.teachback.gaps.length === 1, 'teachback gaps mapped');
assert.ok(rpt.stepAnalyses[0].retry && rpt.stepAnalyses[0].retry.improved, 'step retry improved true');

// Cross-day habit tracking & repeated mistakes test
var pastDays = [
  { dayNumber: 2, speak: { aiFeedback: { score: 6, tags: ['no-metric', 'generic'] } } },
  { dayNumber: 1, speak: { aiFeedback: { score: 5, tags: ['no-metric'] } } }
];
// Case A: Today (sampleDay) has 'generic' and 'no-impact', so 'generic' is repeated from Day 2!
var rptWithHistory = L.computeDayReport(sampleDay, pastDays);
assert.equal(rptWithHistory.repeatedHabits.length, 1, '1 repeated habit detected');
assert.equal(rptWithHistory.repeatedHabits[0].tag, 'generic', 'generic is repeated habit');
assert.deepEqual(rptWithHistory.repeatedHabits[0].priorDays, [2], 'repeated from day 2');

// Breakthrough: Day 1 and Day 2 had 'no-metric', but today has NO 'no-metric' -> Breakthrough!
assert.equal(rptWithHistory.breakthroughs.length, 1, '1 breakthrough detected');
assert.equal(rptWithHistory.breakthroughs[0].tag, 'no-metric', 'no-metric is breakthrough');
assert.deepEqual(rptWithHistory.breakthroughs[0].priorDays, [1, 2], 'conquered after days 1 & 2');

// ── selectByWeakSpotNoRepeat ──────────────────────────────────────────────
(function() {
  var items = [
    { targetsTags: ['no-metric'] },
    { targetsTags: ['rambling'] },
    { targetsTags: ['generic'] },
    { targetsTags: [] }
  ];
  assert(LOGIC.selectByWeakSpotNoRepeat(items, ['no-metric'], 0) !== items[0], 'should skip lastIdx');
  assert(LOGIC.selectByWeakSpotNoRepeat(items, ['rambling'], 0) === items[1], 'picks weak-spot match skipping lastIdx');
  assert(LOGIC.selectByWeakSpotNoRepeat(items, [], 0) === items[1], 'no tags → first non-last');
  assert(LOGIC.selectByWeakSpotNoRepeat(items, [], 1) === items[2], 'no tags → cycles to next index (2)');
  assert(LOGIC.selectByWeakSpotNoRepeat(items, [], 3) === items[0], 'no tags → wraps to 0');
  assert(LOGIC.selectByWeakSpotNoRepeat(items, ['no-metric'], -1) === items[0], 'lastIdx -1 → normal pick');
  console.log('  selectByWeakSpotNoRepeat: ok');
})();

// ── computeDayReport score scale (1-100) ──────────────────────────────────
(function() {
  var dayData = {
    speak: { aiFeedback: { score: 7, tags: [], landed: 'good', fix: 'fix it', betterLine: 'better' } },
    case: { aiFeedback: { score: 8, tags: [], landed: 'good', fix: 'fix it', betterLine: 'better' } },
    interview: { aiFeedback: { score: 6, tags: [], landed: 'good', fix: 'fix it', betterLine: 'better' } }
  };
  var rpt = LOGIC.computeDayReport(dayData, []);
  assert.equal(rpt.averageScore, 70, 'averageScore should be 70 (7+8+6 avg=7 *10)');
  assert.equal(rpt.stepAnalyses[0].score, 70, 'step score should be *10');
  console.log('  computeDayReport 1-100 scale: ok');
})();

console.log('logic self-check: all passed');
