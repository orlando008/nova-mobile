import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ART_SIZE, CONTROLS, FIELD, HEIGHT, SECTORS, START_CORE, TOWERS, WAVE_COUNT, WIDTH, createCart } from '../carts/space-swarm-defender/code.js';
import { createRuntime } from '../src/runtime.mjs';

const screen = { w: 720, h: HEIGHT * 2, scale: 2, dpr: 1, safe: {} };
const sprites = ['pad', 'range', 'pulse', 'nova', 'cryo', 'core', 'scout', 'runner', 'guard', 'queen', 'burst']
  .map(name => ({ path: 'assets/' + name + '.png', width: ART_SIZE, height: ART_SIZE }));
sprites.push({ path: 'assets/space.png', width: WIDTH, height: FIELD });
const idle = { touches: [], now: 0 };
const make = sector => createRuntime(createCart, screen, [], sprites, { sector });
const tap = (x, y) => ({ ...idle, touches: ['down', 'up'].map(phase => ({ id: 1, phase, x: x * 2, y: y * 2 })) });
const command = key => {
  const box = CONTROLS[key];
  return tap(box.x + box.w / 2, box.y + box.h / 2);
};
const pad = (sector, index) => tap(...SECTORS[sector].pads[index]);

function settleWave(game) {
  for (let i = 0; i < 2600 && game.state().phase === 'wave'; i++) game.tick(idle);
  assert.notEqual(game.state().phase, 'wave', 'wave did not finish');
}

test('build, upgrade, and salvage apply the right credit amounts', () => {
  const game = make(0);
  game.tick(command('nova'));
  game.tick(pad(0, 1));
  assert.equal(game.state().towers[1].type, 'nova');
  assert.equal(game.state().credits, 65);
  game.tick(pad(0, 2));
  assert.equal(game.state().towers[2], null);
  assert.equal(game.state().credits, 65);
  game.tick(pad(0, 1));
  assert.equal(game.state().upgrade, 60);
  game.tick(command('upgrade'));
  assert.equal(game.state().towers[1].level, 2);
  assert.equal(game.state().credits, 5);
  game.tick(command('salvage'));
  assert.equal(game.state().towers[1], null);
  assert.equal(game.state().credits, 99);
});

test('an undefended core takes damage and loses on wave two', () => {
  const game = make(0);
  game.tick(command('speed'));
  game.tick(command('launch'));
  settleWave(game);
  assert.equal(game.state().core, START_CORE - 9);
  assert.equal(game.state().kills, 0);
  game.tick(command('launch'));
  settleWave(game);
  assert.equal(game.state().core, 0);
  assert.equal(game.state().phase, 'lost');
});

test('all three sectors can clear eight waves through touch controls', () => {
  const strategies = [
    [1, 2, 10, 6, 5, 0, 13, 9, 3, 7, 11, 12, 4, 8],
    [2, 7, 11, 3, 9, 8, 12, 14, 0, 10, 6, 13, 1, 4, 15, 5],
    [8, 9, 14, 3, 1, 4, 11, 13, 15, 0, 2, 10, 12, 6, 5, 7],
  ];
  const rotation = ['pulse', 'nova', 'cryo', 'nova', 'pulse', 'nova', 'pulse', 'cryo'];
  for (const [sector, strategy] of strategies.entries()) {
    const game = make(sector);
    let built = 0;
    game.tick(command('speed'));
    for (let wave = 0; wave < WAVE_COUNT; wave++) {
      assert.equal(game.state().phase, 'setup', SECTORS[sector].name);
      while (built < strategy.length) {
        const type = rotation[built % rotation.length];
        if (game.state().credits < TOWERS[type].cost) break;
        game.tick(command(type));
        game.tick(pad(sector, strategy[built]));
        assert.equal(game.state().towers[strategy[built]].type, type);
        built++;
      }
      for (const index of wave > 1 ? strategy.slice(0, built) : []) {
        game.tick(pad(sector, index));
        if (game.state().upgrade > 0 && game.state().credits >= game.state().upgrade) game.tick(command('upgrade'));
      }
      game.tick(command('launch'));
      settleWave(game);
    }
    assert.equal(game.state().phase, 'won', SECTORS[sector].name);
    assert.equal(game.state().wave, WAVE_COUNT);
    assert.ok(game.state().core > 0);
  }
});

test('identical input streams replay the wave tick for tick', () => {
  const live = make(2);
  const replay = make(2);
  const recording = [command('nova'), pad(2, 8), command('cryo'), pad(2, 9), command('launch'),
    ...Array.from({ length: 550 }, () => idle)];
  for (const frame of recording) {
    live.tick(frame);
    replay.tick(frame);
    const drawList = replay.draw(.5);
    assert.ok(drawList.length > 0 && drawList.every(Number.isFinite));
    assert.deepEqual(replay.state(), live.state());
  }
  assert.ok(live.state().kills > 0);
});
