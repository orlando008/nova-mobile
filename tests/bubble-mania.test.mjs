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
  const blocked = traceShot(0, .81, [{ x: 151, y: 370, size: 16 }], [bubble]);
  assert.equal(blocked.impact, 'land');
  assert.ok(blocked.segments[0].end < longer.distance);
  assert.equal(blocked.segments[1].dy, 1);
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

test('a bead that banks off the frame or a firebrick still shatters a bubble', () => {
  const bank = traceShot(.84, 1, [], []);
  const { origin, dx, dy } = bank.segments[1];
  const bubble = { x: origin.x + dx * 65, y: origin.y + dy * 65, radius: 16 };
  const shattered = traceShot(.84, 1, [], [bubble]);
  assert.equal(shattered.segments.length, 2);
  assert.equal(shattered.impact, 'bubble');
  assert.equal(shattered.victim, 0);
  assert.ok(shattered.distance < bank.distance);

  const brick = { x: 212, y: 250, size: 32 };
  const fromBrick = traceShot(.3, .75, [brick], []);
  const reflected = fromBrick.segments[1];
  const otherBubble = { x: reflected.origin.x + reflected.dx * 55, y: reflected.origin.y + reflected.dy * 55, radius: 9 };
  const hitAfterBrick = traceShot(.3, .75, [brick], [otherBubble]);
  assert.equal(hitAfterBrick.segments.length, 2);
  assert.equal(hitAfterBrick.impact, 'bubble');
  assert.equal(hitAfterBrick.victim, 0);
  assert.ok(hitAfterBrick.distance < fromBrick.distance);
});

test('brick faces and corners reflect the appropriate axis and preserve travel distance', () => {
  const angle = .5;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const x = PIVOT.x + dx * 210;
  const y = PIVOT.y + dy * 210;
  const brick = { x: x + 2.4, y: y - 20, size: 32 };
  const side = traceShot(angle, .6, [brick], []);
  assert.equal(side.impact, 'land');
  assert.equal(side.segments.length, 2);
  assert.equal(side.segments[1].dx, -dx);
  assert.equal(side.segments[1].dy, dy);
  assert.equal(side.distance, traceShot(angle, .6, [], []).distance);

  const corner = traceShot(angle, .6, [{ ...brick, y: y - brick.size - 2.4 }], []);
  assert.equal(corner.segments.length, 2);
  assert.equal(corner.segments[1].dx, -dx);
  assert.equal(corner.segments[1].dy, -dy);

  // An angled shot returns down from the ceiling onto the top of a brick.
  const ceiling = traceShot(.13, 1, [], []).segments[1];
  const doubleBank = traceShot(.13, 1, [{ x: ceiling.origin.x + 4, y: 52, size: 18 }], []);
  assert.ok(doubleBank.segments.length >= 3);
  assert.equal(doubleBank.segments[2].dx, ceiling.dx);
  assert.equal(doubleBank.segments[2].dy, -ceiling.dy);
});

test('a charged bank shot signals the bounce and grows at the reflected landing point', () => {
  const game = make(1);
  game.tick(frame(press('down')));
  game.tick(frame(press('move', 90)));
  for (let i = 2; i < 71; i++) game.tick(frame());
  const preview = game.state().shotPreview;
  assert.equal(preview.impact, 'land');
  game.tick(frame(press('up', 90)));
  assert.equal(game.state().shotPreview, null);
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
  assert.deepEqual(preview, { x: bubble.x, y: bubble.y, impact: 'land' });
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
  game.tick(frame(press('down')));
  assert.equal(game.state().shotPreview.impact, 'bubble');
  game.tick(frame(press('up')));
  const after = settle(game);
  assert.equal(after.phase, 'lost');
  assert.deepEqual(after.bubbles, []);
  assert.equal(after.cue.name, 'shatter');
  assert.equal(after.coverage, before.coverage);
});

test('mulligans accrue at every 15% and save the board until the supply runs out', () => {
  const game = make(1);
  function fireAt(angle, heldTicks) {
    const releaseX = 160 + (angle - game.state().angle) / .012;
    game.tick(frame(press('down')));
    for (let i = 1; i < heldTicks; i++) game.tick(frame());
    game.tick(frame(press('up', releaseX)));
    return settle(game);
  }

  assert.equal(game.state().mulligans, 0);
  const first = fireAt(.12, 16);
  assert.ok(first.coverage >= 30 && first.coverage < 45);
  assert.equal(first.mulligans, 2);
  assert.equal(first.readout.mulligans, 2);
  assert.equal(first.cue.name, 'mulligan-earned');

  const saved = fireAt(.12, 16);
  assert.equal(saved.phase, 'ready');
  assert.equal(saved.cue.name, 'mulligan-used');
  assert.equal(saved.mulligans, 1);
  assert.equal(saved.coverage, first.coverage);
  assert.deepEqual(saved.bubbles, first.bubbles);

  for (const hold of [66, 53]) {
    const next = fireAt(-.6, hold);
    assert.ok(next.coverage > first.coverage && next.coverage < 45);
    assert.equal(next.mulligans, 1);
  }
  const milestone = fireAt(-.72, 13);
  assert.ok(milestone.coverage >= 45 && milestone.coverage < 60);
  assert.equal(milestone.mulligans, 2);
  assert.equal(fireAt(-.72, 13).mulligans, 1);
  assert.equal(fireAt(-.72, 13).mulligans, 0);
  const lost = fireAt(-.72, 13);
  assert.equal(lost.phase, 'lost');
  assert.equal(lost.cue.name, 'shatter');
  assert.equal(lost.coverage, milestone.coverage);
  assert.equal(lost.bubbles.length, milestone.bubbles.length - 1);
});

test('holding cycles the power meter from empty to full and back without firing', () => {
  const game = make();
  game.tick(frame(press('down')));
  let held = 0;
  for (const [elapsed, expected] of [[0, 0], [36, 36 / 71], [71, 1], [106, 36 / 71], [142, 0], [178, 36 / 71], [213, 1]]) {
    while (held < elapsed) {
      game.tick(frame());
      held++;
    }
    const { power, charging, phase } = game.state();
    assert.equal(power, expected);
    assert.equal(charging, true);
    assert.equal(phase, 'ready');
  }
});

test('releasing on the way down or in another cycle fires at the same selected power', () => {
  function fireAfter(held) {
    const game = make();
    game.tick(frame(press('down')));
    for (let i = 1; i < held; i++) game.tick(frame());
    game.tick(frame(press('up')));
    assert.equal(game.state().phase, 'flight');
    assert.equal(game.state().charging, false);
    return settle(game).bubbles;
  }

  const rising = fireAfter(28);
  assert.equal(rising.length, 1);
  assert.deepEqual(fireAfter(114), rising);
  assert.deepEqual(fireAfter(170), rising);
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
  assert.equal(game.state().shotPreview, null);
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
