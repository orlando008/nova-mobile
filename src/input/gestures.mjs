const TICKS_PER_SECOND = 60;
const TAP_TICKS = 18;
const DOUBLE_TAP_TICKS = 18;
const PRESS_TICKS = 27;
const DRAG_DISTANCE = 10;
const DOUBLE_TAP_DISTANCE = 24;
const SWIPE_SPEED = 500;

const DIRECTIONS = {
  4: ['right', 'down', 'left', 'up'],
  8: ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'],
};

const EMPTY = Object.freeze([]);
const point = (x, y) => Object.freeze({ x, y });
const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

function measurePinch(first, second) {
  return {
    center: point((first.current.x + second.current.x) / 2, (first.current.y + second.current.y) / 2),
    dx: second.current.x - first.current.x,
    dy: second.current.y - first.current.y,
  };
}

function pinchChange(before, after) {
  const previousLength = Math.hypot(before.dx, before.dy);
  const currentLength = Math.hypot(after.dx, after.dy);
  if (!previousLength || !currentLength) return { scale: 1, rotation: 0 };
  const cross = before.dx * after.dy - before.dy * after.dx;
  const dot = before.dx * after.dx + before.dy * after.dy;
  return { scale: currentLength / previousLength, rotation: Math.atan2(cross, dot) };
}

// The worker advances this once per simulation tick with live or recorded input.
export function createGestureInput({ directions = 4 } = {}) {
  if (directions !== 4 && directions !== 8) throw new RangeError('Expected 4 or 8 swipe directions');
  const pointers = new Map();
  let tick = 0;
  let scale;
  let previousTap = null;
  let pinch = null;
  let latest = EMPTY;

  function clearPointers() {
    pointers.clear();
    previousTap = null;
    pinch = null;
  }

  function reset() {
    clearPointers();
    tick = 0;
    scale = undefined;
    latest = EMPTY;
  }

  function dragEvent(type, pointer) {
    const { id, start, current } = pointer;
    return { type, id, start, current, delta: point(current.x - start.x, current.y - start.y) };
  }

  function startPinch() {
    if (pinch || pointers.size < 2) return;
    const [first, second] = pointers.values();
    pinch = { first, second, before: measurePinch(first, second) };
  }

  function reportPinch(events) {
    if (!pinch) return;
    const { first, second, before } = pinch;
    const after = measurePinch(first, second);
    if (before.dx === after.dx && before.dy === after.dy &&
        before.center.x === after.center.x && before.center.y === after.center.y) return;
    pinch.before = after;
    events.push({ type: 'pinch', center: after.center, ...pinchChange(before, after) });
  }

  function down(sample, events) {
    if (pointers.has(sample.id)) return;
    const start = point(sample.x, sample.y);
    pointers.set(sample.id, { id: sample.id, start, current: start, downTick: tick, mode: 'pending' });
    if (pointers.size < 2) return;
    previousTap = null;
    for (const pointer of pointers.values()) {
      if (pointer.mode === 'drag') events.push(dragEvent('cancel', pointer));
      pointer.mode = 'pinch';
    }
    startPinch();
  }

  function move(pointer, sample, events) {
    if (pointer.current.x === sample.x && pointer.current.y === sample.y) return;
    pointer.current = point(sample.x, sample.y);
    if (pointer.mode === 'pending' && distance(pointer.start, pointer.current) >= DRAG_DISTANCE * scale) {
      pointer.mode = 'drag';
      previousTap = null;
    }
    if (pointer.mode === 'drag') events.push(dragEvent('drag', pointer));
  }

  function press(pointer, events) {
    if (pointer.mode !== 'pending' || tick - pointer.downTick < PRESS_TICKS) return;
    pointer.mode = 'press';
    previousTap = null;
    events.push({ type: 'press', id: pointer.id, position: pointer.current });
  }

  function tap(pointer, events) {
    const { id, current: position } = pointer;
    events.push({ type: 'tap', id, position });
    if (previousTap && tick - previousTap.tick <= DOUBLE_TAP_TICKS &&
        distance(position, previousTap.position) <= DOUBLE_TAP_DISTANCE * scale) {
      events.push({ type: 'doubletap', id, position });
      previousTap = null;
    } else {
      previousTap = { tick, position };
    }
  }

  function drop(pointer, elapsed, events) {
    const event = dragEvent('drop', pointer);
    events.push(event);
    const speed = distance(event.start, event.current) * TICKS_PER_SECOND / Math.max(1, elapsed);
    if (speed <= SWIPE_SPEED * scale) return;
    const angle = Math.atan2(event.delta.y, event.delta.x);
    const sector = Math.round(angle * directions / (2 * Math.PI));
    const direction = DIRECTIONS[directions][(sector + directions) % directions];
    events.push({ ...event, type: 'swipe', direction, speed });
  }

  function finish(pointer, sample, events) {
    const inPinch = pinch && (pinch.first === pointer || pinch.second === pointer);
    if (sample.phase === 'cancel') {
      if (pointer.mode === 'drag') events.push(dragEvent('cancel', pointer));
      previousTap = null;
    } else {
      move(pointer, sample, events);
      const elapsed = tick - pointer.downTick;
      press(pointer, events);
      if (pointer.mode === 'drag') drop(pointer, elapsed, events);
      if (pointer.mode === 'pending' && elapsed <= TAP_TICKS) tap(pointer, events);
      if (inPinch) reportPinch(events);
    }
    pointers.delete(pointer.id);
    if (inPinch) {
      pinch = null;
      startPinch();
    }
  }

  function step({ touches = [], scale: tickScale, wheel } = {}) {
    if (!Number.isFinite(tickScale) || tickScale <= 0) throw new RangeError('Expected a positive screen scale');
    if (wheel && (!Number.isFinite(wheel.scale) || wheel.scale <= 0)) {
      throw new RangeError('Expected a positive wheel scale');
    }
    tick += 1;
    const events = [];
    if (scale !== undefined && scale !== tickScale) {
      for (const pointer of pointers.values()) {
        if (pointer.mode === 'drag') events.push(dragEvent('cancel', pointer));
      }
      clearPointers();
    }
    scale = tickScale;
    for (const sample of touches) {
      const pointer = pointers.get(sample.id);
      if (sample.phase === 'down') down(sample, events);
      else if (pointer && sample.phase === 'move') move(pointer, sample, events);
      else if (pointer && (sample.phase === 'up' || sample.phase === 'cancel')) finish(pointer, sample, events);
    }
    for (const pointer of pointers.values()) press(pointer, events);
    reportPinch(events);
    if (wheel && wheel.scale !== 1) {
      events.push({ type: 'pinch', center: point(wheel.x, wheel.y), scale: wheel.scale, rotation: 0 });
    }
    latest = events.length ? Object.freeze(events.map(event => Object.freeze(event))) : EMPTY;
    return latest;
  }

  return { step, gesture: () => latest, reset };
}
