import test from 'node:test';
import assert from 'node:assert/strict';
import { DECOR, PIANOS, changeStudioItem, progressSummary, readProgress, rewardLesson } from '../play/music-tutor/progress.mjs';

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
  assert.equal(changeStudioItem(readProgress(), crimson), null);

  const bought = changeStudioItem(progress, crimson).progress;
  const swapped = changeStudioItem(bought, navy).progress;
  assert.equal(swapped.equipped.rug, navy.id);
  assert.equal(progressSummary(swapped).points, 0);

  const restored = readProgress(JSON.parse(JSON.stringify(swapped)));
  assert.deepEqual(restored, swapped);
  const putAway = changeStudioItem(restored, navy).progress;
  assert.equal(putAway.equipped.rug, undefined);
  assert.deepEqual(putAway.owned, [crimson.id, navy.id]);
  const redecorated = changeStudioItem(putAway, crimson).progress;
  assert.equal(redecorated.equipped.rug, crimson.id);
  assert.equal(progressSummary(redecorated).points, 0);
});

test('old and invalid saves load with valid ownership and equipped slots', () => {
  assert.deepEqual(readProgress(null), { xp: 0, owned: [], equipped: { piano: 'wooden-upright' } });
  assert.deepEqual(readProgress({
    xp: 300,
    owned: ['crimson-rug', 'unknown', 'crimson-rug'],
    equipped: { rug: 'crimson-rug', wall: 'framed-score' },
  }), { xp: 300, owned: ['crimson-rug'], equipped: { piano: 'wooden-upright', rug: 'crimson-rug' } });
});

test('a purchased piano replaces the upright, and any owned piano can be switched back in', () => {
  const [starter, , babyGrand, concertGrand] = PIANOS;
  const starting = readProgress({ xp: 400 });
  assert.equal(changeStudioItem(starting, concertGrand), null);
  assert.equal(changeStudioItem(starting, starter), null);

  const upgraded = changeStudioItem(starting, babyGrand).progress;
  const reloaded = readProgress(JSON.parse(JSON.stringify(upgraded)));
  assert.equal(reloaded.equipped.piano, babyGrand.id);
  assert.equal(progressSummary(reloaded).points, 0);
  assert.equal(changeStudioItem(reloaded, babyGrand), null);

  const reverted = changeStudioItem(reloaded, starter).progress;
  assert.equal(reverted.equipped.piano, starter.id);
  assert.equal(changeStudioItem(reverted, babyGrand).progress.equipped.piano, babyGrand.id);
  assert.equal(progressSummary(reverted).points, 0);
});
