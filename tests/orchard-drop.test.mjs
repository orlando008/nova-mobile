import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CRATE, DROP_Y, FRUIT, HEIGHT, WIDTH, createCart, fruitPath } from '../carts/orchard-drop/code.js';
import { DRAW_STRIDE, PICTURE_INDEX } from '../src/draw-list.mjs';
import { createRuntime } from '../src/runtime.mjs';

const screen = { w: WIDTH * 2, h: HEIGHT * 2, scale: 2, dpr: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
const pictures = [
  { path: 'assets/crate.webp', width: WIDTH * 2, height: HEIGHT * 2 },
  ...FRUIT.map(({ pixels }, tier) => ({ path: fruitPath(tier), width: pixels, height: pixels })),
];
const make = (seed = 8) => createRuntime(createCart, screen, [], pictures, { seed });
const touch = (phase, x, id = 1) => ({ phase, x: x * 2, y: 200, id });
const frame = (...touches) => ({ now: 0, touches });
const drop = x => frame(touch('down', x), touch('up', x));

function advance(game, count) {
  for (let i = 0; i < count; i++) game.tick(frame());
}

test('dragging clamps the drop and only the owning pointer can release it', () => {
  const game = make();
  const initial = game.state();
  assert.equal(initial.current, 0);
  game.tick(frame(touch('down', 120), touch('down', 300, 2), touch('up', 300, 2)));
  assert.equal(game.state().dropped, 0);
  game.tick(frame(touch('move', 40), touch('up', -30)));
  const after = game.state();
  assert.equal(after.dropped, 1);
  assert.equal(after.current, initial.next);
  assert.equal(after.bodies[0].tier, initial.current);
  assert.ok(Math.abs(after.bodies[0].x - (CRATE.left + FRUIT[0].radius)) < .3);
  assert.ok(after.bodies[0].y > DROP_Y);
  game.tick(drop(150));
  assert.equal(game.state().dropped, 1);
});

test('matching fruit merge on contact and score once', () => {
  const game = make();
  game.tick(drop(180));
  advance(game, 105);
  assert.equal(game.state().bodies[0].y, CRATE.floor - FRUIT[0].radius);
  assert.equal(game.state().score, 0);

  game.tick(drop(180));
  advance(game, 105);
  const after = game.state();
  assert.equal(after.bodies.length, 1);
  assert.equal(after.bodies[0].tier, 1);
  assert.equal(after.bodies[0].y, CRATE.floor - FRUIT[1].radius);
  assert.equal(after.score, 3);
  assert.equal(after.largest, 1);
});

test('higher-resolution sprites still draw at the fruit collision sizes', () => {
  const game = make();
  for (let i = 0; i < 70 && game.state().largest < 6; i++) {
    game.tick(drop(180));
    advance(game, 54);
  }

  const { bodies } = game.state();
  assert.ok(bodies.some(body => body.tier >= 6));
  advance(game, 20);
  const draw = game.draw(0);
  const sprites = [];
  for (let i = 0; i < draw.length; i += DRAW_STRIDE) {
    if (draw[i + PICTURE_INDEX] >= 2) sprites.push(draw.subarray(i, i + DRAW_STRIDE));
  }
  const settled = game.state().bodies;
  const bodySprites = sprites.slice(-settled.length);
  for (const [index, body] of settled.entries()) {
    const [x, y, width, height] = bodySprites[index];
    const diameter = body.radius * 2 * screen.w / WIDTH;
    assert.ok(width >= diameter && width < diameter + 2);
    assert.equal(height, width);
    assert.ok(Math.abs(x + width / 2 - body.x * screen.w / WIDTH) < .001);
    assert.ok(Math.abs(y + height / 2 - body.y * screen.w / WIDTH) < .001);
  }
});

test('canceled, paused, and resized touches do not drop fruit', () => {
  const game = make();
  game.tick(frame(touch('down', 110), touch('cancel', 120)));
  game.tick(frame(touch('up', 120)));
  for (const lifecycle of ['pause', 'resize']) {
    game.tick(frame(touch('down', 200)));
    game.tick({ ...frame(), lifecycle, screen });
    game.tick(frame(touch('up', 250)));
  }
  assert.equal(game.state().dropped, 0);
  assert.equal(game.state().pointer, null);
});

test('a heavy merge gives nearby lighter fruit a stronger shove', () => {
  const game = make();
  for (let attempt = 0; attempt < 80; attempt++) {
    for (const sample of [drop(30), ...Array.from({ length: 22 }, () => frame())]) {
      const before = game.state();
      game.tick(sample);
      const after = game.state();
      const merge = after.bursts.at(-1);
      if (merge?.start !== after.tick || merge.tier < 6) continue;
      for (const body of after.bodies) {
        if (body.radius >= merge.radius || body.born === after.tick) continue;
        const candidates = before.bodies.filter(previous => previous.tier === body.tier &&
          Math.hypot(previous.x - body.x, previous.y - body.y) < 10);
        if (candidates.length !== 1) continue;
        const dx = body.x - merge.x;
        const dy = body.y - merge.y;
        const distance = Math.hypot(dx, dy);
        if (distance === 0 || distance > merge.radius + body.radius + 10) continue;
        const previous = candidates[0];
        const outwardKick = ((body.vx - previous.vx) * dx + (body.vy - previous.vy) * dy) / distance;
        if (outwardKick > 2) return;
      }
    }
  }
  assert.fail('Expected a large merge to push a neighboring lighter fruit outward');
});

test('the same inputs replay chain scores and overflow independent of drawing', () => {
  const game = make();
  const replay = make();
  let attempts = 0;
  let chained = false;

  while (!game.state().lost && attempts < 240) {
    const samples = [drop(30), ...Array.from({ length: 22 }, () => frame())];
    for (const sample of samples) {
      const before = game.state();
      assert.ok(game.draw(.5).length > 0);
      assert.deepEqual(game.state(), before);
      game.tick(sample);
      replay.tick(sample);
      const after = game.state();
      assert.deepEqual(after, replay.state());
      chained ||= after.bursts.some(burst => burst.chain > 1 && burst.points > 3);
      if (after.lost) {
        assert.equal(before.danger, 89);
        assert.equal(after.danger, 90);
        break;
      }
    }
    attempts++;
  }
  const end = game.state();
  assert.ok(chained);
  assert.ok(end.lost);
  game.tick(drop(180));
  assert.deepEqual(game.state(), end);
});
