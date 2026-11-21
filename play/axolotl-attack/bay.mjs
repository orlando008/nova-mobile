import { ROUND_TICKS, TEAMS } from '../../carts/axolotl-attack/code.js';
import { chooseCartOptions, pausePlayer, restartPlayer } from '../../src/player.mjs';
import { createAudio } from './sound.mjs';

const byId = id => document.getElementById(id);
const canvas = byId('surface');
const pause = byId('pause-menu');
const result = byId('result');
const sound = byId('sound');
const thumb = byId('stick-thumb');
const feedback = byId('feedback');
const key = 'axolotl-attack:' + new URL('../../', import.meta.url).pathname;
let best = 0;
try {
  const save = JSON.parse(localStorage.getItem(key));
  if (Number.isInteger(save?.best) && save.best > 0) best = save.best;
  sound.checked = save?.sound !== false;
} catch {
  // A blocked or damaged save still allows play.
}

const audio = createAudio(() => sound.checked);
let loaded = false;
let session = -1;
let cue = 0;
const labels = TEAMS.map(({ name, color }, id) => {
  const marker = document.createElement('span');
  marker.className = 'marker';
  marker.style.setProperty('--team', color);
  marker.hidden = true;
  byId('markers').append(marker);

  const item = document.createElement('li');
  item.style.setProperty('--team', color);
  const count = document.createElement('b');
  item.append(id === 0 ? 'You' : name, count);
  byId('schools').append(item);
  return { marker, item, count };
});

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function showBest() {
  const label = byId('record-value');
  label.hidden = best === 0;
  label.textContent = 'Best school · ' + best;
}

function save() {
  try {
    localStorage.setItem(key, JSON.stringify({ best, sound: sound.checked }));
  } catch {
    // Settings and the best score remain available this session.
  }
}

function chooseMatch() {
  chooseCartOptions({ seed: crypto.getRandomValues(new Uint32Array(1))[0] });
  drawSteering(null);
  void audio.unlock();
}

function drawSteering(steering) {
  thumb.style.transform = 'translate(' + ((steering?.x ?? 0) * 15) + 'px, ' +
    ((steering?.y ?? 0) * 15) + 'px)';
}

function resume() {
  pause.close();
  pausePlayer(false);
}

function restart() {
  result.close();
  pause.close();
  byId('intro').hidden = true;
  byId('board').hidden = false;
  chooseMatch();
  pausePlayer(false);
  restartPlayer();
}

function home() {
  pausePlayer(true);
  pause.close();
  result.close();
  byId('board').hidden = true;
  byId('location').hidden = true;
  byId('menu').hidden = true;
  byId('intro').hidden = false;
  byId('dive-again').hidden = !loaded;
  byId('play').hidden = loaded;
  feedback.textContent = '';
  showBest();
  byId('dive-again').focus();
}

function finish(state) {
  const player = state.standings.find(team => team.id === 0);
  const first = state.standings[0].count;
  const won = player.count === first;
  const tied = won && state.standings[1].count === first;
  byId('result-title').textContent = state.phase === 'caught' ? 'Your school was caught'
    : tied ? 'Tied for first' : won ? 'You rule the bay!' : TEAMS[state.standings[0].id].name + ' rules the bay';
  const newBest = state.peak > best;
  best = Math.max(best, state.peak);
  save();
  byId('result-detail').textContent = (newBest ? 'New best school' : 'Your peak school') + ' · ' + state.peak;
  const rows = state.standings.map(({ id, count }) => {
    const row = document.createElement('li');
    row.style.setProperty('--team', TEAMS[id].color);
    const score = document.createElement('b');
    score.textContent = String(count);
    row.append(id === 0 ? 'Your school' : TEAMS[id].name, score);
    return row;
  });
  byId('results').replaceChildren(...rows);
  pausePlayer(true);
  audio.play(won ? 'win' : 'end');
  result.showModal();
}

showBest();
byId('play').addEventListener('click', chooseMatch, { capture: true });
byId('dive-again').addEventListener('click', restart);
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
for (const button of document.querySelectorAll('[data-home]')) button.addEventListener('click', home);
for (const button of document.querySelectorAll('[data-restart]')) button.addEventListener('click', restart);
for (const id of ['record', 'replay', 'live']) byId(id).addEventListener('click', resume);
sound.addEventListener('change', () => {
  if (sound.checked) void audio.unlock();
  save();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || byId('menu').hidden || pause.open || result.open) return;
  pausePlayer(true);
  pause.showModal();
});
new MutationObserver(() => {
  feedback.classList.toggle('quiet', feedback.textContent === 'Live input');
}).observe(feedback, { childList: true });
canvas.addEventListener('cartframe', ({ detail }) => {
  const { state, mode } = detail;
  if (!state || byId('board').hidden) return;
  loaded = true;
  byId('menu').hidden = false;
  byId('location').hidden = false;
  if (session !== detail.session) {
    session = detail.session;
    cue = 0;
  }
  drawSteering(state.phase === 'swimming' ? state.steering : null);
  byId('timer').classList.toggle('urgent', state.tick >= ROUND_TICKS - 600);
  for (const { id, count } of state.standings) {
    const label = labels[id];
    setText(label.count, String(count));
    label.item.classList.toggle('eliminated', count === 0);
  }
  for (const [id, { marker }] of labels.entries()) {
    const leader = state.leaders.find(item => item.id === id);
    marker.hidden = !leader || leader.x < 0.04 || leader.x > 0.96 || leader.y < 0.02 || leader.y > 0.98;
    if (marker.hidden) continue;
    marker.style.left = leader.x * 100 + '%';
    marker.style.top = leader.y * 100 + '%';
    setText(marker, (id === 0 ? 'You · ' : '') + leader.count);
  }
  if (cue !== state.cue.id) {
    cue = state.cue.id;
    if (state.phase === 'swimming') audio.play(state.cue.type);
  }
  if (state.phase !== 'swimming' && mode !== 'replay' && mode !== 'finished' && !result.open) finish(state);
});
