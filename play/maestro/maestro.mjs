import { APPROACH, COUNT_IN, createPerformance } from '../../carts/maestro/code.js?v=extreme';
import { createPiano } from './audio.mjs';

const SONGS = [
  { id: 'clair', name: 'Clair de lune', composer: 'Claude Debussy', level: 'Gentle', duration: '5:04' },
  { id: 'elise', name: 'Für Elise', composer: 'Ludwig van Beethoven', level: 'Moderate', duration: '1:56' },
  { id: 'entertainer', name: 'The Entertainer', composer: 'Scott Joplin', level: 'Lively', duration: '3:00' },
];
const asset = path => new URL('../../carts/maestro/assets/' + path, import.meta.url);
const byId = id => document.getElementById(id);
const number = new Intl.NumberFormat(document.documentElement.lang);
const STORAGE = 'nova-mobile:maestro';
const RESUME_LEAD = 1200;
const INPUT_GRACE = 32;
const STRIKE = .86;
const KEYS = { KeyA: 0, KeyS: 1, KeyD: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 };
const DIFFICULTIES = {
  standard: { name: 'Standard', asset: 'lanes.json', approach: APPROACH },
  extreme: { name: 'Extreme', asset: 'extreme.json', approach: 1100 },
};
const piano = createPiano();

function readSave() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE)) ?? {};
  } catch {
    return {};
  }
}

function writeSave() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify({
      selected: song.id, difficulty, records: saved.records,
      laneRecords: records.standard, extremeRecords: records.extreme, volume, offset,
    }));
  } catch {}
}

function bounded(value, minimum, maximum, fallback) {
  return Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
}

function recordMap(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

const saved = readSave();
const records = { standard: recordMap(saved.laneRecords), extreme: recordMap(saved.extremeRecords) };
let difficulty = saved.difficulty === 'extreme' ? 'extreme' : 'standard';
let volume = bounded(saved.volume, 0, 100, 85);
let offset = bounded(saved.offset, -200, 200, 0);
let song = SONGS.find(item => item.id === saved.selected) ?? SONGS[0];
const charts = new Map();
let run;
let pending = false;
let watchingAudio = false;
let phase = 'recital';
let frameId;

const highway = byId('highway');
const lanes = [...highway.querySelectorAll('.lane')];
const blocks = byId('blocks');
const markers = [];
const stage = highway.parentElement;
highway.style.setProperty('--strike', 100 * STRIKE + '%');
const pauseMenu = byId('pause-menu');
const settingsMenu = byId('settings-menu');

function show(visible) {
  phase = visible;
  for (const id of ['recital', 'performance', 'results']) byId(id).hidden = id !== phase;
  const playing = phase === 'performance';
  byId('pause').hidden = !playing;
  byId('settings').hidden = playing;
  byId('wordmark').hidden = phase === 'recital';
}

function showNotice(id, message = '') {
  const notice = byId(id);
  notice.textContent = message;
  notice.hidden = !message;
}

function stars(element, count) {
  const filled = bounded(count, 0, 3, 0);
  element.setAttribute('aria-label', filled + ' of 3 stars');
  element.replaceChildren(...Array.from({ length: 3 }, (_, index) => {
    const star = document.createElement('span');
    star.textContent = index < filled ? '★' : '☆';
    star.className = index < filled ? 'earned' : '';
    star.setAttribute('aria-hidden', 'true');
    return star;
  }));
}

const songRows = new Map();
for (const piece of SONGS) {
  const label = document.createElement('label');
  label.className = 'song';
  label.innerHTML = '<input type="radio" name="piece"><span class="song-card">' +
    '<img alt="" width="60" height="60"><span class="song-copy"><strong></strong><small></small></span>' +
    '<span class="song-meta"><span></span><span class="stars" role="img"></span></span></span>';
  const radio = label.querySelector('input');
  radio.checked = piece === song;
  radio.addEventListener('change', () => {
    song = piece;
    writeSave();
    showNotice('notice');
  });
  label.querySelector('img').src = asset(piece.id + '.webp');
  label.querySelector('strong').textContent = piece.name;
  label.querySelector('small').textContent = piece.composer;
  label.querySelector('.song-meta > span').textContent = piece.level + ' · ' + piece.duration;
  songRows.set(piece.id, label.querySelector('.stars'));
  byId('songs').append(label);
}

function updateRecords() {
  for (const [id, element] of songRows) stars(element, records[difficulty][id]?.stars);
}

for (const radio of byId('difficulty').querySelectorAll('input')) {
  radio.checked = radio.value === difficulty;
  radio.addEventListener('change', () => {
    difficulty = radio.value;
    writeSave();
    updateRecords();
    showNotice('notice');
  });
}

function updateSettings() {
  byId('volume').value = volume;
  byId('volume-value').value = volume + '%';
  byId('timing').value = offset;
  byId('timing-value').value = (offset > 0 ? '+' : '') + offset + ' ms';
}

byId('volume').addEventListener('input', event => {
  volume = Number(event.target.value);
  piano.setVolume(volume / 100);
  updateSettings();
  writeSave();
});
byId('timing').addEventListener('input', event => {
  offset = Number(event.target.value);
  updateSettings();
  writeSave();
});

function stop() {
  cancelAnimationFrame(frameId);
  piano.stop();
}

function showRecital() {
  if (pending) return;
  stop();
  run = undefined;
  pauseMenu.close();
  show('recital');
  byId('maestro-title').focus({ preventScroll: true });
}

function setText(id, text) {
  const element = byId(id);
  text = String(text);
  if (element.textContent !== text) element.textContent = text;
}

function placeMarker(index, type, left, y, width = '') {
  let marker = markers[index];
  if (!marker) {
    marker = document.createElement('span');
    blocks.append(marker);
    markers[index] = marker;
  }
  marker.hidden = false;
  marker.className = type;
  marker.style.left = left + '%';
  marker.style.width = width;
  marker.style.setProperty('--y', y + 'px');
}

function renderCues(now) {
  const { chart, game, mode } = run;
  const { approach } = DIFFICULTIES[mode];
  const strikeY = highway.clientHeight * STRIKE;
  const center = lane => (lane + .5) * 100 / lanes.length;
  let marker = 0;
  for (let index = game.cursor; index < chart.cues.length; index++) {
    const [beat, required] = chart.cues[index];
    const remaining = beat - now;
    if (remaining > approach) break;
    const y = strikeY * (1 - remaining / approach);
    const paired = (required & (required - 1)) !== 0;
    const open = index === game.cursor ? required & ~game.hitLanes : required;
    if (paired && open === required) {
      const left = center(required & 1 ? 0 : 1);
      const right = center(required & 4 ? 2 : 1);
      placeMarker(marker++, 'pair-link', left, y, (right - left) + '%');
    }
    for (let lane = 0; lane < lanes.length; lane++) {
      if (open & (1 << lane)) placeMarker(marker++, paired ? 'block paired' : 'block', center(lane), y);
    }
  }
  for (let index = marker; index < markers.length; index++) markers[index].hidden = true;
}

function render(position) {
  const { chart, game, from } = run;
  const now = position - offset;
  const lead = from - position;
  renderCues(now);
  byId('progress').value = Math.max(from, position) / chart.end;
  setText('score', number.format(game.score));
  setText('combo', game.combo);

  for (let lane = 0; lane < lanes.length; lane++) {
    const flash = run.flashes[lane];
    const active = flash && now >= flash.time && now - flash.time < 190;
    lanes[lane].dataset.hit = active ? flash.name : '';
  }
  const feedback = game.feedback;
  const fresh = feedback && now >= feedback.time && now - feedback.time < 540;
  stage.dataset.hit = fresh ? feedback.name : '';
  const countdown = lead > 120 ? Math.ceil(lead / 1000) : '';
  setText('judgement', countdown || (fresh ? feedback.name : ''));
  const difference = Math.abs(Math.round(feedback?.offset ?? 0));
  setText('deviation', countdown ? 'Get ready' : fresh && difference && feedback.name !== 'Off beat'
    ? difference + ' ms ' + (feedback.offset < 0 ? 'early' : 'late') : '');
}

function complete() {
  const { game, mode } = run;
  game.advance(Infinity);
  stop();
  const result = game.result();
  const previous = records[mode][song.id];
  const newBest = result.score > (previous?.score ?? 0);
  const bestStars = Math.max(previous?.stars ?? 0, result.stars);
  if (newBest || bestStars > (previous?.stars ?? 0)) {
    records[mode][song.id] = { score: Math.max(previous?.score ?? 0, result.score), stars: bestStars };
    writeSave();
    updateRecords();
  }
  setText('result-title', song.name);
  setText('result-difficulty', DIFFICULTIES[mode].name + ' results');
  stars(byId('result-stars'), result.stars);
  setText('accuracy', (Math.floor(result.accuracy * 10) / 10) + '%');
  setText('best-combo', result.bestCombo);
  setText('final-score', number.format(result.score));
  byId('new-best').hidden = !newBest;
  const breakdown = byId('breakdown');
  breakdown.replaceChildren(...Object.entries(result.counts).map(([rating, value]) => {
    const entry = document.createElement('div');
    const term = document.createElement('dt');
    const count = document.createElement('dd');
    term.textContent = rating;
    count.textContent = value;
    entry.append(term, count);
    return entry;
  }));
  show('results');
  byId('result-title').focus({ preventScroll: true });
}

function frame(timestamp) {
  if (phase !== 'performance' || pauseMenu.open) return;
  const position = piano.positionAt(timestamp);
  run.game.advance(position - offset - INPUT_GRACE);
  if (position >= run.chart.end) {
    complete();
    return;
  }
  render(position);
  frameId = requestAnimationFrame(frame);
}

function launch(from, lead) {
  run.from = from;
  piano.start(run.buffer, from, lead);
  pauseMenu.close();
  show('performance');
  render(from - lead);
  lanes[1].focus({ preventScroll: true });
  frameId = requestAnimationFrame(frame);
}

async function startPiece(button) {
  if (pending) return;
  pending = true;
  button.disabled = true;
  byId('songs').disabled = true;
  byId('difficulty').disabled = true;
  const mode = difficulty;
  const settings = DIFFICULTIES[mode];
  const notice = pauseMenu.open ? 'pause-notice' : phase === 'results' ? 'result-notice' : 'notice';
  showNotice(notice, 'Preparing the piano…');
  try {
    await piano.unlock(volume / 100);
    if (!watchingAudio) {
      watchingAudio = true;
      piano.context.addEventListener('statechange', () => {
        if (piano.context.state !== 'running') pauseRun();
      });
    }
    const [data, buffer] = await Promise.all([
      charts.get(mode) ?? fetch(asset(settings.asset)).then(response => {
        if (!response.ok) throw new Error('The beat chart could not load.');
        return response.json();
      }),
      piano.load(asset(song.id + '-piano.mp3').href),
    ]);
    charts.set(mode, data);
    const chart = data[song.id];
    if (!chart?.cues.length || Math.abs(buffer.duration * 1000 - chart.end) > 250) {
      throw new Error('The track and beat chart do not match.');
    }
    stop();
    run = { chart, buffer, game: createPerformance(chart.cues), mode, pausedAt: 0, flashes: [] };
    byId('performance').dataset.difficulty = mode;
    setText('piece-title', song.name);
    setText('piece-difficulty', settings.name);
    if (document.hidden) {
      show('performance');
      run.from = 0;
      render(-COUNT_IN);
      if (!pauseMenu.open) pauseMenu.showModal();
    } else {
      launch(0, COUNT_IN);
    }
    showNotice(notice);
  } catch {
    showNotice(notice, 'The piano could not start. Try again.');
  } finally {
    pending = false;
    button.disabled = false;
    byId('songs').disabled = false;
    byId('difficulty').disabled = false;
  }
}

function pauseRun() {
  if (pending || phase !== 'performance' || pauseMenu.open) return;
  run.pausedAt = Math.max(run.from, piano.positionAt(performance.now()));
  run.game.clearPartial();
  run.flashes = [];
  stop();
  showNotice('pause-notice');
  pauseMenu.showModal();
}

async function resumeRun() {
  if (pending || !pauseMenu.open) return;
  const resume = byId('resume');
  pending = true;
  resume.disabled = true;
  try {
    await piano.unlock(volume / 100);
    if (!document.hidden) {
      if (run.pausedAt >= run.chart.end) {
        pauseMenu.close();
        complete();
      } else {
        launch(run.pausedAt, run.pausedAt === 0 ? COUNT_IN : RESUME_LEAD);
      }
    }
  } catch {
    showNotice('pause-notice', 'The piano could not resume. Try again.');
  } finally {
    pending = false;
    resume.disabled = false;
  }
}

function tap(lane, event) {
  if (phase !== 'performance' || pauseMenu.open) return;
  const position = piano.positionAt(event.timeStamp);
  if (position < run.from - (run.from === 0 ? 275 : 0)) return;
  const time = position - offset;
  const name = run.game.tap(lane, time);
  if (name) run.flashes[lane] = { time, name };
  render(piano.positionAt(performance.now()));
}

lanes.forEach((button, lane) => {
  button.addEventListener('pointerdown', event => {
    if (event.button === 0) tap(lane, event);
  });
  button.addEventListener('click', event => {
    if (event.detail === 0) tap(lane, event);
  });
});
document.addEventListener('keydown', event => {
  if (phase !== 'performance' || pauseMenu.open) return;
  if (event.code === 'Escape') {
    event.preventDefault();
    pauseRun();
    return;
  }
  const lane = KEYS[event.code];
  if (lane !== undefined) {
    event.preventDefault();
    if (!event.repeat) tap(lane, event);
  }
});
pauseMenu.addEventListener('cancel', event => {
  event.preventDefault();
  resumeRun();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseRun();
});
window.addEventListener('pagehide', pauseRun);

for (const id of ['play', 'replay', 'restart']) {
  byId(id).addEventListener('click', event => startPiece(event.currentTarget));
}
for (const button of document.querySelectorAll('[data-recital]')) button.addEventListener('click', showRecital);
byId('pause').addEventListener('click', pauseRun);
byId('resume').addEventListener('click', resumeRun);
byId('settings').addEventListener('click', () => settingsMenu.showModal());
updateRecords();
updateSettings();
