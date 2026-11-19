const SIZE = 88;
const CRATE = 'assets/crate.png';
const COLORS = {
  target: [0.16, 0.29, 0.28, 1],
  highlight: [0.77, 0.95, 0.49, 1],
  mark: [0.36, 0.9, 0.77, 1],
  center: [0.12, 0.2, 0.2, 1],
};

function controls({ w, h, safe }) {
  const x = (safe.left + w - safe.right - SIZE) / 2;
  const y = h - safe.bottom - SIZE - 16;
  const box = offset => ({ x: x + offset, y, w: SIZE, h: SIZE });
  return { button: box(-102), home: box(0), slot: box(102) };
}

export function createCart({ gesture, hit, button, consumed, rect, spr, screen }) {
  let event = 'Ready';
  let x = 0;
  let y = 0;
  let count = 0;
  let buttonStatus = null;
  let buttonClicks = 0;
  let drops = 0;
  let position = 'home';
  let drag = null;

  function clear() {
    event = 'Ready';
    x = 0;
    y = 0;
    buttonStatus = null;
    drag = null;
  }

  function trackPiece(item, boxes) {
    if (item.type === 'drag') {
      const origin = boxes[position];
      if (!drag && !hit(item.start.x, item.start.y, origin)) return;
      if (drag && drag.id !== item.id) return;
      drag = { id: item.id, x: origin.x + item.delta.x, y: origin.y + item.delta.y };
    } else if (drag && drag.id === item.id) {
      if (item.type === 'drop') {
        const target = position === 'home' ? 'slot' : 'home';
        if (hit(item.current.x, item.current.y, boxes[target])) {
          position = target;
          drops += 1;
        }
        drag = null;
      } else if (item.type === 'cancel') {
        drag = null;
      }
    }
  }

  return {
    update() {
      const boxes = controls(screen());
      buttonStatus = button('counter', boxes.button);
      if (buttonStatus === 'clicked') buttonClicks += 1;
      for (const item of gesture()) {
        if (consumed(item.id)) continue;
        const at = item.position ?? item.current ?? item.center;
        x = at.x;
        y = at.y;
        event = item.type === 'doubletap' ? 'Double tap' : item.type[0].toUpperCase() + item.type.slice(1);
        count += 1;
        trackPiece(item, boxes);
      }
    },
    draw() {
      const view = screen();
      const { w, safe } = view;
      const boxes = controls(view);
      const gridHeight = boxes.button.y - 14 - safe.top;
      const padding = 22;
      const stride = SIZE + 14;
      const columns = Math.max(1, Math.floor((w - safe.left - safe.right - padding) / stride));
      const rows = Math.max(1, Math.floor((gridHeight - padding) / stride));
      const left = safe.left + (w - safe.left - safe.right - columns * stride + 14) / 2;
      const top = safe.top + (gridHeight - rows * stride + 14) / 2;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const px = left + col * stride;
          const py = top + row * stride;
          const active = event !== 'Ready' && x >= px && x < px + SIZE && y >= py && y < py + SIZE;
          rect(px, py, SIZE, SIZE, active ? COLORS.highlight : COLORS.target);
          rect(px + 42, py + 42, 4, 4, active ? COLORS.center : COLORS.mark);
        }
      }
      const pressed = buttonStatus === 'pressed' || buttonStatus === 'held';
      const buttonBox = boxes.button;
      rect(buttonBox.x, buttonBox.y, SIZE, SIZE, pressed ? COLORS.highlight : COLORS.mark);
      rect(buttonBox.x + 25, buttonBox.y + 40, 38, 8, COLORS.center);
      rect(buttonBox.x + 40, buttonBox.y + 25, 8, 38, COLORS.center);
      for (const box of [boxes.home, boxes.slot]) {
        rect(box.x, box.y, SIZE, SIZE, COLORS.mark);
        rect(box.x + 3, box.y + 3, SIZE - 6, SIZE - 6, COLORS.center);
      }
      const piece = drag ?? boxes[position];
      spr(CRATE, piece.x + SIZE / 2, piece.y + SIZE / 2, { scale: SIZE / 160, anchor: [0.5, 0.5] });
      if (event !== 'Ready') {
        rect(x - 22, y - 2, 44, 4, COLORS.mark);
        rect(x - 2, y - 22, 4, 44, COLORS.mark);
        rect(x - 5, y - 5, 10, 10, COLORS.center);
      }
    },
    resize: clear,
    pause: clear,
    state: () => ({ event, x, y, count, buttonStatus, buttonClicks, drops, position, drag }),
  };
}
