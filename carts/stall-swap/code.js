const WIDTH = 8;
const CELL_COUNT = WIDTH * WIDTH;
const TYPES = ['apple', 'bananas', 'strawberry', 'blueberries', 'carrot', 'broccoli'];
const GOALS = { apples: [0, 6], strawberries: [2, 6], blueberries: [3, 6], carrots: [4, 6] };
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
};
const row = i => Math.floor(i / WIDTH);
const col = i => i % WIDTH;
const adjacent = (a, b) => Math.abs(row(a) - row(b)) + Math.abs(col(a) - col(b)) === 1;

function exchange(board, a, b) {
  [board[a], board[b]] = [board[b], board[a]];
}

export function findMatches(board) {
  const matched = new Set();
  for (const across of [true, false]) {
    for (let line = 0; line < WIDTH; line++) {
      let start = 0;
      const slot = at => across ? line * WIDTH + at : at * WIDTH + line;
      for (let end = 1; end <= WIDTH; end++) {
        if (end < WIDTH && board[slot(start)] === board[slot(end)]) continue;
        if (end - start >= 3) {
          for (let i = start; i < end; i++) matched.add(slot(i));
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

export function createCart({ gesture, screen, rect, spr }) {
  let board = START_BOARD.slice();
  const remaining = Object.fromEntries(Object.entries(GOALS).map(([key, [, count]]) => [key, count]));
  const goalNames = Object.keys(GOALS);
  let seed = 0x5a170001;
  let moves = 18;
  let selected = -1;
  let combo = 0;
  let phase = null;
  let outcome = 'playing';
  let status = 'Swap two neighbors to make a line of three.';

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
    for (let attempt = 0; attempt < 12; attempt++) {
      const next = [];
      for (let slot = 0; slot < CELL_COUNT; slot++) {
        const choices = TYPES.map((_, i) => i).filter(type =>
          !(col(slot) >= 2 && next[slot - 1] === type && next[slot - 2] === type) &&
          !(row(slot) >= 2 && next[slot - WIDTH] === type && next[slot - 2 * WIDTH] === type));
        next.push(choices[nextProduce() % choices.length]);
      }
      if (legalSwaps(next).length) return next;
    }
    return START_BOARD.slice();
  }

  function settle() {
    if (goalNames.every(key => remaining[key] === 0)) {
      outcome = 'won';
      status = 'Both orders packed. Nice work!';
    } else if (moves === 0) {
      outcome = 'lost';
      status = 'Out of moves. Tap Retry for a fresh board.';
    } else if (!legalSwaps(board).length) {
      board = newBoard();
      status = 'Board reshuffled. Your orders and moves are unchanged.';
    } else {
      status = combo > 1 ? 'Cascade ×' + combo + '. Keep packing!' : 'Match produce to fill your orders.';
    }
  }

  function finishPhase() {
    const finished = phase;
    phase = null;
    switch (finished.kind) {
      case 'swap': {
        exchange(board, finished.from, finished.to);
        const matches = findMatches(board);
        if (matches.length) {
          moves--;
          combo = 1;
          begin('clear', 10, { matches });
        } else {
          status = 'That swap makes no match. Try another.';
          begin('undo', 7, { from: finished.from, to: finished.to });
        }
        break;
      }
      case 'undo':
        exchange(board, finished.from, finished.to);
        break;
      case 'clear':
        for (const slot of finished.matches) {
          for (const key of goalNames) {
            if (board[slot] === GOALS[key][0] && remaining[key] > 0) remaining[key]--;
          }
        }
        refill(finished.matches);
        break;
      case 'fall': {
        const matches = findMatches(board);
        if (matches.length) {
          combo++;
          begin('clear', 10, { matches });
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
        else selected = selected === slot ? -1 : slot;
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
        marked ? COLORS.active : (row(slot) + col(slot)) % 2 ? COLORS.light : COLORS.dark);
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
      board: board.slice(), seed, moves, selected, combo, phase, outcome, status,
      readout: { ...remaining, moves },
    }),
  };
}
