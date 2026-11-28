export const WIDTH = 360;
export const HEIGHT = 460;
export const CRATE = { left: 19, right: 341, floor: 441, line: 95 };
export const DROP_Y = 44;
export const FRUIT = [
  { name: 'Blueberry', radius: 11, color: '#899ad6' },
  { name: 'Cherry', radius: 15, color: '#f66673' },
  { name: 'Apricot', radius: 20, color: '#ffab63' },
  { name: 'Lime', radius: 25, color: '#b5c654' },
  { name: 'Fig', radius: 30, color: '#b377ad' },
  { name: 'Orange', radius: 36, color: '#ff8d33' },
  { name: 'Apple', radius: 43, color: '#ed514b' },
  { name: 'Pomegranate', radius: 50, color: '#cb4f6c' },
  { name: 'Golden pear', radius: 58, color: '#f5cb59' },
  { name: 'Watermelon', radius: 68, color: '#73a25b' },
];
export const fruitPath = tier => 'assets/fruit-' + tier + '.webp';
const OVERFLOW_TICKS = 90;
const CHAIN_TICKS = 48;
const DROP_DELAY = 22;
const SUBSTEPS = 3;
const SOLVER_PASSES = 5;
const MAX_TIER = FRUIT.length - 1;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function clampX(x, radius) {
  return clamp(x, CRATE.left + radius, CRATE.right - radius);
}

function confine(body) {
  const x = clampX(body.x, body.radius);
  if (body.x !== x) {
    if ((body.x - x) * body.vx > 0) body.vx *= -.22;
    body.x = x;
  }
  const floor = CRATE.floor - body.radius;
  if (body.y < floor) return;
  body.y = floor;
  body.landed = true;
  if (body.vy > 0) {
    body.vx *= .97;
    body.vy = body.vy > 1.6 ? -.2 * body.vy : 0;
  }
}

function separate(a, b, nx, ny, overlap) {
  // Fruit mass grows with its area. A small fruit moves farther than a large one.
  const inverseA = 1 / a.radius ** 2;
  const inverseB = 1 / b.radius ** 2;
  const total = inverseA + inverseB;
  const correction = Math.max(0, overlap - .02) * .83 / total;
  a.x -= nx * correction * inverseA;
  a.y -= ny * correction * inverseA;
  b.x += nx * correction * inverseB;
  b.y += ny * correction * inverseB;

  const dvx = b.vx - a.vx;
  const dvy = b.vy - a.vy;
  const closing = dvx * nx + dvy * ny;
  if (closing >= 0) return;
  const normal = -closing * (closing < -1.4 ? 1.12 : 1) / total;
  const tangent = clamp((dvx * ny - dvy * nx) / total, -.13 * normal, .13 * normal);
  const ix = nx * normal - ny * tangent;
  const iy = ny * normal + nx * tangent;
  a.vx -= ix * inverseA;
  a.vy -= iy * inverseA;
  b.vx += ix * inverseB;
  b.vy += iy * inverseB;
}

export function createCart(api) {
  const bodies = [];
  const bursts = [];
  let random = (api.options.seed ?? 1) >>> 0;
  let bag = [];
  let tick = 0;
  let dropped = 0;
  let aimX = WIDTH / 2;
  let pointer = null;
  let cooldown = 0;
  let score = 0;
  let largest = null;
  let chain = 0;
  let lastMerge = -CHAIN_TICKS - 1;
  let danger = 0;
  let lost = false;
  let cue = { id: 0 };
  let status = 'Press and drag to aim, then release to drop.';

  function nextFruit() {
    if (!bag.length) {
      bag = [0, 0, 1, 1, 2, 2, 3, 3];
      for (let i = bag.length - 1; i > 0; i--) {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        const j = Math.floor(random / 4294967296 * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }

  let current = nextFruit();
  let next = nextFruit();
  const aim = () => clampX(aimX, FRUIT[current].radius);

  function playCue(name, tier) {
    cue = { id: cue.id + 1, name, tier };
  }

  function drop() {
    const { radius } = FRUIT[current];
    const x = aim();
    if (guideEnd(x, radius) < DROP_Y) {
      status = 'That spot is blocked. Try another part of the crate.';
      return;
    }
    bodies.push({ tier: current, radius, x, y: DROP_Y, vx: dropped % 2 ? .12 : -.12, vy: 0, landed: false, born: tick - 12 });
    largest = Math.max(largest ?? current, current);
    dropped++;
    cooldown = DROP_DELAY;
    chain = 0;
    playCue('drop', current);
    status = 'Dropped ' + FRUIT[current].name.toLowerCase() + '.';
    current = next;
    next = nextFruit();
  }

  function merge(i, j) {
    const a = bodies[i];
    const b = bodies[j];
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    const cleared = a.tier === MAX_TIER;
    const tier = cleared ? MAX_TIER : a.tier + 1;
    const { radius, name } = FRUIT[tier];
    const base = cleared ? 100 : (tier + 1) * (tier + 2) / 2;
    chain = tick - lastMerge <= CHAIN_TICKS ? chain + 1 : 1;
    lastMerge = tick;
    const points = base * Math.min(chain, 4);
    score += points;
    largest = Math.max(largest ?? tier, tier);
    bursts.push({ x, y, tier, radius, points, chain, start: tick, cleared });
    bodies.splice(j, 1);
    if (cleared) bodies.splice(i, 1);
    else {
      bodies[i] = {
        tier, radius, x: clampX(x, radius), y: Math.min(y, CRATE.floor - radius),
        vx: (a.vx + b.vx) * .32, vy: (a.vy + b.vy) * .28 - .55, landed: true, born: tick,
      };
    }
    status = (cleared ? 'Watermelon harvest!' : name + ' merged!') + ' Plus ' + points + ' points.';
    playCue(cleared ? 'harvest' : 'merge', tier);
  }

  function contacts() {
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const reach = a.radius + b.radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > reach * reach) continue;
        if (a.tier === b.tier) {
          merge(i, j);
          break;
        }
        a.landed = b.landed = true;
        const distance = Math.sqrt(distanceSquared);
        separate(a, b, distance ? dx / distance : 1, distance ? dy / distance : 0, reach - distance);
      }
    }
  }

  function physics() {
    for (let step = 0; step < SUBSTEPS; step++) {
      for (const body of bodies) {
        body.vy = Math.min(13, body.vy + .5 / SUBSTEPS);
        body.x += body.vx / SUBSTEPS;
        body.y += body.vy / SUBSTEPS;
      }
      for (let pass = 0; pass < SOLVER_PASSES; pass++) {
        for (const body of bodies) confine(body);
        contacts();
      }
      for (const body of bodies) confine(body);
    }
  }

  function guideEnd(x, radius) {
    let y = CRATE.floor - radius;
    for (const body of bodies) {
      const dx = x - body.x;
      const reach = body.radius + radius;
      if (Math.abs(dx) >= reach || body.y + reach <= DROP_Y) continue;
      y = Math.min(y, body.y - Math.sqrt(reach ** 2 - dx ** 2));
    }
    return y;
  }

  function cancel() {
    pointer = null;
  }

  function handleInput() {
    for (const touch of api.touches()) {
      if (touch.phase === 'down' && pointer === null && !cooldown) pointer = touch.id;
      if (pointer !== touch.id) continue;
      if (touch.phase === 'cancel') {
        cancel();
        continue;
      }
      aimX = touch.x * WIDTH / api.screen().w;
      if (touch.phase === 'up') {
        cancel();
        drop();
      }
    }
  }

  function update() {
    if (lost) return;
    tick++;
    cooldown = Math.max(0, cooldown - 1);
    handleInput();
    physics();

    const overflowing = bodies.some(body => body.landed && body.y - body.radius < CRATE.line - 1);
    if (overflowing && !danger) status = 'Crate almost full. Merge fruit to clear the fill line!';
    danger = overflowing ? danger + 1 : 0;
    if (danger >= OVERFLOW_TICKS) {
      lost = true;
      cancel();
      status = 'Crate full. Final score ' + score + '.';
      playCue('lost');
    }
    while (bursts.length && tick - bursts[0].start >= 42) bursts.shift();
  }

  function draw(alpha) {
    const scale = api.screen().w / WIDTH;
    const rect = (x, y, w, h, color) => api.rect(x * scale, y * scale, w * scale, h * scale, color);
    const fruit = (tier, x, y, radius, opacity = 1) => api.spr(fruitPath(tier), x * scale, y * scale, {
      scale: radius * 2 * scale / 96, anchor: [.5, .5], alpha: opacity,
    });
    api.spr('assets/crate.webp', 0, 0, { sx: scale / 2, sy: scale / 2 });

    const limitColor = danger ? [1, .43, .31, .9] : [1, .79, .49, .34];
    for (let x = CRATE.left + 7; x < CRATE.right - 5; x += 10) rect(x, CRATE.line, 4, 1, limitColor);
    if (danger) {
      const fill = Math.min(1, danger / OVERFLOW_TICKS);
      rect(CRATE.left, CRATE.line - 2, (CRATE.right - CRATE.left) * fill, 2, [1, .39, .28, .9]);
    }

    if (!lost && !cooldown) {
      const x = aim();
      const radius = FRUIT[current].radius;
      const end = guideEnd(x, radius);
      const guideColor = [1, .88, .68, pointer === null ? .26 : .6];
      for (let y = DROP_Y + radius + 7; y < end; y += 10) rect(x - .6, y, 1.2, 4, guideColor);
      fruit(current, x, DROP_Y, radius, end < DROP_Y ? .35 : 1);
    }
    for (const body of bodies) {
      const age = tick - body.born + alpha;
      const size = age < 12 ? 1 + .13 * Math.sin(age / 12 * Math.PI) : 1;
      fruit(body.tier, body.x, body.y, body.radius * size);
    }
    for (const burst of bursts) {
      const age = tick - burst.start + alpha;
      if (age >= 22) continue;
      const opacity = (1 - age / 22) ** 1.4;
      for (let i = 0; i < 9; i++) {
        const angle = i * 2.399963;
        const reach = burst.radius * .6 + age * (1.35 + i % 3 * .32);
        const x = burst.x + Math.cos(angle) * reach;
        const y = burst.y + Math.sin(angle) * reach;
        if (x < CRATE.left || x > CRATE.right || y < 5 || y > CRATE.floor) continue;
        const size = 2 + i % 3;
        rect(x, y, size, size, [1, .81, .42, opacity]);
      }
    }
  }

  function state() {
    return {
      tick, dropped, aimX, pointer, score, largest, chain, lastMerge, cooldown, danger, lost,
      current, next, random, bag: [...bag], bodies: bodies.map(body => ({ ...body })),
      bursts: bursts.map(burst => ({ ...burst })), cue, status, readout: { score },
    };
  }

  return { update, draw, state, pause: cancel, resize: cancel };
}
