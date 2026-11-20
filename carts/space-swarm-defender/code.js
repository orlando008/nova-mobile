export const WIDTH = 360;
export const HEIGHT = 575;
export const FIELD = 449;
export const ART_SIZE = 96;

export const TOWERS = {
  pulse: { name: 'Pulse', cost: 55, range: 83, damage: 13, interval: 22, color: [.24, .91, .96] },
  nova: { name: 'Nova', cost: 85, range: 77, damage: 23, interval: 46, splash: 41, color: [1, .65, .30] },
  cryo: { name: 'Cryo', cost: 65, range: 78, damage: 7, interval: 27, slow: 62, color: [.65, .61, 1] },
};

export const TOWER_TYPES = Object.keys(TOWERS);

export const CONTROLS = {
  pulse: { x: 8, y: 458, w: 110, h: 47 },
  nova: { x: 125, y: 458, w: 110, h: 47 },
  cryo: { x: 242, y: 458, w: 110, h: 47 },
  upgrade: { x: 8, y: 515, w: 78, h: 47 },
  salvage: { x: 91, y: 515, w: 70, h: 47 },
  launch: { x: 166, y: 515, w: 131, h: 47 },
  speed: { x: 302, y: 515, w: 50, h: 47 },
};

export const SECTORS = [
  {
    name: 'Kepler Gate',
    description: 'A long approach and tight turns give you space to learn.',
    color: [.24, .82, .90],
    routes: [[[-20, 71], [262, 71], [262, 173], [82, 173], [82, 278], [261, 278], [261, 368], [176, 368], [176, 464]]],
    pads: [[73, 119], [142, 119], [212, 122], [310, 113], [309, 214], [208, 223], [145, 224],
      [35, 219], [37, 326], [125, 326], [195, 322], [310, 326], [118, 409], [229, 418]],
    credits: 150,
    pressure: 1,
  },
  {
    name: 'Ion Trench',
    description: 'Faster swarms and long straights reward early coverage.',
    color: [.45, .65, 1],
    routes: [[[179, -16], [179, 75], [53, 75], [53, 185], [305, 185], [305, 281], [111, 281], [111, 378], [233, 378], [233, 464]]],
    pads: [[123, 33], [230, 50], [177, 126], [112, 131], [249, 133], [309, 132], [57, 237],
      [128, 234], [194, 234], [259, 233], [67, 328], [163, 328], [231, 329], [286, 327], [171, 418], [291, 417]],
    credits: 160,
    pressure: 1.12,
  },
  {
    name: 'Hollow Relay',
    description: 'Two entrances converge. Hold the junction or cover both lanes.',
    color: [.75, .57, 1],
    routes: [
      [[-20, 72], [127, 72], [127, 153], [180, 153], [180, 248], [59, 248], [59, 348], [239, 348], [239, 464]],
      [[380, 79], [245, 79], [245, 153], [180, 153], [180, 248], [59, 248], [59, 348], [239, 348], [239, 464]],
    ],
    pads: [[66, 123], [183, 102], [301, 131], [101, 201], [232, 204], [307, 204], [227, 263],
      [282, 268], [109, 298], [175, 297], [236, 299], [16, 300], [287, 347], [98, 400], [179, 400], [287, 410]],
    credits: 210,
    pressure: 1.25,
  },
];

const ENEMIES = {
  scout: { hp: 41, speed: 1.48, reward: 8, size: 22, leak: 1 },
  runner: { hp: 31, speed: 2.38, reward: 8, size: 20, leak: 1 },
  guard: { hp: 125, speed: 1.12, reward: 15, size: 31, leak: 2 },
  queen: { hp: 1060, speed: 1.04, reward: 85, size: 57, leak: 5 },
};

const WAVES = [
  [['scout', 9, 33]],
  [['scout', 8, 24], ['runner', 9, 17]],
  [['guard', 5, 44], ['scout', 12, 18]],
  [['runner', 13, 13], ['guard', 7, 32]],
  [['scout', 12, 14], ['guard', 8, 23], ['runner', 10, 13]],
  [['guard', 12, 19], ['runner', 19, 11]],
  [['runner', 16, 10], ['guard', 13, 19], ['scout', 12, 12]],
  [['guard', 7, 20], ['queen', 1, 26], ['runner', 16, 11], ['guard', 10, 19]],
];

export const WAVE_COUNT = WAVES.length;
export const START_CORE = 15;
const MAX_LEVEL = 3;
const DOCK = [.025, .060, .106];
const BUTTON = [.068, .136, .200];
const MUTED = [.10, .20, .27];
const AMBER = [.99, .48, .22];

const distance = (x, y, p) => Math.hypot(p.x - x, p.y - y);
const upgradeCost = tower => Math.ceil(TOWERS[tower.type].cost * (tower.level === 1 ? .7 : 1.05));
const rangeOf = tower => TOWERS[tower.type].range + 10 * (tower.level - 1);

function makeRoute(points) {
  let length = 0;
  const legs = points.slice(1).map(([endX, endY], index) => {
    const [x, y] = points[index];
    const legLength = Math.hypot(endX - x, endY - y);
    length += legLength;
    return { x, y, dx: (endX - x) / legLength, dy: (endY - y) / legLength, end: length, length: legLength };
  });
  return { legs, length };
}

function placeEnemy(enemy, route) {
  const leg = route.legs.find(item => enemy.traveled <= item.end) ?? route.legs.at(-1);
  const position = enemy.traveled - (leg.end - leg.length);
  enemy.x = leg.x + leg.dx * position;
  enemy.y = leg.y + leg.dy * position;
}

function waveQueue(number) {
  let time = 10;
  const queue = [];
  for (const [type, count, gap] of WAVES[number - 1]) {
    for (let i = 0; i < count; i++) {
      queue.push({ type, time });
      time += gap;
    }
  }
  return queue;
}

export function createCart(api) {
  const sectorId = SECTORS[api.options.sector] ? Number(api.options.sector) : 0;
  const sector = SECTORS[sectorId];
  const routes = sector.routes.map(makeRoute);
  const towers = new Array(sector.pads.length).fill(null);
  let enemies = [];
  let effects = [];
  let queue = [];
  let cursor = 0;
  let credits = sector.credits;
  let core = START_CORE;
  let wave = 0;
  let waveTick = 0;
  let tick = 0;
  let phase = 'setup';
  let picked = 'pulse';
  let selected = -1;
  let speed = 1;
  let kills = 0;
  let cue = { id: 0, type: '' };
  let status = 'Select a tower, then tap a build pad.';

  function sound(type) {
    cue = { id: cue.id + 1, type };
  }

  function startWave() {
    wave++;
    waveTick = 0;
    queue = waveQueue(wave);
    cursor = 0;
    phase = 'wave';
    status = wave === WAVE_COUNT ? 'The queen has entered the sector.' : 'Wave ' + wave + ' incoming.';
    sound('wave');
  }

  function selectPad(index) {
    selected = index;
    if (towers[index]) {
      const tower = towers[index];
      picked = '';
      status = TOWERS[tower.type].name + ' · Level ' + tower.level;
      sound('select');
      return;
    }
    if (!picked) {
      status = 'Choose a tower below to fill this pad.';
      return;
    }
    const { name, cost } = TOWERS[picked];
    if (cost > credits) {
      status = 'You need ' + cost + ' credits to build ' + name + '.';
      sound('denied');
      return;
    }
    towers[index] = { type: picked, level: 1, cooldown: 0, spent: cost };
    credits -= cost;
    status = name + ' built.';
    sound('build');
  }

  function input() {
    const scale = api.screen().w / WIDTH;
    const clicked = (id, { x, y, w, h }) => api.button(id, {
      x: x * scale, y: y * scale, w: w * scale, h: h * scale,
    }) === 'clicked';
    for (const type of TOWER_TYPES) {
      if (!clicked(type, CONTROLS[type])) continue;
      picked = type;
      if (selected !== -1 && !towers[selected]) selectPad(selected);
      else {
        selected = -1;
        status = 'Choose a pad for ' + TOWERS[type].name + '.';
        sound('select');
      }
    }
    sector.pads.forEach(([x, y], index) => {
      if (clicked('pad' + index, { x: x - 21, y: y - 21, w: 42, h: 42 })) selectPad(index);
    });
    const tower = towers[selected];
    if (clicked('upgrade', CONTROLS.upgrade) && tower && tower.level < MAX_LEVEL) {
      const cost = upgradeCost(tower);
      if (credits >= cost) {
        credits -= cost;
        tower.spent += cost;
        tower.level++;
        status = TOWERS[tower.type].name + ' upgraded to level ' + tower.level + '.';
        sound('build');
      } else {
        status = 'You need ' + cost + ' credits to upgrade.';
        sound('denied');
      }
    }
    if (clicked('salvage', CONTROLS.salvage) && tower) {
      const refund = Math.floor(tower.spent * .65);
      credits += refund;
      towers[selected] = null;
      selected = -1;
      status = 'Tower salvaged for ' + refund + ' credits.';
      sound('select');
    }
    if (clicked('launch', CONTROLS.launch) && phase === 'setup') startWave();
    if (clicked('speed', CONTROLS.speed)) speed = speed === 1 ? 2 : 1;
  }

  function spawn() {
    while (cursor < queue.length && queue[cursor].time <= waveTick) {
      const { type } = queue[cursor];
      const route = cursor % routes.length;
      const spec = ENEMIES[type];
      const hp = Math.round(spec.hp * (1 + (wave - 1) * .115) * sector.pressure);
      const enemy = { type, route, hp, maxHp: hp, traveled: 0, chill: 0, flash: 0 };
      placeEnemy(enemy, routes[route]);
      enemies.push(enemy);
      cursor++;
    }
  }

  function fire(tower, target, x, y) {
    const spec = TOWERS[tower.type];
    const damage = Math.round(spec.damage * (1 + .60 * (tower.level - 1)));
    target.hp -= damage;
    target.flash = 5;
    if (spec.slow) target.chill = spec.slow + tower.level * 8;
    if (spec.splash) {
      for (const neighbor of enemies) {
        if (neighbor !== target && neighbor.hp > 0 && distance(target.x, target.y, neighbor) <= spec.splash) {
          neighbor.hp -= Math.ceil(damage * .72);
          neighbor.flash = 5;
        }
      }
    }
    effects.push({ kind: tower.type, x, y, tx: target.x, ty: target.y, born: tick, life: 12 });
    tower.cooldown = spec.interval - (tower.level - 1) * 2;
    if (tick % 5 < 2) sound(tower.type);
  }

  function defend() {
    towers.forEach((tower, index) => {
      if (!tower) return;
      if (tower.cooldown > 0) tower.cooldown--;
      if (tower.cooldown > 0) return;
      const [x, y] = sector.pads[index];
      let target;
      let nearestCore = Infinity;
      for (const enemy of enemies) {
        const remaining = routes[enemy.route].length - enemy.traveled;
        if (enemy.hp <= 0 || remaining >= nearestCore || distance(x, y, enemy) > rangeOf(tower)) continue;
        target = enemy;
        nearestCore = remaining;
      }
      if (target) fire(tower, target, x, y);
    });
  }

  function processEnemies() {
    enemies = enemies.filter(enemy => {
      const spec = ENEMIES[enemy.type];
      if (enemy.hp <= 0) {
        credits += spec.reward;
        kills++;
        effects.push({ kind: 'burst', tx: enemy.x, ty: enemy.y, born: tick, life: 19 });
        return false;
      }
      if (enemy.traveled >= routes[enemy.route].length - 27) {
        core = Math.max(0, core - spec.leak);
        effects.push({ kind: 'burst', tx: enemy.x, ty: FIELD - 15, born: tick, life: 20 });
        status = 'Core hit. ' + core + ' integrity remaining.';
        sound('leak');
        return false;
      }
      return true;
    });
  }

  function step() {
    tick++;
    effects = effects.filter(effect => tick - effect.born < effect.life);
    if (phase !== 'wave') return;
    waveTick++;
    spawn();
    for (const enemy of enemies) {
      enemy.traveled += ENEMIES[enemy.type].speed * Math.sqrt(sector.pressure) * (enemy.chill > 0 ? .54 : 1);
      placeEnemy(enemy, routes[enemy.route]);
      if (enemy.chill > 0) enemy.chill--;
      if (enemy.flash > 0) enemy.flash--;
    }
    defend();
    processEnemies();
    if (core === 0) {
      phase = 'lost';
      status = 'The core has fallen.';
      sound('loss');
    } else if (cursor === queue.length && enemies.length === 0) {
      if (wave === WAVE_COUNT) {
        phase = 'won';
        status = 'Sector secured.';
        sound('win');
      } else {
        phase = 'setup';
        credits += 28 + wave * 5;
        status = 'Wave cleared. Reinforcements are ready.';
        sound('clear');
      }
    }
  }

  function update() {
    if (phase === 'won' || phase === 'lost') return;
    input();
    for (let i = 0; i < speed; i++) step();
  }

  function draw(alpha) {
    const scale = api.screen().w / WIDTH;
    const rect = (x, y, w, h, color) => api.rect(x * scale, y * scale, w * scale, h * scale, color);
    const sprite = (name, x, y, size, opacity = 1) => api.spr('assets/' + name + '.png', x * scale, y * scale, {
      scale: size * scale / ART_SIZE, anchor: [.5, .5], alpha: opacity,
    });

    api.spr('assets/space.png', 0, 0, { sx: scale, sy: scale });
    for (const width of [26, 22, 15]) {
      const color = width === 26 ? [...sector.color, .42] : width === 22 ? [.045, .12, .18] : [.065, .20, .26];
      for (const { legs } of routes) for (const leg of legs) {
        const x2 = leg.x + leg.dx * leg.length;
        const y2 = leg.y + leg.dy * leg.length;
        rect(Math.min(leg.x, x2) - width / 2, Math.min(leg.y, y2) - width / 2,
          Math.abs(x2 - leg.x) + width, Math.abs(y2 - leg.y) + width, color);
      }
    }
    for (const { legs } of routes) for (const leg of legs) {
      for (let i = 8; i < leg.length - 4; i += 15) {
        rect(leg.x + leg.dx * i - 1.4, leg.y + leg.dy * i - 1.4, 2.8, 2.8, [...sector.color, .47]);
      }
    }
    const mount = towers[selected];
    if (mount) {
      const [x, y] = sector.pads[selected];
      sprite('range', x, y, rangeOf(mount) * 2, .55);
    }
    sector.pads.forEach(([x, y], index) => {
      const tower = towers[index];
      if (selected === index) sprite('range', x, y, 48, .87);
      sprite('pad', x, y, 38, tower ? .68 : 1);
      if (!tower) return;
      sprite(tower.type, x, y, 41);
      for (let i = 0; i < tower.level; i++) rect(x - 7 + i * 5, y + 17, 3, 3, TOWERS[tower.type].color);
    });
    const coreX = sector.routes[0].at(-1)[0];
    sprite('core', coreX, FIELD - 20, 72, core > 0 ? 1 : .38);

    for (const enemy of enemies) {
      const { size } = ENEMIES[enemy.type];
      if (enemy.chill > 0) sprite('range', enemy.x, enemy.y, size + 7, .7);
      sprite(enemy.type, enemy.x, enemy.y, size, enemy.flash > 0 ? .7 : 1);
      if (enemy.hp < enemy.maxHp || enemy.type === 'queen') {
        const width = size * .76;
        rect(enemy.x - width / 2, enemy.y - size / 2 - 4, width, 3, [.21, .17, .22]);
        rect(enemy.x - width / 2, enemy.y - size / 2 - 4, width * enemy.hp / enemy.maxHp, 3, AMBER);
      }
    }
    for (const effect of effects) {
      const progress = Math.min(1, (tick - effect.born + alpha) / effect.life);
      if (effect.kind === 'burst') {
        sprite('burst', effect.tx, effect.ty, 18 + 28 * progress, 1 - progress);
        continue;
      }
      const color = TOWERS[effect.kind].color;
      const length = Math.hypot(effect.tx - effect.x, effect.ty - effect.y);
      const dots = Math.ceil(length / 6);
      for (let i = 1; i <= dots; i++) {
        const position = i / dots;
        const x = effect.x + (effect.tx - effect.x) * position;
        const y = effect.y + (effect.ty - effect.y) * position;
        rect(x - 1.5, y - 1.5, 3, 3, [...color, (1 - progress) * .9]);
      }
      sprite(effect.kind === 'nova' ? 'burst' : 'range', effect.tx, effect.ty, 13 + 28 * progress, 1 - progress);
    }

    rect(0, FIELD, WIDTH, HEIGHT - FIELD, DOCK);
    rect(0, FIELD, WIDTH, 1, [...sector.color, .47]);
    Object.entries(CONTROLS).forEach(([id, box]) => {
      const type = TOWERS[id];
      const enabled = type ? credits >= type.cost
        : id === 'upgrade' ? mount && mount.level < MAX_LEVEL && credits >= upgradeCost(mount)
        : id === 'salvage' ? Boolean(mount) : id !== 'launch' || phase === 'setup';
      const active = id === picked || (id === 'launch' && enabled);
      rect(box.x, box.y, box.w, box.h, active ? (type?.color ?? sector.color) : MUTED);
      rect(box.x + 1, box.y + 1, box.w - 2, box.h - 2, enabled ? BUTTON : DOCK);
      if (active) rect(box.x + 1, box.y + 1, box.w - 2, box.h - 2, [...(type?.color ?? sector.color), .13]);
      if (type) sprite(id, box.x + 21, box.y + box.h / 2, 32, enabled ? 1 : .47);
    });
  }

  function state() {
    const tower = towers[selected];
    return {
      sector: sectorId, wave, phase, core, credits, kills, speed, picked, selected, cue, status,
      tick, waveTick, cursor,
      towers: towers.map(item => item && { ...item }),
      enemies: enemies.map(enemy => ({ ...enemy })),
      upgrade: tower && tower.level < MAX_LEVEL ? upgradeCost(tower) : 0,
      salvage: tower ? Math.floor(tower.spent * .65) : 0,
      readout: {
        core: core + '/' + START_CORE,
        credits,
        wave: Math.min(WAVE_COUNT, phase === 'setup' ? wave + 1 : Math.max(1, wave)) + '/' + WAVE_COUNT,
        sector: sector.name,
      },
    };
  }

  return { update, draw, state };
}
