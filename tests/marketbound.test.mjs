import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCart, LEVELS, findMatches, legalSwaps } from '../carts/marketbound/code.js';
import { createRuntime } from '../src/runtime.mjs';

const screen = { w: 720, h: 720, scale: 2, dpr: 1, safe: { top: 0, left: 0, right: 0, bottom: 0 } };
const point = index => ({ x: 45 + index % 8 * 90, y: 45 + Math.floor(index / 8) * 90 });
const event = (phase, index) => ({ id: 1, phase, ...point(index) });
const input = (...touches) => ({ touches, now: 0 });
const move = (from, to) => input(event('down', from), event('up', to));
const tap = index => input(event('down', index), event('up', index));
const pictureNames = ['apple', 'bananas', 'strawberry', 'blueberries', 'carrot', 'broccoli'];
const pictures = pictureNames.map(name => ({ path: 'assets/' + name + '.png', width: 160, height: 160 }));
const make = (level = 0) => createRuntime(createCart, screen, [], pictures, { level });

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
  assert.equal(first.remaining[0], 2);
  assert.equal(first.moves, 17);
  for (const [from, to] of [[21, 29], [14, 22], [29, 37], [0, 8]]) {
    game.tick(move(from, to));
    settle(game);
  }
  const won = game.state();
  assert.equal(won.outcome, 'won');
  assert.deepEqual(won.remaining, [0, 0, 0, 0]);
  assert.equal(won.moves, 13);
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

test('a match of four sweeps one full lane when sweeps are enabled', () => {
  const board = Array.from({ length: 64 }, (_, i) => (i + Math.floor(i / 8)) % 5);
  for (let i = 27; i <= 30; i++) board[i] = 5;
  assert.deepEqual(findMatches(board), [27, 28, 29, 30]);
  assert.deepEqual(findMatches(board, true), [24, 25, 26, 27, 28, 29, 30, 31]);
});

const routes = [
  [[3, 11], [21, 29], [14, 22], [29, 37], [0, 8]],
  [[50, 58], [28, 36], [38, 39], [21, 22]],
  [[7, 15], [43, 44], [26, 34], [12, 20], [10, 11]],
  [[53, 61], [13, 14], [61, 62], [33, 34], [21, 22]],
  [[50, 58], [49, 57], [33, 34], [41, 42], [36, 44], [50, 58], [29, 30], [2, 3], [47, 55]],
  [[3, 11], [29, 30], [12, 20], [43, 44], [33, 41], [33, 34], [42, 50], [11, 12]],
  [[36, 44], [54, 55], [60, 61], [42, 43], [52, 60], [10, 11], [50, 51], [34, 35], [25, 26], [35, 43], [24, 25]],
  [[50, 51], [50, 58], [48, 49], [27, 35], [56, 57], [50, 51], [36, 44], [29, 37], [60, 61]],
];

test('all eight deliveries have completable boards, goals, and move budgets', () => {
  assert.equal(routes.length, LEVELS.length);
  routes.forEach((route, index) => {
    const game = make(index);
    const opening = game.state();
    assert.equal(opening.level, index);
    assert.deepEqual(opening.soil, LEVELS[index].soil ?? []);
    assert.deepEqual(findMatches(opening.board), []);
    for (const [a, b] of route) {
      game.tick(move(a, b));
      settle(game);
    }
    const state = game.state();
    assert.equal(state.outcome, 'won', LEVELS[index].name);
    assert.deepEqual(state.soil, []);
    assert.ok(state.remaining.every(count => count === 0));
    assert.equal(state.moves, opening.moves - route.length);
    assert.equal(state.audio.name, 'win');
  });
});

test('a later delivery replays sweeps, cleared plots, and cues tick for tick', () => {
  const index = 3;
  const game = make(index);
  const poses = [];
  const frames = [];
  const tick = frame => {
    frames.push(frame);
    game.tick(frame);
    poses.push(structuredClone(game.state()));
  };
  for (const [a, b] of routes[index]) {
    tick(move(a, b));
    while (game.state().phase) tick(input());
  }
  const replay = make(index);
  assert.notDeepEqual(make().state().board, replay.state().board);
  JSON.parse(JSON.stringify(frames)).forEach((frame, i) => {
    replay.tick(frame);
    replay.draw(.5);
    assert.deepEqual(replay.state(), poses[i]);
  });
  assert.equal(replay.state().outcome, 'won');
});
