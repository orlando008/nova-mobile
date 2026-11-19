import { loadIndex, loadManifest } from './cart.mjs';

const base = new URL('../', import.meta.url);
const catalog = document.getElementById('catalog-shelves');
const state = document.getElementById('catalog-state');

function message(title, detail) {
  document.getElementById('catalog-status').textContent = title;
  document.getElementById('catalog-detail').textContent = detail;
}

function addCard(list, entry, game) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.className = 'cart-card';
  link.href = new URL('play/' + entry.name + '/', base);
  const art = document.createElement('img');
  art.src = new URL(entry.path + game.poster, base);
  art.alt = '';
  art.width = 1200;
  art.height = 630;
  art.loading = 'lazy';
  const copy = document.createElement('div');
  const title = document.createElement('h4');
  title.textContent = game.title;
  const description = document.createElement('p');
  description.textContent = game.description;
  copy.append(title, description);
  link.append(art, copy);
  item.append(link);
  list.append(item);
}

async function showCatalog() {
  try {
    const { carts } = await loadIndex(base);
    const games = await Promise.all(carts.map(async entry => [entry, await loadManifest(base, entry)]));
    const shelves = new Map();
    for (const [entry, game] of games) {
      if (game.fixture) continue;
      if (!shelves.has(game.shelf)) {
        const section = document.createElement('section');
        section.className = 'catalog-shelf';
        const heading = document.createElement('h3');
        heading.textContent = game.shelf;
        const list = document.createElement('ul');
        list.className = 'cart-list';
        section.append(heading, list);
        catalog.append(section);
        shelves.set(game.shelf, list);
      }
      addCard(shelves.get(game.shelf), entry, game);
    }
    if (!shelves.size) {
      message('No games published yet', 'New games will appear here as they’re published.');
      return;
    }
    state.hidden = true;
    catalog.hidden = false;
  } catch {
    message('Could not load the Library', 'Refresh the page to try again.');
  }
}

showCatalog();
