import { HEIGHT, PIVOT, WIDTH } from '../../carts/bubble-mania/code.js';
import { chooseCartOptions, pausePlayer, restartPlayer } from '../../src/player.mjs';
import { createGlassAudio } from './audio.mjs';

const byId = id => document.getElementById(id);
const storageKey = 'bubble-mania:' + new URL('../../', import.meta.url).pathname;
const audio = createGlassAudio();
const launcher = byId('blowpipe');
const gauge = byId('power');
const radiusLayer = byId('radius-layer');
const feedback = byId('feedback');
const sound = byId('sound');
const menu = byId('pause-menu');
const result = byId('result');
const labels = [];
let best = 0;
let session;
let cueId = 0;
let resultShown = false;
let seed;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (typeof saved?.best === 'number' && saved.best >= 0 && saved.best <= 100) best = saved.best;
  sound.checked = saved?.sound !== false;
} catch {
  // A blocked or damaged save still lets the game start.
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ best, sound: sound.checked }));
  } catch {
    // Keep the session record and sound preference even if storage is unavailable.
  }
}

function startBoard(newBoard) {
  if (newBoard) seed = crypto.getRandomValues(new Uint32Array(1))[0];
  chooseCartOptions({ seed });
}

function showBest() {
  byId('best').textContent = best.toFixed(1) + '%';
}

function renderLabels(bubbles) {
  const positions = bubbles.filter(bubble => bubble.radius >= 4);
  for (const [index, bubble] of positions.entries()) {
    let label = labels[index];
    if (!label) {
      label = document.createElement('span');
      label.className = 'radius';
      radiusLayer.append(label);
      labels.push(label);
    }
    label.style.left = 100 * bubble.x / WIDTH + '%';
    label.style.top = 100 * bubble.y / HEIGHT + '%';
    label.style.fontSize = Math.min(9, 100 * bubble.radius * .64 / WIDTH) + 'cqw';
    const number = String(Math.floor(bubble.radius + 1e-8));
    if (label.textContent !== number) label.textContent = number;
  }
  while (labels.length > positions.length) labels.pop().remove();
}

function closeMenu() {
  menu.close();
  pausePlayer(false);
}

function restart(newBoard) {
  startBoard(newBoard);
  closeMenu();
  result.close();
  restartPlayer();
}

showBest();
launcher.style.left = 100 * PIVOT.x / WIDTH + '%';
launcher.style.top = 100 * PIVOT.y / HEIGHT + '%';
audio.setEnabled(sound.checked);

byId('play').addEventListener('click', () => {
  startBoard(true);
  void audio.unlock();
}, { capture: true });

byId('menu').addEventListener('click', () => {
  pausePlayer(true);
  menu.showModal();
});
byId('resume').addEventListener('click', closeMenu);
menu.addEventListener('cancel', event => {
  event.preventDefault();
  closeMenu();
});
result.addEventListener('cancel', event => event.preventDefault());
byId('retry').addEventListener('click', () => restart(false));
for (const button of document.querySelectorAll('[data-new]')) {
  button.addEventListener('click', () => restart(true));
}
for (const id of ['record', 'replay', 'live']) byId(id).addEventListener('click', closeMenu);

sound.addEventListener('change', () => {
  audio.setEnabled(sound.checked);
  if (sound.checked) void audio.unlock();
  save();
});

new MutationObserver(() => {
  feedback.classList.toggle('sr-only', feedback.textContent === 'Live input');
}).observe(feedback, { childList: true });

byId('surface').addEventListener('cartframe', ({ detail }) => {
  const { state } = detail;
  if (!state) return;
  byId('menu').hidden = false;
  if (session !== detail.session) {
    session = detail.session;
    cueId = 0;
    resultShown = false;
  }
  launcher.style.setProperty('--angle', state.angle + 'rad');
  gauge.style.setProperty('--power', state.power);
  gauge.setAttribute('aria-valuenow', String(Math.round(state.power * 100)));
  renderLabels(state.bubbles);
  if (state.cue.id !== cueId) {
    cueId = state.cue.id;
    audio.play(state.cue);
  }
  if (detail.mode === 'replay' || detail.mode === 'finished') return;
  if (state.phase === 'ready' && state.coverage > best) {
    best = state.coverage;
    showBest();
    save();
  }
  if (state.phase === 'lost' && !resultShown) {
    resultShown = true;
    byId('result-detail').textContent = 'You covered ' + state.readout.coverage + ' of the playfield.';
    pausePlayer(true);
    result.showModal();
  }
});
