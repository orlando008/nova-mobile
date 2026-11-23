import { createLesson, DIFFICULTIES, LESSON_LENGTH } from '../../carts/music-tutor/code.js?v=key-signatures';
import { createInstrument, FEEDBACK_DURATION_MS } from './audio.mjs';

const element = id => document.getElementById(id);
const menu = element('menu');
const lesson = element('lesson');
const results = element('results');
const staff = element('staff');
const notation = staff.querySelector('.notation');
const accidental = element('accidental');
const keySignature = element('key-signature');
const feedback = element('feedback');
const next = element('next');
const letterAnswers = element('letter-answers');
const keyboardAnswers = element('keyboard-answers');
const choices = [...document.querySelectorAll('.choice')];
const instrument = createInstrument();
const keyLayout = [
  { name: 'C', position: 0 },
  { name: 'C sharp or D flat', position: 1, black: true },
  { name: 'D', position: 1 },
  { name: 'D sharp or E flat', position: 2, black: true },
  { name: 'E', position: 2 },
  { name: 'F', position: 3 },
  { name: 'F sharp or G flat', position: 4, black: true },
  { name: 'G', position: 4 },
  { name: 'G sharp or A flat', position: 5, black: true },
  { name: 'A', position: 5 },
  { name: 'A sharp or B flat', position: 6, black: true },
  { name: 'B', position: 6 },
];

let lessonLabel;
let answerButtons;
let questions;
let index;
let score;
let answered;
let muted = false;
let feedbackTimer;

function show(screen) {
  clearTimeout(feedbackTimer);
  menu.hidden = screen !== menu;
  lesson.hidden = screen !== lesson;
  results.hidden = screen !== results;
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
  if (writtenAccidental === null) delete accidental.dataset.sign;
  else accidental.dataset.sign = writtenAccidental;
  feedback.textContent = '';
  next.hidden = true;
  for (const button of answerButtons) {
    button.removeAttribute('data-result');
    button.removeAttribute('aria-disabled');
  }
  choices.forEach((button, optionIndex) => {
    button.textContent = options[optionIndex].label;
    button.setAttribute('aria-label', options[optionIndex].spoken);
  });
  staff.focus({ preventScroll: true });
  instrument.play(target.midi);
}

function start() {
  const difficulty = menu.querySelector('input[name="difficulty"]:checked').value;
  const useKeyboard = menu.querySelector('input[name="mode"]:checked').value === 'keyboard';
  letterAnswers.hidden = useKeyboard;
  keyboardAnswers.hidden = !useKeyboard;
  answerButtons = useKeyboard ? keys : choices;
  lessonLabel = `${DIFFICULTIES[difficulty]} · ${useKeyboard ? 'Keyboard' : 'Letters'}`;
  const [seed] = crypto.getRandomValues(new Uint32Array(1));
  questions = createLesson(difficulty, seed);
  showKeySignature(questions[0].signature);
  index = 0;
  score = 0;
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
  if (!muted) feedbackTimer = setTimeout(() => { next.disabled = false; }, FEEDBACK_DURATION_MS);
  instrument.play(midi, correct);
}

function advance() {
  if (lesson.hidden || !answered) return;
  index++;
  if (index < LESSON_LENGTH) {
    presentQuestion();
    return;
  }
  // Let the final answer's feedback finish while the results come into view.
  element('final-score').textContent = `${score} of ${LESSON_LENGTH} correct`;
  element('final-level').textContent = lessonLabel;
  show(results);
  element('results-title').focus({ preventScroll: true });
}

function returnToMenu() {
  instrument.stop();
  show(menu);
  element('menu-title').focus({ preventScroll: true });
}

element('start').addEventListener('click', start);
element('again').addEventListener('click', start);
element('change-level').addEventListener('click', returnToMenu);
element('results-menu').addEventListener('click', returnToMenu);
next.addEventListener('click', advance);
staff.addEventListener('click', () => instrument.play(questions[index].target.midi));
choices.forEach((button, optionIndex) => {
  button.addEventListener('click', () => selectAnswer(button, questions[index].choices[optionIndex].midi));
});
const keys = keyLayout.map(({ name, position, black }, pitchClass) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = black ? 'piano-key black-key' : 'piano-key';
  button.setAttribute('aria-label', name);
  button.style.setProperty('--key-position', position);
  button.addEventListener('click', () => {
    const { target } = questions[index];
    const octaveStart = target.midi - target.midi % 12;
    selectAnswer(button, octaveStart + pitchClass);
  });
  return button;
});
keyboardAnswers.replaceChildren(...keys);
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
