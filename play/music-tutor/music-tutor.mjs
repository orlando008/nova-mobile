import { createLesson, DIFFICULTIES, LESSON_LENGTH } from '../../carts/music-tutor/code.js';
import { createInstrument, FEEDBACK_DURATION_MS } from './audio.mjs';

const element = id => document.getElementById(id);
const menu = element('menu');
const lesson = element('lesson');
const results = element('results');
const staff = element('staff');
const notation = staff.querySelector('.notation');
const accidental = element('accidental');
const feedback = element('feedback');
const next = element('next');
const choices = [...document.querySelectorAll('.choice')];
const instrument = createInstrument();

let difficulty;
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

function presentQuestion() {
  const { target, choices: options } = questions[index];
  answered = false;
  element('progress').textContent = `Note ${index + 1} of ${LESSON_LENGTH}`;
  notation.style.setProperty('--note-y', `${82 - target.step * 7}%`);
  notation.classList.toggle('stem-down', target.step >= 4);
  accidental.dataset.sign = target.accidental;
  feedback.textContent = '';
  next.hidden = true;
  choices.forEach((button, optionIndex) => {
    button.textContent = options[optionIndex].label;
    button.setAttribute('aria-label', options[optionIndex].spoken);
    button.removeAttribute('data-result');
    button.removeAttribute('aria-disabled');
  });
  staff.focus({ preventScroll: true });
  instrument.play(target.midi);
}

function start() {
  const selection = menu.querySelector('input:checked');
  difficulty = selection.value;
  const [seed] = crypto.getRandomValues(new Uint32Array(1));
  questions = createLesson(difficulty, seed);
  index = 0;
  score = 0;
  element('level').textContent = DIFFICULTIES[difficulty];
  show(lesson);
  presentQuestion();
}

function selectAnswer(optionIndex) {
  if (lesson.hidden || answered) return;
  const { target, choices: options } = questions[index];
  const option = options[optionIndex];
  const correct = option.label === target.label;
  answered = true;
  if (correct) score++;
  choices.forEach(button => button.setAttribute('aria-disabled', 'true'));
  choices[optionIndex].dataset.result = correct ? 'correct' : 'incorrect';
  feedback.textContent = correct ? `Correct! That’s ${target.spoken}.` : `Incorrect. That’s ${target.spoken}.`;
  next.textContent = index + 1 === LESSON_LENGTH ? 'See results' : 'Next note';
  next.hidden = false;
  next.disabled = !muted;
  if (!muted) feedbackTimer = setTimeout(() => { next.disabled = false; }, FEEDBACK_DURATION_MS);
  instrument.play(option.midi, correct);
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
  element('final-level').textContent = DIFFICULTIES[difficulty];
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
choices.forEach((button, optionIndex) => button.addEventListener('click', () => selectAnswer(optionIndex)));
element('mute').addEventListener('click', event => {
  muted = !muted;
  event.currentTarget.setAttribute('aria-pressed', String(muted));
  instrument.setMuted(muted);
  if (muted) next.disabled = false;
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !/^[1-3]$/.test(event.key)) return;
  selectAnswer(Number(event.key) - 1);
});
window.addEventListener('pagehide', instrument.stop);
