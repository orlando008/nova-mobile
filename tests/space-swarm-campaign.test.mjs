import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadRatings, planetCapacity, planetStars, planetUnlocked, recordWin, starsForWin, zoneUnlocked } from '../play/space-swarm-defender/campaign.mjs';

test('only Kepler Gate starts open and any clear unlocks the next zone', () => {
  const ratings = loadRatings();
  assert.equal(planetUnlocked(0, ratings), true);
  assert.equal(planetUnlocked(1, ratings), false);
  assert.equal(zoneUnlocked(0, 0, ratings), true);
  assert.equal(zoneUnlocked(0, 1, ratings), false);
  assert.equal(recordWin(ratings, 0, 1), 1);
  assert.equal(zoneUnlocked(0, 1, ratings), true);
  assert.equal(zoneUnlocked(0, 2, ratings), false);
  assert.equal(zoneUnlocked(1, 3, ratings), false);
});

test('Vesper unlocks only when Kepler has all nine stars, while replays retain the best', () => {
  const ratings = loadRatings({ stars: [3, 2, 3] });
  assert.equal(planetStars(0, ratings), 8);
  assert.equal(planetCapacity(0), 9);
  assert.equal(planetUnlocked(1, ratings), false);
  assert.equal(recordWin(ratings, 1, 13), 3);
  assert.equal(planetUnlocked(1, ratings), true);
  assert.equal(planetUnlocked(2, ratings), false);
  assert.equal(zoneUnlocked(1, 3, ratings), true);
  assert.equal(zoneUnlocked(1, 4, ratings), false);
  assert.equal(recordWin(ratings, 1, 9), 3);
  assert.equal(planetStars(0, ratings), 9);
});

test('legacy clears survive as single-star ratings and boundaries match the displayed goals', () => {
  const ratings = loadRatings({ clearance: [0, 2, 3], stars: [null, -1, 5] });
  assert.deepEqual(ratings.slice(0, 4), [1, 0, 1, 0]);
  assert.equal(zoneUnlocked(0, 2, ratings), true);
  assert.deepEqual([0, 1, 9, 10, 12, 13, 15].map(starsForWin), [0, 1, 1, 2, 2, 3, 3]);
});
