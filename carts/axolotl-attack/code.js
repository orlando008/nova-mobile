export const TILE = 96;
export const MAP = [
  '................',
  '..RR.R....RR....',
  '..R........R....',
  '.....TWW.WT.....',
  '.R...W....W..R..',
  '.RR..W....W..RR.',
  '.....W.......R..',
  '.....TWW.WT.....',
  '..R.............',
  '..RR...R....RR..',
  '.......RR...R...',
  '.............R..',
  '...RR........R..',
  '...R...RR.......',
  '.......R....R...',
  '..R.........RR..',
  '..RR............',
  '................',
];
export const WIDTH = MAP[0].length * TILE;
export const HEIGHT = MAP.length * TILE;
export const ROUND_TICKS = 60 * 60;
export const TEAMS = [
  { name: 'Pink', color: '#ff9fc4', x: 9, y: 15 },
  { name: 'Kelp', color: '#a6ed81', x: 7, y: 5 },
  { name: 'Tide', color: '#8ec8ff', x: 2, y: 7 },
  { name: 'Sun', color: '#ffd486', x: 13, y: 2 },
];
const TAU = 2 * Math.PI;
const STEERING_RANGE = 54;
const LEADER_RADIUS = 16;
const FOLLOWER_RADIUS = 11;
const PLAYER_SPEED = 3.35;
const CATCH_UP_SPEED = 0.75;
const RECRUIT_DISTANCE = 30;
const CATCH_UP_RECRUIT_DISTANCE = 46;
const CENTER = [0.5, 0.5];
const ASSETS = 'assets/';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const cellOf = ({ x, y }) => Math.floor(x / TILE) + Math.floor(y / TILE) * MAP[0].length;
const centerOf = (x, y) => ({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE });
const cellCenter = index => centerOf(index % MAP[0].length, Math.floor(index / MAP[0].length));
const openCells = MAP.flatMap((row, y) => [...row].flatMap((type, x) => type === '.' ? [cellOf(centerOf(x, y))] : []));
const open = new Set(openCells);
const adjacent = new Map(openCells.map(cell => {
  const x = cell % MAP[0].length;
  return [cell, [cell - MAP[0].length, cell + MAP[0].length,
    x > 0 ? cell - 1 : -1, x < MAP[0].length - 1 ? cell + 1 : -1].filter(next => open.has(next))];
}));

function randomFrom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function canSwim(x, y, radius) {
  if (x - radius < 0 || y - radius < 0 || x + radius >= WIDTH || y + radius >= HEIGHT) return false;
  for (let row = Math.floor((y - radius) / TILE); row <= Math.floor((y + radius) / TILE); row++) {
    for (let col = Math.floor((x - radius) / TILE); col <= Math.floor((x + radius) / TILE); col++) {
      if (MAP[row][col] === '.') continue;
      const dx = x - clamp(x, col * TILE, (col + 1) * TILE);
      const dy = y - clamp(y, row * TILE, (row + 1) * TILE);
      if (dx * dx + dy * dy < radius * radius) return false;
    }
  }
  return true;
}

function move(unit, dx, dy, speed, radius) {
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return;
  const x = dx * Math.min(1, speed / length);
  const y = dy * Math.min(1, speed / length);
  const oldX = unit.x;
  const oldY = unit.y;
  if (canSwim(unit.x + x, unit.y, radius)) unit.x += x;
  if (canSwim(unit.x, unit.y + y, radius)) unit.y += y;
  if (oldX !== unit.x || oldY !== unit.y) unit.angle = Math.atan2(unit.y - oldY, unit.x - oldX);
}

const routes = new Map();

function pathsFrom(start) {
  if (routes.has(start)) return routes.get(start);
  const paths = new Map([[start, { steps: 0, first: start }]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    const path = paths.get(cell);
    for (const next of adjacent.get(cell)) {
      if (paths.has(next)) continue;
      paths.set(next, { steps: path.steps + 1, first: i === 0 ? next : path.first });
      queue.push(next);
    }
  }
  routes.set(start, paths);
  return paths;
}

function nextPoint(current, target, paths) {
  const start = cellOf(current);
  const next = paths.get(cellOf(target))?.first;
  if (next === start || next === undefined) return target;
  const center = cellCenter(start);
  const waypoint = cellCenter(next);
  // Line up within the current corridor before crossing the next tile boundary.
  return center.x === waypoint.x ? { x: center.x, y: waypoint.y } : { x: waypoint.x, y: center.y };
}

function chooseTarget(team, teams, members, openTarget) {
  const paths = pathsFrom(cellOf(team));
  const threat = teams.filter(other => !other.out && other.count > team.count && distance(team, other) < 255)
    .sort((a, b) => distance(team, a) - distance(team, b))[0];
  if (threat) {
    let safest = team;
    let best = -Infinity;
    for (const [cell, path] of paths) {
      if (path.steps > 3) continue;
      const point = cellCenter(cell);
      const score = distance(point, threat) - 12 * path.steps;
      if (score > best) {
        best = score;
        safest = point;
      }
    }
    return nextPoint(team, safest, paths);
  }

  let target = openTarget;
  let best = Infinity;
  for (const unit of members) {
    if (unit.owner !== -1) continue;
    const path = paths.get(cellOf(unit));
    const score = path.steps * TILE * 0.85 + distance(team, unit) * 0.35;
    if (score < best) {
      best = score;
      target = unit;
    }
  }
  for (const rival of teams) {
    if (rival.out || rival.count >= team.count || distance(rival, team) > 420) continue;
    const path = paths.get(cellOf(rival));
    const score = path.steps * TILE * 0.85 + distance(team, rival) * 0.35 + 65 - Math.min(60, rival.count * 6);
    if (score < best) {
      best = score;
      target = rival;
    }
  }
  return nextPoint(team, target, paths);
}

function steerFollower(unit, team, index, tick, speedBonus) {
  const angle = index * 2.399963 + Math.sin(tick / 95) * 0.22;
  const radius = 25 + 12 * Math.sqrt(index);
  const target = { x: team.x + Math.cos(angle) * radius, y: team.y + Math.sin(angle) * radius };
  if (!canSwim(target.x, target.y, FOLLOWER_RADIUS) || distance(unit, team) > radius + 55) {
    const leaderPoint = nextPoint(unit, team, pathsFrom(cellOf(unit)));
    move(unit, leaderPoint.x - unit.x, leaderPoint.y - unit.y, 4.3 + speedBonus, FOLLOWER_RADIUS);
  } else {
    move(unit, target.x - unit.x, target.y - unit.y, 4 + speedBonus, FOLLOWER_RADIUS);
  }
}

export function createMatch(seed) {
  const random = randomFrom(seed);
  const teams = TEAMS.map(({ x, y }, id) => ({
    ...centerOf(x, y), id, angle: -Math.PI / 2, count: 1, out: false, cooldown: 0, waypoint: null, roam: null,
  }));
  const player = teams[0];
  const members = [{ x: player.x, y: player.y - 52, angle: -Math.PI / 2, owner: -1, flash: 0 }];
  const cells = openCells.filter(cell => teams.every(team => cellOf(team) !== cell) &&
    cell !== cellOf(members[0]));
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (const cell of cells.slice(0, 132)) {
    const { x, y } = cellCenter(cell);
    members.push({ x: x + (random() - 0.5) * 52, y: y + (random() - 0.5) * 52,
      angle: random() * TAU, owner: -1, flash: 0 });
  }
  let tick = 0;
  let peak = 1;
  let phase = 'swimming';
  let cue = { id: 0, type: '' };
  let catchUp = false;

  function updateCatchUp() {
    const leader = Math.max(teams[1].count, teams[2].count, teams[3].count);
    const gap = leader - player.count;
    // Give players room to recover before taking the boost away.
    catchUp = catchUp
      ? gap > 2 && player.count * 5 < leader * 4
      : gap >= 5 && player.count * 3 <= leader * 2;
  }

  function signal(type) {
    cue = { id: cue.id + 1, type };
  }

  function recruit(unit, team) {
    if (unit.owner >= 0) teams[unit.owner].count--;
    team.count++;
    unit.owner = team.id;
    unit.flash = tick;
  }

  function resolveContacts() {
    // Resolve neutral recruitment first. Contested neutrals join the nearest swimmer.
    const schools = teams.map(team => team.out ? [] : [team]);
    for (const unit of members) {
      if (unit.owner >= 0) schools[unit.owner].push(unit);
    }
    function nearest(unit, swimmers, range, extended = false) {
      let best = range * range;
      for (const swimmer of swimmers) {
        const dx = unit.x - swimmer.x;
        const dy = unit.y - swimmer.y;
        const squared = dx * dx + dy * dy;
        if (squared >= best) continue;
        if (extended && squared >= RECRUIT_DISTANCE ** 2) {
          // The longer reach cannot recruit around the corner of a reef.
          if (!canSwim(swimmer.x + dx / 3, swimmer.y + dy / 3, 8) ||
              !canSwim(swimmer.x + 2 * dx / 3, swimmer.y + 2 * dy / 3, 8)) continue;
        }
        best = squared;
      }
      return best < range * range ? best : Infinity;
    }
    const playerStart = teams[0].count;
    for (const unit of members) {
      if (unit.owner >= 0) continue;
      let best = Infinity;
      let candidate;
      for (const team of teams) {
        const extended = catchUp && team.id === 0;
        const range = extended ? CATCH_UP_RECRUIT_DISTANCE : RECRUIT_DISTANCE;
        const squared = nearest(unit, schools[team.id], range, extended);
        if (squared >= best) continue;
        best = squared;
        candidate = team;
      }
      if (candidate) recruit(unit, candidate);
    }

    // Tag at most one rival per school per cooldown. Use the same head counts for simultaneous tags.
    const counts = teams.map(team => team.count);
    const claimed = new Set();
    const tags = [];
    for (const attacker of teams) {
      if (attacker.out || attacker.cooldown > tick) continue;
      let best = Infinity;
      let target;
      for (const rival of teams) {
        if (rival.out || counts[rival.id] >= counts[attacker.id]) continue;
        for (const unit of schools[rival.id]) {
          if (unit === rival && counts[rival.id] > 1) continue;
          if (claimed.has(unit) || (unit.flash && tick - unit.flash < 18)) continue;
          const squared = nearest(unit, schools[attacker.id], 27);
          if (squared >= best) continue;
          best = squared;
          target = { unit, rival };
        }
      }
      if (!target) continue;
      claimed.add(target.unit);
      attacker.cooldown = tick + 10;
      tags.push({ ...target, attacker });
    }
    // Apply tags from small to large so a school that gains a member during
    // the exchange keeps its leader and the new follower.
    tags.sort((a, b) => counts[a.attacker.id] - counts[b.attacker.id]);
    let playerTagged = false;
    let playerHit = false;
    for (const { unit, rival, attacker } of tags) {
      if (unit === rival) {
        if (rival.count > 1) continue;
        rival.out = true;
        rival.count = 0;
        const { x, y, angle } = rival;
        const captured = { x, y, angle, owner: -1, flash: 0 };
        members.push(captured);
        recruit(captured, attacker);
      } else {
        recruit(unit, attacker);
      }
      playerTagged ||= attacker.id === 0;
      playerHit ||= rival.id === 0;
    }

    if (playerHit) signal('hit');
    else if (playerTagged) signal('tag');
    else if (teams[0].count > playerStart) signal('recruit');
  }

  function step(dx = 0, dy = 0) {
    if (phase !== 'swimming') return;
    tick++;
    const speedBonus = catchUp ? CATCH_UP_SPEED : 0;
    const speed = PLAYER_SPEED + speedBonus;
    move(player, dx * speed, dy * speed, speed, LEADER_RADIUS);
    for (const team of teams.slice(1)) {
      if (team.out) continue;
      if (!team.waypoint || (tick + team.id * 5) % 20 === 0 || distance(team, team.waypoint) < 4) {
        if (!team.roam || distance(team, team.roam) < 9) {
          team.roam = cellCenter(openCells[Math.floor(random() * openCells.length)]);
        }
        team.waypoint = chooseTarget(team, teams, members, team.roam);
      }
      move(team, team.waypoint.x - team.x, team.waypoint.y - team.y, 2.65 + team.id * 0.12, LEADER_RADIUS);
    }
    const formation = teams.map(() => 0);
    for (const unit of members) {
      if (unit.owner >= 0) {
        steerFollower(unit, teams[unit.owner], formation[unit.owner]++, tick, unit.owner === 0 ? speedBonus : 0);
      } else {
        const angle = unit.angle + Math.sin(tick / 90 + unit.x * 0.05) * 0.035;
        move(unit, Math.cos(angle), Math.sin(angle), 0.27, FOLLOWER_RADIUS);
        unit.angle = angle;
      }
    }
    if (tick % 3 === 0) {
      resolveContacts();
      updateCatchUp();
    }
    peak = Math.max(peak, player.count);
    if (player.out || tick === ROUND_TICKS || teams.slice(1).every(team => team.out)) {
      phase = player.out ? 'caught' : 'finished';
    }
  }

  function standings() {
    return teams.map(({ id, count }) => ({ id, count }))
      .sort((a, b) => b.count - a.count || a.id - b.id);
  }

  return { teams, members, step, standings,
    get tick() { return tick; },
    get peak() { return peak; },
    get phase() { return phase; },
    get cue() { return cue; },
    get catchUp() { return phase === 'swimming' && catchUp; },
  };
}

export function createCart({ options, touches, screen, spr }) {
  const match = createMatch(options.seed ?? 837545);
  const player = match.teams[0];
  let stick = null;
  let steering = null;

  function update() {
    for (const { id, phase, x, y } of touches()) {
      if (!stick && phase === 'down') stick = { id, originX: x, originY: y, x, y };
      if (stick?.id !== id) continue;
      if (phase === 'move') Object.assign(stick, { x, y });
      if (phase === 'up' || phase === 'cancel') stick = null;
    }
    steering = null;
    if (stick) {
      const dx = stick.x - stick.originX;
      const dy = stick.y - stick.originY;
      const divisor = Math.max(STEERING_RANGE, Math.hypot(dx, dy));
      steering = { x: dx / divisor, y: dy / divisor };
    }
    match.step(steering?.x, steering?.y);
  }

  function view() {
    const { w, h } = screen();
    const zoom = Math.min(w / 700, h / 740);
    const left = clamp(player.x - w / zoom / 2, 0, Math.max(0, WIDTH - w / zoom));
    const top = clamp(player.y - h / zoom * 0.54, 0, Math.max(0, HEIGHT - h / zoom));
    const x = (w - Math.min(w, WIDTH * zoom)) / 2 - left * zoom;
    const y = (h - Math.min(h, HEIGHT * zoom)) / 2 - top * zoom;
    return { w, h, zoom, x, y };
  }

  const place = (unit, { zoom, x, y }) => ({ x: unit.x * zoom + x, y: unit.y * zoom + y });
  function draw() {
    const camera = view();
    const { w, h, zoom, x, y } = camera;
    spr(ASSETS + 'sandcastle-bay.webp', x, y, { scale: zoom });
    const swimmers = match.members.map(unit => ({ unit, team: unit.owner, leader: false }));
    for (const unit of match.teams) {
      if (!unit.out) swimmers.push({ unit, team: unit.id, leader: true });
    }
    swimmers.sort((a, b) => a.unit.y - b.unit.y);
    for (const { unit, team, leader } of swimmers) {
      const at = place(unit, camera);
      if (at.x < -60 || at.x > w + 60 || at.y < -60 || at.y > h + 60) continue;
      const heading = (Math.round((unit.angle + Math.PI * 2) / TAU * 8) + 8) % 8;
      const bob = Math.sin(match.tick * 0.15 + unit.x * 0.09) * 2 * zoom;
      const scale = (leader ? 0.83 : 0.59) * zoom;
      if (leader) spr(ASSETS + (team === 0 ? 'home-ring.png' : 'rival-ring.png'), at.x, at.y,
        { scale: zoom, anchor: CENTER });
      const art = ASSETS + 'swimmer-' + (team + 1) + '-' + heading + '.webp';
      spr(art, at.x, at.y + bob, { scale, anchor: CENTER });
      if (unit.flash && match.tick - unit.flash < 20) {
        const progress = (match.tick - unit.flash) / 20;
        spr(ASSETS + 'spark.png', at.x, at.y, { scale: (0.26 + 0.5 * progress) * zoom,
          anchor: CENTER, alpha: 1 - progress });
      }
    }
  }

  function state() {
    const camera = view();
    const standings = match.standings();
    const leaders = match.teams.filter(team => !team.out).map(team => {
      const at = place(team, camera);
      return { id: team.id, count: team.count, x: at.x / camera.w, y: (at.y - 37 * camera.zoom) / camera.h };
    });
    const seconds = Math.ceil((ROUND_TICKS - match.tick) / 60);
    let signature = 2166136261;
    for (const unit of match.members) {
      signature = Math.imul(signature ^ Math.round(unit.x * 100), 16777619);
      signature = Math.imul(signature ^ Math.round(unit.y * 100), 16777619);
      signature = Math.imul(signature ^ unit.owner, 16777619);
    }
    return { phase: match.phase, tick: match.tick, peak: match.peak, leaders, standings, cue: match.cue,
      signature, steering, catchUp: match.catchUp, readout: {
        school: player.count,
        rank: '#' + (standings.filter(team => team.count > player.count).length + 1),
        time: Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'),
      },
    };
  }
  function clear() {
    stick = null;
    steering = null;
  }
  return { update, draw, state, pause: clear, resize: clear };
}
