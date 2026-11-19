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
