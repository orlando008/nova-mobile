import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRound, mapFrame, MODES, panFrame, ROUND_LENGTH, worldOffset, zoomFrame } from '../carts/global-citizen/code.js';
import { COUNTRIES } from '../carts/global-citizen/assets/countries.mjs';
import { createMap } from '../play/global-citizen/map.mjs';

test('all three quizzes produce deterministic ten-question rounds for every region', () => {
  const regions = new Set(COUNTRIES.map(country => country.region));
  assert.equal(regions.size, 6);
  for (const region of ['World', ...regions]) {
    for (const mode of Object.keys(MODES)) {
      for (const seed of [0, 42, 319, 0xffffffff]) {
        const settings = { mode, region, seed };
        const questions = createRound(COUNTRIES, settings);
        assert.deepEqual(questions, createRound(COUNTRIES, settings));
        assert.equal(questions.length, ROUND_LENGTH);
        assert.equal(new Set(questions.map(question => question.country.id)).size, ROUND_LENGTH);
        for (const { country, prompt, answer, options } of questions) {
          if (region !== 'World') assert.equal(country.region, region);
          if (mode === 'countries') {
            assert.equal(prompt, `Tap ${country.name}`);
            continue;
          }
          assert.equal(answer, mode === 'flags' ? country.name : country.capital);
          assert.equal(new Set(options).size, 3);
          assert.ok(options.includes(answer));
        }
      }
    }
  }
  assert.notDeepEqual(
    createRound(COUNTRIES, { mode: 'countries', region: 'World', seed: 1 }),
    createRound(COUNTRIES, { mode: 'countries', region: 'World', seed: 2 }),
  );
});

test('every quiz country has a uniquely indexed flag and a reachable map feature', () => {
  const outlines = JSON.parse(readFileSync(new URL('../carts/global-citizen/assets/map.json', import.meta.url), 'utf8'));
  const mapped = new Set(outlines.map(([id]) => id));
  assert.equal(mapped.size, outlines.length);
  assert.equal(COUNTRIES.length, 195);
  assert.equal(new Set(COUNTRIES.map(country => country.id)).size, 195);
  for (const [index, country] of COUNTRIES.entries()) {
    assert.equal(country.flag, index);
    assert.ok(mapped.has(country.id));
    assert.ok(country.capital);
    const frame = mapFrame(country.center);
    const [x, y] = country.center;
    const wrappedX = x + worldOffset(x, frame);
    assert.ok(wrappedX >= frame.x && wrappedX <= frame.x + frame.width, country.name);
    assert.ok(y >= frame.y && y <= frame.y + frame.height, country.name);
  }
});

test('the map wraps at the antimeridian and clamps at the poles and zoom limits', () => {
  const frame = mapFrame([359, 70]);
  assert.equal(worldOffset(4, frame), 360);
  assert.equal(worldOffset(359, panFrame(frame, 30, -300)), -360);
  assert.equal(panFrame(frame, 30, -300).y, 0);
  assert.equal(panFrame(frame, -30, 300).y, 180 - frame.height);
  assert.equal(zoomFrame(frame, .0001).width, 6);
  assert.equal(zoomFrame(frame, 100).width, 180);
  assert.equal(zoomFrame(frame, 100).height, 144);
});

test('pinch zoom keeps the map point under the moving midpoint', () => {
  const frame = { x: 100, y: 30, width: 90, height: 72 };
  const from = { x: .25, y: .75 };
  const to = { x: .5, y: .5 };
  const zoomed = zoomFrame(frame, .5, from, to);
  assert.deepEqual(zoomed, { x: 100, y: 66, width: 45, height: 36 });
  assert.equal(frame.x + from.x * frame.width, zoomed.x + to.x * zoomed.width);
  assert.equal(frame.y + from.y * frame.height, zoomed.y + to.y * zoomed.height);
});

test('pinching supports either release order without grading an answer', () => {
  const svg = new EventTarget();
  const attributes = new Map();
  const answers = [];
  const captured = new Set();
  const callbacks = [];
  const map = Object.assign(svg, {
    clientWidth: 300,
    getBoundingClientRect: () => ({ left: 20, top: 40, width: 300, height: 240 }),
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: key => attributes.delete(key),
    querySelectorAll: () => [],
    setPointerCapture: id => captured.add(id),
  });
  const controls = { in: new EventTarget(), out: new EventTarget(), reset: new EventTarget() };
  const country = { id: 'AAA', center: [150, 60] };
  const originalObserver = globalThis.ResizeObserver;
  const originalRequest = globalThis.requestAnimationFrame;
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.requestAnimationFrame = callback => callbacks.push(callback);

  function emit(type, properties) {
    svg.dispatchEvent(Object.assign(new Event(type), properties));
  }

  function pointer(type, pointerId, clientX, clientY) {
    emit(type, { pointerId, clientX, clientY, button: 0 });
  }

  function select() {
    const event = new Event('click');
    Object.defineProperty(event, 'target', { value: { dataset: { country: 'AAA', name: 'Example' } } });
    svg.dispatchEvent(event);
  }

  try {
    const view = createMap(map, controls, [country], id => answers.push(id));
    for (const [first, second] of [[1, 2], [2, 1]]) {
      view.start(country);
      pointer('pointerdown', 1, 110, 160);
      pointer('pointerdown', 2, 230, 160);
      assert.deepEqual([...captured], [1, 2]);
      pointer('pointermove', 1, 50, 160);
      pointer('pointermove', 2, 290, 160);
      assert.equal(callbacks.length, 1);
      callbacks.shift()();
      assert.equal(Number(attributes.get('viewBox').split(' ')[2]), 45);
      pointer('pointerup', first, 0, 0);
      select();
      pointer('pointerup', second, 0, 0);
      select();
      assert.deepEqual(answers, []);
    }

    pointer('pointerdown', 3, 110, 160);
    pointer('pointerup', 3, 110, 160);
    select();
    assert.deepEqual(answers, ['AAA']);
  } finally {
    globalThis.ResizeObserver = originalObserver;
    globalThis.requestAnimationFrame = originalRequest;
  }
});
