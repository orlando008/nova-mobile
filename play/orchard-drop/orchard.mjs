import { FRUIT, HEIGHT, WIDTH, fruitPath } from '../../carts/orchard-drop/code.js?v=5';
import { chooseCartOptions, pausePlayer, restartPlayer } from '../../src/player.mjs?v=5';

const byId = id => document.getElementById(id);
const asset = tier => '../../carts/orchard-drop/' + fruitPath(tier) + '?v=5';
const storageKey = 'orchard-drop:' + new URL('../../', import.meta.url).pathname;
const menu = byId('pause-menu');
const result = byId('result');
const feedback = byId('feedback');
const sound = byId('sound');
const pop = byId('merge-pop');
const harvestBanner = byId('harvest-banner');
const hint = byId('hint');
const nextFruit = byId('next-fruit');
const ladder = byId('fruit-ladder');
const ladderItems = FRUIT.map(({ name }, tier) => {
  const entry = document.createElement('li');
  const image = new Image(29, 29);
  image.src = asset(tier);
  image.alt = name;
  entry.title = name;
  entry.append(image);
  ladder.append(entry);
  return entry;
});
let audio;
let audioReady;
let harvestVoice;
let harvestAnimation;
let lastHarvest = 0;
let best = 0;
let session;
let lastCue = 0;
let lastNext;
let lastLargest;
let lastBurst;
let popAnimation;
let resultShown = false;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Number.isSafeInteger(saved?.best) && saved.best >= 0) best = saved.best;
  sound.checked = saved?.sound !== false;
} catch {
  // Storage may be unavailable in a private session.
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ best, sound: sound.checked }));
  } catch {
    // The record still lasts for the current visit.
  }
}

function unlockAudio() {
  if (!sound.checked || !window.AudioContext) return;
  try {
    audio ??= new AudioContext();
    audioReady = audio.resume().catch(() => {});
    harvestVoice ??= fetch(new URL('../../carts/orchard-drop/assets/juicy.wav?v=5', import.meta.url))
      .then(response => response.ok ? response.arrayBuffer() : null)
      .then(bytes => bytes && audio.decodeAudioData(bytes))
      .catch(() => null);
  } catch {
    // The game also works on devices without Web Audio.
  }
}

function tone(start, frequency, duration, volume, type = 'sine', endFrequency = frequency) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(.001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .012);
  gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playCue({ name, tier }) {
  if (!sound.checked || audio?.state !== 'running') return;
  const now = audio.currentTime;
  if (name === 'drop') tone(now, 224, .10, .046, 'sine', 135);
  else if (name === 'lost') {
    tone(now, 294, .21, .065, 'triangle');
    tone(now + .12, 196, .32, .048, 'triangle');
  } else {
    const root = 293.66 * 2 ** (tier / 12);
    tone(now, root, .18, .09, 'triangle');
    tone(now + .053, root * 1.5, .22, .065);
  }
}

function clearHarvest() {
  harvestAnimation?.cancel();
  harvestBanner.hidden = true;
}

function celebrateHarvest() {
  clearHarvest();
  harvestBanner.hidden = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animation = harvestBanner.animate(reduced ? [{ opacity: 1 }, { opacity: 0 }] : [
    { opacity: 0, transform: 'rotate(-10deg) scale(.75)' },
    { opacity: 1, transform: 'rotate(-6deg) scale(1.07)', offset: .14 },
    { opacity: 1, transform: 'rotate(-6deg) scale(1)', offset: .8 },
    { opacity: 0, transform: 'rotate(-6deg) scale(.98)' },
  ], { duration: 1500 });
  harvestAnimation = animation;
  animation.onfinish = () => {
    if (harvestAnimation === animation) harvestBanner.hidden = true;
  };

  const currentSession = session;
  if (!sound.checked || !audio) return;
  void Promise.all([harvestVoice, audioReady]).then(([buffer]) => {
    if (session !== currentSession || !sound.checked || audio.state !== 'running') return;
    if (!buffer) {
      playCue({ name: 'merge', tier: FRUIT.length - 1 });
      return;
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start();
  });
}

function chooseSeed() {
  chooseCartOptions({ seed: crypto.getRandomValues(new Uint32Array(1))[0] });
}

function closeMenu() {
  menu.close();
  pausePlayer(false);
}

function clearPop() {
  popAnimation?.cancel();
  pop.hidden = true;
}

function showPop(burst) {
  clearPop();
  pop.textContent = burst.cleared ? '+' + burst.points :
    burst.chain > 1 ? 'Chain ×' + Math.min(burst.chain, 4) + ' · +' + burst.points : '+' + burst.points;
  pop.style.setProperty('--x', Math.max(18, Math.min(82, burst.x / WIDTH * 100)) + '%');
  pop.style.setProperty('--y', Math.max(20, burst.y - burst.radius) / HEIGHT * 100 + '%');
  pop.hidden = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animation = pop.animate(reduced ? [{ opacity: 1 }, { opacity: 0 }] : [
    { opacity: 1, transform: 'translate(-50%, -30%)' },
    { opacity: 1, offset: .52 },
    { opacity: 0, transform: 'translate(-50%, -112%)' },
  ], 620);
  popAnimation = animation;
  animation.onfinish = () => {
    if (popAnimation === animation) pop.hidden = true;
  };
}

function renderBest() {
  byId('best').textContent = best;
}

byId('play').addEventListener('click', () => {
  chooseSeed();
  unlockAudio();
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
for (const button of document.querySelectorAll('[data-new-run]')) {
  button.addEventListener('click', () => {
    chooseSeed();
    unlockAudio();
    closeMenu();
    result.close();
    clearPop();
    clearHarvest();
    restartPlayer();
  });
}
for (const id of ['record', 'replay', 'live']) byId(id).addEventListener('click', closeMenu);
sound.addEventListener('change', () => {
  unlockAudio();
  save();
});
new MutationObserver(() => {
  feedback.classList.toggle('sr-only', feedback.textContent === 'Live input');
}).observe(feedback, { childList: true });

renderBest();
byId('surface').addEventListener('cartframe', ({ detail }) => {
  const { state, mode } = detail;
  if (!state) return;
  byId('menu').hidden = false;
  if (session !== detail.session) {
    session = detail.session;
    lastCue = 0;
    lastHarvest = 0;
    lastBurst = undefined;
    resultShown = false;
    clearPop();
    clearHarvest();
  }
  if (state.next !== lastNext) {
    lastNext = state.next;
    nextFruit.src = asset(state.next);
    nextFruit.alt = FRUIT[state.next].name;
  }
  if (state.largest !== lastLargest) {
    ladderItems[lastLargest]?.removeAttribute('data-largest');
    ladderItems[state.largest]?.setAttribute('data-largest', '');
    lastLargest = state.largest;
  }

  const message = state.danger ? 'Above the fill line! Make room fast.' : 'Press and drag to aim. Release to drop.';
  if (hint.textContent !== message) hint.textContent = message;
  hint.toggleAttribute('data-danger', Boolean(state.danger));

  if (state.harvestCount > lastHarvest) {
    lastHarvest = state.harvestCount;
    celebrateHarvest();
  }
  const burst = state.bursts.at(-1);
  if (burst && burst.start !== lastBurst) {
    lastBurst = burst.start;
    showPop(burst);
  }
  if (state.cue.id !== lastCue) {
    lastCue = state.cue.id;
    if (state.cue.name !== 'harvest') playCue(state.cue);
  }
  if (mode === 'replay' || mode === 'finished') return;
  if (state.score > best) {
    best = state.score;
    renderBest();
    save();
  }
  if (state.lost && !resultShown) {
    resultShown = true;
    const largest = state.largest === null ? '' : ' Largest fruit was ' + FRUIT[state.largest].name.toLowerCase() + '.';
    byId('result-detail').textContent = 'You scored ' + state.score + ' points.' + largest;
    pausePlayer(true);
    result.showModal();
  }
});
