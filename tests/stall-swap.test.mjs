import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCart, findMatches, legalSwaps } from '../carts/stall-swap/code.js';
import { createRuntime } from '../src/runtime.mjs';

const screen = { w: 720, h: 720, scale: 2, dpr: 1, safe: { top: 0, left: 0, right: 0, bottom: 0 } };
const point = index => ({ x: 45 + index % 8 * 90, y: 45 + Math.floor(index / 8) * 90 });
const event = (phase, index) => ({ id: 1, phase, ...point(index) });
const input = (...touches) => ({ touches, now: 0 });
const move = (from, to) => input(event('down', from), event('up', to));
const tap = index => input(event('down', index), event('up', index));
const pictureNames = ['apple', 'bananas', 'strawberry', 'blueberries', 'carrot', 'broccoli'];
const pictures = pictureNames.map(name => ({ path: 'assets/' + name + '.png', width: 160, height: 160 }));
const make = () => createRuntime(createCart, screen, [], pictures);

function settle(game) {
  for (let i = 0; i < 600 && game.state().phase; i++) game.tick(input());
  const state = game.state();
  assert.equal(state.phase, null);
  assert.deepEqual(findMatches(state.board), []);
  return state;
}

test('the opening board has a legal move and rejects a nonmatching swap at no cost', () => {
  const game = make();
  const opening = game.state().board;
  assert.deepEqual(findMatches(opening), []);
  const swaps = legalSwaps(opening);
  assert.ok(swaps.some(([a, b]) => a === 3 && b === 11));
  assert.ok(!swaps.some(([a, b]) => a === 0 && b === 1));
  game.tick(tap(0));
  game.tick(tap(1));
  const rejected = settle(game);
  assert.deepEqual(rejected.board, opening);
  assert.equal(rejected.moves, 18);
  assert.match(rejected.status, /makes no match/);
});

test('matches consume one move per swap and the authored board can fill both orders', () => {
  const game = make();
  game.tick(move(3, 11));
  const first = settle(game);
  assert.equal(first.readout.apples, 2);
  assert.equal(first.moves, 17);
  for (const [from, to] of [[21, 29], [14, 22], [29, 37], [0, 8]]) {
    game.tick(move(from, to));
    settle(game);
  }
  const won = game.state();
  assert.equal(won.outcome, 'won');
  assert.deepEqual(won.readout, { apples: 0, strawberries: 0, blueberries: 0, carrots: 0, moves: 13 });
  game.tick(move(3, 11));
  assert.deepEqual(game.state(), won);
});

test('the final cascade resolves before the level runs out of moves', () => {
  const game = make();
  const unsuccessful = [[3, 11], [0, 8], [4, 12], [8, 16], [10, 11], [2, 3], [11, 12],
    [14, 22], [14, 15], [18, 26], [0, 8], [17, 18], [10, 18], [21, 29], [12, 13],
    [29, 37], [34, 42], [37, 38]];
  for (const [from, to] of unsuccessful) {
    game.tick(move(from, to));
    settle(game);
  }
  assert.equal(game.state().moves, 0);
  assert.equal(game.state().outcome, 'lost');
  assert.match(game.state().status, /Retry/);
  assert.equal(make().state().moves, 18);
});

test('a recorded swap and cascade reproduce the same state even with extra draw frames', () => {
  const frames = [tap(3), tap(11), ...Array.from({ length: 72 }, () => input()), move(21, 29),
    ...Array.from({ length: 72 }, () => input())];
  function replay(record, renders) {
    const game = make();
    return record.map(frame => {
      game.tick(frame);
      const state = structuredClone(game.state());
      for (let i = 0; i < renders; i++) game.draw(i / renders);
      assert.deepEqual(game.state(), state);
      return state;
    });
  }
  const expected = replay(frames, 0);
  assert.deepEqual(replay(JSON.parse(JSON.stringify(frames)), 2), expected);
  assert.equal(expected.at(-1).moves, 16);
});
