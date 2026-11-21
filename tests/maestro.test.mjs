import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HIT_WINDOW, createPerformance } from '../carts/maestro/code.js';

test('Maestro grades both sides of the timing window and consumes each beat once', () => {
  const game = createPerformance([0, 500, 1000, 1500, 2000, 2500, 3000]);
  for (const time of [-44, 544, 915, 1585, 1865, 2635, 3136]) game.tap(time);
  assert.deepEqual(game.result(), {
    score: 4600, accuracy: 4600 / 70, stars: 1, bestCombo: 6,
    counts: { Perfect: 2, Great: 2, Good: 2, Miss: 1 },
  });
});

test('Maestro penalizes extra taps and resets combos when a cue passes', () => {
  const game = createPerformance([500, 1000, 1500, 2000]);
  game.tap(0);
  game.tap(500);
  game.tap(510);
  assert.equal(game.feedback.name, 'Off beat');
  game.tap(1000);
  game.advance(1500 + HIT_WINDOW + 1);
  assert.equal(game.combo, 0);
  game.tap(2000);
  assert.deepEqual(game.result(), {
    score: 3000, accuracy: 60, stars: 1, bestCombo: 1,
    counts: { Perfect: 3, Great: 0, Good: 0, Miss: 1 },
  });
});

test('all shipped pieces allow every cue to score independently', async () => {
  const charts = JSON.parse(await readFile(new URL('../carts/maestro/assets/charts.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(charts), ['clair', 'elise', 'entertainer']);
  for (const { end, beats } of Object.values(charts)) {
    assert.ok(beats.length > 100);
    assert.ok(beats[0] >= 0);
    assert.ok(beats.at(-1) + HIT_WINDOW < end);
    for (let i = 1; i < beats.length; i++) assert.ok(beats[i] - beats[i - 1] > 2 * HIT_WINDOW);
    const game = createPerformance(beats);
    for (const beat of beats) game.tap(beat);
    assert.deepEqual(game.result(), {
      score: beats.length * 1000, accuracy: 100, stars: 3, bestCombo: beats.length,
      counts: { Perfect: beats.length, Great: 0, Good: 0, Miss: 0 },
    });
  }
});
