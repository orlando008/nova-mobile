import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createButtonInput, hit } from '../src/input/buttons.mjs';

const box = { x: 10, y: 10, w: 88, h: 88 };
const sample = (phase, x = 20, y = 20, id = 1) => ({ id, phase, x, y });

function frame(input, touches, query = () => input.button('a', box)) {
  input.begin(touches);
  const result = query();
  input.end();
  return result;
}

test('hit includes shape edges and excludes clipped octagon corners', () => {
  assert.equal(hit(98, 98, box), true);
  assert.equal(hit(98.1, 98, box), false);
  const circle = { type: 'circle', x: 40, y: 60, r: 15 };
  assert.equal(hit(40, 75, circle), true);
  assert.equal(hit(55, 75, circle), false);
  const octagon = { type: 'octagon', ...box };
  assert.equal(hit(10, 54, octagon), true);
  assert.equal(hit(10, 10, octagon), false);
  assert.equal(hit(21, 21, octagon), false);
  assert.equal(hit(25, 25, octagon), true);
  assert.equal(hit(20, 20, { ...box, w: 0 }), false);
});

test('wide and tall octagons use 45-degree chamfers in points', () => {
  const wide = { type: 'octagon', x: 0, y: 0, w: 300, h: 88 };
  assert.equal(hit(30, 5, wide), true);
  assert.equal(hit(5, 5, wide), false);
  assert.equal(hit(295, 58, wide), true);
  assert.equal(hit(5, 30, { ...wide, w: 88, h: 300 }), true);
  const custom = { ...wide, cut: 12 };
  assert.equal(hit(20, 5, custom), true);
  assert.equal(hit(7, 5, custom), true);
  assert.equal(hit(6, 5, custom), false);
  assert.equal(hit(150, 44, { ...wide, cut: 45 }), false);
});

test('button captures, holds, and clicks, including down and up in one tick', () => {
  const input = createButtonInput();
  assert.equal(frame(input, [sample('down')]), 'pressed');
  assert.equal(frame(input, []), 'held');
  assert.equal(frame(input, [sample('up')]), 'clicked');
  assert.equal(frame(input, []), null);
  assert.equal(frame(input, [sample('down'), sample('up')]), 'clicked');
});

test('slide-off, release outside and pointer cancellation cannot click', () => {
  const input = createButtonInput();
  assert.equal(frame(input, [sample('down'), sample('move', 100), sample('move'), sample('up')]), null);
  assert.equal(frame(input, [sample('down')]), 'pressed');
  assert.equal(frame(input, [sample('up', 100)]), null);
  assert.equal(frame(input, [sample('down'), sample('cancel'), sample('up')]), null);
  assert.equal(frame(input, [sample('down', 100), sample('move'), sample('up')]), null);
  assert.equal(frame(input, [sample('down'), sample('up')]), 'clicked');
});

test('a press is claimed by the first overlapping button even if released in that tick', () => {
  const input = createButtonInput();
  const query = () => [input.button('a', box), input.button('b', box), input.button('a', box)];
  assert.deepEqual(frame(input, [sample('down'), sample('up')], query), ['clicked', null, 'clicked']);
  assert.deepEqual(frame(input, [sample('down'), sample('down', 30, 20, 2)], query),
    ['pressed', 'pressed', 'pressed']);
  assert.deepEqual(frame(input, [sample('up', 20, 20, 2)], query), ['held', 'clicked', 'held']);
});

test('disabled, hidden or moved buttons drop capture without clicking', () => {
  const input = createButtonInput();
  const disabled = () => input.button('a', box, { disabled: true });
  frame(input, [sample('down')]);
  assert.equal(frame(input, [sample('up')], disabled), null);
  frame(input, [sample('down')]);
  frame(input, [], () => {});
  assert.equal(frame(input, [sample('up')]), null);
  frame(input, [sample('down')]);
  assert.equal(frame(input, [], () => input.button('a', { ...box, x: 200 })), null);
  assert.equal(frame(input, [sample('up')]), null);
  assert.throws(() => input.button('a', box), /only available during update/);
});

test('a disabled overlay consumes the press and blocks an overlapping button', () => {
  const input = createButtonInput();
  const query = () => [input.button('overlay', box, { disabled: true }), input.button('a', box), input.consumed(1)];
  assert.deepEqual(frame(input, [sample('down')], query), [null, null, true]);
  assert.deepEqual(frame(input, [sample('up')], query), [null, null, true]);
  assert.deepEqual(frame(input, [], query), [null, null, false]);
});

test('consumption persists through slide-off, hiding, or cancellation until a new press', () => {
  const input = createButtonInput();
  const query = () => [input.button('a', box), input.consumed(1), input.consumed(2)];
  assert.deepEqual(frame(input, [sample('down'), sample('down', 120, 20, 2)], query), ['pressed', true, false]);
  assert.deepEqual(frame(input, [sample('move', 110)], query), [null, true, false]);
  assert.equal(frame(input, [], () => input.consumed(1)), true);
  assert.deepEqual(frame(input, [sample('cancel', 110)], query), [null, true, false]);
  assert.deepEqual(frame(input, [sample('down', 110), sample('up', 110)], query), [null, false, false]);
});

test('a same-tick click takes priority and repeated IDs use the first result', () => {
  const input = createButtonInput();
  const query = () => [input.button('a', box), input.button('a', { ...box, x: 200 }), input.consumed(2)];
  frame(input, [sample('down')]);
  assert.deepEqual(frame(input, [sample('up'), sample('down', 20, 20, 2)], query), ['clicked', 'clicked', true]);
  assert.deepEqual(frame(input, [], query), ['held', 'held', true]);
});
