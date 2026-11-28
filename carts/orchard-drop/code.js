export const WIDTH = 360;
export const HEIGHT = 460;
export const CRATE = { left: 19, right: 341, floor: 441, line: 95 };
export const DROP_Y = 44;
export const FRUIT = [
  { name: 'Blueberry', radius: 11, pixels: 192 },
  { name: 'Cherry', radius: 15, pixels: 192 },
  { name: 'Peach', radius: 20, pixels: 192 },
  { name: 'Lime', radius: 25, pixels: 288 },
  { name: 'Fig', radius: 30, pixels: 288 },
  { name: 'Orange', radius: 34, pixels: 288 },
  { name: 'Banana', radius: 39, pixels: 384 },
  { name: 'Apple', radius: 42, pixels: 512 },
  { name: 'Pomegranate', radius: 45, pixels: 512 },
  { name: 'Coconut', radius: 50, pixels: 512 },
  { name: 'Golden pear', radius: 57, pixels: 512 },
  { name: 'Watermelon', radius: 66, pixels: 576 },
];
export const fruitPath = tier => 'assets/fruit-' + tier + '.webp';

function ellipse(rx, ry, angle = 0) {
  return Array.from({ length: 32 }, (_, i) => {
    const t = i * Math.PI / 16;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    return [48 + x * Math.cos(angle) - y * Math.sin(angle), 48 + x * Math.sin(angle) + y * Math.cos(angle)];
  });
}

function roundOutline(points) {
  return points.flatMap(([x, y], i) => {
    const before = points.at(i - 1);
    const after = points[(i + 1) % points.length];
    return [0, 1 / 3, 2 / 3].map(t => {
      const a = (1 - t) ** 2 / 2;
      const b = t ** 2 / 2;
      return [x + a * (before[0] - x) + b * (after[0] - x),
        y + a * (before[1] - y) + b * (after[1] - y)];
    });
  });
}

// Draw the upper and lower curves from the same columns used for collision geometry.
const bananaColumns = [
  [3, 34, 41], [9, 39, 53], [19, 46, 66], [29, 49, 73], [40, 48, 76],
  [51, 44, 74], [62, 37, 68], [73, 28, 59], [82, 17, 46], [89, 12, 31],
  [93, 13, 23],
];
const bananaTop = bananaColumns.map(([x, top]) => [x, top]);
const bananaBottom = bananaColumns.map(([x, , bottom]) => [x, bottom]);
const outlines = [
  ellipse(46, 46),
  roundOutline([[46, 7], [71, 4], [90, 19], [95, 39], [89, 62], [69, 85], [46, 95], [24, 88], [6, 66], [2, 38], [8, 17], [25, 5]]),
  roundOutline([[46, 5], [74, 4], [92, 21], [95, 48], [86, 74], [62, 92], [38, 95], [15, 82], [3, 60], [3, 34], [16, 11]]),
  ellipse(45, 37, -.34),
  roundOutline([[47, 3], [59, 10], [72, 24], [85, 42], [91, 61], [84, 82], [63, 94], [36, 94], [15, 84], [5, 65], [10, 46], [23, 28], [37, 14]]),
  ellipse(46, 44),
  [...bananaTop, ...bananaBottom.toReversed()],
  roundOutline([[48, 7], [68, 3], [87, 13], [95, 36], [90, 63], [78, 84], [64, 94], [45, 94], [27, 94], [13, 80], [3, 59], [1, 36], [10, 15], [28, 3]]),
  roundOutline([[48, 6], [69, 10], [88, 24], [94, 46], [89, 70], [70, 90], [47, 95], [24, 90], [6, 74], [2, 50], [8, 27], [26, 12]]),
  ellipse(46, 41, .34),
  roundOutline([[48, 3], [62, 7], [69, 22], [74, 36], [85, 50], [91, 64], [87, 81], [73, 92], [49, 95], [26, 92], [10, 82], [5, 66], [12, 49], [24, 35], [29, 21], [35, 8]]),
  ellipse(47, 42, -.14),
];
export const fruitOutline = tier => outlines[tier];

function bounds(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

function localPoints(points, radius) {
  return points.map(([x, y]) => [(x - 48) * radius / 48, (y - 48) * radius / 48]);
}

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const EPSILON = 1e-8;
const convex = points => points.every((a, i) => cross(a, points[(i + 1) % points.length],
  points[(i + 2) % points.length]) >= -EPSILON);

function joinConvex(a, b) {
  for (let i = 0; i < a.length; i++) {
    const next = (i + 1) % a.length;
    const j = b.indexOf(a[next]);
    if (j < 0 || b[(j + 1) % b.length] !== a[i]) continue;
    const joined = [...a.slice(next), ...a.slice(0, next)];
    for (let step = 2; step < b.length; step++) joined.push(b[(j + step) % b.length]);
    if (convex(joined)) return joined;
  }
  return null;
}

function convexPieces(outline) {
  if (convex(outline)) return [outline];

  // Cut ears from the outline, then join adjacent triangles where the result stays convex.
  const points = [...outline];
  const pieces = [];
  while (points.length > 3) {
    const i = points.findIndex((b, i) => {
      const a = points.at(i - 1);
      const c = points[(i + 1) % points.length];
      return cross(a, b, c) > EPSILON && !points.some(p => p !== a && p !== b && p !== c &&
        cross(a, b, p) >= -EPSILON && cross(b, c, p) >= -EPSILON && cross(c, a, p) >= -EPSILON);
    });
    if (i < 0) throw new Error('Invalid fruit outline');
    pieces.push([points.at(i - 1), points[i], points[(i + 1) % points.length]]);
    points.splice(i, 1);
  }
  pieces.push(points);
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const joined = joinConvex(pieces[i], pieces[j]);
      if (!joined) continue;
      pieces[i] = joined;
      pieces.splice(j, 1);
      j = i;
    }
  }
  return pieces;
}

function makeGeometry(outline, pieces) {
  const limits = bounds(outline);
  const extreme = (axis, value) => {
    const points = outline.filter(point => Math.abs(point[axis] - value) < .08);
    return [points.reduce((sum, point) => sum + point[0], 0) / points.length,
      points.reduce((sum, point) => sum + point[1], 0) / points.length];
  };
  return {
    ...limits,
    leftPoint: extreme(0, limits.left),
    rightPoint: extreme(0, limits.right),
    bottomPoint: extreme(1, limits.bottom),
    pieces: pieces.map(points => ({ points, ...bounds(points), axes: points.map(([x, y], i) => {
      const [nextX, nextY] = points[(i + 1) % points.length];
      const dx = nextX - x;
      const dy = nextY - y;
      const length = Math.hypot(dx, dy);
      const nx = dy / length;
      const ny = -dx / length;
      return { nx, ny, limit: nx * x + ny * y };
    }) })),
  };
}

const localShapes = FRUIT.map(({ radius }, tier) => {
  const outline = localPoints(outlines[tier], radius);
  return { outline, pieces: convexPieces(outline) };
});
const shapes = localShapes.map(({ outline, pieces }) => makeGeometry(outline, pieces));

function rotatedGeometry(tier, angle) {
  if (!angle) return shapes[tier];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const rotate = ([x, y]) => [x * c - y * s, x * s + y * c];
  const { outline, pieces } = localShapes[tier];
  return makeGeometry(outline.map(rotate), pieces.map(points => points.map(rotate)));
}

export const fruitBounds = (tier, angle = 0) => {
  const { left, right, top, bottom } = rotatedGeometry(tier, angle);
  return { left, right, top, bottom };
};

const projection = (points, index, nx, ny) => points[index][0] * nx + points[index][1] * ny;

function firstSupport(points, nx, ny) {
  let support = 0;
  let min = projection(points, 0, nx, ny);
  for (let i = 1; i < points.length; i++) {
    const value = projection(points, i, nx, ny);
    if (value < min) {
      min = value;
      support = i;
    }
  }
  return support;
}

function nextSupport(points, support, nx, ny) {
  // Both convex outlines wind clockwise, so the support point advances with the face normals.
  let min = projection(points, support, nx, ny);
  let next = (support + 1) % points.length;
  let value = projection(points, next, nx, ny);
  while (value < min - EPSILON) {
    support = next;
    min = value;
    next = (support + 1) % points.length;
    value = projection(points, next, nx, ny);
  }
  return support;
}

function scanFaces(a, b, dx, dy) {
  let depth = Infinity;
  let face;
  let bestSupport;
  let bestProjection;
  let support = 0;
  const { points } = b;
  for (let i = 0; i < a.axes.length; i++) {
    const edge = a.axes[i];
    const { nx, ny } = edge;
    support = i === 0 ? firstSupport(points, nx, ny) : nextSupport(points, support, nx, ny);
    const min = projection(points, support, nx, ny);
    const overlap = edge.limit - (min + dx * nx + dy * ny);
    if (overlap < -EPSILON) return null;
    if (overlap < depth) {
      depth = overlap;
      face = edge;
      bestSupport = support;
      bestProjection = min;
    }
  }
  const { nx, ny } = face;
  const [px, py] = points[bestSupport];
  const neighbor = [points.at(bestSupport - 1), points[(bestSupport + 1) % points.length]].find(
    ([x, y]) => Math.abs(x * nx + y * ny - bestProjection) < EPSILON);
  const x = neighbor ? (px + neighbor[0]) / 2 : px;
  const y = neighbor ? (py + neighbor[1]) / 2 : py;
  return { nx, ny, depth: Math.max(0, depth), x: x + dx, y: y + dy };
}

function overlaps(a, b, dx, dy) {
  return dx >= a.left - b.right - EPSILON && dx <= a.right - b.left + EPSILON &&
    dy >= a.top - b.bottom - EPSILON && dy <= a.bottom - b.top + EPSILON;
}

function collide(a, b, dx, dy) {
  if (!overlaps(a, b, dx, dy)) return null;
  let contact = null;
  for (const first of a.pieces) {
    for (const second of b.pieces) {
      if (!overlaps(first, second, dx, dy)) continue;
      const aFace = scanFaces(first, second, dx, dy);
      if (!aFace) continue;
      const bFace = scanFaces(second, first, -dx, -dy);
      if (!bFace) continue;
      const face = aFace.depth <= bFace.depth ? aFace : {
        nx: -bFace.nx, ny: -bFace.ny, depth: bFace.depth, x: bFace.x + dx, y: bFace.y + dy,
      };
      if (!contact || face.depth > contact.depth) contact = face;
    }
  }
  return contact;
}

export function fruitContact(aTier, bTier, dx, dy, aAngle = 0, bAngle = 0) {
  return collide(rotatedGeometry(aTier, aAngle), rotatedGeometry(bTier, bAngle), dx, dy);
}

function verticalEntry(a, b, dx, start) {
  if (dx < a.left - b.right || dx > a.right - b.left) return Infinity;
  let first = Infinity;
  for (const firstPiece of a.pieces) {
    for (const secondPiece of b.pieces) {
      if (dx < firstPiece.left - secondPiece.right || dx > firstPiece.right - secondPiece.left) continue;
      let enter = -Infinity;
      let exit = Infinity;
      for (const [reference, other, sign] of [[firstPiece, secondPiece, 1], [secondPiece, firstPiece, -1]]) {
        let point = 0;
        for (let i = 0; i < reference.axes.length; i++) {
          const { nx, ny, limit } = reference.axes[i];
          point = i === 0 ? firstSupport(other.points, nx, ny) : nextSupport(other.points, point, nx, ny);
          const stop = limit - projection(other.points, point, nx, ny) - nx * dx * sign;
          const slope = ny * sign;
          if (slope > EPSILON) exit = Math.min(exit, stop / slope);
          else if (slope < -EPSILON) enter = Math.max(enter, stop / slope);
          else if (stop <= EPSILON) enter = Infinity;
          if (enter >= exit) break;
        }
      }
      if (enter < exit && exit > start) first = Math.min(first, enter);
    }
  }
  return first;
}

const OVERFLOW_TICKS = 90;
const CHAIN_TICKS = 48;
const DROP_DELAY = 22;
const SUBSTEPS = 3;
const SOLVER_PASSES = 5;
const MAX_TIER = FRUIT.length - 1;
const FRUIT_EDGE_BLEED = .35;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function clampX(x, tier) {
  const { left, right } = shapes[tier];
  return clamp(x, CRATE.left - left, CRATE.right - right);
}

const inverseMass = body => 1 / body.radius ** 2;
const inverseInertia = body => 2.65 / body.radius ** 4;
const cross2 = (x, y, nx, ny) => x * ny - y * nx;

function applyImpulse(body, x, y, ix, iy) {
  body.vx += ix * inverseMass(body);
  body.vy += iy * inverseMass(body);
  body.spin = clamp(body.spin + cross2(x, y, ix, iy) * inverseInertia(body), -.26, .26);
}

function wallImpulse(body, [x, y], nx, ny) {
  const vx = body.vx - body.spin * y;
  const vy = body.vy + body.spin * x;
  const closing = vx * nx + vy * ny;
  if (closing >= 0) return;
  const arm = cross2(x, y, nx, ny);
  const mass = inverseMass(body);
  const inertia = inverseInertia(body);
  const bounce = closing < -1.6 ? .2 : 0;
  const normal = -closing * (1 + bounce) / (mass + arm ** 2 * inertia);
  const tx = -ny;
  const ty = nx;
  const tangentArm = cross2(x, y, tx, ty);
  const tangentSpeed = vx * tx + vy * ty + normal * arm * inertia * tangentArm;
  const tangent = clamp(-tangentSpeed / (mass + tangentArm ** 2 * inertia), -.32 * normal, .32 * normal);
  applyImpulse(body, x, y, nx * normal + tx * tangent, ny * normal + ty * tangent);
}

function confine(body, shape) {
  const x = clamp(body.x, CRATE.left - shape.left, CRATE.right - shape.right);
  if (body.x <= CRATE.left - shape.left) wallImpulse(body, shape.leftPoint, 1, 0);
  if (body.x >= CRATE.right - shape.right) wallImpulse(body, shape.rightPoint, -1, 0);
  body.x = x;
  const floor = CRATE.floor - shape.bottom;
  if (body.y < floor) return;
  body.y = floor;
  body.landed = true;
  wallImpulse(body, shape.bottomPoint, 0, -1);
}

function separate(a, b, { nx, ny, depth, x, y }) {
  const ax = x;
  const ay = y;
  const bx = x + a.x - b.x;
  const by = y + a.y - b.y;
  const massA = inverseMass(a);
  const massB = inverseMass(b);
  const total = massA + massB;
  const correction = Math.max(0, depth - .02) * .83 / total;
  a.x -= nx * correction * massA;
  a.y -= ny * correction * massA;
  b.x += nx * correction * massB;
  b.y += ny * correction * massB;

  const avx = a.vx - a.spin * ay;
  const avy = a.vy + a.spin * ax;
  const bvx = b.vx - b.spin * by;
  const bvy = b.vy + b.spin * bx;
  const speedA = avx * nx + avy * ny;
  const speedB = bvx * nx + bvy * ny;
  const closing = speedB - speedA;
  if (closing >= 0) return;
  const impactRadius = speedA / massA >= -speedB / massB ? a.radius : b.radius;
  const bounce = closing < -1.4 ? .06 + .0055 * impactRadius : 0;
  const armA = cross2(ax, ay, nx, ny);
  const armB = cross2(bx, by, nx, ny);
  const inertiaA = inverseInertia(a);
  const inertiaB = inverseInertia(b);
  const normal = -closing * (1 + bounce) / (total + armA ** 2 * inertiaA + armB ** 2 * inertiaB);
  const tx = -ny;
  const ty = nx;
  const tangentA = cross2(ax, ay, tx, ty);
  const tangentB = cross2(bx, by, tx, ty);
  const tangentSpeed = (bvx - avx) * tx + (bvy - avy) * ty +
    normal * (armA * inertiaA * tangentA + armB * inertiaB * tangentB);
  const tangent = clamp(-tangentSpeed / (total + tangentA ** 2 * inertiaA + tangentB ** 2 * inertiaB),
    -.24 * normal, .24 * normal);
  const ix = nx * normal + tx * tangent;
  const iy = ny * normal + ty * tangent;
  applyImpulse(a, ax, ay, -ix, -iy);
  applyImpulse(b, bx, by, ix, iy);
}

export function createCart(api, startingPile = []) {
  const bodies = startingPile.map(({ tier, x, y, vx = 0, vy = 0, angle = 0, spin = 0 }) =>
    ({ tier, x, y, vx, vy, angle, spin, radius: FRUIT[tier].radius, landed: false, born: -12 }));
  const bursts = [];
  const geometries = new WeakMap();

  function bodyGeometry(body) {
    if (body.angle === 0) return shapes[body.tier];
    const cached = geometries.get(body);
    if (cached?.angle === body.angle) return cached.shape;
    const shape = rotatedGeometry(body.tier, body.angle);
    geometries.set(body, { angle: body.angle, shape });
    return shape;
  }
  let random = (api.options.seed ?? 1) >>> 0;
  let bag = [];
  let tick = 0;
  let dropped = 0;
  let openingBag = true;
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
  let harvestCount = 0;
  let status = 'Press and drag to aim, then release to drop.';

  function nextFruit() {
    if (!bag.length) {
      bag = openingBag ? [0, 0, 1, 1, 2, 2, 3, 3] : [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
      openingBag = false;
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
  const aim = () => clampX(aimX, current);

  function playCue(name, tier) {
    cue = { id: cue.id + 1, name, tier };
  }

  function drop() {
    const { radius } = FRUIT[current];
    const x = aim();
    if (guideEnd(x, current) < DROP_Y) {
      status = 'That spot is blocked. Try another part of the crate.';
      return;
    }
    bodies.push({ tier: current, radius, x, y: DROP_Y, vx: dropped % 2 ? .12 : -.12, vy: 0,
      angle: 0, spin: 0, landed: false, born: tick - 12 });
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
    if (cleared) {
      bodies.splice(i, 1);
      harvestCount++;
    } else {
      const merged = {
        tier, radius, x, y, vx: (a.vx + b.vx) * .32, vy: (a.vy + b.vy) * .28 - .55,
        angle: a.angle, spin: (a.spin + b.spin) * .35, landed: true, born: tick,
      };
      confine(merged, bodyGeometry(merged));
      bodies[i] = merged;
      pushNearbyFruit(merged);
    }
    status = (cleared ? 'JUICY!!' : name + ' merged!') + ' Plus ' + points + ' points.';
    playCue(cleared ? 'harvest' : 'merge', tier);
  }

  function pushNearbyFruit(merged) {
    const mass = merged.radius ** 2;
    for (const body of bodies) {
      if (body === merged) continue;
      const dx = body.x - merged.x;
      const dy = body.y - merged.y;
      const contact = collide(bodyGeometry(merged), bodyGeometry(body), dx, dy);
      if (!contact || contact.depth === 0) continue;
      const massShare = mass / (mass + body.radius ** 2);
      const depth = Math.min(1, contact.depth / (merged.radius * .4));
      const impulse = (1.1 + merged.radius * .07) * massShare * (.55 + .45 * depth);
      const scaled = impulse / inverseMass(body);
      applyImpulse(body, contact.x - dx, contact.y - dy, contact.nx * scaled, contact.ny * scaled);
    }
  }

  function contacts() {
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const contact = collide(bodyGeometry(a), bodyGeometry(b), b.x - a.x, b.y - a.y);
        if (!contact) continue;
        if (a.tier === b.tier) {
          merge(i, j);
          break;
        }
        a.landed = b.landed = true;
        separate(a, b, contact);
      }
    }
  }

  function physics() {
    for (let step = 0; step < SUBSTEPS; step++) {
      for (const body of bodies) {
        body.vy = Math.min(12 + body.radius * .055, body.vy + .5 / SUBSTEPS);
        body.x += body.vx / SUBSTEPS;
        body.y += body.vy / SUBSTEPS;
        body.spin = Math.abs(body.spin) < .00035 ? 0 : body.spin * .985;
        body.angle = (body.angle + body.spin / SUBSTEPS) % (2 * Math.PI);
      }
      for (let pass = 0; pass < SOLVER_PASSES; pass++) {
        for (const body of bodies) confine(body, bodyGeometry(body));
        contacts();
      }
      for (const body of bodies) confine(body, bodyGeometry(body));
    }
  }

  function guideEnd(x, tier) {
    let y = CRATE.floor - shapes[tier].bottom;
    for (const body of bodies) {
      const entry = verticalEntry(bodyGeometry(body), shapes[tier], x - body.x, DROP_Y - body.y);
      y = Math.min(y, body.y + entry);
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

    const overflowing = bodies.some(body => body.landed && body.y + bodyGeometry(body).top < CRATE.line - 1);
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
    const fruit = (tier, x, y, radius, opacity = 1, angle = 0) => api.spr(fruitPath(tier), x * scale, y * scale, {
      // Cover the subpixel seam where the antialiased edges of two fruit touch.
      scale: (radius + FRUIT_EDGE_BLEED) * 2 * scale / FRUIT[tier].pixels,
      anchor: [.5, .5], alpha: opacity, rot: angle,
    });
    api.spr('assets/crate.webp', 0, 0, { sx: scale / 2, sy: scale / 2 });

    const limitColor = danger ? [.67, .21, .15, 1] : [.49, .32, .19, .8];
    for (let x = CRATE.left + 7; x < CRATE.right - 5; x += 10) {
      rect(x, CRATE.line - 1, 6, 3, [1, .97, .83, .76]);
      rect(x, CRATE.line, 6, 1.5, limitColor);
    }
    if (danger) {
      const fill = Math.min(1, danger / OVERFLOW_TICKS);
      rect(CRATE.left, CRATE.line - 3, (CRATE.right - CRATE.left) * fill, 3, limitColor);
    }

    if (!lost && !cooldown) {
      const x = aim();
      const radius = FRUIT[current].radius;
      const end = guideEnd(x, current);
      const guideColor = [.16, .37, .27, pointer === null ? .58 : .9];
      for (let y = DROP_Y + shapes[current].bottom + 7; y < end; y += 10) {
        rect(x - 1.2, y - .6, 2.4, 5.2, [1, .98, .88, .63]);
        rect(x - .65, y, 1.3, 4, guideColor);
      }
      fruit(current, x, DROP_Y, radius, end < DROP_Y ? .35 : 1);
    }
    for (const body of bodies) {
      const age = tick - body.born + alpha;
      const size = age < 12 ? 1 + .13 * Math.sin(age / 12 * Math.PI) : 1;
      fruit(body.tier, body.x, body.y, body.radius * size, 1, body.angle);
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
      current, next, random, openingBag, bag: [...bag], bodies: bodies.map(body => ({ ...body })),
      bursts: bursts.map(burst => ({ ...burst })), cue, harvestCount, status, readout: { score },
    };
  }

  return { update, draw, state, pause: cancel, resize: cancel };
}
