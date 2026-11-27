import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  cases, currentDeduction, hearClue, isCaseUnlocked, isClueAvailable,
  missingEvidence, newInvestigation, pinClue, submitDeduction,
} from '../carts/italian-detective/code.js';

test('follow-ups require the previous deduction or a pinned reply', () => {
  const investigation = newInvestigation(cases[0]);
  assert.equal(hearClue(investigation, 'move'), null);
  assert.equal(pinClue(investigation, 'counter'), false);
  assert.equal(submitDeduction(investigation, 1), null);

  for (const id of ['counter', 'gone']) {
    assert.equal(hearClue(investigation, id).id, id);
    assert.equal(pinClue(investigation, id), true);
    assert.equal(pinClue(investigation, id), false);
  }
  assert.equal(submitDeduction(investigation, 0).correct, false);
  assert.equal(currentDeduction(investigation).id, 'window');
  assert.equal(hearClue(investigation, 'move'), null);

  assert.equal(submitDeduction(investigation, 1).complete, false);
  assert.equal(hearClue(investigation, 'move').id, 'move');
  assert.equal(hearClue(investigation, 'paper'), null);
  assert.equal(pinClue(investigation, 'move'), true);
  assert.equal(hearClue(investigation, 'paper').id, 'paper');
  assert.equal(pinClue(investigation, 'paper'), true);
  assert.equal(submitDeduction(investigation, 2).complete, true);
  assert.equal(submitDeduction(investigation, 2), null);
});

test('every case can be solved with reachable, voiced evidence and unlocks the next case', () => {
  const completed = new Set();
  for (const [index, file] of cases.entries()) {
    assert.equal(isCaseUnlocked(index, completed), true);
    assert.equal(isCaseUnlocked(index + 1, completed), false);
    const investigation = newInvestigation(file);
    for (const step of file.deductions) {
      // Follow-ups can be unlocked by pinning another newly available clue.
      let next = file.clues.find(clue => !investigation.pinned.has(clue.id) && isClueAvailable(investigation, clue));
      while (next) {
        assert.ok(file.witnesses.some(witness => witness.id === next.witness));
        assert.ok(hearClue(investigation, next.id));
        assert.ok(pinClue(investigation, next.id));
        const audio = readFileSync(new URL('../carts/italian-detective/assets/dialogue/' + next.id + '.mp3', import.meta.url));
        assert.ok(audio.length > 1000, next.id);
        next = file.clues.find(clue => !investigation.pinned.has(clue.id) && isClueAvailable(investigation, clue));
      }
      assert.equal(currentDeduction(investigation), step);
      assert.deepEqual(missingEvidence(investigation, step), []);
      if (step.kind === 'sequence') {
        assert.equal(submitDeduction(investigation, step.answer.slice(1)).correct, false);
        assert.equal(submitDeduction(investigation, [...step.answer].reverse()).correct, false);
      } else {
        assert.equal(new Set(step.options).size, 3);
      }
      assert.equal(submitDeduction(investigation, step.answer).correct, true);
    }
    assert.equal(currentDeduction(investigation), undefined);
    assert.equal(investigation.pinned.size, file.clues.length);
    completed.add(file.id);
  }
  const reopened = newInvestigation(cases[0]);
  assert.equal(reopened.pinned.size, 0);
  assert.equal(isCaseUnlocked(2, completed), true);
});
