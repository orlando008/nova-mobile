export const WIDTH = 360;
export const HEIGHT = 510;
export const ARENA = { left: 8, right: 352, top: 8, bottom: 406 };
export const PIVOT = { x: 160, y: 477 };
export const PIPE_LENGTH = 68;
export const COLORS = ['sapphire', 'amethyst', 'emerald', 'ruby', 'gold'];
const LIGHTS = [[.31, .68, 1], [.81, .42, 1], [.37, 1, .59], [1, .33, .44], [1, .73, .27]];
const CHARGE_TICKS = 71;
const MAX_ANGLE = .84;
const MIN_RADIUS = 3.5;
const MULLIGAN_INTERVAL = 15;
const BEAD_RADIUS = 2.4;
const CONTACT_TOLERANCE = 1e-7;
const SHATTER_TICKS = 44;
const AREA = (ARENA.right - ARENA.left) * (ARENA.bottom - ARENA.top);
const inRange = (value, min, max) => Math.max(min, Math.min(max, value));

function chargePower(heldTicks) {
  const cycleTicks = CHARGE_TICKS * 2;
  const cyclePosition = heldTicks % cycleTicks;
  return Math.min(cyclePosition, cycleTicks - cyclePosition) / CHARGE_TICKS;
}

export function makeBricks(seed) {
  let state = seed >>> 0;
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }
  return [[70, 75], [276, 61], [222, 151], [83, 218], [291, 286]].map(([x, y]) => {
    const size = 16 + Math.floor(random() * 9);
    const jitter = () => Math.floor(random() * 53) - 26;
    return { x: x + jitter() - size / 2, y: y + jitter() - size / 2, size };
  });
}

export function availableRadius(x, y, bricks, bubbles) {
  let space = Math.min(x - ARENA.left, ARENA.right - x, y - ARENA.top, ARENA.bottom - y);
  for (const brick of bricks) {
    const dx = x - inRange(x, brick.x, brick.x + brick.size);
    const dy = y - inRange(y, brick.y, brick.y + brick.size);
    space = Math.min(space, Math.hypot(dx, dy));
  }
  for (const bubble of bubbles) {
    space = Math.min(space, Math.hypot(x - bubble.x, y - bubble.y) - bubble.radius);
  }
  return Math.max(0, space);
}

function circleContact(origin, dx, dy, bubble) {
  const x = bubble.x - origin.x;
  const y = bubble.y - origin.y;
  const projection = x * dx + y * dy;
  const reach = bubble.radius + BEAD_RADIUS;
  const inside = x * x + y * y - reach * reach;
  if (inside <= 0) return 0;
  const overlap = projection * projection - inside;
  if (projection < 0 || overlap < 0) return Infinity;
  return Math.max(0, projection - Math.sqrt(overlap));
}

function brickContact(origin, dx, dy, brick) {
  const left = brick.x - BEAD_RADIUS;
  const right = brick.x + brick.size + BEAD_RADIUS;
  const top = brick.y - BEAD_RADIUS;
  const bottom = brick.y + brick.size + BEAD_RADIUS;
  if (dx === 0 && (origin.x <= left || origin.x >= right)) return null;
  const enterX = dx === 0 ? -Infinity : ((dx > 0 ? left : right) - origin.x) / dx;
  const exitX = dx === 0 ? Infinity : ((dx > 0 ? right : left) - origin.x) / dx;
  const enterY = ((dy > 0 ? top : bottom) - origin.y) / dy;
  const exitY = ((dy > 0 ? bottom : top) - origin.y) / dy;
  const enter = Math.max(enterX, enterY);
  const distance = Math.max(0, enter);
  // The last contact can sit on the boundary, but an outgoing shot must not hit it again.
  if (enter < -CONTACT_TOLERANCE || Math.min(exitX, exitY) <= distance + CONTACT_TOLERANCE) return null;
  return {
    distance,
    flipX: enterX >= enter - CONTACT_TOLERANCE,
    flipY: enterY >= enter - CONTACT_TOLERANCE,
  };
}

export function traceShot(angle, power, bricks, bubbles) {
  let dx = Math.sin(angle);
  let dy = -Math.cos(angle);
  let origin = { x: PIVOT.x + dx * PIPE_LENGTH, y: PIVOT.y + dy * PIPE_LENGTH };
  // Extra range near full charge makes the ceiling reachable without rescaling short shots.
  const range = 113 + power * 351 + 96 * power ** 8 - PIPE_LENGTH;
  const { left, right, top, bottom } = ARENA;
  const segments = [];
  let traveled = 0;

  while (true) {
    const side = dx < 0 ? left + BEAD_RADIUS : right - BEAD_RADIUS;
    const edge = dy < 0 ? top + BEAD_RADIUS : bottom - BEAD_RADIUS;
    const wallX = dx === 0 ? Infinity : (side - origin.x) / dx;
    const wallY = (edge - origin.y) / dy;
    const wall = Math.min(wallX, wallY);
    const remaining = range - traveled;
    let distance = Math.min(remaining, wall);
    let impact = wall < remaining ? 'bounce' : 'land';
    let flipX = wallX <= wall + CONTACT_TOLERANCE;
    let flipY = wallY <= wall + CONTACT_TOLERANCE;
    let victim = -1;
    for (const brick of bricks) {
      const contact = brickContact(origin, dx, dy, brick);
      if (!contact || contact.distance >= distance) continue;
      ({ distance, flipX, flipY } = contact);
      impact = 'bounce';
    }
    for (const [i, bubble] of bubbles.entries()) {
      const contact = circleContact(origin, dx, dy, bubble);
      if (contact > distance) continue;
      distance = contact;
      impact = 'bubble';
      victim = i;
    }

    const end = traveled + distance;
    segments.push({ origin, dx, dy, start: traveled, end });
    if (impact !== 'bounce') return { segments, distance: end, impact, victim };

    origin = { x: origin.x + dx * distance, y: origin.y + dy * distance };
    if (flipX) dx = -dx;
    if (flipY) dy = -dy;
    traveled = end;
  }
}

function shotPosition(shot, distance) {
  const { origin, dx, dy, start } = shot.segments.find(segment => distance <= segment.end);
  return { x: origin.x + dx * (distance - start), y: origin.y + dy * (distance - start) };
}

function coverageOf(bubbles, active) {
  const area = bubbles.reduce((sum, { radius }) => sum + radius ** 2, (active?.radius ?? 0) ** 2);
  return 100 * Math.PI * area / AREA;
}

export function createCart(api) {
  const bricks = makeBricks(api.options.seed ?? 1);
  const bubbles = [];
  let phase = 'ready';
  let angle = 0;
  let power = 0;
  let gesture;
  let shot;
  let growing;
  let shattered;
  let finalCoverage;
  let tick = 0;
  let nextColor = 0;
  let mulligans = 0;
  let milestonesReached = 0;
  let cue = { id: 0 };
  let status = 'Hold below the glass. Drag to aim and release to fire.';

  function sound(name, duration = 0) {
    cue = { id: cue.id + 1, name, duration };
  }

  function cancel() {
    gesture = undefined;
    power = 0;
  }

  function fire() {
    const color = nextColor % COLORS.length;
    shot = { ...traceShot(angle, power, bricks, bubbles), color, traveled: 0, speed: 6.2 + 3.8 * power };
    cancel();
    phase = 'flight';
    status = 'Glass in flight';
    sound('fire');
  }

  function handleTouch() {
    for (const sample of api.touches()) {
      if (phase !== 'ready') break;
      const scale = WIDTH / api.screen().w;
      const x = sample.x * scale;
      const y = sample.y * scale;
      if (!gesture) {
        if (sample.phase === 'down' && y >= ARENA.bottom && y <= HEIGHT) {
          gesture = { id: sample.id, x, angle, tick };
        }
        continue;
      }
      if (sample.id !== gesture.id) continue;
      if (sample.phase === 'cancel') {
        cancel();
        continue;
      }
      angle = inRange(gesture.angle + (x - gesture.x) * .012, -MAX_ANGLE, MAX_ANGLE);
      if (sample.phase === 'up') {
        power = chargePower(tick - gesture.tick);
        fire();
      }
    }
    if (gesture) power = chargePower(tick - gesture.tick);
  }

  function land(x, y, color) {
    const goal = availableRadius(x, y, bricks, bubbles);
    if (goal < MIN_RADIUS) {
      phase = 'ready';
      status = 'No room to grow. Try another angle or power.';
      sound('miss');
      return;
    }
    const duration = Math.ceil(15 + goal * .29);
    growing = { x, y, color, radius: BEAD_RADIUS, goal, duration, start: tick };
    nextColor++;
    phase = 'grow';
    status = 'Glass expanding';
    sound('grow', duration / 60);
  }

  function advanceShot() {
    const previous = shot.traveled;
    shot.traveled = Math.min(shot.distance, shot.traveled + shot.speed);
    if (shot.traveled < shot.distance) {
      if (shot.segments.some(({ end }) => previous < end && end <= shot.traveled)) sound('bounce');
      return;
    }
    const { distance, impact, victim, color } = shot;
    const { x, y } = shotPosition(shot, distance);
    shot = undefined;
    if (impact === 'bubble') {
      if (mulligans > 0) {
        mulligans--;
        phase = 'ready';
        status = 'Mulligan Save! Aim and try again.';
        sound('mulligan-used');
        return;
      }
      finalCoverage = coverageOf(bubbles);
      const [bubble] = bubbles.splice(victim, 1);
      shattered = { ...bubble, contactX: x, contactY: y, start: tick };
      phase = 'shatter';
      status = 'Glass shattered';
      sound('shatter');
    } else {
      land(x, y, color);
    }
  }

  function expand() {
    const { x, y, color, goal, duration, start } = growing;
    const progress = Math.min(1, (tick - start) / duration);
    growing.radius = BEAD_RADIUS + (goal - BEAD_RADIUS) * (1 - (1 - progress) ** 1.65);
    if (progress < 1) return;
    bubbles.push({ x, y, color, radius: goal });
    growing = undefined;
    phase = 'ready';
    const milestones = Math.floor(coverageOf(bubbles) / MULLIGAN_INTERVAL);
    const earned = milestones - milestonesReached;
    milestonesReached = milestones;
    mulligans += earned;
    if (earned > 0) {
      status = earned === 1 ? 'Mulligan Earned!' : earned + ' mulligans earned!';
      sound('mulligan-earned');
    } else {
      status = 'Ready for the next bead';
      sound('settle');
    }
  }

  function update() {
    tick++;
    switch (phase) {
      case 'ready': handleTouch(); break;
      case 'flight': advanceShot(); break;
      case 'grow': expand(); break;
      case 'shatter':
        if (tick - shattered.start >= SHATTER_TICKS) phase = 'lost';
        break;
    }
  }

  function draw(alpha) {
    const scale = api.screen().w / WIDTH;
    const rect = (x, y, w, h, color) => api.rect(x * scale, y * scale, w * scale, h * scale, color);
    const sprite = (name, x, y, w, h, opacity = 1) => api.spr('assets/' + name + '.png', x * scale, y * scale, {
      sx: w * scale / 192, sy: h * scale / 192, anchor: [.5, .5], alpha: opacity,
    });
    sprite('kiln', WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT);
    const { left, right, top, bottom } = ARENA;
    const brass = [.73, .46, .24, .82];
    rect(left - 1, top - 1, right - left + 2, 1, brass);
    rect(left - 1, top, 1, bottom - top, brass);
    rect(right, top, 1, bottom - top, brass);
    rect(left - 1, bottom, right - left + 2, 1.5, brass);
    rect(left - 1, bottom + 1.5, right - left + 2, 3, [.94, .52, .21, .11]);
    for (const { x, y, size } of bricks) sprite('brick', x + size / 2, y + size / 2, size, size);
    for (const { x, y, radius, color } of bubbles) sprite(COLORS[color], x, y, radius * 2, radius * 2);
    if (growing) {
      const { x, y, radius, color } = growing;
      sprite(COLORS[color], x, y, radius * 2, radius * 2);
    }
    if (shot) {
      const distance = Math.min(shot.distance, shot.traveled + shot.speed * alpha);
      const { x, y } = shotPosition(shot, distance);
      sprite('ember-' + COLORS[shot.color], x, y, 15, 15);
    }
    if (phase === 'shatter') {
      const { x, y, radius, color, contactX, contactY, start } = shattered;
      const elapsed = tick - start + alpha;
      const opacity = Math.max(0, 1 - elapsed / SHATTER_TICKS);
      sprite('ember-' + COLORS[color], contactX, contactY, 26 + elapsed * 2, 26 + elapsed * 2, opacity ** 3);
      for (let i = 0; i < 24; i++) {
        const bearing = i * 2.399963;
        const radiusAt = radius * (.2 + (i % 6) * .15) + elapsed * (1.08 + i % 4 * .29);
        const px = x + Math.cos(bearing) * radiusAt;
        const py = y + Math.sin(bearing) * radiusAt + elapsed ** 2 * .054;
        if (px < left + 4 || px > right - 4 || py < top + 4 || py > bottom - 4) continue;
        const size = Math.min(8, (2.8 + i % 4) * (radius / 24 + .35));
        sprite('shard', px, py, size, size, opacity);
        rect(px, py, size * .22, size * .18, [...LIGHTS[color], opacity]);
      }
    }
  }

  function previewShot() {
    if (!gesture) return null;
    // A release with the same aim fires on the next tick.
    const preview = traceShot(angle, chargePower(tick + 1 - gesture.tick), bricks, bubbles);
    return { ...shotPosition(preview, preview.distance), impact: preview.impact };
  }

  function state() {
    const visible = growing ? [...bubbles, growing] : bubbles;
    const coverage = finalCoverage ?? coverageOf(bubbles, growing);
    return {
      phase, angle, power, charging: Boolean(gesture), shotPreview: previewShot(), status, cue,
      coverage, mulligans,
      bubbles: visible.map(({ x, y, radius, color }) => ({ x, y, radius, color })),
      readout: {
        coverage: coverage.toFixed(1) + '%',
        mulligans,
      },
    };
  }

  return { update, draw, state, resize: cancel, pause: cancel };
}
