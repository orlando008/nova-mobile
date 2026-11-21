import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPiano } from '../play/maestro/audio.mjs';

test('Maestro keeps its place when the device clock resets during playback', async t => {
  let now = 5000;
  t.mock.method(performance, 'now', () => now);
  class AudioContext {
    currentTime = 0;
    state = 'running';
    output = { contextTime: 0, performanceTime: 0 };
    createGain() { return { gain: {}, connect() {} }; }
    createBufferSource() { return { connect() {}, start() {}, stop() {} }; }
    getOutputTimestamp() { return this.output; }
  }
  const originalWindow = globalThis.window;
  globalThis.window = { AudioContext };
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });

  const piano = createPiano();
  await piano.unlock(.85);
  piano.start({}, 0, 2200);
  const context = piano.context;
  context.currentTime = 72.25;
  context.output = { contextTime: 72.2, performanceTime: now };
  const position = () => Math.round(piano.positionAt(now));
  assert.equal(position(), 70000);
  assert.equal(Math.round(piano.positionAt(now - 12)), 69988);

  now += 16;
  context.currentTime += .016;
  context.output = { contextTime: 0, performanceTime: now };
  assert.equal(position(), 70016);

  now += 16;
  context.currentTime += .016;
  context.output = { contextTime: context.currentTime - .5, performanceTime: now - 400 };
  assert.equal(position(), 70032);

  context.output = { contextTime: 200, performanceTime: now };
  assert.equal(position(), 70032);

  context.state = 'interrupted';
  context.output = { contextTime: 0, performanceTime: now };
  assert.equal(position(), 70032);

  context.state = 'closed';
  piano.stop();
  await piano.unlock(.85);
  assert.notEqual(piano.context, context);
  piano.start({}, 70032, 1200);
  assert.equal(position(), 68832);
});
