import { createRuntime } from './runtime.mjs';

let session;
let createCart;
let assets;
let pictures;
let runtime;

function start(id, screen, options) {
  session = id;
  runtime = createRuntime(createCart, screen, assets, pictures, options);
  self.postMessage({ type: 'ready', session });
}

self.addEventListener('message', async ({ data }) => {
  try {
    if (data.type === 'load') {
      session = data.session;
      const url = URL.createObjectURL(new Blob([data.code], { type: 'text/javascript' }));
      try {
        for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'eval', 'Function']) {
          Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
        }
        ({ createCart } = await import(url));
      } finally {
        URL.revokeObjectURL(url);
      }
      if (typeof createCart !== 'function') throw new Error('Cart code must export createCart()');
      assets = data.assets;
      pictures = data.pictures;
      start(data.session, data.screen, data.options);
    } else if (data.type === 'restart') {
      start(data.session, data.screen, data.options);
    } else if (data.type === 'frame' && data.session === session) {
      const states = [];
      for (const frame of data.frames) {
        runtime.tick(frame);
        if (data.capture) states.push(JSON.stringify(runtime.state()));
      }
      const drawList = runtime.draw(data.alpha);
      self.postMessage({ type: 'frame', session, drawList, screen: runtime.screen(),
        state: runtime.state(), states }, [drawList.buffer]);
    }
  } catch (error) {
    self.postMessage({ type: 'error', session, message: error.message });
  }
});
