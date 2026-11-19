export const CONSOLE_VERSION = '0.1';
const namePattern = /^[a-z][a-z0-9-]{1,31}$/;
const hashPattern = /^[0-9a-f]{64}$/;
const assetPattern = /^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const shelves = ['Puzzle', 'Merge', 'Build', 'Cards', 'Arcade'];

function requireField(condition, field) {
  if (!condition) throw new Error('Invalid ' + field);
}

export function validateIndex(index) {
  requireField(index?.format === 1 && Array.isArray(index.carts), 'cart index');
  const names = new Set();
  for (const entry of index.carts) {
    requireField(typeof entry?.name === 'string' && namePattern.test(entry.name) &&
      entry.path === 'carts/' + entry.name + '/' && !names.has(entry.name), 'cart index entry');
    names.add(entry.name);
  }
  return index;
}

export function validateManifest(game, name, { verifyHashes = true } = {}) {
  requireField(game?.format === 1, 'manifest format');
  requireField(typeof name === 'string' && namePattern.test(name) && game.name === name, 'manifest name');
  requireField(typeof game.title === 'string' && game.title.trim() && game.title.length <= 40, 'manifest title');
  requireField(typeof game.version === 'string' && versionPattern.test(game.version), 'manifest version');
  const supported = CONSOLE_VERSION.split('.').map(Number);
  const needed = typeof game.console === 'string' && /^\d+\.\d+$/.test(game.console)
    ? game.console.split('.').map(Number) : [];
  requireField(needed[0] < supported[0] ||
    (needed[0] === supported[0] && needed[1] <= supported[1]), 'manifest console version');
  requireField(typeof game.description === 'string' && game.description.trim() && game.description.length <= 200,
    'manifest description');
  requireField(shelves.includes(game.shelf), 'manifest shelf');
  requireField(game.fixture === undefined || typeof game.fixture === 'boolean', 'manifest fixture flag');
  if (game.orientations !== undefined) {
    requireField(Array.isArray(game.orientations) && game.orientations[0] === 'portrait' &&
      (game.orientations.length === 1 ||
        (game.orientations.length === 2 && game.orientations[1] === 'landscape')), 'manifest orientations');
  }
  requireField(Array.isArray(game.assets), 'manifest asset list');
  const assets = new Set();
  for (const asset of game.assets) {
    requireField(typeof asset?.path === 'string' && assetPattern.test(asset.path) &&
      !assets.has(asset.path) && (asset.lazy === undefined || typeof asset.lazy === 'boolean'),
    'manifest asset entry');
    if (verifyHashes) {
      requireField(Number.isSafeInteger(asset.bytes) && asset.bytes >= 0, asset.path + ' byte count');
      requireField(typeof asset.sha256 === 'string' && hashPattern.test(asset.sha256), asset.path + ' SHA-256');
    }
    assets.add(asset.path);
  }
  requireField(assets.has(game.poster) && assets.has(game.icon), 'manifest poster or icon');
  if (verifyHashes) requireField(typeof game.contentVersion === 'string' && hashPattern.test(game.contentVersion),
    'manifest content version');
  return game;
}

export async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function contentVersion(code, art, assets) {
  const records = assets.map(({ path, bytes, sha256: hash, lazy }) => [path, bytes, hash, Boolean(lazy)]);
  records.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const data = [await sha256(code), art === null ? null : await sha256(art), records];
  return sha256(new TextEncoder().encode(JSON.stringify(data)));
}

async function get(base, path, optional = false) {
  const response = await fetch(new URL(path, base));
  if (optional && response.status === 404) return null;
  if (!response.ok) throw new Error('Could not load ' + path + ' (' + response.status + ')');
  return response;
}

export async function loadIndex(base) {
  return validateIndex(await (await get(base, 'carts/index.json')).json());
}

export async function loadManifest(base, entry) {
  return validateManifest(await (await get(base, entry.path + 'game.json')).json(), entry.name);
}

export async function loadCart(name, base) {
  const index = await loadIndex(base);
  const entry = index.carts.find(cart => cart.name === name);
  if (!entry) throw new Error('This cart is missing from the index');
  const manifest = await loadManifest(base, entry);
  const [code, art, ...assets] = await Promise.all([
    get(base, entry.path + 'code.js').then(response => response.arrayBuffer()),
    get(base, entry.path + 'art.js', true).then(response => response?.arrayBuffer() ?? null),
    ...manifest.assets.filter(asset => !asset.lazy).map(async asset => {
      const bytes = await (await get(base, entry.path + asset.path)).arrayBuffer();
      if (bytes.byteLength !== asset.bytes || await sha256(bytes) !== asset.sha256) {
        throw new Error('Integrity check failed for ' + asset.path);
      }
      return { path: asset.path, bytes };
    }),
  ]);
  if (await contentVersion(code, art, manifest.assets) !== manifest.contentVersion) {
    throw new Error('Cart content version did not match ' + name);
  }
  return { manifest, code, assets };
}
