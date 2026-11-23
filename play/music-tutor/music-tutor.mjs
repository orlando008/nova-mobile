import {
  createLesson, DIFFICULTIES, LESSON_LENGTH, MIDDLE_C_MIDI, MIDDLE_C_STEP, KEYBOARD_END_MIDI,
} from '../../carts/music-tutor/code.js?v=full-staff';
import { createInstrument, feedbackDurationMs } from './audio.mjs?v=chime';
import { createStudio } from './studio.mjs?v=previews';

const element = id => document.getElementById(id);
const menu = element('menu');
const lesson = element('lesson');
const results = element('results');
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

function show(screen) {
  clearTimeout(feedbackTimer);
  menu.hidden = screen !== menu;
  lesson.hidden = screen !== lesson;
  results.hidden = screen !== results;
  studioScreen.hidden = screen !== studioScreen;
}

const staffPosition = step => `${82 - step * 7}%`;

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
  ledgerLine.hidden = target.step !== MIDDLE_C_STEP;
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
  answerButtons = useKeyboard ? keys : choices;
  lessonLabel = `${DIFFICULTIES[difficulty]} · ${useKeyboard ? 'Keyboard' : 'Letters'}`;
  const [seed] = crypto.getRandomValues(new Uint32Array(1));
  questions = createLesson(difficulty, seed, mode);
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
  if (!muted) feedbackTimer = setTimeout(() => { next.disabled = false; }, feedbackDurationMs(correct));
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
  element('lesson-xp').textContent = `+${reward.xp} XP`;
  const levelReward = element('level-reward');
  levelReward.hidden = reward.levels === 0;
  const points = `+${reward.levels} studio point${reward.levels === 1 ? '' : 's'}`;
  levelReward.textContent = `Level ${reward.level} · ${points}${reward.rank ? ` · New rank: ${reward.rank}` : ''}`;
  show(results);
  element('results-title').focus({ preventScroll: true });
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
const keys = Array.from({ length: KEYBOARD_END_MIDI - MIDDLE_C_MIDI + 1 }, (_, offset) => {
  const { names, position } = octaveLayout[offset % octaveLayout.length];
  const midi = MIDDLE_C_MIDI + offset;
  const octave = Math.floor(midi / 12) - 1;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = names.length === 2 ? 'piano-key black-key' : 'piano-key';
  const label = offset === 0 ? 'Middle C' : names.map(name => `${name} ${octave}`).join(' or ');
  button.setAttribute('aria-label', label);
  button.style.setProperty('--key-position', position + 7 * Math.floor(offset / octaveLayout.length));
  button.addEventListener('click', () => selectAnswer(button, midi));
  return button;
});
keyboardAnswers.replaceChildren(...keys);
keyboardAnswers.style.setProperty('--white-keys', keyboardAnswers.querySelectorAll('.piano-key:not(.black-key)').length);
element('mute').addEventListener('click', event => {
  muted = !muted;
  event.currentTarget.setAttribute('aria-pressed', String(muted));
  instrument.setMuted(muted);
  if (muted) next.disabled = false;
});
document.addEventListener('keydown', event => {
  if (lesson.hidden || letterAnswers.hidden || event.repeat || event.altKey || event.ctrlKey ||
      event.metaKey || !/^[1-3]$/.test(event.key)) return;
  choices[Number(event.key) - 1].click();
});
window.addEventListener('pagehide', instrument.stop);
