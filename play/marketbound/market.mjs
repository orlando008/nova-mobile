import { LEVELS, PRODUCE } from '../../carts/marketbound/code.js';
import { chooseCartOptions, pausePlayer, restartPlayer } from '../../src/player.mjs';
import { createAudio } from './audio.mjs';

const byId = id => document.getElementById(id);
const assets = new URL('../../carts/marketbound/assets/', import.meta.url);
const storageKey = 'marketbound:' + new URL('../../', import.meta.url).pathname;
const play = byId('play');
const intro = byId('intro');
const saved = readSave();
const progress = LEVELS.map((_, index) => {
  const stars = saved.progress?.[index];
  return Number.isInteger(stars) && stars >= 1 && stars <= 3 ? stars : 0;
});
const settings = { music: saved.music !== false, effects: saved.effects !== false };
const audio = createAudio(settings);
let currentLevel = progress.every(Boolean) ? 0 : firstUnfinished();
let lastSession = 0;
let lastCue = 0;
let shownResult = 0;
let displayedLevel = -1;
let dialog;
let parentDialog;
let goalNodes = [];

function readSave() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) ?? {};
  } catch {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ progress, ...settings }));
  } catch {
    // Keep progress for this visit when storage is unavailable.
  }
}

function firstUnfinished() {
  const next = progress.indexOf(0);
  return next === -1 ? LEVELS.length - 1 : next;
}

function starsText(count) {
  return '★'.repeat(count) + '☆'.repeat(3 - count);
}

function showLevels() {
  const completed = progress.filter(Boolean).length;
  const stars = progress.reduce((total, value) => total + value, 0);
  byId('campaign-progress').textContent = completed + ' / ' + LEVELS.length + ' deliveries · ' + stars + ' / ' +
    LEVELS.length * 3 + ' stars';
  byId('levels').replaceChildren(...LEVELS.map((level, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    const number = document.createElement('span');
    const title = document.createElement('span');
    const mark = document.createElement('span');
    button.type = 'button';
    button.dataset.level = index;
    button.disabled = index > firstUnfinished();
    number.className = 'level-index';
    number.textContent = String(index + 1).padStart(2, '0');
    title.textContent = level.name;
    mark.className = 'level-mark';
    mark.textContent = button.disabled ? 'Locked' : progress[index] ? starsText(progress[index]) : 'Ready';
    if (progress[index]) {
      mark.setAttribute('role', 'img');
      mark.setAttribute('aria-label', progress[index] + ' of 3 stars');
    }
    button.append(number, title, mark);
    item.append(button);
    return item;
  }));
}

function showMenu(id, parent) {
  if (id === 'campaign') showLevels();
  dialog?.close();
  parentDialog = parent;
  dialog = byId(id);
  dialog.showModal();
  pausePlayer(true);
}

function closeMenu(returnToParent = true) {
  if (returnToParent && parentDialog) {
    showMenu(parentDialog);
    return;
  }
  dialog?.close();
  dialog = undefined;
  parentDialog = undefined;
  pausePlayer(false);
}

function chooseLevel(index) {
  if (index > firstUnfinished() || !LEVELS[index] || (!intro.hidden && play.disabled)) return;
  currentLevel = index;
  chooseCartOptions({ level: index });
  closeMenu(false);
  if (intro.hidden) restartPlayer();
  else play.click();
}

function buildGoals(index) {
  const level = LEVELS[index];
  byId('level-number').textContent = 'Level ' + (index + 1) + ' of ' + LEVELS.length;
  byId('level-name').textContent = level.name;
  goalNodes = level.orders.map(([type]) => {
    const { label, file } = PRODUCE[type];
    const icon = new Image();
    icon.src = new URL(file, assets);
    icon.alt = label;
    return makeGoal(icon);
  });
  if (level.soil) {
    const icon = document.createElement('span');
    icon.className = 'soil-icon';
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', 'Soil plots');
    goalNodes.push(makeGoal(icon));
  }
  byId('goals').replaceChildren(...goalNodes.map(({ item }) => item));
}

function makeGoal(icon) {
  const item = document.createElement('li');
  const count = document.createElement('span');
  item.append(icon, count);
  return { item, count };
}

function showResult(state) {
  const won = state.outcome === 'won';
  const final = won && state.level === LEVELS.length - 1;
  const stars = won ? 1 + Number(state.moves >= Math.ceil(LEVELS[state.level].moves * .24)) +
    Number(state.moves >= Math.ceil(LEVELS[state.level].moves * .45)) : 0;
  if (won && stars > progress[state.level]) {
    progress[state.level] = stars;
    save();
  }
  byId('result-title').textContent = final ? 'Market route complete!' : won ? 'Delivery complete!' : 'Out of moves';
  byId('result-detail').textContent = won ? state.moves + ' moves left' : 'Try the order again from a fresh board.';
  byId('result-stars').textContent = starsText(stars);
  byId('result-stars').setAttribute('aria-label', stars + ' of 3 stars');
  byId('next').hidden = !won || final;
  byId('next').dataset.level = state.level + 1;
  showMenu('result');
}

if (progress.some(Boolean)) play.textContent = progress.every(Boolean) ? 'Play again' : 'Continue campaign';
play.addEventListener('click', () => {
  chooseCartOptions({ level: currentLevel });
  void audio.unlock();
}, { capture: true });

for (const key of ['music', 'effects']) {
  const input = byId(key);
  input.checked = settings[key];
  input.addEventListener('change', () => {
    settings[key] = input.checked;
    save();
    if (input.checked) void audio.unlock();
    audio.refresh();
  });
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.open) showMenu(button.dataset.open, dialog?.id);
  else if (button.hasAttribute('data-close')) closeMenu();
  else if (button.dataset.level !== undefined) chooseLevel(Number(button.dataset.level));
  else if (button.hasAttribute('data-retry')) chooseLevel(currentLevel);
  else if (['live', 'record', 'replay'].includes(button.id)) closeMenu(false);
});

for (const menu of document.querySelectorAll('dialog')) {
  menu.addEventListener('cancel', event => {
    event.preventDefault();
    closeMenu();
  });
}

byId('surface').addEventListener('cartframe', ({ detail: { state, mode, session } }) => {
  if (byId('pause').hidden) byId('pause').hidden = false;
  if (state.level !== displayedLevel) {
    displayedLevel = state.level;
    buildGoals(displayedLevel);
  }
  const counts = [...state.remaining, state.soil.length];
  goalNodes.forEach(({ item, count }, index) => {
    const value = counts[index];
    if (count.textContent === String(value)) return;
    count.textContent = value;
    item.classList.toggle('complete', value === 0);
  });
  if (session !== lastSession) {
    lastSession = session;
    lastCue = 0;
  }
  if (state.audio.id !== lastCue) {
    lastCue = state.audio.id;
    audio.play(state.audio.name, state.audio.combo);
  }
  if (mode === 'live' && !dialog && state.outcome !== 'playing' && shownResult !== session) {
    shownResult = session;
    showResult(state);
  }
});
