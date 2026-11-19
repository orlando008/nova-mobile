import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCart } from '../carts/sprite-yard/code.js';
import { createRuntime } from '../src/runtime.mjs';
import { DRAW_STRIDE, PICTURE_INDEX } from '../src/draw-list.mjs';

const screen = { w: 720, h: 820, scale: 2, dpr: 1, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
const pictures = ['crate', 'apple', 'coin', 'heart-full', 'lantern', 'sapphire', 'flame', 'star']
  .map(name => ({ path: 'assets/' + name + '.png', width: 160, height: 160 }));
const runtime = () => createRuntime(createCart, screen, [], pictures);
const sample = (phase, x, y, id = 1) => ({ phase, x, y, id });
const press = (x, y) => [sample('down', x, y), sample('up', x, y)];
const frame = (touches, extra = {}) => ({ touches, now: 0, ...extra });

test('Sprite Yard places, moves and rejects pieces without overwriting a slot', () => {
  const yard = runtime();
  const start = yard.state().board;
  yard.tick(frame(press(302, 599)));
  assert.equal(yard.state().status, 'Apple selected.');
  yard.tick(frame(press(244, 105)));
  assert.equal(yard.state().board[1], start[1]);
  yard.tick(frame(press(128, 105)));
  assert.equal(yard.state().board[0], 1);
  yard.tick(frame([sample('down', 128, 105), sample('up', 360, 105)]));
  assert.equal(yard.state().board[0], null);
  assert.equal(yard.state().board[2], 1);
  yard.tick(frame([sample('down', 360, 105), sample('up', 244, 105)]));
  assert.equal(yard.state().board[1], start[1]);
  assert.equal(yard.state().board[2], 1);
  yard.tick(frame([sample('down', 418, 599), sample('up', 128, 105)]));
  assert.equal(yard.state().board[0], 2);
  assert.deepEqual(runtime().state().board, start);
});

test('Sprite Yard replays the same drag, cancellation and resize at every tick', () => {
  const frames = [
    frame([sample('down', 186, 599), sample('move', 128, 105)]),
    frame([sample('up', 128, 105)]),
    frame([sample('down', 128, 105), sample('move', 360, 105)]),
    frame([sample('cancel', 360, 105)]),
    frame([sample('down', 128, 105), sample('move', 360, 105)]),
    frame([], { lifecycle: 'resize', screen: { ...screen, h: 770, scale: 1.8 } }),
    frame([sample('up', 360, 105)]),
  ];
  function replay(sequence, draw) {
    const yard = runtime();
    return sequence.map(tick => {
      yard.tick(tick);
      const state = yard.state();
      if (draw) {
        const list = yard.draw(0.25);
        assert.equal(list.length % DRAW_STRIDE, 0);
        let sprites = 0;
        for (let i = PICTURE_INDEX; i < list.length; i += DRAW_STRIDE) if (list[i]) sprites += 1;
        assert.ok(sprites >= 13);
        assert.deepEqual(yard.state(), state);
      }
      return state;
    });
  }
  const states = replay(frames, false);
  assert.equal(states[0].drag.item, 0);
  assert.equal(states[1].board[0], 0);
  assert.equal(states[3].drag, null);
  assert.equal(states[5].drag, null);
  assert.equal(states[6].board[0], 0);
  assert.deepEqual(replay(JSON.parse(JSON.stringify(frames)), true), states);
});
