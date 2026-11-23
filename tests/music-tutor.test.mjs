import test from 'node:test';
import assert from 'node:assert/strict';
import { createLesson, DIFFICULTIES, LESSON_LENGTH } from '../carts/music-tutor/code.js';

test('the same difficulty and seed reproduce the lesson', () => {
  assert.deepEqual(createLesson('mixed', 321), createLesson('mixed', 321));
  assert.notDeepEqual(createLesson('mixed', 321), createLesson('mixed', 123));
  assert.deepEqual(createLesson('key', 321), createLesson('key', 321));
});

test('all choices have a distinct name and pitch, and only one matches the staff', () => {
  const staffPitches = [64, 65, 67, 69, 71, 72, 74, 76, 77];
  const staffLetters = 'EFGABCDEF';
  const accidentalLabels = ['♭', '', '♯'];
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (let seed = 0; seed < 100; seed++) {
      const lesson = createLesson(difficulty, Math.imul(seed, 0x9e3779b1));
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

test('every beginner and intermediate choice agrees with the accidental on the note', () => {
  for (const difficulty of ['natural', 'sharps', 'mixed']) {
    for (let seed = 0; seed < 30; seed++) {
      for (const { choices, signature, writtenAccidental } of createLesson(difficulty, seed)) {
        assert.deepEqual(signature, []);
        assert.ok(choices.every(note => note.accidental === (writtenAccidental ?? 0)));
      }
    }
  }
});

test('key signature questions use conventional positions and apply visible marks to every choice', () => {
  const patterns = {
    1: [['F', 8], ['C', 5], ['G', 9], ['D', 6]],
    [-1]: [['B', 4], ['E', 7], ['A', 3], ['D', 6]],
  };
  const letters = 'EFGABCDEF';
  const covered = new Set();
  for (let seed = 0; seed < 30; seed++) {
    const lesson = createLesson('key', Math.imul(seed, 0x9e3779b1));
    const { signature } = lesson[0];
    const { sign } = signature[0];
    covered.add(sign * signature.length);
    assert.deepEqual(signature.map(({ letter, step }) => [letter, step]), patterns[sign].slice(0, signature.length));
    assert.ok(signature.every(mark => mark.sign === sign));
    const defaults = new Map(signature.map(mark => [mark.letter, mark.sign]));
    for (const question of lesson) {
      assert.deepEqual(question.signature, signature);
      for (const note of question.choices) {
        const fromKey = defaults.get(letters[note.step]) ?? 0;
        assert.equal(note.accidental, question.writtenAccidental ?? fromKey);
        if (question.writtenAccidental !== null) assert.notEqual(note.accidental, fromKey);
      }
    }
    const fromKey = lesson.filter(question => question.writtenAccidental === null);
    assert.equal(fromKey.filter(question => question.target.accidental === sign).length, 3);
    assert.equal(fromKey.filter(question => question.target.accidental === 0).length, 3);
    assert.deepEqual([-1, 0, 1].map(sign => lesson.filter(question => question.writtenAccidental === sign).length),
      [1, 2, 1]);
  }
  assert.deepEqual([...covered].sort((a, b) => a - b), [-4, -3, 3, 4]);
});

test('practice rounds include the intended mix of accidentals', () => {
  for (const [difficulty, expected] of [['natural', [10, 0, 0]], ['sharps', [5, 5, 0]], ['mixed', [5, 2, 3]]]) {
    const lesson = createLesson(difficulty, 42);
    assert.deepEqual([0, 1, -1].map(accidental => lesson.filter(({ target }) =>
      target.accidental === accidental).length), expected);
  }
});

test('Keyboard mode covers the treble staff from middle C through its top F', () => {
  const whiteKeys = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77];
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const covered = new Set();
    for (let seed = 0; seed < 100; seed++) {
      const lesson = createLesson(difficulty, Math.imul(seed, 0x9e3779b1), 'keyboard');
      assert.equal(lesson.length, LESSON_LENGTH);
      for (const { target } of lesson) {
        assert.ok(target.midi >= 60 && target.midi <= 78);
        assert.equal(target.midi, whiteKeys[target.step + 2] + target.accidental);
        covered.add(target.midi);
      }
    }
    assert.ok(whiteKeys.every(midi => covered.has(midi)));
    assert.equal(covered.has(78), difficulty !== 'natural');
  }
});
