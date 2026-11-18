export function measureScreen(element, safeArea) {
  const bounds = element.getBoundingClientRect();
  if (!bounds.width || !bounds.height) throw new Error('The game surface has no size');
  const scale = 720 / bounds.width;
  const insets = getComputedStyle(safeArea);
  const inset = edge => parseFloat(insets.getPropertyValue('padding-' + edge)) * scale;
  return {
    w: 720,
    h: bounds.height * scale,
    scale,
    dpr: Math.min(window.devicePixelRatio || 1, 3),
    safe: { top: inset('top'), right: inset('right'), bottom: inset('bottom'), left: inset('left') },
  };
}

export function bindPointers(canvas, screen) {
  const active = new Map();
  let touches = [];
  let wheel;
  const point = event => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * screen().scale, y: (event.clientY - bounds.top) * screen().scale };
  };

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || active.has(event.pointerId) || active.size >= 5) return;
    const position = point(event);
    active.set(event.pointerId, position);
    canvas.setPointerCapture(event.pointerId);
    touches.push({ id: event.pointerId, phase: 'down', ...position });
  });
  canvas.addEventListener('pointermove', event => {
    if (!active.has(event.pointerId)) return;
    const position = point(event);
    active.set(event.pointerId, position);
    touches.push({ id: event.pointerId, phase: 'move', ...position });
  });
  function end(event, phase) {
    if (!active.has(event.pointerId)) return;
    const position = phase === 'up' ? point(event) : active.get(event.pointerId);
    active.delete(event.pointerId);
    touches.push({ id: event.pointerId, phase, ...position });
  }
  canvas.addEventListener('pointerup', event => end(event, 'up'));
  canvas.addEventListener('pointercancel', event => end(event, 'cancel'));
  canvas.addEventListener('lostpointercapture', event => end(event, 'cancel'));
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
    const delta = Math.max(-300, Math.min(300, event.deltaY * unit));
    wheel = { ...point(event), scale: Math.max(0.1, Math.min(10, (wheel?.scale ?? 1) * Math.exp(-delta / 300))) };
  }, { passive: false });

  function reset() {
    active.clear();
    touches = [];
    wheel = undefined;
  }

  function sample() {
    const frame = { touches, wheel };
    touches = [];
    wheel = undefined;
    return frame;
  }

  return { sample, reset };
}
