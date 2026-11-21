import { CONTROLS, HEIGHT, SECTORS, TOWERS, WIDTH, WAVE_COUNT } from '../../carts/space-swarm-defender/code.js';
import { chooseCartOptions, pausePlayer, restartPlayer } from '../../src/player.mjs';
import { createAudio } from './audio.mjs';
import { PLANETS, STARS_PER_ZONE, STAR_THRESHOLDS, loadRatings, planetCapacity, planetStars, planetUnlocked,
  recordWin, starsForWin, zoneUnlocked } from './campaign.mjs';

const byId = id => document.getElementById(id);
const pause = byId('pause-menu');
const result = byId('result');
const sound = byId('sound');
const audio = createAudio();
const storageKey = 'space-swarm-defender:' + new URL('../../', import.meta.url).pathname;
const assets = new URL('../../carts/space-swarm-defender/assets/', import.meta.url);
const feedback = byId('feedback');
const zonePositions = [[22, 77], [51, 50], [76, 21]];
const zoneIcons = ['core', 'nova', 'cryo'];
let save;

try {
  save = JSON.parse(localStorage.getItem(storageKey));
} catch {
  // A blocked or damaged save still allows play.
}
sound.checked = save?.sound !== false;
const ratings = loadRatings(save);
let planet = PLANETS.findLastIndex((_, index) => planetUnlocked(index, ratings));
let sector = PLANETS[planet].zones[0];
let loaded = false;
let session = -1;
let cueId = 0;
let resultShown = false;

function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ stars: ratings, sound: sound.checked }));
  } catch {
    // Progress remains available during this session.
  }
}

function starTotal(index) {
  return planetStars(index, ratings) + ' / ' + planetCapacity(index) + ' stars';
}

function drawStars(container, count) {
  container.setAttribute('role', 'img');
  container.setAttribute('aria-label', count + ' of ' + STARS_PER_ZONE + ' stars');
  container.replaceChildren(...Array.from({ length: STARS_PER_ZONE }, (_, index) => {
    const star = document.createElement('span');
    star.className = index < count ? 'star-earned' : 'star-open';
    star.textContent = index < count ? '★' : '☆';
    star.setAttribute('aria-hidden', 'true');
    return star;
  }));
}

function lockIcon() {
  const lock = document.createElement('span');
  lock.className = 'padlock';
  lock.setAttribute('aria-hidden', 'true');
  return lock;
}

function drawRoute(container, positions, ratio, isOpen) {
  for (let index = 1; index < positions.length; index++) {
    const [x, y] = positions[index - 1];
    const [endX, endY] = positions[index];
    const dx = endX - x;
    const dy = (endY - y) * ratio;
    const segment = document.createElement('span');
    segment.className = isOpen(index) ? 'flight-path open' : 'flight-path';
    segment.style.left = x + '%';
    segment.style.top = y + '%';
    segment.style.width = Math.hypot(dx, dy) + '%';
    segment.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
    segment.setAttribute('aria-hidden', 'true');
    container.append(segment);
  }
}

function mapNode(grid, group, title, position, locked, selected, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = group + '-node' + (locked ? ' locked' : '');
  button.setAttribute('aria-label', title + (locked ? ', locked' : ''));
  button.setAttribute('aria-pressed', String(selected));
  button.style.left = position[0] + '%';
  button.style.top = position[1] + '%';
  button.addEventListener('click', () => {
    for (const choice of grid.querySelectorAll('button')) choice.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    onClick();
  });
  grid.append(button);
  return button;
}

function showPlanetSummary() {
  const world = PLANETS[planet];
  const open = planetUnlocked(planet, ratings);
  const next = PLANETS[planet + 1];
  byId('planet-label').textContent = world.name;
  byId('planet-stars').textContent = starTotal(planet);
  const notice = byId('planet-notice');
  if (!open) notice.textContent = 'Earn all ' + planetCapacity(planet - 1) + ' stars on ' + PLANETS[planet - 1].name + ' to unlock.';
  else if (next && !planetUnlocked(planet + 1, ratings)) {
    notice.textContent = next.name + ' unlocks when every zone here has three stars.';
  } else if (planetStars(planet, ratings) === planetCapacity(planet)) notice.textContent = 'Planet mastered.';
  else notice.textContent = '';
  notice.hidden = !notice.textContent;
  byId('view-planet').disabled = !open;
}

function showConstellation(focus = true) {
  byId('constellation').hidden = false;
  byId('planet-map').hidden = true;
  const grid = byId('galaxy');
  grid.replaceChildren();
  drawRoute(grid, PLANETS.map(world => world.position), 1.5, index => planetUnlocked(index, ratings));
  PLANETS.forEach((world, index) => {
    const locked = !planetUnlocked(index, ratings);
    const node = mapNode(grid, 'planet', world.name, world.position, locked, planet === index, () => {
      planet = index;
      showPlanetSummary();
    });
    node.style.width = world.diameter + '%';
    const label = document.createElement('span');
    label.className = 'planet-name';
    if (locked) label.append(lockIcon());
    label.append(world.name);
    node.append(label);
  });
  showPlanetSummary();
  if (focus) byId('constellation-title').focus();
}

function showZoneSummary() {
  const open = zoneUnlocked(planet, sector, ratings);
  const zone = SECTORS[sector];
  const zones = PLANETS[planet].zones;
  const index = zones.indexOf(sector);
  byId('zone-label').textContent = zone.name;
  drawStars(byId('zone-stars'), ratings[sector]);
  byId('zone-description').textContent = open ? zone.description : 'Clear ' + SECTORS[zones[index - 1]].name + ' to unlock.';
  byId('rating-guide').hidden = !open;
  byId('play').hidden = loaded;
  byId('redeploy').hidden = !loaded;
  byId('play').disabled = !open;
  byId('redeploy').disabled = !open;
}

function showPlanet(preferred) {
  if (!planetUnlocked(planet, ratings)) return;
  const world = PLANETS[planet];
  const { zones } = world;
  sector = zoneUnlocked(planet, preferred, ratings) ? preferred
    : zones.find(zone => !ratings[zone] && zoneUnlocked(planet, zone, ratings)) ??
      zones.find(zone => ratings[zone] < STARS_PER_ZONE) ?? zones[0];
  byId('planet-title').textContent = world.name;
  byId('zone-progress').textContent = starTotal(planet);
  byId('constellation').hidden = true;
  byId('planet-map').hidden = false;
  const grid = byId('terrain');
  grid.style.backgroundImage = 'url(' + new URL('planet-' + world.id + '.webp', assets).href + ')';
  grid.replaceChildren();
  drawRoute(grid, zonePositions, 1, index => zoneUnlocked(planet, zones[index], ratings));
  zones.forEach((zone, index) => {
    const locked = !zoneUnlocked(planet, zone, ratings);
    const { name } = SECTORS[zone];
    const node = mapNode(grid, 'zone', name + ', ' + ratings[zone] + ' of ' + STARS_PER_ZONE + ' stars',
      zonePositions[index], locked, sector === zone, () => {
        sector = zone;
        showZoneSummary();
      });
    const icon = document.createElement('span');
    icon.className = 'zone-marker';
    if (locked) icon.append(lockIcon());
    else {
      const art = document.createElement('img');
      art.src = new URL(zoneIcons[index] + '.png', assets).href;
      art.alt = '';
      icon.append(art);
    }
    const label = document.createElement('span');
    label.className = 'zone-name';
    label.textContent = name;
    const stars = document.createElement('span');
    stars.className = 'stars';
    drawStars(stars, ratings[zone]);
    label.append(stars);
    node.append(icon, label);
  });
  showZoneSummary();
  byId('planet-title').focus();
}

function restart() {
  if (!zoneUnlocked(planet, sector, ratings)) return;
  result.close();
  pause.close();
  byId('intro').hidden = true;
  byId('board').hidden = false;
  pausePlayer(false);
  chooseCartOptions({ sector });
  restartPlayer();
}

function returnToMap() {
  pausePlayer(true);
  result.close();
  pause.close();
  byId('menu').hidden = true;
  byId('board').hidden = true;
  byId('intro').hidden = false;
  feedback.textContent = '';
  showPlanet(sector);
}

function resume() {
  pause.close();
  pausePlayer(false);
}

function showResult(state) {
  const won = state.phase === 'won';
  const stars = won ? starsForWin(state.core) : 0;
  const nextWasUnlocked = planetUnlocked(planet + 1, ratings);
  if (won) {
    recordWin(ratings, state.sector, state.core);
    saveSettings();
  }
  const openedPlanet = !nextWasUnlocked && planetUnlocked(planet + 1, ratings);
  byId('result-title').textContent = won ? 'Zone secured' : 'Core lost';
  drawStars(byId('result-stars'), stars);
  let detail = won
    ? 'You held ' + SECTORS[state.sector].name + ' with ' + state.core + ' core integrity.'
    : SECTORS[state.sector].name + ' fell on wave ' + state.wave + ' of ' + WAVE_COUNT + '.';
  if (openedPlanet) detail += ' ' + PLANETS[planet + 1].name + ' unlocked.';
  byId('result-detail').textContent = detail;
  byId('next-zone').hidden = !won || !zoneUnlocked(planet, sector + 1, ratings);
  byId('next-planet').hidden = !openedPlanet;
  pausePlayer(true);
  result.showModal();
}

const labels = {};
for (const [key, box] of Object.entries(CONTROLS)) {
  const node = document.createElement('div');
  node.className = 'command ' + (TOWERS[key] ? 'tower' : key);
  node.style.left = 100 * box.x / WIDTH + '%';
  node.style.top = 100 * box.y / HEIGHT + '%';
  node.style.width = 100 * box.w / WIDTH + '%';
  node.style.height = 100 * box.h / HEIGHT + '%';
  const title = document.createElement('b');
  const detail = document.createElement('span');
  node.append(title, detail);
  byId('dock').append(node);
  labels[key] = { node, title, detail };
}

function label(key, text, detail = '', enabled = true) {
  const item = labels[key];
  if (item.title.textContent !== text) item.title.textContent = text;
  if (item.detail.textContent !== detail) item.detail.textContent = detail;
  item.detail.hidden = !detail;
  item.node.classList.toggle('inactive', !enabled);
}

function drawActions(state) {
  for (const [key, tower] of Object.entries(TOWERS)) {
    label(key, tower.name, tower.cost + ' cr', state.credits >= tower.cost);
  }
  label('upgrade', 'Upgrade', state.upgrade ? state.upgrade + ' cr' : '', state.upgrade > 0 && state.credits >= state.upgrade);
  label('salvage', 'Salvage', state.salvage ? '+' + state.salvage : '', state.salvage > 0);
  label('launch', state.phase === 'setup' ? 'Launch wave ' + (state.wave + 1) : 'Wave ' + state.wave + ' active', '', state.phase === 'setup');
  label('speed', state.speed + '×');
}

audio.setEnabled(sound.checked);
byId('rating-guide').textContent = '★ Clear · ★★ ' + STAR_THRESHOLDS[1] + '+ core · ★★★ ' + STAR_THRESHOLDS[2] + '+ core';
showConstellation(false);

byId('view-planet').addEventListener('click', () => showPlanet());
byId('map-back').addEventListener('click', () => showConstellation());
byId('play').addEventListener('click', () => {
  chooseCartOptions({ sector });
  void audio.unlock();
}, { capture: true });
byId('redeploy').addEventListener('click', restart);

byId('menu').addEventListener('click', () => {
  pausePlayer(true);
  pause.showModal();
});
byId('resume').addEventListener('click', resume);
pause.addEventListener('cancel', event => {
  event.preventDefault();
  resume();
});
result.addEventListener('cancel', event => event.preventDefault());
for (const button of document.querySelectorAll('[data-map]')) button.addEventListener('click', returnToMap);
for (const button of document.querySelectorAll('[data-restart]')) button.addEventListener('click', restart);
byId('next-zone').addEventListener('click', () => {
  sector++;
  returnToMap();
});
byId('next-planet').addEventListener('click', () => {
  returnToMap();
  planet++;
  showConstellation();
});
for (const id of ['record', 'replay', 'live']) byId(id).addEventListener('click', resume);

sound.addEventListener('change', () => {
  audio.setEnabled(sound.checked);
  if (sound.checked) void audio.unlock();
  saveSettings();
});

new MutationObserver(() => {
  feedback.classList.toggle('quiet', feedback.textContent === 'Live input');
}).observe(feedback, { childList: true });

byId('surface').addEventListener('cartframe', ({ detail }) => {
  const { state, mode } = detail;
  if (!state || byId('board').hidden) return;
  loaded = true;
  byId('menu').hidden = false;
  if (session !== detail.session) {
    session = detail.session;
    cueId = 0;
    resultShown = false;
  }
  drawActions(state);
  if (state.cue.id !== cueId) {
    cueId = state.cue.id;
    audio.play(state.cue.type);
  }
  if (!resultShown && mode !== 'replay' && mode !== 'finished' && ['won', 'lost'].includes(state.phase)) {
    resultShown = true;
    showResult(state);
  }
});
