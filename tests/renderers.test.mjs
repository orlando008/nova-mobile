import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRuntime } from '../src/runtime.mjs';
import { createCanvasRenderer } from '../src/canvas/rects.mjs';
import { createRenderer } from '../src/webgl/rects.mjs';

const screen = { w: 64, h: 48, scale: 1, safe: {} };
const picture = { path: 'assets/example.webp', width: 16, height: 8 };
const bitmap = { width: picture.width, height: picture.height };
const makeRuntime = draw => createRuntime(api => ({ update() {}, draw: () => draw(api) }), screen, [], [picture]);

function layer({ rect, spr }) {
  rect(0, 0, 64, 48, [1, 0, 0]);
  rect(0, 0, 3, 3, [1, 0, 0]);
  spr(picture.path, 16, 8, { scale: 2, sy: 1, anchor: [0.5, 0.5], alpha: 0.5 });
  spr(picture.path, 20, 20);
  rect(4, 4, 2, 2, [0, 0, 1, 0.5]);
}

test('the runtime packs ordered rectangles and sprites with their placement and opacity', () => {
  const frame = makeRuntime(layer).draw(0);
  assert.deepEqual([...frame], [
    0, 0, 64, 48, 1, 0, 0, 1, 0, 0,
    0, 0, 3, 3, 1, 0, 0, 1, 0, 0,
    0, 4, 32, 8, 1, 1, 1, 0.5, 1, 0,
    20, 20, 16, 8, 1, 1, 1, 1, 1, 0,
    4, 4, 2, 2, 0, 0, 1, 0.5, 0, 0,
  ]);
  assert.throws(() => makeRuntime(({ spr }) => spr('assets/missing.png', 0, 0)).draw(0),
    /Picture is not loaded: assets\/missing.png/);
});

test('Canvas 2D draws the decoded image in order and restores opacity for solid rectangles', () => {
  const commands = [];
  const context = {
    globalAlpha: 1,
    setTransform() {},
    fillRect(x, y, w, h) { commands.push(['rect', this.globalAlpha, x, y, w, h]); },
    drawImage(image, x, y, w, h) { commands.push(['sprite', this.globalAlpha, image, x, y, w, h]); },
  };
  const renderer = createCanvasRenderer({ width: 64, height: 48, getContext: () => context }, [bitmap]);
  renderer.draw(makeRuntime(layer).draw(0), screen);
  assert.deepEqual(commands, [
    ['rect', 1, 0, 0, 64, 48],
    ['rect', 1, 0, 0, 64, 48],
    ['rect', 1, 0, 0, 3, 3],
    ['sprite', 0.5, bitmap, 0, 4, 32, 8],
    ['sprite', 1, bitmap, 20, 20, 16, 8],
    ['rect', 1, 4, 4, 2, 2],
  ]);
});

test('a rotated sprite turns around its chosen anchor in Canvas 2D', () => {
  const commands = [];
  const context = {
    setTransform() {},
    fillRect() {},
    save() { commands.push('save'); },
    translate(x, y) { commands.push([x, y]); },
    rotate(angle) { commands.push(angle); },
    drawImage(image, x, y, w, h) { commands.push([image, x, y, w, h]); },
    restore() { commands.push('restore'); },
  };
  const frame = makeRuntime(({ spr }) => spr(picture.path, 20, 16, { anchor: [.5, .5], rot: Math.PI / 2 })).draw(0);
  const renderer = createCanvasRenderer({ width: 64, height: 48, getContext: () => context }, [bitmap]);
  renderer.draw(frame, screen);
  assert.deepEqual(commands, ['save', [24, 8], Math.fround(Math.PI / 2), [bitmap, 0, 0, 16, 8], 'restore']);
});

test('WebGL uploads the picture once and batches only adjacent uses of the same texture', () => {
  let texture = 1;
  let boundTexture;
  let offset;
  let uploads = 0;
  const batches = [];
  const textures = [];
  const context = new Proxy({
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getParameter: () => 4096,
    createTexture: () => texture++,
    bindTexture(_target, id) { boundTexture = id; },
    texImage2D(...args) { textures.push(args.at(-1)); },
    bufferData() { uploads += 1; },
    vertexAttribPointer(attribute, _size, _type, _normalized, stride, byteOffset) {
      assert.equal(stride, 40);
      if (attribute === 0) offset = byteOffset;
      else assert.equal(byteOffset, offset + (attribute === 1 ? 16 : 36));
    },
    drawArraysInstanced(_mode, _first, _vertices, count) { batches.push([boundTexture, offset, count]); },
  }, { get: (target, key) => target[key] ?? (() => {}) });
  const renderer = createRenderer({ width: 64, height: 48, getContext: () => context }, [bitmap]);
  renderer.draw(makeRuntime(layer).draw(0), screen);
  assert.equal(uploads, 1);
  assert.deepEqual(textures, [new Uint8Array([255, 255, 255, 255]), bitmap]);
  assert.deepEqual(batches, [[1, 0, 2], [2, 80, 2], [1, 160, 1]]);
});
