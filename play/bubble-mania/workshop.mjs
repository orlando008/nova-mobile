import { HEIGHT, PIPE_LENGTH, PIVOT, WIDTH } from '../../carts/bubble-mania/code.js';
import { chooseCartOptions, pausePlayer, restartPlayer } from '../../src/player.mjs';
import { createGlassAudio } from './audio.mjs';
import { challengeUrl, readChallenge } from './challenge.mjs';

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
const share = byId('share');
const link = byId('share-link');
const shareStatus = byId('share-status');
const labels = [];
let best = 0;
let session;
let cueId = 0;
let resultShown = false;
let challenge = readChallenge(location.href);
let seed;
let resultScore;

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
  if (newBoard) {
    seed = undefined;
    if (challenge) {
      challenge = null;
      history.replaceState(history.state, '', challengeUrl(location.href));
      showChallenge();
    }
  }
  seed ??= challenge?.seed ?? crypto.getRandomValues(new Uint32Array(1))[0];
  chooseCartOptions({ seed });
}

function showChallenge() {
  const intro = byId('challenge-intro');
  const target = challenge?.target ?? null;
  intro.hidden = !challenge;
  intro.textContent = target === null ? 'Play the shared board.' : 'Can you beat ' + target.toFixed(1) + '% coverage?';
  byId('target').hidden = target === null;
  byId('target-score').textContent = target === null ? '' : target.toFixed(1) + '%';
}

function openShare(score) {
  const hasScore = score !== undefined;
  byId('share-title').textContent = hasScore ? 'Share challenge' : 'Share board';
  byId('share-detail').textContent = hasScore
    ? 'Send this board with your ' + score.toFixed(1) + '% coverage to beat.'
    : 'Anyone with this link can play the same board.';
  link.value = challengeUrl(location.href, seed, score).href;
  shareStatus.textContent = '';
  share.showModal();
}

function selectLink() {
  link.focus();
  link.select();
  shareStatus.textContent = 'Select and copy the link to share it.';
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
showChallenge();
launcher.style.left = 100 * PIVOT.x / WIDTH + '%';
launcher.style.top = 100 * PIVOT.y / HEIGHT + '%';
launcher.style.setProperty('--pipe-length', 100 * PIPE_LENGTH / WIDTH + 'cqw');
audio.setEnabled(sound.checked);

byId('play').addEventListener('click', () => {
  startBoard();
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

byId('share-board').addEventListener('click', () => openShare());
byId('share-result').addEventListener('click', () => openShare(resultScore));
byId('copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(link.value);
    shareStatus.textContent = 'Link copied.';
  } catch {
    selectLink();
  }
});
const nativeShare = byId('share-native');
nativeShare.hidden = typeof navigator.share !== 'function';
nativeShare.addEventListener('click', async () => {
  try {
    await navigator.share({ title: 'Bubble Mania', text: byId('share-detail').textContent, url: link.value });
  } catch (error) {
    if (error.name !== 'AbortError') selectLink();
  }
});

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
  launcher.classList.toggle('charging', state.charging);
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
    resultScore = Number(state.coverage.toFixed(1));
    const target = challenge?.target ?? null;
    byId('result-title').textContent = target === null ? 'Glass shattered'
      : resultScore > target ? 'Challenge beaten'
      : resultScore === target ? 'Challenge tied' : 'Challenge missed';
    const coverage = 'You covered ' + state.readout.coverage + ' of the playfield.';
    byId('result-detail').textContent = target === null ? coverage : coverage + ' The score to beat was ' + target.toFixed(1) + '%.';
    pausePlayer(true);
    result.showModal();
  }
});
