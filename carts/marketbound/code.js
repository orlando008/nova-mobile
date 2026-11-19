const WIDTH = 8;
const CELL_COUNT = WIDTH * WIDTH;
const TYPES = ['apple', 'bananas', 'strawberry', 'blueberries', 'carrot', 'broccoli'];
export const PRODUCE = ['Apples', 'Bananas', 'Strawberries', 'Blueberries', 'Carrots', 'Broccoli']
  .map((label, type) => ({ label, file: TYPES[type] + '.png' }));
export const LEVELS = [
  { name: 'First Delivery', moves: 18, seed: 0x5a170001, orders: [[0, 6], [2, 6], [4, 6], [3, 6]],
    tip: 'Tap neighboring pieces or swipe to match three.' },
  { name: 'Berry Stand', moves: 16, seed: 0x3f1280d1, orders: [[2, 12], [3, 12]],
    tip: 'Match four or more to sweep the entire row or column.', sweeps: true },
  { name: 'Lunch Rush', moves: 15, seed: 0x4af806eb, orders: [[1, 12], [4, 12], [5, 12]], sweeps: true },
  { name: 'Garden Beds', moves: 18, seed: 0x24180af5, orders: [[4, 12], [5, 12]],
    soil: [18, 21, 26, 29, 34, 37, 42, 45], tip: 'Clear produce over brown plots to dig them up.', sweeps: true },
  { name: 'Corner Plots', moves: 20, seed: 0x16ec02df, orders: [[0, 14], [1, 14]],
    soil: [0, 1, 6, 7, 8, 15, 48, 55, 56, 57, 62, 63], sweeps: true },
  { name: 'Orchard Route', moves: 16, seed: 0x97a42f29, orders: [[0, 16], [2, 16], [3, 16]],
    soil: [9, 14, 27, 28, 35, 36, 49, 54], sweeps: true },
  { name: 'Last Crates', moves: 19, seed: 0x5f7c20b1, orders: [[1, 16], [3, 16], [5, 16]],
    soil: [0, 3, 4, 7, 18, 21, 24, 31, 32, 39, 42, 45, 56, 59, 60, 63], sweeps: true },
  { name: 'Market Festival', moves: 21, seed: 0x790adda3, orders: [[0, 18], [2, 18], [4, 18], [5, 18]],
    soil: [0, 7, 9, 14, 18, 21, 24, 27, 28, 31, 32, 35, 36, 39, 42, 45, 49, 54, 56, 63], sweeps: true },
];
const START_BOARD = [
  5, 0, 0, 1, 0, 2, 3, 1,
  0, 5, 5, 0, 2, 1, 5, 5,
  4, 3, 4, 5, 3, 4, 3, 1,
  3, 2, 1, 4, 3, 3, 5, 2,
  0, 4, 1, 1, 2, 4, 5, 3,
  2, 5, 3, 3, 4, 4, 2, 1,
  4, 2, 4, 2, 1, 3, 1, 0,
  2, 3, 4, 4, 2, 3, 0, 0,
];
const COLORS = {
  backdrop: [0.145, 0.19, 0.145, 1],
  light: [0.23, 0.29, 0.205, 1],
  dark: [0.19, 0.25, 0.18, 1],
  active: [0.37, 0.42, 0.24, 1],
  gold: [1, 0.78, 0.39, 1],
  soil: [0.46, 0.26, 0.16, 1],
  soilRim: [0.79, 0.52, 0.29, 1],
};
const row = i => Math.floor(i / WIDTH);
const col = i => i % WIDTH;
const adjacent = (a, b) => Math.abs(row(a) - row(b)) + Math.abs(col(a) - col(b)) === 1;

function exchange(board, a, b) {
  [board[a], board[b]] = [board[b], board[a]];
}

export function findMatches(board, sweep = false) {
  const matched = new Set();
  for (const across of [true, false]) {
    for (let line = 0; line < WIDTH; line++) {
      let start = 0;
      const slot = at => across ? line * WIDTH + at : at * WIDTH + line;
      for (let end = 1; end <= WIDTH; end++) {
        if (end < WIDTH && board[slot(start)] === board[slot(end)]) continue;
        if (end - start >= 3) {
          const fullLane = sweep && end - start >= 4;
          for (let i = fullLane ? 0 : start; i < (fullLane ? WIDTH : end); i++) matched.add(slot(i));
        }
        start = end;
      }
    }
  }
  return [...matched];
}

export function legalSwaps(board) {
  const moves = [];
  for (let slot = 0; slot < CELL_COUNT; slot++) {
    for (const next of [col(slot) < WIDTH - 1 ? slot + 1 : -1, slot + WIDTH]) {
      if (next < 0 || next >= CELL_COUNT || board[slot] === board[next]) continue;
      exchange(board, slot, next);
      if (findMatches(board).length) moves.push([slot, next]);
      exchange(board, slot, next);
    }
  }
  return moves;
}

function geometry({ w, h, safe }) {
  const inner = w - safe.left - safe.right;
  const size = Math.min(inner, h);
  return { x: safe.left + (inner - size) / 2, y: (h - size) / 2, size, cell: size / WIDTH };
}

function slotAt(point, box) {
  const x = Math.floor((point.x - box.x) / box.cell);
  const y = Math.floor((point.y - box.y) / box.cell);
  return x >= 0 && x < WIDTH && y >= 0 && y < WIDTH ? y * WIDTH + x : -1;
}

function swipeNeighbor(event, from, cell) {
  const { x, y } = event.delta;
  if (Math.max(Math.abs(x), Math.abs(y)) < cell * 0.24) return -1;
  const horizontal = Math.abs(x) >= Math.abs(y);
  const c = col(from) + (horizontal ? Math.sign(x) : 0);
  const r = row(from) + (horizontal ? 0 : Math.sign(y));
  return c >= 0 && c < WIDTH && r >= 0 && r < WIDTH ? r * WIDTH + c : -1;
}

export function createCart({ gesture, screen, rect, spr, options }) {
  const requested = options?.level;
  const levelIndex = Number.isInteger(requested) && LEVELS[requested] ? requested : 0;
  const level = LEVELS[levelIndex];
  let seed = level.seed;
  let board = levelIndex === 0 ? START_BOARD.slice() : newBoard();
  const remaining = level.orders.map(([, count]) => count);
  const soil = new Set(level.soil);
  let moves = level.moves;
  let selected = -1;
  let combo = 0;
  let phase = null;
  let outcome = 'playing';
  let status = level.tip ?? 'Match produce to pack your order.';
  let audio = { id: 0, name: '', combo: 0 };

  function cue(name) {
    audio = { id: audio.id + 1, name, combo };
  }

  function nextProduce() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) % TYPES.length;
  }

  function begin(kind, duration, extra) {
    phase = { kind, duration, age: 0, ...extra };
  }

  function attempt(from, to) {
    if (from < 0 || to < 0 || !adjacent(from, to)) return;
    selected = -1;
    begin('swap', 8, { from, to });
    cue('swap');
  }

  function refill(matches) {
    const gone = new Set(matches);
    const distance = Array(CELL_COUNT).fill(0);
    for (let c = 0; c < WIDTH; c++) {
      let target = WIDTH - 1;
      for (let source = WIDTH - 1; source >= 0; source--) {
        if (gone.has(source * WIDTH + c)) continue;
        const slot = target * WIDTH + c;
        board[slot] = board[source * WIDTH + c];
        distance[slot] = target - source;
        target--;
      }
      const incoming = target + 1;
      for (; target >= 0; target--) {
        const slot = target * WIDTH + c;
        board[slot] = nextProduce();
        distance[slot] = incoming;
      }
    }
    begin('fall', 12, { distance });
  }

  function newBoard() {
    const types = TYPES.map((_, i) => i);
    for (let attempt = 0; attempt < 12; attempt++) {
      const next = [];
      for (let slot = 0; slot < CELL_COUNT; slot++) {
        const choices = types.filter(type =>
          !(col(slot) >= 2 && next[slot - 1] === type && next[slot - 2] === type) &&
          !(row(slot) >= 2 && next[slot - WIDTH] === type && next[slot - 2 * WIDTH] === type));
        next.push(choices[nextProduce() % choices.length]);
      }
      if (legalSwaps(next).length) return next;
    }
    return START_BOARD.slice();
  }

  function settle() {
    if (remaining.every(count => count === 0) && soil.size === 0) {
      outcome = 'won';
      status = 'Delivery complete!';
      cue('win');
    } else if (moves === 0) {
      outcome = 'lost';
      status = 'Out of moves. Tap Retry for a fresh board.';
      cue('lose');
    } else if (!legalSwaps(board).length) {
      board = newBoard();
      status = 'Board reshuffled. Your goals and moves are unchanged.';
    } else {
      status = combo > 1 ? 'Cascade ×' + combo + '. Keep packing!' : 'Match produce to pack your order.';
    }
  }

  function finishPhase() {
    const finished = phase;
    phase = null;
    switch (finished.kind) {
      case 'swap': {
        exchange(board, finished.from, finished.to);
        const matches = findMatches(board, level.sweeps);
        if (matches.length) {
          moves--;
          combo = 1;
          begin('clear', 10, { matches });
          cue('match');
        } else {
          status = 'That swap makes no match. Try another.';
          begin('undo', 7, { from: finished.from, to: finished.to });
          cue('miss');
        }
        break;
      }
      case 'undo':
        exchange(board, finished.from, finished.to);
        break;
      case 'clear':
        for (const slot of finished.matches) {
          const target = level.orders.findIndex(([type]) => type === board[slot]);
          if (target >= 0 && remaining[target] > 0) remaining[target]--;
          soil.delete(slot);
        }
        refill(finished.matches);
        break;
      case 'fall': {
        const matches = findMatches(board, level.sweeps);
        if (matches.length) {
          combo++;
          begin('clear', 10, { matches });
          cue('match');
        } else {
          settle();
        }
        break;
      }
    }
  }

  function update() {
    if (phase) {
      phase.age++;
      if (phase.age >= phase.duration) finishPhase();
      return;
    }
    if (outcome !== 'playing') return;
    const box = geometry(screen());
    for (const event of gesture()) {
      if (event.type === 'tap') {
        const slot = slotAt(event.position, box);
        if (slot < 0) continue;
        if (selected >= 0 && adjacent(selected, slot)) attempt(selected, slot);
        else {
          selected = selected === slot ? -1 : slot;
          if (selected >= 0) cue('select');
        }
      } else if (event.type === 'drop') {
        const from = slotAt(event.start, box);
        if (from >= 0) attempt(from, swipeNeighbor(event, from, box.cell));
      }
      if (phase) break;
    }
  }

  function draw(alpha) {
    const { x, y, size, cell } = geometry(screen());
    const t = phase ? Math.min(1, (phase.age + alpha) / phase.duration) : 0;
    const matches = phase?.kind === 'clear' ? new Set(phase.matches) : null;
    rect(x, y, size, size, COLORS.backdrop);
    for (let slot = 0; slot < CELL_COUNT; slot++) {
      const left = x + col(slot) * cell;
      const top = y + row(slot) * cell;
      const marked = slot === selected || matches?.has(slot);
      if (marked) rect(left + 1.5, top + 1.5, cell - 3, cell - 3, COLORS.gold);
      const inset = marked ? 4.5 : 2;
      rect(left + inset, top + inset, cell - inset * 2, cell - inset * 2,
        soil.has(slot) ? COLORS.soil : marked ? COLORS.active : (row(slot) + col(slot)) % 2 ? COLORS.light : COLORS.dark);
      if (soil.has(slot)) {
        const mark = cell * .075;
        for (const offset of [.15, .28, .41]) {
          rect(left + offset * cell, top + .81 * cell, mark, mark, COLORS.soilRim);
        }
      }
    }
    for (let slot = 0; slot < CELL_COUNT; slot++) {
      let px = x + (col(slot) + 0.5) * cell;
      let py = y + (row(slot) + 0.5) * cell;
      if ((phase?.kind === 'swap' || phase?.kind === 'undo') && (slot === phase.from || slot === phase.to)) {
        const target = slot === phase.from ? phase.to : phase.from;
        px += (col(target) - col(slot)) * cell * t;
        py += (row(target) - row(slot)) * cell * t;
      }
      if (phase?.kind === 'fall') py -= phase.distance[slot] * cell * (1 - t * t);
      if (py < y - cell / 2) continue;
      const clearing = matches?.has(slot);
      spr('assets/' + TYPES[board[slot]] + '.png', px, py, {
        scale: cell * (clearing ? 0.85 + 0.13 * t : 0.85) / 160,
        anchor: [0.5, 0.5],
        alpha: clearing ? 1 - t : 1,
      });
    }
  }

  return {
    update,
    draw,
    resize: () => { selected = -1; },
    pause: () => { selected = -1; },
    state: () => ({
      board: board.slice(), seed, moves, selected, combo, phase, outcome, status, audio,
      level: levelIndex, remaining: remaining.slice(), soil: [...soil], readout: { moves },
    }),
  };
}
