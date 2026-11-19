import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createClock, createRuntime, TICK_MS } from '../src/runtime.mjs';
import { createCart } from '../carts/diag/code.js';
import { validateIndex, validateManifest } from '../src/cart.mjs';
import { DRAW_STRIDE } from '../src/draw-list.mjs';

const screen = { w: 720, h: 1000, scale: 2, dpr: 2, safe: { top: 0, right: 0, bottom: 0, left: 0 } };
const pictures = [{ path: 'assets/crate.png', width: 160, height: 160 }];
const input = (phase, x, y) => ({ id: 1, phase, x, y });
const digest = state => createHash('sha256').update(JSON.stringify(state)).digest('hex');

test('fixed clock caps backlog and preserves the fractional display interval', () => {
  const clock = createClock();
  assert.deepEqual(clock.frame(100), { count: 0, alpha: 0 });
  assert.equal(clock.frame(100 + TICK_MS * 0.5).count, 0);
  assert.equal(clock.frame(100 + TICK_MS).count, 1);
  const stalled = clock.frame(100 + TICK_MS * 20.25);
  assert.equal(stalled.count, 4);
  assert.ok(Math.abs(stalled.alpha - 0.25) < 1e-8);
  assert.equal(clock.frame(100 + TICK_MS * 20.5).count, 0);
  clock.reset();
  assert.deepEqual(clock.frame(5000), { count: 0, alpha: 0 });
});

test('the diagnostic cart reproduces the same state hashes on every recorded tick', () => {
  const frames = [
    { touches: [input('down', 60, 58), input('up', 60, 58)], now: 1000 },
    { touches: [input('down', 80, 60)], now: 1017 },
    { touches: [input('move', 108, 64)], now: 1034 },
    { touches: [input('up', 152, 64)], now: 1050 },
    { touches: [], wheel: { x: 25, y: 64, scale: 1.2 }, now: 1066 },
    { touches: [], lifecycle: 'resize', screen: { ...screen, h: 830, scale: 1.8 }, now: 1083 },
    { touches: [input('down', 30, 50), input('up', 30, 50)], now: 1100 },
    { touches: [], lifecycle: 'pause', now: 1117 },
  ];
  const play = (recording, draws) => {
    const runtime = createRuntime(createCart, screen, [], pictures);
    const hashes = recording.map(frame => {
      runtime.tick(frame);
      const state = digest(runtime.state());
      for (let i = 0; i < draws; i += 1) assert.equal(runtime.draw(i / draws).length % DRAW_STRIDE, 0);
      assert.equal(digest(runtime.state()), state);
      return state;
    });
    return { hashes, state: runtime.state() };
  };
  const live = play(frames, 1);
  assert.deepEqual(play(JSON.parse(JSON.stringify(frames)), 0), live);
  assert.deepEqual(play(JSON.parse(JSON.stringify(frames)), 3), live);
  assert.deepEqual(live.state, { event: 'Ready', x: 0, y: 0, count: 7,
    buttonStatus: null, buttonClicks: 0, drops: 0, position: 'home', drag: null });
});

test('button clicks, canceled presses and piece drops replay through a resize', () => {
  const resized = { ...screen, h: 860, scale: 1.8 };
  const frames = [
    { touches: [input('down', 258, 940), input('up', 258, 940)] },
    { touches: [input('down', 258, 940)] },
    { touches: [input('move', 258, 840), input('move', 258, 940), input('up', 258, 940)] },
    { touches: [input('down', 360, 940), input('move', 462, 940)] },
    { touches: [input('up', 462, 940)] },
    { touches: [input('down', 462, 940), input('up', 550, 840)] },
    { touches: [input('down', 462, 940), input('move', 360, 940)] },
    { touches: [], lifecycle: 'resize', screen: resized },
    { touches: [input('up', 360, 800)] },
    { touches: [input('down', 462, 800), input('up', 360, 800)] },
    { touches: [input('down', 360, 800), input('move', 385, 800), input('up', 360, 800)] },
  ].map((frame, index) => ({ ...frame, now: index * TICK_MS }));

  function run(recording) {
    const runtime = createRuntime(createCart, screen);
    return recording.map(frame => {
      runtime.tick(frame);
      return runtime.state();
    });
  }

  const states = run(frames);
  assert.equal(states[0].buttonClicks, 1);
  assert.equal(states[0].count, 0);
  assert.equal(states[1].buttonStatus, 'pressed');
  assert.equal(states[2].buttonStatus, null);
  assert.equal(states[2].buttonClicks, 1);
  assert.equal(states[2].count, 0);
  assert.ok(states[3].drag);
  assert.equal(states[4].position, 'slot');
  assert.equal(states[4].drops, 1);
  assert.equal(states[5].position, 'slot');
  assert.equal(states[5].drops, 1);
  assert.ok(states[6].drag);
  assert.equal(states[7].drag, null);
  assert.equal(states[8].position, 'slot');
  assert.equal(states[8].drops, 1);
  assert.equal(states[9].position, 'home');
  assert.equal(states[9].drops, 2);
  assert.equal(states[10].position, 'home');
  assert.equal(states[10].drops, 2);
  assert.deepEqual(run(JSON.parse(JSON.stringify(frames))).map(digest), states.map(digest));
});

test('the runtime clears button capture on pause and resize even at the same coordinates', () => {
  const history = [];
  const runtime = createRuntime(api => ({
    update: () => history.push(api.button('test', { x: 10, y: 10, w: 88, h: 88 })),
    draw() {},
  }), screen);
  for (const lifecycle of ['pause', 'resize']) {
    runtime.tick({ touches: [input('down', 20, 20)], now: 100 });
    runtime.tick({ lifecycle, screen, touches: [], now: 117 });
    runtime.tick({ touches: [input('up', 20, 20)], now: 134 });
  }
  assert.deepEqual(history, ['pressed', null, null, 'pressed', null, null]);
});

test('resize and pause clear pending gestures and expose recorded inputs and the clock', () => {
  const received = [];
  const runtime = createRuntime(api => ({
    resize: (w, h) => received.push(['resize', w, h]),
    pause: () => received.push(['pause']),
    update: () => received.push([api.now(), api.screen().scale, api.gesture().map(event => event.type)]),
    draw() {},
  }), screen);
  runtime.tick({ now: 10, touches: [input('down', 30, 50), input('move', 55, 50)] });
  runtime.tick({ now: 30, touches: [], lifecycle: 'resize', screen: { ...screen, h: 800, scale: 1.5 } });
  runtime.tick({ now: 70, touches: [input('up', 55, 50)] });
  runtime.tick({ now: 80, touches: [], lifecycle: 'pause' });
  assert.deepEqual(received, [[10, 2, ['drag']], ['resize', 720, 800], [30, 1.5, []],
    [70, 1.5, []], ['pause'], [80, 1.5, []]]);
});

test('the index rejects alternate locations and duplicate cart identities', () => {
  const entry = { name: 'diag', path: 'carts/diag/' };
  assert.throws(() => validateIndex({ format: 1, carts: [{ ...entry, path: '../other/' }] }), /Invalid cart index entry/);
  assert.throws(() => validateIndex({ format: 1, carts: [entry, entry] }), /Invalid cart index entry/);
  assert.throws(() => validateManifest({ format: 1, name: 'another' }, 'diag'), /Invalid manifest name/);
});
