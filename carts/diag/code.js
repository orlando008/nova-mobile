const SIZE = 88;
const COLORS = {
  target: [0.16, 0.29, 0.28, 1],
  highlight: [0.77, 0.95, 0.49, 1],
  mark: [0.36, 0.9, 0.77, 1],
  center: [0.12, 0.2, 0.2, 1],
};

export function createCart({ gesture, rect, screen }) {
  let event = 'Ready';
  let x = 0;
  let y = 0;
  let count = 0;

  function clear() {
    event = 'Ready';
    x = 0;
    y = 0;
  }

  return {
    update() {
      for (const item of gesture()) {
        const at = item.position ?? item.current ?? item.center;
        x = at.x;
        y = at.y;
        event = item.type === 'doubletap' ? 'Double tap' : item.type[0].toUpperCase() + item.type.slice(1);
        count += 1;
      }
    },
    draw() {
      const { w, h, safe } = screen();
      const padding = 22;
      const stride = SIZE + 14;
      const columns = Math.max(1, Math.floor((w - safe.left - safe.right - padding) / stride));
      const rows = Math.max(1, Math.floor((h - safe.top - safe.bottom - padding) / stride));
      const left = safe.left + (w - safe.left - safe.right - columns * stride + 14) / 2;
      const top = safe.top + (h - safe.top - safe.bottom - rows * stride + 14) / 2;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          const px = left + col * stride;
          const py = top + row * stride;
          const active = event !== 'Ready' && x >= px && x < px + SIZE && y >= py && y < py + SIZE;
          rect(px, py, SIZE, SIZE, active ? COLORS.highlight : COLORS.target);
          rect(px + 42, py + 42, 4, 4, active ? COLORS.center : COLORS.mark);
        }
      }
      if (event !== 'Ready') {
        rect(x - 22, y - 2, 44, 4, COLORS.mark);
        rect(x - 2, y - 22, 4, 44, COLORS.mark);
        rect(x - 5, y - 5, 10, 10, COLORS.center);
      }
    },
    resize: clear,
    pause: clear,
    state: () => ({ event, x, y, count }),
  };
}
