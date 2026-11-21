import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ART_SIZE, CONTROLS, FIELD, HEIGHT, SECTORS, START_CORE, TOWERS, WAVE_COUNT, WIDTH, createCart } from '../carts/space-swarm-defender/code.js';
import { loadRatings, planetUnlocked, recordWin, STARS_PER_ZONE, zoneUnlocked } from '../play/space-swarm-defender/campaign.mjs';
import { createRuntime } from '../src/runtime.mjs';

const screen = { w: 720, h: HEIGHT * 2, scale: 2, dpr: 1, safe: {} };
const sprites = ['pad', 'range', 'blocked', 'pulse', 'nova', 'cryo', 'core', 'scout', 'runner', 'guard', 'queen', 'burst']
  .map(name => ({ path: 'assets/' + name + '.png', width: ART_SIZE, height: ART_SIZE }));
sprites.push({ path: 'assets/space.png', width: WIDTH, height: FIELD });
const idle = { touches: [], now: 0 };
const make = sector => createRuntime(createCart, screen, [], sprites, { sector });
const sample = (phase, x, y) => ({ id: 1, phase, x: x * 2, y: y * 2 });
const touch = (phase, x, y) => ({ ...idle, touches: [sample(phase, x, y)] });
const tap = (x, y) => ({ ...idle, touches: ['down', 'up'].map(phase => sample(phase, x, y)) });
const buttonCenter = key => {
  const box = CONTROLS[key];
  return [box.x + box.w / 2, box.y + box.h / 2];
};
const command = key => tap(...buttonCenter(key));

function settleWave(game) {
  for (let i = 0; i < 2600 && game.state().phase === 'wave'; i++) game.tick(idle);
  assert.notEqual(game.state().phase, 'wave', 'wave did not finish');
}

test('build, upgrade, and salvage apply the right credit amounts', () => {
  const game = make(0);
  game.tick(command('nova'));
  game.tick(tap(142, 119));
  assert.equal(game.state().towers[0].type, 'nova');
  assert.equal(game.state().credits, 65);
  game.tick(tap(212, 122));
  assert.equal(game.state().towers.length, 1);
  assert.equal(game.state().credits, 65);
  game.tick(tap(142, 119));
  assert.equal(game.state().upgrade, 60);
  game.tick(command('upgrade'));
  assert.equal(game.state().towers[0].level, 2);
  assert.equal(game.state().credits, 5);
  game.tick(command('salvage'));
  assert.equal(game.state().towers.length, 0);
  assert.equal(game.state().credits, 99);
});

test('dragging a shop tower previews and builds at the release point', () => {
  for (const [type, tower] of Object.entries(TOWERS)) {
    const game = make(0);
    game.tick(touch('down', ...buttonCenter(type)));
    game.tick(touch('move', 100, 115));
    assert.equal(game.state().status, 'Release to build ' + tower.name + '.');
    assert.equal(game.state().towers.length, 0);
    assert.equal(game.state().credits, 150);
    assert.ok(game.draw(.5).every(Number.isFinite));

    game.tick(touch('up', 115, 120));
    const [{ x, y, type: builtType }] = game.state().towers;
    assert.deepEqual([x, y, builtType], [115, 120, type]);
    assert.equal(game.state().credits, 150 - tower.cost);
  }
});

test('blocked and canceled drops leave the field and credits intact', () => {
  const game = make(0);
  game.tick(tap(115, 120));
  for (const [x, y, status] of [
    [145, 71, 'Keep the swarm lane clear.'],
    [145, 97, 'Keep the swarm lane clear.'],
    [137, 120, 'Leave room between towers.'],
    [211, 419, 'Leave room around the core.'],
    [7, 120, 'Build inside the field.'],
    [220, 538, 'Build inside the field.'],
  ]) {
    game.tick(touch('down', ...buttonCenter('nova')));
    game.tick(touch('move', x, y));
    assert.equal(game.state().status, status);
    assert.ok(game.draw(.5).every(Number.isFinite));
    game.tick(touch('up', x, y));
    assert.equal(game.state().status, status);
    assert.equal(game.state().towers.length, 1);
    assert.equal(game.state().credits, 95);
    assert.equal(game.state().phase, 'setup');
  }
  for (const frame of [touch('cancel', 190, 120), { ...idle, lifecycle: 'pause' }]) {
    game.tick(touch('down', ...buttonCenter('nova')));
    game.tick(touch('move', 190, 120));
    game.tick(frame);
    game.tick(touch('up', 190, 120));
    assert.equal(game.state().towers.length, 1);
    assert.equal(game.state().credits, 95);
  }
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

test('all twelve zones can earn three stars and unlock the full campaign through touch controls', () => {
  const strategies = [
    [[142, 119], [212, 122], [195, 322], [145, 224], [208, 223], [73, 119], [229, 418], [125, 326], [310, 113], [35, 219], [310, 326], [118, 409], [309, 214], [37, 326]],
    [[177, 126], [128, 234], [163, 328], [112, 131], [259, 233], [194, 234], [231, 329], [171, 418], [123, 33], [67, 328], [57, 237], [286, 327], [230, 50], [249, 133], [291, 417], [309, 132]],
    [[109, 298], [175, 297], [179, 400], [101, 201], [183, 102], [232, 204], [16, 300], [98, 400], [287, 410], [66, 123], [301, 131], [236, 299], [287, 347], [227, 263], [307, 204], [282, 268]],
    [[196, 112], [244, 216], [259, 117], [210, 315], [111, 215], [179, 216], [202, 414], [141, 316], [248, 29], [300, 315], [122, 119], [309, 219], [82, 313], [142, 44], [76, 413], [57, 118]],
    [[205, 132], [135, 135], [202, 241], [151, 335], [138, 240], [118, 422], [279, 132], [223, 339], [44, 125], [321, 236], [44, 339], [230, 414], [45, 231], [319, 339]],
    [[259, 286], [195, 285], [191, 395], [267, 187], [187, 93], [137, 190], [344, 288], [79, 406], [299, 112], [64, 120], [133, 287], [270, 395], [79, 338], [142, 250], [57, 190], [84, 255]],
    [[163, 108], [233, 111], [217, 310], [166, 209], [229, 208], [86, 108], [249, 415], [145, 315], [319, 102], [319, 315], [42, 204], [137, 405], [318, 199], [44, 315]],
    [[99, 312], [163, 311], [167, 405], [92, 217], [171, 112], [221, 220], [16, 314], [89, 405], [59, 135], [225, 313], [295, 144], [280, 414], [280, 357], [216, 278], [302, 220], [274, 283]],
    [[193, 110], [142, 213], [125, 114], [179, 312], [271, 212], [210, 213], [187, 413], [137, 28], [245, 313], [262, 116], [76, 312], [245, 43], [296, 311], [300, 412], [65, 216], [316, 115]],
    [[237, 315], [168, 314], [164, 406], [160, 114], [113, 223], [246, 220], [109, 315], [342, 316], [249, 406], [117, 281], [58, 411], [51, 146], [63, 359], [285, 137], [45, 223], [67, 286]],
    [[163, 136], [214, 247], [177, 338], [231, 141], [86, 246], [146, 247], [111, 339], [219, 36], [169, 421], [62, 337], [112, 54], [282, 338], [95, 143], [293, 250], [58, 420], [42, 142]],
    [[239, 135], [169, 138], [236, 245], [187, 338], [173, 244], [151, 423], [300, 135], [255, 342], [332, 240], [59, 128], [59, 342], [261, 415], [330, 342], [60, 235]],
  ];
  const rotation = ['pulse', 'nova', 'cryo', 'nova', 'pulse', 'nova', 'pulse', 'cryo'];
  assert.equal(strategies.length, SECTORS.length);
  const ratings = loadRatings();
  for (const [sector, strategy] of strategies.entries()) {
    assert.equal(zoneUnlocked(Math.floor(sector / 3), sector, ratings), true);
    const game = make(sector);
    let built = 0;
    game.tick(command('speed'));
    for (let wave = 0; wave < WAVE_COUNT; wave++) {
      assert.equal(game.state().phase, 'setup', SECTORS[sector].name);
      while (built < strategy.length) {
        const type = rotation[built % rotation.length];
        if (game.state().credits < TOWERS[type].cost) break;
        game.tick(command(type));
        const [x, y] = strategy[built];
        game.tick(tap(x, y));
        assert.equal(game.state().towers[built]?.type, type, `${SECTORS[sector].name} (${x}, ${y}): ${game.state().status}`);
        built++;
      }
      for (const [x, y] of wave > 1 ? strategy.slice(0, built) : []) {
        game.tick(tap(x, y));
        if (game.state().upgrade > 0 && game.state().credits >= game.state().upgrade) game.tick(command('upgrade'));
      }
      game.tick(command('launch'));
      settleWave(game);
    }
    assert.equal(game.state().phase, 'won', SECTORS[sector].name);
    assert.equal(game.state().wave, WAVE_COUNT);
    assert.equal(recordWin(ratings, sector, game.state().core), STARS_PER_ZONE, SECTORS[sector].name);
  }
  assert.ok(ratings.every(stars => stars === STARS_PER_ZONE));
  assert.equal(planetUnlocked(3, ratings), true);
});

test('identical input streams replay the wave tick for tick', () => {
  const live = make(2);
  const replay = make(2);
  const recording = [command('nova'), tap(109, 298), command('cryo'), tap(175, 297), command('launch'),
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
