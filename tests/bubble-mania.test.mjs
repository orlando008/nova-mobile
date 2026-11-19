import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARENA, availableRadius, createCart, makeBricks, traceShot } from '../carts/bubble-mania/code.js';
import { createRuntime } from '../src/runtime.mjs';

const screen = { w: 720, h: 1020, scale: 2, dpr: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
const pictures = ['kiln', 'brick', 'shard', ...['sapphire', 'emerald', 'amethyst', 'ruby', 'gold']
  .flatMap(color => [color, 'ember-' + color])].map(name => ({ path: 'assets/' + name + '.png', width: 192, height: 192 }));
const make = (seed = 1) => createRuntime(createCart, screen, [], pictures, { seed });
const frame = (...touches) => ({ touches, now: 0 });
const press = (phase, x = 160, y = 477, id = 1) => ({ phase, x: x * 2, y: y * 2, id });
const tap = frame(press('down'), press('up'));

function settle(game) {
  for (let i = 0; i < 180; i++) {
    if (['ready', 'lost'].includes(game.state().phase)) return game.state();
    game.tick(frame());
  }
  assert.fail('Shot did not settle');
}

test('growth touches the nearest wall, edge or corner of a brick, or circle rim', () => {
  assert.equal(availableRadius(26, 120, [], []), 18);
  assert.equal(availableRadius(170, 105, [{ x: 185, y: 100, size: 20 }], []), 15);
  assert.equal(availableRadius(170, 85, [{ x: 178, y: 100, size: 20 }], []), 17);
  assert.equal(availableRadius(170, 100, [], [{ x: 200, y: 140, radius: 31 }]), 19);
  assert.equal(availableRadius(170, 100, [], [{ x: 170, y: 100, radius: 6 }]), 0);
});

test('a shot hits the first object on the way even if its landing point would be clear', () => {
  const bubble = { x: 160, y: 343, radius: 15 };
  const partial = traceShot(0, 0, [], [bubble]);
  assert.equal(partial.impact, 'land');
  const longer = traceShot(0, .81, [], [bubble]);
  assert.equal(longer.impact, 'bubble');
  assert.equal(longer.victim, 0);
  assert.ok(longer.distance < 80);
  const blocked = traceShot(0, .81, [{ x: 151, y: 384, size: 16 }], [bubble]);
  assert.equal(blocked.impact, 'brick');
  assert.ok(blocked.distance < longer.distance);
  assert.equal(traceShot(.84, 1, [], []).impact, 'wall');
});

test('the label radius grows to its exact limit and a repeat shot shatters the bubble', () => {
  const game = make();
  game.tick(tap);
  const growth = [];
  while (game.state().phase !== 'ready') {
    game.tick(frame());
    if (game.state().phase === 'grow') growth.push(game.state().bubbles[0].radius);
  }
  assert.ok(growth.length > 10);
  assert.ok(growth.every((r, i) => i === 0 || r > growth[i - 1]));
  const before = game.state();
  assert.equal(before.bubbles[0].radius, ARENA.bottom - before.bubbles[0].y);
  assert.equal(before.coverage, 100 * Math.PI * before.bubbles[0].radius ** 2 /
    ((ARENA.right - ARENA.left) * (ARENA.bottom - ARENA.top)));
  game.tick(tap);
  const after = settle(game);
  assert.equal(after.phase, 'lost');
  assert.deepEqual(after.bubbles, []);
  assert.equal(after.cue.name, 'shatter');
  assert.equal(after.coverage, before.coverage);
});

test('presses inside the arena, second fingers and canceled charges cannot fire', () => {
  const game = make();
  game.tick(frame(press('down', 160, 300), press('up', 160, 300)));
  game.tick(frame(press('down')));
  for (let i = 0; i < 25; i++) game.tick(frame());
  assert.ok(game.state().power > 0);
  game.tick(frame(press('down', 160, 477, 2), press('up', 160, 477, 2)));
  assert.equal(game.state().phase, 'ready');
  game.tick(frame(press('cancel')));
  game.tick(frame(press('up')));
  assert.equal(game.state().phase, 'ready');
  assert.equal(game.state().power, 0);
  game.tick(frame(press('down')));
  game.tick({ ...frame(), lifecycle: 'pause' });
  game.tick(frame(press('up')));
  assert.equal(game.state().phase, 'ready');
  assert.equal(game.state().charging, false);
});

test('a seeded run replays aimed shots, growth, color and shattering tick for tick', () => {
  assert.deepEqual(makeBricks(91), makeBricks(91));
  assert.notDeepEqual(makeBricks(91), makeBricks(92));
  const wait = ticks => Array.from({ length: ticks }, () => frame());
  const left = [frame(press('down')), ...wait(31), frame(press('up', 131))];
  const right = [frame(press('down')), ...wait(16), frame(press('up', 219))];
  const record = [...left, ...wait(110), ...right, ...wait(110), frame(press('down')), ...wait(16), frame(press('up')), ...wait(110)];
  function replay(frames, draw = false) {
    const game = make(91);
    return frames.map(input => {
      game.tick(input);
      if (draw) {
        game.draw(.25);
        game.draw(.75);
      }
      return game.state();
    });
  }
  const states = replay(record);
  assert.equal(states.some(state => state.bubbles.length === 2 && state.bubbles[1].color === 1), true);
  assert.equal(states.at(-1).phase, 'lost');
  assert.deepEqual(replay(JSON.parse(JSON.stringify(record)), true), states);
});
