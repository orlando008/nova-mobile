import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGestureInput } from '../src/input/gestures.mjs';

const sample = (phase, x = 0, y = 0, id = 1) => ({ id, phase, x, y });
const tick = (input, ...touches) => input.step({ scale: 2, touches });
const idle = (input, count) => {
  for (let i = 0; i < count; i += 1) tick(input);
};
const types = events => events.map(event => event.type);

test('tap timing includes 18 ticks and excludes a release at 19', () => {
  const input = createGestureInput();
  tick(input, sample('down'));
  idle(input, 17);
  assert.deepEqual(tick(input, sample('up', 19.99)), [
    { type: 'tap', id: 1, position: { x: 19.99, y: 0 } },
  ]);
  tick(input, sample('down'));
  idle(input, 18);
  assert.deepEqual(tick(input, sample('up')), []);
});

test('double taps use points scaled from the CSS distance and release-to-release timing', () => {
  function twoTaps(dx, gap) {
    const input = createGestureInput();
    tick(input, sample('down'), sample('up'));
    idle(input, gap - 1);
    return types(tick(input, sample('down', dx, 0, 2), sample('up', dx, 0, 2)));
  }
  assert.deepEqual(twoTaps(48, 18), ['tap', 'doubletap']);
  assert.deepEqual(twoTaps(48.01, 18), ['tap']);
  assert.deepEqual(twoTaps(48, 19), ['tap']);
});

test('press fires once at tick 27, including a release on that tick', () => {
  const input = createGestureInput();
  tick(input, sample('down', 4, 8));
  idle(input, 26);
  assert.deepEqual(input.gesture(), []);
  assert.deepEqual(tick(input), [{ type: 'press', id: 1, position: { x: 4, y: 8 } }]);
  assert.deepEqual(tick(input, sample('move', 40, 8)), []);
  assert.deepEqual(tick(input, sample('up', 40, 8)), []);

  tick(input, sample('down'));
  idle(input, 26);
  assert.deepEqual(types(tick(input, sample('up'))), ['press']);
});

test('drag crosses the same CSS threshold at different screen scales', () => {
  for (const scale of [1, 720 / 375, 2]) {
    const input = createGestureInput();
    input.step({ scale, touches: [sample('down')] });
    assert.deepEqual(input.step({ scale, touches: [sample('move', 9.99 * scale)] }), []);
    assert.deepEqual(input.step({ scale, touches: [sample('move', 10 * scale)] }), [
      { type: 'drag', id: 1, start: { x: 0, y: 0 }, current: { x: 10 * scale, y: 0 }, delta: { x: 10 * scale, y: 0 } },
    ]);
    assert.deepEqual(types(input.step({ scale, touches: [sample('up', 10 * scale)] })), ['drop']);
  }
});

test('drop uses the release position and swipe requires strictly over 500 CSS px/sec', () => {
  function drag(dx, dy, directions = 4) {
    const input = createGestureInput({ directions });
    tick(input, sample('down'));
    tick(input, sample('move', 20));
    idle(input, 4);
    return tick(input, sample('up', dx, dy));
  }
  assert.deepEqual(types(drag(100, 0)), ['drag', 'drop']);
  const events = drag(101, 0);
  assert.deepEqual(types(events), ['drag', 'drop', 'swipe']);
  assert.deepEqual(events[1].current, { x: 101, y: 0 });
  assert.equal(events[2].direction, 'right');
  assert.equal(events[2].speed, 1010);
  assert.equal(drag(100, -101, 8).at(-1).direction, 'up-right');
  assert.equal(drag(100, -101).at(-1).direction, 'up');
});

test('a release sample can cross the drag threshold by itself', () => {
  const input = createGestureInput();
  tick(input, sample('down'));
  idle(input, 8);
  assert.deepEqual(types(tick(input, sample('up', 20))), ['drag', 'drop']);
});

test('a pinch cancels a drag and reports incremental scale, angle, and center', () => {
  const input = createGestureInput();
  tick(input, sample('down'));
  tick(input, sample('move', 20));
  assert.deepEqual(types(tick(input, sample('down', 40, 0, 2))), ['cancel']);
  assert.deepEqual(tick(input, sample('move', 20, 40, 2)), [
    { type: 'pinch', center: { x: 20, y: 20 }, scale: 2, rotation: Math.PI / 2 },
  ]);
  assert.deepEqual(tick(input, sample('move', 30, 0), sample('move', 30, 40, 2)), [
    { type: 'pinch', center: { x: 30, y: 20 }, scale: 1, rotation: 0 },
  ]);
  assert.deepEqual(tick(input), []);
  assert.deepEqual(tick(input, sample('up', 30, 40, 2), sample('up', 30)), []);
});

test('changing a pinch pair starts a fresh baseline, including coincident pointers', () => {
  const input = createGestureInput();
  tick(input, sample('down'), sample('down', 20, 0, 2), sample('down', 20, 0, 3));
  assert.deepEqual(tick(input, sample('up')), []);
  assert.deepEqual(tick(input, sample('move', 40, 0, 3)), [
    { type: 'pinch', center: { x: 30, y: 0 }, scale: 1, rotation: 0 },
  ]);
  assert.deepEqual(tick(input, sample('move', 60, 0, 3)), [
    { type: 'pinch', center: { x: 40, y: 0 }, scale: 2, rotation: 0 },
  ]);
});

test('pointer cancellation, resize and reset discard active single-pointer gestures', () => {
  const input = createGestureInput();
  tick(input, sample('down'), sample('move', 20));
  assert.deepEqual(types(tick(input, sample('cancel'))), ['cancel']);
  assert.deepEqual(tick(input, sample('up', 20)), []);

  tick(input, sample('down'), sample('move', 20));
  assert.deepEqual(types(input.step({ scale: 1, touches: [sample('up', 10)] })), ['cancel']);

  tick(input, sample('down'), sample('up'));
  input.reset();
  assert.deepEqual(input.gesture(), []);
  assert.deepEqual(types(tick(input, sample('down'), sample('up'))), ['tap']);
});

test('wheel zoom reports a pinch with the recorded center and scale multiplier', () => {
  const input = createGestureInput();
  assert.deepEqual(input.step({ scale: 2, wheel: { x: 30, y: 18, scale: 1.25 } }), [
    { type: 'pinch', center: { x: 30, y: 18 }, scale: 1.25, rotation: 0 },
  ]);
  assert.deepEqual(input.step({ scale: 2, wheel: { x: 30, y: 18, scale: 1 } }), []);
});

test('a recorded tick stream produces the same cart state after every tick', () => {
  const frames = [
    { scale: 2, touches: [sample('down'), sample('up')] },
    { scale: 2, touches: [sample('down', 2), sample('up', 2)] },
    { scale: 2, touches: [sample('down'), sample('move', 20)] },
    { scale: 2, touches: [sample('up', 45)] },
    { scale: 2, touches: [sample('down'), sample('down', 20, 0, 2)] },
    { scale: 2, touches: [sample('move', 20, 20, 2)] },
    { scale: 2, touches: [sample('up'), sample('up', 20, 20, 2)] },
    { scale: 1, wheel: { x: 24, y: 40, scale: 1.125 } },
  ];
  const replay = recording => {
    const input = createGestureInput();
    let state = { x: 0, zoom: 1, presses: 0 };
    return recording.map(frame => {
      const events = input.step(frame);
      assert.strictEqual(events, input.gesture());
      assert.ok(Object.isFrozen(events));
      for (const event of events) {
        if (event.type === 'tap') state = { ...state, presses: state.presses + 1 };
        if (event.type === 'drop') state = { ...state, x: state.x + event.delta.x };
        if (event.type === 'pinch') state = { ...state, zoom: state.zoom * event.scale };
      }
      return { events, state };
    });
  };
  const live = replay(frames);
  assert.deepEqual(replay(JSON.parse(JSON.stringify(frames))), live);
  assert.equal(live.at(-1).state.x, 45);
  assert.equal(live.at(-1).state.presses, 2);
  assert.ok(live.at(-1).state.zoom > 1.5);
});
