import {
  CLEFS, createLesson, DIFFICULTIES, LESSON_LENGTH, MIDDLE_C_MIDI,
} from '../../carts/music-tutor/code.js?v=bass-clef';
import { createInstrument, nextNoteDelayMs } from './audio.mjs?v=xp-celebrations';
import { createResults } from './results.mjs';
import { createStudio } from './studio.mjs?v=xp-celebrations';

const element = id => document.getElementById(id);
const menu = element('menu');
const lesson = element('lesson');
const results = element('results');
const explorer = element('explorer');
const studioScreen = element('studio');
const staff = element('staff');
const notation = staff.querySelector('.notation');
const ledgerLine = element('ledger-line');
const accidental = element('accidental');
const keySignature = element('key-signature');
const feedback = element('feedback');
const next = element('next');
const letterAnswers = element('letter-answers');
const keyboardAnswers = element('keyboard-answers');
const choices = [...document.querySelectorAll('.choice')];
const instrument = createInstrument();
const studio = createStudio();
const resultsProgress = createResults(instrument);
const octaveLayout = [
  { names: ['C'], position: 0 },
  { names: ['C sharp', 'D flat'], position: 1 },
  { names: ['D'], position: 1 },
  { names: ['D sharp', 'E flat'], position: 2 },
  { names: ['E'], position: 2 },
  { names: ['F'], position: 3 },
  { names: ['F sharp', 'G flat'], position: 4 },
  { names: ['G'], position: 4 },
  { names: ['G sharp', 'A flat'], position: 5 },
  { names: ['A'], position: 5 },
  { names: ['A sharp', 'B flat'], position: 6 },
  { names: ['B'], position: 6 },
];

let lessonLabel;
let answerButtons;
let questions;
let index;
let score;
let answered;
let muted = false;
let feedbackTimer;
let lessonReward;
let studioReturn;
let clefName = menu.querySelector('input[name="lesson-clef"]:checked').value;

function show(screen) {
  clearTimeout(feedbackTimer);
  if (screen !== results && !results.hidden) resultsProgress.finish();
  menu.hidden = screen !== menu;
  lesson.hidden = screen !== lesson;
  results.hidden = screen !== results;
  explorer.hidden = screen !== explorer;
  studioScreen.hidden = screen !== studioScreen;
}

const staffPosition = step => `${82 - step * 7}%`;

const explorerStaff = element('explorer-staff');
const explorerNote = explorerStaff.querySelector('.notation');
const explorerLedger = explorerStaff.querySelector('.staff-ledger');
const explorerLetter = explorerStaff.querySelector('.explorer-letter');
const explorerKeys = element('explorer-keys');
const clefControls = [...document.querySelectorAll('input[data-clef]')];
let letterTimer;

function renderClef(board) {
  board.dataset.clef = clefName;
  board.querySelector('.clef').src = `../../carts/music-tutor/assets/${clefName}-clef.png`;
}

function renderExplorer() {
  clearTimeout(letterTimer);
  instrument.stop();
  const clef = CLEFS[clefName];
  const leftLimit = clefName === 'bass' ? 49 : 40;
  explorerNote.hidden = explorerLedger.hidden = explorerLetter.hidden = true;
  explorerStaff.setAttribute('aria-label', `${clef.name} staff`);
  renderClef(explorerStaff);
  const rows = [...clef.notes].reverse().map(note => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'explorer-hit';
    row.style.top = staffPosition(note.step);
    const octave = Math.floor(note.midi / 12) - 1;
    row.setAttribute('aria-label', note.midi === MIDDLE_C_MIDI ? 'Play middle C' : `Play ${note.label}${octave}`);
    row.addEventListener('click', event => {
      const bounds = explorerStaff.getBoundingClientRect();
      const x = event.detail ? ((event.clientX - bounds.left) / bounds.width) * 100 : 55;
      explorerStaff.style.setProperty('--note-x', `${Math.max(leftLimit, Math.min(82, x))}%`);
      explorerStaff.style.setProperty('--note-y', staffPosition(note.step));
      explorerNote.classList.toggle('stem-down', note.step >= 4);
      explorerNote.hidden = false;
      explorerLedger.hidden = note.step !== clef.ledgerStep;
      explorerLetter.textContent = note.label;
      explorerLetter.hidden = false;
      clearTimeout(letterTimer);
      letterTimer = setTimeout(() => { explorerLetter.hidden = true; }, 900);
      instrument.play(note.midi);
    });
    return row;
  });
  explorerKeys.replaceChildren(...rows);
}

function showKeySignature(signature) {
  staff.toggleAttribute('data-key-signature', signature.length > 0);
  keySignature.replaceChildren(...signature.map(({ step, sign }, index) => {
    const mark = document.createElement('span');
    mark.className = 'accidental';
    mark.dataset.sign = sign;
    mark.style.top = staffPosition(step);
    mark.style.left = `${25 + index * 7}%`;
    return mark;
  }));
}

function presentQuestion() {
  const { target, choices: options, writtenAccidental } = questions[index];
  answered = false;
  element('progress').textContent = `Note ${index + 1} of ${LESSON_LENGTH}`;
  staff.style.setProperty('--note-y', staffPosition(target.step));
  notation.classList.toggle('stem-down', target.step >= 4);
  ledgerLine.hidden = target.step !== CLEFS[clefName].ledgerStep;
  if (writtenAccidental === null) delete accidental.dataset.sign;
  else accidental.dataset.sign = writtenAccidental;
  feedback.textContent = '';
  next.hidden = true;
  for (const button of answerButtons) {
    button.removeAttribute('data-result');
    button.removeAttribute('aria-disabled');
  }
  options.forEach((option, optionIndex) => {
    const button = choices[optionIndex];
    button.textContent = option.label;
    button.setAttribute('aria-label', option.spoken);
  });
  staff.focus({ preventScroll: true });
  instrument.play(target.midi);
}

function start() {
  const difficulty = menu.querySelector('input[name="difficulty"]:checked').value;
  const mode = menu.querySelector('input[name="mode"]:checked').value;
  const useKeyboard = mode === 'keyboard';
  letterAnswers.hidden = useKeyboard;
  keyboardAnswers.hidden = !useKeyboard;
  const clef = CLEFS[clefName];
  answerButtons = useKeyboard ? renderKeyboard(clef) : choices;
  lessonLabel = `${DIFFICULTIES[difficulty]} · ${useKeyboard ? 'Keyboard' : 'Letters'} · ${clef.name}`;
  const [seed] = crypto.getRandomValues(new Uint32Array(1));
  questions = createLesson(difficulty, seed, mode, clefName);
  renderClef(staff);
  showKeySignature(questions[0].signature);
  index = 0;
  score = 0;
  lessonReward = null;
  element('level').textContent = lessonLabel;
  show(lesson);
  presentQuestion();
}

function selectAnswer(button, midi) {
  if (lesson.hidden || answered) return;
  const { target } = questions[index];
  const correct = midi === target.midi;
  answered = true;
  if (correct) score++;
  for (const answer of answerButtons) answer.setAttribute('aria-disabled', 'true');
  button.dataset.result = correct ? 'correct' : 'incorrect';
  feedback.textContent = correct ? `Correct! That’s ${target.spoken}.` : `Incorrect. That’s ${target.spoken}.`;
  next.textContent = index + 1 === LESSON_LENGTH ? 'See results' : 'Next note';
  next.hidden = false;
  next.disabled = !muted;
  if (!muted) feedbackTimer = setTimeout(() => { next.disabled = false; }, nextNoteDelayMs(correct));
  instrument.play(midi, correct);
  if (index + 1 === LESSON_LENGTH) lessonReward = studio.earn(score);
}

async function advance() {
  if (lesson.hidden || !answered || next.disabled) return;
  if (index + 1 < LESSON_LENGTH) {
    index++;
    presentQuestion();
    return;
  }
  next.disabled = true;
  const pending = lessonReward;
  const reward = await pending;
  if (lesson.hidden || pending !== lessonReward) return;
  element('final-score').textContent = `${score} of ${LESSON_LENGTH} correct`;
  element('final-level').textContent = lessonLabel;
  show(results);
  element('results-title').focus({ preventScroll: true });
  resultsProgress.present(reward);
}

function returnToMenu() {
  instrument.stop();
  show(menu);
  element('menu-title').focus({ preventScroll: true });
}

function openStudio(from) {
  instrument.stop();
  studioReturn = from;
  studio.open();
  show(studioScreen);
  element('studio-title').focus();
}

element('start').addEventListener('click', start);
element('again').addEventListener('click', start);
element('change-level').addEventListener('click', returnToMenu);
element('results-menu').addEventListener('click', returnToMenu);
element('open-explorer').addEventListener('click', () => {
  renderExplorer();
  show(explorer);
  element('explorer-title').focus({ preventScroll: true });
});
for (const control of clefControls) {
  control.checked = control.value === clefName;
  control.addEventListener('change', () => {
    clefName = control.value;
    for (const input of clefControls) input.checked = input.value === clefName;
    if (!explorer.hidden) renderExplorer();
  });
}
element('explorer-back').addEventListener('click', () => {
  clearTimeout(letterTimer);
  instrument.stop();
  show(menu);
  element('open-explorer').focus({ preventScroll: true });
});
element('menu-studio').addEventListener('click', () => openStudio(menu));
element('results-studio').addEventListener('click', () => openStudio(results));
element('studio-back').addEventListener('click', () => {
  show(studioReturn);
  element(studioReturn === menu ? 'menu-studio' : 'results-studio').focus();
});
next.addEventListener('click', advance);
staff.addEventListener('click', () => instrument.play(questions[index].target.midi));
choices.forEach((button, optionIndex) => {
  button.addEventListener('click', () => selectAnswer(button, questions[index].choices[optionIndex].midi));
});
function renderKeyboard({ keyboardStart, keyboardEnd }) {
  const leftKey = octaveLayout[keyboardStart % 12];
  const startOctave = Math.floor(keyboardStart / 12);
  const keys = Array.from({ length: keyboardEnd - keyboardStart + 1 }, (_, offset) => {
    const midi = keyboardStart + offset;
    const { names, position } = octaveLayout[midi % 12];
    const octave = Math.floor(midi / 12);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = names.length === 2 ? 'piano-key black-key' : 'piano-key';
    const label = midi === MIDDLE_C_MIDI ? 'Middle C' : names.map(name => `${name} ${octave - 1}`).join(' or ');
    button.setAttribute('aria-label', label);
    button.style.setProperty('--key-position', position - leftKey.position + 7 * (octave - startOctave));
    button.addEventListener('click', () => selectAnswer(button, midi));
    return button;
  });
  keyboardAnswers.replaceChildren(...keys);
  keyboardAnswers.style.setProperty('--left-edge', leftKey.names.length === 2 ? .4 : 0);
  keyboardAnswers.style.setProperty('--white-keys', keyboardAnswers.querySelectorAll('.piano-key:not(.black-key)').length);
  return keys;
}
element('mute').addEventListener('click', event => {
  muted = !muted;
  event.currentTarget.setAttribute('aria-pressed', String(muted));
  instrument.setMuted(muted);
  if (muted) {
    clearTimeout(feedbackTimer);
    next.disabled = false;
  }
});
document.addEventListener('keydown', event => {
  if (lesson.hidden || letterAnswers.hidden || event.repeat || event.altKey || event.ctrlKey ||
      event.metaKey || !/^[1-3]$/.test(event.key)) return;
  choices[Number(event.key) - 1].click();
});
window.addEventListener('pagehide', () => {
  resultsProgress.finish();
  instrument.stop();
});
