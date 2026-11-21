import test from 'node:test';
import assert from 'node:assert/strict';
import { canSwim, createCart, createMatch, ROUND_TICKS, TILE } from '../carts/axolotl-attack/code.js';
import { createRuntime } from '../src/runtime.mjs';

test('the courtyard has a swim-through breach and solid castle walls', () => {
  const match = createMatch(4);
  const pink = match.teams[0];
  Object.assign(pink, { x: 9.5 * TILE, y: 6.5 * TILE });
  for (let i = 0; i < 62; i++) match.step(1, 0);
  assert.ok(pink.x > 11.5 * TILE);
  assert.ok(canSwim(pink.x, pink.y, 16));
  Object.assign(pink, { x: 9.5 * TILE, y: 5.5 * TILE });
  for (let i = 0; i < 62; i++) match.step(1, 0);
  assert.ok(pink.x <= 10 * TILE - 16);
});

test('a neutral joins a school, and only a larger school can take a rival leader', () => {
  const match = createMatch(3);
  const [pink, kelp] = match.teams;
  match.members.length = 0;
  Object.assign(kelp, { x: pink.x + 18, y: pink.y });
  for (let i = 0; i < 3; i++) match.step();
  assert.equal(kelp.out, false);
  kelp.waypoint = { x: pink.x, y: pink.y };
  Object.assign(kelp, { x: pink.x + 18, y: pink.y });
  match.members.push({ x: pink.x - 13, y: pink.y, angle: 0, flash: 0, owner: -1 });
  for (let i = 0; i < 3; i++) match.step();
  assert.equal(match.members[0].owner, 0);
  assert.equal(kelp.out, true);
  assert.equal(pink.count, 3);
  assert.equal(match.members.filter(unit => unit.owner === 0).length, 2);
});

test('a tied match runs out at 3600 ticks and stops updating', () => {
  const match = createMatch(1);
  match.members.length = 0;
  for (let i = 0; i < ROUND_TICKS - 1; i++) match.step();
  assert.equal(match.phase, 'swimming');
  match.step();
  assert.equal(match.phase, 'finished');
  assert.deepEqual(match.standings().map(team => team.count), [1, 1, 1, 1]);
  match.step(1, 0);
  assert.equal(match.tick, ROUND_TICKS);
});

test('the cart repeats seeded pointer input and clears steering on pause', () => {
  const screen = { w: 720, h: 1100, scale: 2, dpr: 2, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
  const newRun = () => createRuntime(createCart, screen, [], [], { seed: 618 });
  const first = newRun();
  const replay = newRun();
  const originalY = first.state().leaders[0].y;
  const origin = { id: 1, x: 360, y: 75 };
  for (let i = 0; i < 190; i++) {
    const touches = i === 0 ? [{ ...origin, phase: 'down' }]
      : i === 1 ? [{ ...origin, y: 12, phase: 'move' }] : [];
    const frame = { touches, now: i * 1000 / 60 };
    if (i === 52) frame.lifecycle = 'pause';
    first.tick(frame);
    replay.tick(frame);
    assert.deepEqual(first.state(), replay.state());
    if (i === 0) assert.deepEqual(first.state().steering, { x: 0, y: 0 });
    if (i === 1) assert.deepEqual(first.state().steering, { x: 0, y: -1 });
    if (i === 52) assert.equal(first.state().steering, null);
  }
  assert.ok(first.state().leaders[0].y < originalY);
  const afterPause = first.state().leaders[0];
  first.tick({ touches: [{ ...origin, y: 25, phase: 'move' }], now: 3200 });
  assert.equal(first.state().leaders[0].y, afterPause.y);
});
