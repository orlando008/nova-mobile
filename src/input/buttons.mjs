const OCTAGON_CORNER = 1 - Math.SQRT1_2;

export function hit(x, y, shape) {
  if (!shape || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  const dx = x - shape.x;
  const dy = y - shape.y;
  if (shape.type === 'circle') {
    return shape.r > 0 && Math.hypot(dx, dy) <= shape.r;
  }

  const { w, h, type = 'rect' } = shape;
  if (!(w > 0 && h > 0 && dx >= 0 && dx <= w && dy >= 0 && dy <= h)) return false;
  if (type === 'rect') return true;
  if (type !== 'octagon') return false;
  const shortSide = Math.min(w, h);
  const cut = shape.cut ?? shortSide * OCTAGON_CORNER;
  return Number.isFinite(cut) && cut >= 0 && cut <= shortSide / 2 &&
    Math.min(dx, w - dx) + Math.min(dy, h - dy) >= cut;
}

export function createButtonInput() {
  const captured = new Map();
  const results = new Map();
  const claimed = new Set();
  const ownedPointers = new Set();
  const consumedPointers = new Set();
  let touches = null;

  function begin(samples) {
    touches = samples;
    results.clear();
    claimed.clear();
    consumedPointers.clear();
    for (const id of ownedPointers) consumedPointers.add(id);
  }

  function button(id, box, { disabled = false } = {}) {
    if (!touches) throw new Error('button() is only available during update()');
    if (results.has(id)) return results.get(id);
    let pointer = captured.get(id);
    if (disabled || (pointer && !hit(pointer.x, pointer.y, box))) pointer = undefined;
    let pressed = false;
    let clicked = false;

    for (const sample of touches) {
      if (!pointer) {
        if (sample.phase === 'down' && !claimed.has(sample) && hit(sample.x, sample.y, box)) {
          claimed.add(sample);
          consumedPointers.add(sample.id);
          if (!disabled) {
            pointer = sample;
            pressed = true;
          }
        }
        continue;
      }
      if (sample.id !== pointer.id) continue;
      const inside = sample.phase !== 'cancel' && hit(sample.x, sample.y, box);
      if (sample.phase === 'up' && inside) clicked = true;
      pointer = inside && sample.phase !== 'up' ? sample : undefined;
    }

    if (pointer) captured.set(id, pointer);
    else captured.delete(id);
    const result = clicked ? 'clicked' : pointer ? (pressed ? 'pressed' : 'held') : null;
    results.set(id, result);
    return result;
  }

  function end() {
    for (const id of captured.keys()) {
      if (!results.has(id)) captured.delete(id);
    }
    for (const sample of touches) {
      if (sample.phase === 'down' && claimed.has(sample)) ownedPointers.add(sample.id);
      if (sample.phase === 'up' || sample.phase === 'cancel') ownedPointers.delete(sample.id);
    }
    touches = null;
  }

  function reset() {
    captured.clear();
    ownedPointers.clear();
    consumedPointers.clear();
  }

  return { begin, button, consumed: id => consumedPointers.has(id), end, reset };
}
