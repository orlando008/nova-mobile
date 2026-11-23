import test from 'node:test';
import assert from 'node:assert/strict';
import { createLesson, DIFFICULTIES, LESSON_LENGTH } from '../carts/music-tutor/code.js';

test('the same difficulty and seed reproduce the lesson', () => {
  assert.deepEqual(createLesson('mixed', 321), createLesson('mixed', 321));
  assert.notDeepEqual(createLesson('mixed', 321), createLesson('mixed', 123));
});

test('all choices have a distinct name and pitch, and only one matches the staff', () => {
  const staffPitches = [64, 65, 67, 69, 71, 72, 74, 76, 77];
  const staffLetters = 'EFGABCDEF';
  const accidentalLabels = ['♭', '', '♯'];
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (let seed = 0; seed < 100; seed++) {
      const lesson = createLesson(difficulty, seed);
      assert.equal(lesson.length, LESSON_LENGTH);
      for (const { target, choices } of lesson) {
        assert.equal(choices.length, 3);
        assert.equal(new Set(choices.map(note => note.label)).size, 3);
        assert.equal(new Set(choices.map(note => note.midi)).size, 3);
        assert.deepEqual(choices.filter(note => note.label === target.label), [target]);
        for (const note of choices) {
          assert.equal(note.label, staffLetters[note.step] + accidentalLabels[note.accidental + 1]);
          assert.equal(note.midi, staffPitches[note.step] + note.accidental);
        }
      }
    }
  }
});

test('practice rounds include the intended mix of accidentals', () => {
  for (const [difficulty, expected] of [['natural', [10, 0, 0]], ['sharps', [5, 5, 0]], ['mixed', [5, 2, 3]]]) {
    const lesson = createLesson(difficulty, 42);
    assert.deepEqual([0, 1, -1].map(accidental => lesson.filter(({ target }) =>
      target.accidental === accidental).length), expected);
  }
});
