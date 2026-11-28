import { createGestureInput } from './input/gestures.mjs';
import { createButtonInput, hit } from './input/buttons.mjs';

export const TICK_MS = 1000 / 60;
const MAX_TICKS = 4;

export function createClock() {
  let previous;
  let remaining = 0;

  function reset() {
    previous = undefined;
    remaining = 0;
  }

  function frame(now) {
    if (previous !== undefined) remaining += Math.max(0, now - previous);
    previous = now;
    const count = Math.floor((remaining + 1e-7) / TICK_MS);
    remaining = Math.max(0, remaining - count * TICK_MS);
    return { count: Math.min(count, MAX_TICKS), alpha: remaining / TICK_MS };
  }

  return { frame, reset };
}

export function createRuntime(createCart, initialScreen, assets = [], pictures = [], options = {}) {
  const input = createGestureInput();
  const buttons = createButtonInput();
  const freezeScreen = screen => Object.freeze({ ...screen, safe: Object.freeze({ ...screen.safe }) });
  let screen = freezeScreen(initialScreen);
  let touches = Object.freeze([]);
  let now = 0;
  let commands = null;
  const bytesByPath = new Map(assets.map(({ path, bytes }) => [path, bytes]));
  const picturesByPath = new Map(pictures.map(({ path, width, height }, index) => [path, {
    width, height, index: index + 1,
  }]));
  const cart = createCart(Object.freeze({
    options: Object.freeze({ ...options }),
    gesture: input.gesture,
    hit,
    button: buttons.button,
    consumed: buttons.consumed,
    screen: () => screen,
    touches: () => touches,
    now: () => now,
    asset: path => bytesByPath.get(path)?.slice(0),
    rect(x, y, width, height, [red, green, blue, alpha = 1]) {
      if (!commands) throw new Error('rect() is only available during draw()');
      commands.push(x, y, width, height, red, green, blue, alpha, 0, 0);
    },
    spr(path, x, y, { scale = 1, sx = scale, sy = scale, anchor = [0, 0], alpha = 1, rot = 0 } = {}) {
      if (!commands) throw new Error('spr() is only available during draw()');
      const picture = picturesByPath.get(path);
      if (!picture) throw new Error('Picture is not loaded: ' + path);
      const width = picture.width * sx;
      const height = picture.height * sy;
      const [ax, ay] = anchor;
      if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 &&
          Number.isFinite(rot) && ax >= 0 && ax <= 1 && ay >= 0 && ay <= 1 && alpha >= 0 && alpha <= 1)) {
        throw new RangeError('Invalid sprite scale, anchor, alpha, or angle for ' + path);
      }
      const dx = -ax * width;
      const dy = -ay * height;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      commands.push(x + dx * cos - dy * sin, y + dx * sin + dy * cos,
        width, height, 1, 1, 1, alpha, picture.index, rot);
    },
  }));
  if (typeof cart?.update !== 'function' || typeof cart?.draw !== 'function') {
    throw new Error('The cart must define update() and draw()');
  }
  cart.init?.();

  function tick(frame) {
    now = frame.now;
    touches = Object.freeze(frame.touches.map(sample => Object.freeze({ ...sample })));
    if (frame.lifecycle === 'resize') {
      input.reset();
      buttons.reset();
      screen = freezeScreen(frame.screen);
      cart.resize?.(screen.w, screen.h);
    } else if (frame.lifecycle === 'pause') {
      input.reset();
      buttons.reset();
      cart.pause?.();
    }
    input.step({ touches, scale: screen.scale, wheel: frame.wheel });
    buttons.begin(touches);
    try {
      cart.update();
    } finally {
      buttons.end();
    }
  }

  function draw(alpha) {
    commands = [];
    try {
      cart.draw(alpha);
      return Float32Array.from(commands);
    } finally {
      commands = null;
    }
  }

  return { tick, draw, screen: () => screen, state: () => cart.state?.() ?? null };
}
