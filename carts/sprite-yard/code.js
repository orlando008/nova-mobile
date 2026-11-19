const ITEMS = [
  ['Crate', 'crate'], ['Apple', 'apple'], ['Coin', 'coin'], ['Heart', 'heart-full'],
  ['Lantern', 'lantern'], ['Sapphire', 'sapphire'], ['Flame', 'flame'], ['Star', 'star'],
];
const COLUMNS = 5;
const ROWS = 4;
const TRAY_COLUMNS = 4;
const STARTING_PIECES = [[1, 5], [7, 0], [11, 1], [13, 4], [17, 3]];
const COLORS = {
  panel: [0.10, 0.17, 0.16, 1],
  empty: [0.14, 0.24, 0.22, 1],
  occupied: [0.20, 0.30, 0.27, 1],
  tray: [0.24, 0.30, 0.23, 1],
  edge: [0.31, 0.40, 0.35, 1],
  dot: [0.33, 0.55, 0.45, 1],
  selected: [0.84, 0.97, 0.55, 1],
};

function layout({ w, h, safe }) {
  const width = w - safe.left - safe.right;
  const height = h - safe.top - safe.bottom;
  const gap = 12;
  const separator = 42;
  const step = Math.min(116, (width - 28 + gap) / COLUMNS, (height - 28 - separator + 2 * gap) / 6);
  const size = step - gap;
  const gridY = safe.top + (height - (step * 6 - 2 * gap + separator)) / 2;
  const trayY = gridY + step * ROWS - gap + separator;
  function boxes(total, columns, top) {
    const left = safe.left + (width - (step * columns - gap)) / 2;
    return Array.from({ length: total }, (_, i) => ({
      x: left + (i % columns) * step,
      y: top + Math.floor(i / columns) * step,
      w: size, h: size,
    }));
  }
  return { slots: boxes(COLUMNS * ROWS, COLUMNS, gridY), tray: boxes(ITEMS.length, TRAY_COLUMNS, trayY), size };
}

export function createCart({ gesture, hit, rect, spr, screen }) {
  const board = Array(COLUMNS * ROWS).fill(null);
  for (const [slot, item] of STARTING_PIECES) board[slot] = item;
  let selected = null;
  let drag = null;
  let status = 'Choose a sprite or move a piece.';

  const where = (boxes, point) => boxes.findIndex(box => hit(point.x, point.y, box));

  function tap(point, boxes) {
    const item = where(boxes.tray, point);
    if (item >= 0) {
      selected = item;
      status = ITEMS[item][0] + ' selected.';
      return;
    }
    const slot = where(boxes.slots, point);
    if (selected === null || slot < 0) return;
    if (board[slot] !== null) {
      status = 'Choose an empty slot.';
      return;
    }
    board[slot] = selected;
    status = ITEMS[selected][0] + ' placed.';
  }

  function move(event, boxes) {
    if (drag && event.id !== drag.id) return;
    if (!drag) {
      const source = where(boxes.slots, event.start);
      const fromTray = where(boxes.tray, event.start);
      const item = fromTray >= 0 ? fromTray : board[source];
      if (item == null) return;
      drag = { id: event.id, item, source: fromTray >= 0 ? -1 : source, current: event.current };
    } else {
      drag = { ...drag, current: event.current };
    }
  }

  function drop(point, boxes) {
    const slot = where(boxes.slots, point);
    if (slot >= 0 && board[slot] === null) {
      if (drag.source >= 0) board[drag.source] = null;
      board[slot] = drag.item;
      status = ITEMS[drag.item][0] + (drag.source < 0 ? ' placed.' : ' moved.');
    } else {
      status = slot === drag.source && drag.source >= 0 ? 'Piece returned to its slot.' : 'Choose an empty slot.';
    }
    drag = null;
  }

  function picture(item, x, y, size, alpha = 1) {
    spr('assets/' + ITEMS[item][1] + '.png', x, y, {
      scale: size * 0.87 / 160,
      anchor: [0.5, 0.5],
      alpha,
    });
  }

  function panel(boxes) {
    const first = boxes[0];
    const last = boxes.at(-1);
    rect(first.x - 12, first.y - 12, last.x - first.x + first.w + 24,
      last.y - first.y + first.h + 24, COLORS.panel);
  }

  function tile(box, fill, border = COLORS.edge) {
    rect(box.x, box.y, box.w, box.h, border);
    rect(box.x + 2, box.y + 2, box.w - 4, box.h - 4, fill);
  }

  function clearDrag() {
    drag = null;
  }

  return {
    update() {
      const boxes = layout(screen());
      for (const event of gesture()) {
        if (event.type === 'tap') tap(event.position, boxes);
        if (event.type === 'drag') move(event, boxes);
        if (event.type === 'drop' && event.id === drag?.id) drop(event.current, boxes);
        if (event.type === 'cancel' && event.id === drag?.id) clearDrag();
      }
    },
    draw() {
      const { slots, tray, size } = layout(screen());
      const half = size / 2;
      const hovered = drag ? where(slots, drag.current) : -1;
      panel(slots);
      panel(tray);
      slots.forEach((box, i) => {
        const item = board[i];
        const active = hovered === i && item === null;
        tile(box, item === null ? COLORS.empty : COLORS.occupied, active ? COLORS.selected : COLORS.edge);
        if (item === null) {
          rect(box.x + half - 2, box.y + half - 2, 4, 4, active ? COLORS.selected : COLORS.dot);
        } else {
          picture(item, box.x + half, box.y + half, size, drag?.source === i ? 0.35 : 1);
        }
      });
      tray.forEach((box, i) => {
        tile(box, COLORS.tray, selected === i ? COLORS.selected : COLORS.edge);
        picture(i, box.x + half, box.y + half, size);
      });
      if (drag) picture(drag.item, drag.current.x, drag.current.y, size);
    },
    resize: clearDrag,
    pause: clearDrag,
    state: () => ({ board: board.slice(), selected, drag, status }),
  };
}
