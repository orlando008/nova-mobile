import { CONTROLS, HEIGHT, SECTORS, TOWERS, WIDTH, WAVE_COUNT } from '../../carts/space-swarm-defender/code.js';
import { chooseCartOptions, pausePlayer, restartPlayer } from '../../src/player.mjs';
import { createAudio } from './audio.mjs';

const byId = id => document.getElementById(id);
const pause = byId('pause-menu');
const sectorMenu = byId('sector-menu');
const result = byId('result');
const sound = byId('sound');
const audio = createAudio();
const storageKey = 'space-swarm-defender:' + new URL('../../', import.meta.url).pathname;
const feedback = byId('feedback');
const clearance = new Set();
let sector = 0;
let session = -1;
let cueId = 0;
let resultShown = false;

try {
  const save = JSON.parse(localStorage.getItem(storageKey));
  for (const index of Array.isArray(save?.clearance) ? save.clearance : []) {
    if (Number.isInteger(index) && SECTORS[index]) clearance.add(index);
  }
  sound.checked = save?.sound !== false;
} catch {
  // A blocked or damaged save still allows play.
}

function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ clearance: [...clearance], sound: sound.checked }));
  } catch {
    // Progress still remains available during this session.
  }
}

function drawSectorChoices(container, deployImmediately) {
  container.replaceChildren(...SECTORS.map(({ name, description }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sector-option';
    button.setAttribute('aria-pressed', String(index === sector));
    const title = document.createElement('strong');
    title.textContent = name;
    const mark = document.createElement('span');
    mark.className = 'sector-mark';
    if (clearance.has(index)) mark.textContent = 'Secured';
    const detail = document.createElement('small');
    detail.textContent = description;
    button.append(title, mark, detail);
    button.addEventListener('click', () => {
      sector = index;
      if (deployImmediately) restart();
      else {
        for (const [i, choice] of [...container.children].entries()) {
          choice.setAttribute('aria-pressed', String(i === sector));
        }
      }
    });
    return button;
  }));
}

function restart() {
  sectorMenu.close();
  result.close();
  pause.close();
  pausePlayer(false);
  chooseCartOptions({ sector });
  restartPlayer();
}

function resume() {
  pause.close();
  pausePlayer(false);
}

function showResult(state) {
  const won = state.phase === 'won';
  byId('result-title').textContent = won ? 'Sector secured' : 'Core lost';
  byId('result-detail').textContent = won
    ? 'You held ' + SECTORS[state.sector].name + ' with ' + state.core + ' core integrity and defeated ' + state.kills + ' attackers.'
    : SECTORS[state.sector].name + ' fell on wave ' + state.wave + ' of ' + WAVE_COUNT + '.';
  byId('next-sector').hidden = !won || !SECTORS[sector + 1];
  if (won) {
    clearance.add(state.sector);
    saveSettings();
  }
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
drawSectorChoices(byId('sectors'), false);

byId('play').addEventListener('click', () => {
  chooseCartOptions({ sector });
  void audio.unlock();
}, { capture: true });

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
byId('back').addEventListener('click', () => sectorMenu.close());
for (const button of document.querySelectorAll('[data-choose]')) {
  button.addEventListener('click', () => {
    drawSectorChoices(byId('other-sectors'), true);
    sectorMenu.showModal();
  });
}
for (const button of document.querySelectorAll('[data-restart]')) button.addEventListener('click', restart);
byId('next-sector').addEventListener('click', () => {
  sector++;
  restart();
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
  if (!state) return;
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
