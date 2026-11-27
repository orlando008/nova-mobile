import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLesson, DRILL_LENGTH, emptyProgress, fillSentence, finishLesson, LESSON_LENGTH, questionsOf, readProgress,
  recordAnswer, trickiestRules,
} from '../carts/italian-tutor/code.js';
import { RULES, TOPICS } from '../carts/italian-tutor/assets/bank.mjs';

test('every rule has a topic, an explanation, and well-formed questions', () => {
  const topics = new Set(TOPICS.map(topic => topic.id));
  assert.equal(new Set(RULES.map(rule => rule.id)).size, RULES.length);
  for (const rule of RULES) {
    assert.ok(topics.has(rule.topic), rule.id);
    assert.ok(rule.explain && rule.summary && rule.table.length && rule.examples.length, rule.id);
    assert.ok(rule.q.length >= DRILL_LENGTH, rule.id);
    for (const [sentence, answer, wrong, english] of rule.q) {
      assert.equal(sentence.split('___').length, 2, sentence);
      assert.equal(wrong.length, 3, sentence);
      assert.equal(new Set([answer, ...wrong]).size, 4, sentence);
      assert.ok(english, sentence);
    }
  }
});

test('lessons are reproducible and respect their focus', () => {
  const progress = emptyProgress();
  for (const focus of ['review', ...TOPICS.map(topic => topic.id), RULES[0].id]) {
    for (const seed of [0, 7, 0xffffffff]) {
      const lesson = createLesson(RULES, { focus, seed, progress });
      assert.deepEqual(lesson, createLesson(RULES, { focus, seed, progress }));
      assert.equal(lesson.length, focus === RULES[0].id ? DRILL_LENGTH : LESSON_LENGTH);
      assert.equal(new Set(lesson.map(question => question.id)).size, lesson.length);
      for (const question of lesson) {
        if (focus === RULES[0].id) assert.equal(question.rule, focus);
        else if (focus !== 'review') assert.equal(question.topic, focus);
        assert.deepEqual([...question.choices].sort(), [question.answer, ...question.wrong].sort());
      }
    }
  }
});

test('missed rules rise to the top and dominate the focused review', () => {
  let progress = emptyProgress();
  const weak = questionsOf(RULES).filter(question => question.rule === 'prep-dei-degli');
  for (const question of weak) progress = recordAnswer(progress, question, false);
  for (const question of questionsOf(RULES).filter(question => question.rule !== 'prep-dei-degli')) {
    progress = recordAnswer(progress, question, true);
  }
  assert.equal(trickiestRules(progress, RULES)[0].rule.id, 'prep-dei-degli');
  const lesson = createLesson(RULES, { focus: 'review', seed: 3, progress });
  assert.equal(lesson.filter(question => question.rule === 'prep-dei-degli').length, 3);
  assert.deepEqual(readProgress(JSON.parse(JSON.stringify(progress)), RULES), progress);
});

test('streaks and sentence filling', () => {
  let { progress } = finishLesson(emptyProgress(), 10, '2026-11-26');
  assert.equal(progress.xp, 70);
  ({ progress } = finishLesson(progress, 0, '2026-11-27'));
  assert.equal(progress.streak.count, 2);
  ({ progress } = finishLesson(progress, 0, '2026-11-30'));
  assert.equal(progress.streak.count, 1);
  assert.deepEqual(fillSentence('Sì, ___ ho visto.', 'l’'), { before: 'Sì, ', word: 'l’', after: 'ho visto.' });
  assert.equal(fillSentence('___ cerca trova.', 'chi').word, 'Chi');
});
