import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { HIT_WINDOW, createPerformance } from '../carts/maestro/code.js';

test('Maestro grades both sides of the timing window', () => {
  const game = createPerformance([0, 500, 1000, 1500, 2000, 2500, 3000].map(beat => [beat, 1]));
  for (const time of [-44, 544, 915, 1585, 1865, 2635, 3136]) game.tap(0, time);
  assert.deepEqual(game.result(), {
    score: 4600, accuracy: 4600 / 70, stars: 1, bestCombo: 6,
    counts: { Perfect: 2, Great: 2, Good: 2, Miss: 1 },
  });
});

test('Maestro penalizes a wrong lane or extra tap and resets combos when a cue passes', () => {
  const game = createPerformance([[500, 1], [1000, 2], [1500, 1], [2000, 4]]);
  game.tap(0, 0);
  game.tap(0, 500);
  assert.equal(game.tap(2, 1000), 'Off beat');
  assert.equal(game.tap(1, 1000), 'Perfect');
  game.advance(1500 + HIT_WINDOW + 1);
  assert.equal(game.combo, 0);
  game.tap(2, 2000);
  assert.deepEqual(game.result(), {
    score: 3000, accuracy: 60, stars: 1, bestCombo: 1,
    counts: { Perfect: 3, Great: 0, Good: 0, Miss: 1 },
  });
});

test('linked blocks accept distinct lanes in either order and grade the wider offset', () => {
  const game = createPerformance([[500, 5], [1000, 6]]);
  assert.equal(game.tap(2, 475), 'Together');
  assert.equal(game.hitLanes, 4);
  assert.equal(game.score, 0);
  assert.equal(game.tap(0, 529), 'Perfect');
  assert.equal(game.hitLanes, 0);
  assert.equal(game.tap(1, 1012), 'Together');
  assert.equal(game.tap(2, 1075), 'Great');
  assert.equal(game.combo, 2);
  assert.equal(game.score, 1800);
});

test('a repeated lane, a late second tap, and a partial chord do not score', () => {
  const game = createPerformance([[500, 3], [1000, 3], [1500, 3]]);
  game.tap(0, 450);
  assert.equal(game.tap(0, 460), 'Off beat');
  assert.equal(game.hitLanes, 1);
  assert.equal(game.tap(1, 550), 'Miss');
  game.tap(0, 1000);
  game.advance(1000 + HIT_WINDOW + 1);
  assert.equal(game.hitLanes, 0);
  game.tap(0, 1490);
  game.clearPartial();
  assert.equal(game.tap(1, 1500), 'Together');
  game.advance(Infinity);
  assert.deepEqual(game.result().counts, { Perfect: 0, Great: 0, Good: 0, Miss: 3 });
});

test('dense cues close at the midpoint so a missed note cannot block the next hit', () => {
  const game = createPerformance([[500, 5], [620, 2], [745, 2]]);
  assert.equal(game.tap(0, 500), 'Together');
  assert.equal(game.tap(1, 620), 'Perfect');
  assert.equal(game.tap(1, 678), 'Off beat');
  assert.equal(game.tap(1, 685), 'Great');
  assert.deepEqual(game.result().counts, { Perfect: 1, Great: 1, Good: 0, Miss: 1 });
});

test('all six charts are clearable and Extreme adds real cue rows to every Standard chart', async () => {
  const loadChart = async file => JSON.parse(await readFile(new URL(
    '../carts/maestro/assets/' + file + '.json', import.meta.url
  ), 'utf8'));
  const [standard, extreme] = await Promise.all([loadChart('lanes'), loadChart('extreme')]);
  assert.deepEqual(Object.keys(standard), ['clair', 'elise', 'entertainer']);
  assert.deepEqual(Object.keys(extreme), Object.keys(standard));

  for (const [song, chart] of Object.entries(standard)) {
    assert.equal(extreme[song].end, chart.end);
    assert.ok(extreme[song].cues.length >= chart.cues.length * 2, song);
    const additions = new Map(extreme[song].cues);
    for (const [time, mask] of chart.cues) assert.equal(additions.get(time), mask);
  }

  for (const charts of [standard, extreme]) {
    for (const { end, cues } of Object.values(charts)) {
      assert.ok(cues[0][0] >= 0);
      assert.ok(cues.at(-1)[0] + HIT_WINDOW < end);
      const masks = new Set(cues.map(([, mask]) => mask));
      for (const lane of [1, 2, 4]) assert.ok(masks.has(lane));
      assert.ok([3, 5, 6].some(pair => masks.has(pair)));
      const game = createPerformance(cues);
      for (const [index, [time, mask]] of cues.entries()) {
        assert.ok(Number.isInteger(mask) && mask >= 1 && mask <= 6);
        if (index) assert.ok(time - cues[index - 1][0] >= 115);
        for (let lane = 0; lane < 3; lane++) {
          if (mask & (1 << lane)) game.tap(lane, time);
        }
      }
      assert.deepEqual(game.result(), {
        score: cues.length * 1000, accuracy: 100, stars: 3, bestCombo: cues.length,
        counts: { Perfect: cues.length, Great: 0, Good: 0, Miss: 0 },
      });
    }
  }
});
