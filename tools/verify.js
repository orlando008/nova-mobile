import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateIndex, validateManifest, contentVersion, sha256 } from '../src/cart.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const absolute = file => resolve(root, file);
const read = (file, encoding) => readFile(absolute(file), encoding);
const json = async file => JSON.parse(await read(file, 'utf8'));
const flags = new Set(process.argv.slice(2));
const fix = flags.has('--fix');
const fast = flags.has('--fast');

const networkNames = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|eval|Function)\b|\bimport\s*\(/;
const rootLink = /(?:\b(?:src|href|content)\s*=\s*|\burl\(\s*)["']?\/(?!\/)/i;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function filesUnder(path) {
  const entries = await readdir(absolute(path), { withFileTypes: true });
  const contents = [];
  for (const entry of entries) {
    const child = path + '/' + entry.name;
    check(entry.isFile() || entry.isDirectory(), 'Unexpected file type at ' + child);
    contents.push(...(entry.isDirectory() ? await filesUnder(child) : [child]));
  }
  return contents.sort();
}

function checkPicture(bytes, width, height, file) {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  check(bytes.length >= 24 && bytes.subarray(0, 8).equals(png) &&
    bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(16) === width &&
    bytes.readUInt32BE(20) === height, file + ' must be a ' + width + ' × ' + height + ' PNG');
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function checkCart(entry) {
  const { name, path } = entry;
  const manifestPath = path + 'game.json';
  const game = validateManifest(await json(manifestPath), name, { verifyHashes: !fix });
  const code = await read(path + 'code.js');
  const art = await read(path + 'art.js').catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  for (const source of [code, art]) {
    if (source) check(!networkNames.test(source.toString()), name + ' uses a restricted network or evaluation name');
  }

  const actual = await filesUnder(path + 'assets');
  const listed = game.assets.map(asset => path + asset.path).sort();
  check(JSON.stringify(actual) === JSON.stringify(listed), name + ' asset files differ from the manifest');
  let total = code.length + (art?.length ?? 0);
  for (const asset of game.assets) {
    const file = path + asset.path;
    const bytes = await read(file);
    const hash = await sha256(bytes);
    total += bytes.length;
    if (fix) Object.assign(asset, { bytes: bytes.length, sha256: hash });
    else check(asset.bytes === bytes.length && asset.sha256 === hash, 'Integrity mismatch for ' + file);
    if (asset.path === game.poster) checkPicture(bytes, 1200, 630, file);
    if (asset.path === game.icon) checkPicture(bytes, 512, 512, file);
  }

  const version = await contentVersion(code, art, game.assets);
  if (fix) game.contentVersion = version;
  else check(game.contentVersion === version, name + ' contentVersion is stale');
  const play = await read('play/' + name + '/index.html', 'utf8');
  for (const required of [
    '<title>' + escapeHtml(game.title) + '</title>',
    'property="og:title" content="' + escapeHtml(game.title) + '"',
    'property="og:description" content="' + escapeHtml(game.description) + '"',
    'property="og:image" content="../../' + path + game.poster + '"',
  ]) check(play.includes(required), name + ' link page does not match its manifest');
  await read('docs/carts/' + name + '.md');
  if (code.length > 512 * 1024) console.warn(name + ' code exceeds 512 KB');
  if (total > 32 * 1024 * 1024) console.warn(name + ' exceeds 32 MB');
  if (fix) await writeFile(absolute(manifestPath), JSON.stringify(game, null, 2) + '\n');
  console.log('Verified ' + name);
}

try {
  for (const flag of flags) check(flag === '--fix' || flag === '--fast', 'Unknown option ' + flag);
  const index = validateIndex(await json('carts/index.json'));
  const folders = (await readdir(absolute('carts'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  const names = index.carts.map(entry => entry.name).sort();
  check(JSON.stringify(folders) === JSON.stringify(names), 'Cart index differs from cart folders');
  for (const entry of index.carts) await checkCart(entry);

  const paths = ['index.html', 'style.css', ...await filesUnder('about'), ...await filesUnder('play')];
  for (const path of paths.filter(path => /\.(?:html|css)$/.test(path))) {
    check(!rootLink.test(await read(path, 'utf8')), 'Root-relative link in ' + path);
  }
  if (!fast) {
    const result = spawnSync(process.execPath, ['--test', 'tests/*.test.mjs'], { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
