import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ARENA, PIVOT, availableRadius, createCart, makeBricks, traceShot } from '../carts/bubble-mania/code.js';
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
  assert.equal(longer.segments.length, 1);
});

test('bank shots keep the remaining range and reflect off either side and the ceiling', () => {
  for (const angle of [-.84, .84, 0]) {
    const { segments, distance, impact } = traceShot(angle, 1, [], []);
    assert.equal(impact, 'land');
    assert.equal(segments.length, 2);
    const [incoming, outgoing] = segments;
    const vertical = angle === 0;
    assert.equal(outgoing.dx, vertical ? incoming.dx : -incoming.dx);
    assert.equal(outgoing.dy, vertical ? -incoming.dy : incoming.dy);
    assert.equal(outgoing.start, incoming.end);
    assert.equal(outgoing.end, distance);
    assert.equal(distance, 492);
  }
});

test('a shot can bank twice and an exact corner reverses both directions', () => {
  const twice = traceShot(-.36, 1, [], []);
  assert.equal(twice.segments.length, 3);
  const [first, second, third] = twice.segments;
  assert.equal(second.dx, -first.dx);
  assert.equal(second.dy, first.dy);
  assert.equal(third.dx, second.dx);
  assert.equal(third.dy, -second.dy);

  const cornerAngle = Math.atan2(ARENA.left + 2.4 - PIVOT.x, PIVOT.y - ARENA.top - 2.4);
  const corner = traceShot(cornerAngle, 1, [], []);
  assert.equal(corner.segments.length, 2);
  assert.equal(corner.segments[1].dx, -corner.segments[0].dx);
  assert.equal(corner.segments[1].dy, -corner.segments[0].dy);
});

test('a banked bead still stops at a bubble or a firebrick', () => {
  const bank = traceShot(.84, 1, [], []);
  const { origin, dx, dy } = bank.segments[1];
  const bubble = { x: origin.x + dx * 65, y: origin.y + dy * 65, radius: 16 };
  const shattered = traceShot(.84, 1, [], [bubble]);
  assert.equal(shattered.segments.length, 2);
  assert.equal(shattered.impact, 'bubble');
  assert.equal(shattered.victim, 0);
  assert.ok(shattered.distance < bank.distance);

  // An angled shot returns down from the ceiling onto the top of this brick.
  const ceilingBank = traceShot(.13, 1, [], []);
  const afterCeiling = ceilingBank.segments[1];
  const brick = { x: afterCeiling.origin.x + 4, y: 52, size: 18 };
  const blocked = traceShot(.13, 1, [brick], []);
  assert.equal(blocked.segments.length, 2);
  assert.equal(blocked.impact, 'brick');
  assert.ok(blocked.distance < ceilingBank.distance);
});

test('a charged bank shot signals the bounce and grows at the reflected landing point', () => {
  const game = make(1);
  game.tick(frame(press('down')));
  for (let i = 0; i < 71; i++) game.tick(frame());
  game.tick(frame(press('up', 90)));
  const cues = [];
  while (game.state().phase === 'flight' && cues.length < 90) {
    game.tick(frame());
    game.draw(.5);
    cues.push(game.state().cue.name);
  }
  assert.ok(cues.includes('bounce'));
  const result = settle(game);
  assert.equal(result.bubbles.length, 1);
  const { segments, distance } = traceShot(-.84, 1, makeBricks(1), []);
  const { origin, dx, dy, start } = segments.at(-1);
  const [bubble] = result.bubbles;
  assert.equal(bubble.x, origin.x + dx * (distance - start));
  assert.equal(bubble.y, origin.y + dy * (distance - start));
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
