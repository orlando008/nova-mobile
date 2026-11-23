import test from 'node:test';
import assert from 'node:assert/strict';
import { DECOR, changeDecor, progressSummary, readProgress, rewardLesson } from '../play/music-tutor/progress.mjs';

test('completed lessons earn XP and level-ups earn studio points', () => {
  const starting = readProgress();
  const missed = rewardLesson(starting, 0);
  assert.equal(missed.xp, 40);
  assert.equal(missed.levels, 0);
  const perfect = rewardLesson(missed.progress, 10);
  assert.equal(perfect.xp, 100);
  assert.equal(perfect.levels, 1);
  assert.equal(progressSummary(perfect.progress).levelXP, 40);
  assert.equal(progressSummary(perfect.progress).points, 1);
  assert.equal(starting.xp, 0);
});

test('ranks unlock at their milestones and XP continues after Maestro', () => {
  for (const [xp, name] of [[199, 'Apprentice'], [200, 'Musician'], [400, 'Pianist'],
    [700, 'Virtuoso'], [1100, 'Maestro'], [1400, 'Maestro']]) {
    assert.equal(progressSummary(readProgress({ xp })).rank, name);
  }
  assert.equal(rewardLesson(readProgress({ xp: 164 }), 6).rank, 'Musician');
});

test('decor purchases spend points once and owned items can be swapped or removed', () => {
  const crimson = DECOR.find(item => item.id === 'crimson-rug');
  const navy = DECOR.find(item => item.id === 'navy-rug');
  const progress = readProgress({ xp: 300 });
  assert.equal(changeDecor(readProgress(), crimson), null);

  const bought = changeDecor(progress, crimson).progress;
  const swapped = changeDecor(bought, navy).progress;
  assert.equal(swapped.equipped.rug, navy.id);
  assert.equal(progressSummary(swapped).points, 0);

  const restored = readProgress(JSON.parse(JSON.stringify(swapped)));
  assert.deepEqual(restored, swapped);
  const putAway = changeDecor(restored, navy).progress;
  assert.equal(putAway.equipped.rug, undefined);
  assert.deepEqual(putAway.owned, [crimson.id, navy.id]);
  const redecorated = changeDecor(putAway, crimson).progress;
  assert.equal(redecorated.equipped.rug, crimson.id);
  assert.equal(progressSummary(redecorated).points, 0);
});

test('old and invalid saves load with valid ownership and equipped slots', () => {
  assert.deepEqual(readProgress(null), { xp: 0, owned: [], equipped: {} });
  assert.deepEqual(readProgress({
    xp: 300,
    owned: ['crimson-rug', 'unknown', 'crimson-rug'],
    equipped: { rug: 'crimson-rug', wall: 'framed-score' },
  }), { xp: 300, owned: ['crimson-rug'], equipped: { rug: 'crimson-rug' } });
});
