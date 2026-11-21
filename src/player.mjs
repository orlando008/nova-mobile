import { loadCart } from './cart.mjs';
import { bindPointers, measureScreen } from './input/pointers.mjs';
import { createClock } from './runtime.mjs';
import { createRenderer } from './webgl/rects.mjs';
import { createCanvasRenderer } from './canvas/rects.mjs';
import { decodePictures } from './pictures.mjs';

const byId = id => document.getElementById(id);
const { cart } = document.body.dataset;
const canvas = byId('surface');
const inputSurface = document.querySelector('[data-cart-input]') ?? canvas;
const safeArea = byId('safe-area');
const cartFields = document.querySelectorAll('[data-cart-field]');
const resetInLive = byId('live').hasAttribute('data-reset');
const maxTicks = 60 * 60;
const clock = createClock();
let worker;
let renderer;
let pointers;
let screen;
let session = 0;
let ready = false;
let pending = null;
let lifecycle = [];
let mode = 'live';
let record;
let replayed = 0;
let options = {};
let paused = false;

export function chooseCartOptions(next) {
  options = { ...next };
}

export function pausePlayer(value) {
  if (paused === value) return;
  paused = value;
  clock.reset();
  pointers?.reset();
  if (paused && ready && (mode === 'live' || mode === 'record')) lifecycle.push({ lifecycle: 'pause' });
}

function message(text) {
  byId('feedback').textContent = text;
}

function setText(id, text) {
  const element = byId(id);
  if (element && element.textContent !== text) element.textContent = text;
}

function describe(view, state) {
  setText('screen', Math.round(view.w) + ' × ' + Math.round(view.h) + ' points · ' +
    view.scale.toFixed(2) + ' pts/CSS px · ' + view.dpr + '× DPR · ' + renderer.name);
  setText('insets', 'Safe area (top/right/bottom/left) ' +
    Object.values(view.safe).map(value => Math.round(value)).join(' / '));
  if (state?.event) setText('gesture', state.event +
    (state.event === 'Ready' ? '' : ' · ' + Math.round(state.x) + ', ' + Math.round(state.y) + ' pts'));
  if (state?.buttonClicks !== undefined) {
    setText('interaction', 'Button clicks ' + state.buttonClicks + ' · Valid drops ' + state.drops);
  }
  if (typeof state?.status === 'string') setText('cart-status', state.status);
  for (const field of cartFields) {
    const value = state?.readout?.[field.dataset.cartField];
    if (typeof value === 'number' || typeof value === 'string') {
      const text = String(value);
      if (field.textContent !== text) field.textContent = text;
    }
  }
}

function fail(error) {
  ready = false;
  worker?.terminate();
  byId('record').disabled = true;
  byId('replay').disabled = true;
  byId('live').disabled = true;
  message(error instanceof Error ? error.message : String(error));
}

function start(next, loaded) {
  session += 1;
  mode = next;
  ready = false;
  pending = null;
  lifecycle = [];
  pointers.reset();
  clock.reset();
  replayed = 0;
  const initial = next === 'replay' ? record.screen : screen;
  const initialOptions = next === 'replay' ? record.options : options;
  if (next === 'record') record = { screen, options: initialOptions, frames: [], states: [] };
  byId('record').textContent = next === 'record' ? 'Stop' : 'Record';
  byId('replay').disabled = true;
  byId('live').disabled = next === 'live';
  message({ live: 'Live input', record: 'Recording…', replay: 'Replaying…' }[next]);
  if (loaded) {
    worker.postMessage({ type: 'load', session, screen: initial, options: initialOptions, code: loaded.code,
      assets: loaded.assets, pictures: loaded.pictures },
      [loaded.code, ...loaded.assets.map(asset => asset.bytes)]);
  } else {
    worker.postMessage({ type: 'restart', session, screen: initial, options: initialOptions });
  }
}

function stopRecording() {
  mode = 'live';
  byId('record').textContent = 'Record';
  byId('live').disabled = !resetInLive;
  byId('replay').disabled = !record.frames.length;
  message('Recorded ' + record.frames.length + ' ticks');
}

function onMessage({ data }) {
  if (data.session !== session) return;
  if (data.type === 'ready') {
    ready = true;
    byId('record').disabled = false;
    if (resetInLive) byId('live').disabled = false;
    return;
  }
  if (data.type === 'error') {
    fail(data.message);
    return;
  }
  if (data.type !== 'frame' || !pending) return;

  const { frames, capture } = pending;
  pending = null;
  const width = Math.round(screen.w / screen.scale * screen.dpr);
  const height = Math.round(screen.h / screen.scale * screen.dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  renderer.draw(data.drawList, data.screen);
  describe(data.screen, data.state);
  const frameMode = capture ?? mode;
  if (capture === 'record') {
    record.frames.push(...frames);
    record.states.push(...data.states);
    if (mode !== 'record' || record.frames.length >= maxTicks) stopRecording();
  } else if (capture === 'replay') {
    const mismatch = data.states.findIndex((state, index) => state !== record.states[replayed + index]);
    replayed += frames.length;
    if (mismatch >= 0 || replayed === record.frames.length) {
      message(mismatch >= 0
        ? 'Replay diverged at tick ' + (replayed - frames.length + mismatch)
        : 'Replay matched all ' + replayed + ' ticks');
      mode = 'finished';
      byId('replay').disabled = false;
    }
  }
  if (canvas.hasAttribute('data-cart-events')) {
    canvas.dispatchEvent(new CustomEvent('cartframe', { detail: { state: data.state, mode: frameMode, session } }));
  }
}

function liveFrame() {
  // Drain transitions in order. Resizing clears samples collected in the previous coordinate system.
  const transition = lifecycle.shift();
  const sampled = transition ? { touches: [] } : pointers.sample();
  return { ...sampled, ...transition, now: Date.now() };
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  if (!ready || pending || paused || mode === 'finished' || document.hidden) return;
  const { count, alpha } = clock.frame(timestamp);
  let frames;
  if (mode === 'replay') frames = record.frames.slice(replayed, replayed + count);
  else {
    const length = mode === 'record' ? Math.min(count, maxTicks - record.frames.length) : count;
    frames = Array.from({ length }, liveFrame);
  }
  const capture = mode === 'record' || mode === 'replay' ? mode : null;
  pending = { frames, capture };
  worker.postMessage({ type: 'frame', session, frames, alpha, capture: Boolean(capture) });
}

const refresh = () => {
  if (!canvas.getClientRects().length) return;
  const next = measureScreen(canvas, safeArea);
  if (JSON.stringify(next) === JSON.stringify(screen)) return;
  screen = next;
  if (mode === 'replay' || mode === 'finished') return;
  pointers.reset();
  if (lifecycle.at(-1)?.lifecycle === 'resize') lifecycle.pop();
  lifecycle.push({ lifecycle: 'resize', screen });
};

byId('play').addEventListener('click', async () => {
  byId('play').disabled = true;
  message('Loading cart…');
  let pictures = [];
  try {
    const loaded = await loadCart(cart, new URL('../', import.meta.url));
    pictures = await decodePictures(loaded.assets);
    loaded.pictures = pictures.map(({ path, bitmap }) => ({ path, width: bitmap.width, height: bitmap.height }));
    const bitmaps = pictures.map(({ bitmap }) => bitmap);
    byId('intro').hidden = true;
    byId('controls').hidden = false;
    byId('board').hidden = false;
    renderer = createRenderer(canvas, bitmaps) ?? createCanvasRenderer(canvas, bitmaps);
    screen = measureScreen(canvas, safeArea);
    pointers = bindPointers(inputSurface, () => screen);
    worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' });
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', event => fail(event.message));
    new ResizeObserver(refresh).observe(canvas);
    window.addEventListener('resize', refresh);
    document.addEventListener('visibilitychange', () => {
      clock.reset();
      if (document.hidden && (mode === 'live' || mode === 'record')) {
        pointers.reset();
        lifecycle.push({ lifecycle: 'pause' });
      }
    });
    start('live', loaded);
    requestAnimationFrame(animate);
  } catch (error) {
    for (const { bitmap } of pictures) bitmap.close();
    fail(error);
  }
});

byId('record').addEventListener('click', () => {
  if (mode === 'record') stopRecording();
  else start('record');
});
byId('replay').addEventListener('click', () => start('replay'));
export function restartPlayer() {
  refresh();
  start('live');
  if (record?.frames.length) byId('replay').disabled = false;
}
byId('live').addEventListener('click', restartPlayer);
