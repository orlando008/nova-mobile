import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentVersion, loadCart, sha256 } from '../src/cart.mjs';

const base = new URL('https://example.com/pr/12/');
const name = 'demo';
const cartPath = 'carts/demo/';
const code = new TextEncoder().encode('export function createCart() {}');
const picture = new Uint8Array([1, 2, 3]);

function stubAssets(mock, manifest, assets) {
  const requests = [];
  mock.method(globalThis, 'fetch', (url, options) => {
    const path = url.pathname.slice(base.pathname.length);
    requests.push({ path, version: url.searchParams.get('version'), cache: options.cache });
    if (path === 'carts/index.json') return Response.json({ format: 1, carts: [{ name, path: cartPath }] });
    if (path === cartPath + 'game.json') return Response.json(manifest);
    if (path === cartPath + 'code.js') return new Response(code);
    if (assets[path]) return new Response(assets[path]);
    return new Response(null, { status: 404 });
  });
  return requests;
}

test('the cart loader revalidates discovery files and fetches a version-matched set of bytes', async ({ mock }) => {
  const hash = await sha256(picture);
  const assets = ['sprite', 'poster', 'icon'].map(file => ({
    path: 'assets/' + file + '.png', bytes: picture.length, sha256: hash, ...(file === 'sprite' ? {} : { lazy: true }),
  }));
  const version = await contentVersion(code, null, assets);
  const manifest = { format: 1, name, title: 'Demo', version: '1.0.0', console: '0.1', description: 'A cart',
    shelf: 'Puzzle', poster: assets[1].path, icon: assets[2].path, assets, contentVersion: version };
  const runs = stubAssets(mock, manifest, { [cartPath + assets[0].path]: picture });
  const loaded = await loadCart(name, base);
  assert.equal(loaded.manifest.contentVersion, version);
  assert.deepEqual(runs, [
    { path: 'carts/index.json', version: null, cache: 'no-cache' },
    { path: cartPath + 'game.json', version: null, cache: 'no-cache' },
    { path: cartPath + 'code.js', version, cache: 'default' },
    { path: cartPath + 'art.js', version, cache: 'default' },
    { path: cartPath + assets[0].path, version, cache: 'default' },
  ]);
});
