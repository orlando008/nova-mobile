import { loadCart } from './cart.mjs';
import { bindPointers, measureScreen } from './input/pointers.mjs';
import { createClock } from './runtime.mjs';
import { createRenderer } from './webgl/rects.mjs';
import { createCanvasRenderer } from './canvas/rects.mjs';

const byId = id => document.getElementById(id);
const { cart } = document.body.dataset;
const canvas = byId('surface');
const safeArea = byId('safe-area');
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

function message(text) {
  byId('feedback').textContent = text;
}

function setText(id, text) {
  const element = byId(id);
  if (element.textContent !== text) element.textContent = text;
}

function describe(view, state) {
  setText('screen', Math.round(view.w) + ' × ' + Math.round(view.h) + ' points · ' +
    view.scale.toFixed(2) + ' pts/CSS px · ' + view.dpr + '× DPR · ' + renderer.name);
  setText('insets', 'Safe area (top/right/bottom/left) ' +
    Object.values(view.safe).map(value => Math.round(value)).join(' / '));
  if (state) setText('gesture', state.event +
    (state.event === 'Ready' ? '' : ' · ' + Math.round(state.x) + ', ' + Math.round(state.y) + ' pts'));
  if (state?.buttonClicks !== undefined) {
    setText('interaction', 'Button clicks ' + state.buttonClicks + ' · Valid drops ' + state.drops);
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
  if (next === 'record') record = { screen, frames: [], states: [] };
  byId('record').textContent = next === 'record' ? 'Stop' : 'Record';
  byId('replay').disabled = true;
  byId('live').disabled = next === 'live';
  message({ live: 'Live input', record: 'Recording…', replay: 'Replaying…' }[next]);
  if (loaded) {
    worker.postMessage({ type: 'load', session, screen: initial, code: loaded.code, assets: loaded.assets },
      [loaded.code, ...loaded.assets.map(asset => asset.bytes)]);
  } else {
    worker.postMessage({ type: 'restart', session, screen: initial });
  }
}

function stopRecording() {
  mode = 'live';
  byId('record').textContent = 'Record';
  byId('live').disabled = true;
  byId('replay').disabled = !record.frames.length;
  message('Recorded ' + record.frames.length + ' ticks');
}

function onMessage({ data }) {
  if (data.session !== session) return;
  if (data.type === 'ready') {
    ready = true;
    byId('record').disabled = false;
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
}

function liveFrame() {
  // Drain transitions in order. Resizing clears samples collected in the previous coordinate system.
  const transition = lifecycle.shift();
  const sampled = transition ? { touches: [] } : pointers.sample();
  return { ...sampled, ...transition, now: Date.now() };
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  if (!ready || pending || mode === 'finished' || document.hidden) return;
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
  message('Loading the diagnostic cart…');
  try {
    const loaded = await loadCart(cart, new URL('../', import.meta.url));
    if (!loaded.manifest.fixture) throw new Error('Expected a diagnostic fixture');
    byId('intro').hidden = true;
    byId('controls').hidden = false;
    byId('board').hidden = false;
    renderer = createRenderer(canvas) ?? createCanvasRenderer(canvas);
    screen = measureScreen(canvas, safeArea);
    pointers = bindPointers(canvas, () => screen);
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
    fail(error);
  }
});

byId('record').addEventListener('click', () => {
  if (mode === 'record') stopRecording();
  else start('record');
});
byId('replay').addEventListener('click', () => start('replay'));
byId('live').addEventListener('click', () => {
  start('live');
  if (record?.frames.length) byId('replay').disabled = false;
});
