import { createRound, MODES } from '../../carts/global-citizen/code.js?v=3';
import { COUNTRIES } from '../../carts/global-citizen/assets/countries.mjs?v=1';
import { createMap } from './map.mjs?v=4';
import { silhouetteOutline } from './silhouette.mjs?v=1';

const element = id => document.getElementById(id);
const menu = element('menu');
const quiz = element('quiz');
const results = element('results');
const menuButton = element('menu-button');
const regionInput = element('region');
const prompt = element('prompt');
const answers = element('answers');
const feedback = element('feedback');
const next = element('next');
const mapQuestion = element('map-question');
const mapLoading = element('map-loading');
const retryMap = element('retry-map');
const flagQuestion = element('flag-question');
const flag = element('flag');
const mapSurface = element('map');
const silhouette = element('silhouette');
const silhouettePath = silhouette.querySelector('path');
const map = createMap(mapSurface, {
  in: element('zoom-in'), out: element('zoom-out'), reset: element('reset-map'),
}, COUNTRIES, submitAnswer);
const outlinesURL = new URL('../../carts/global-citizen/assets/map.json?v=2', import.meta.url);

let mode;
let region;
let questions;
let position;
let score;
let answered;
let requestId = 0;
let outlinesRequest;
let mapLoaded = false;

function show(screen, heading) {
  menu.hidden = screen !== menu;
  quiz.hidden = screen !== quiz;
  results.hidden = screen !== results;
  menuButton.hidden = screen === menu;
  heading?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

async function showGeography(country) {
  const request = ++requestId;
  const isMap = mode === 'countries';
  const controls = element('map-controls');
  controls.hidden = true;
  mapLoading.hidden = false;
  retryMap.hidden = true;
  feedback.textContent = '';
  delete feedback.dataset.result;
  outlinesRequest ??= fetch(outlinesURL).then(response => {
    if (!response.ok) throw new Error('Could not load the country outlines.');
    return response.json();
  }).catch(error => {
    outlinesRequest = undefined;
    throw error;
  });
  try {
    const outlines = await outlinesRequest;
    if (quiz.hidden || request !== requestId) return;
    if (isMap) {
      if (!mapLoaded) {
        map.load(outlines);
        mapLoaded = true;
      }
      map.start(country);
      controls.hidden = false;
    } else {
      const outline = outlines.find(([id]) => id === country.id)[2];
      const { path, viewBox } = silhouetteOutline(outline, country);
      silhouette.setAttribute('viewBox', viewBox.join(' '));
      silhouettePath.setAttribute('d', path);
      answers.hidden = false;
    }
  } catch {
    if (quiz.hidden || request !== requestId) return;
    retryMap.hidden = false;
    feedback.dataset.result = 'error';
    feedback.textContent = isMap ? 'The map could not load. Try again.' : 'The country outline could not load. Try again.';
  } finally {
    if (request === requestId) mapLoading.hidden = true;
  }
}

function presentQuestion() {
  const question = questions[position];
  const { country, options } = question;
  answered = false;
  next.hidden = true;
  next.textContent = position + 1 === questions.length ? 'See results' : 'Next question';
  feedback.textContent = '';
  delete feedback.dataset.result;
  prompt.textContent = question.prompt;
  element('count').textContent = `${position + 1} / ${questions.length}`;
  element('progress').max = questions.length;
  element('progress').value = position;
  if (mode !== 'countries') {
    if (mode === 'flags') {
      const x = (country.flag % 13) / 12 * 100;
      const y = Math.floor(country.flag / 13) / 14 * 100;
      flag.style.backgroundPosition = `${x}% ${y}%`;
      flag.setAttribute('aria-label', 'Flag to identify');
    }
    answers.replaceChildren(...options.map(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'answer';
      button.textContent = option;
      button.addEventListener('click', () => submitAnswer(option, option));
      return button;
    }));
  }
  if (mode === 'silhouette') {
    answers.hidden = true;
    silhouettePath.removeAttribute('d');
    silhouette.setAttribute('aria-label', 'Country outline to identify');
  }
  if (!mapQuestion.hidden) void showGeography(country);
  const questionStart = mode === 'flags' ? flag : prompt;
  questionStart.focus({ preventScroll: true });
}

function start(nextMode, nextRegion) {
  mode = nextMode;
  region = nextRegion;
  const [seed] = crypto.getRandomValues(new Uint32Array(1));
  questions = createRound(COUNTRIES, { mode, region, seed });
  score = position = 0;
  element('mode-title').textContent = MODES[mode];
  element('quiz-region').textContent = region;
  prompt.hidden = mode === 'flags';
  const isMap = mode === 'countries';
  const isSilhouette = mode === 'silhouette';
  mapQuestion.hidden = !isMap && !isSilhouette;
  mapSurface.toggleAttribute('hidden', !isMap);
  element('map-hint').hidden = !isMap;
  silhouette.toggleAttribute('hidden', !isSilhouette);
  flagQuestion.hidden = mode !== 'flags';
  answers.hidden = isMap;
  retryMap.hidden = true;
  show(quiz);
  presentQuestion();
}

function submitAnswer(chosen, name) {
  if (quiz.hidden || answered || (!mapQuestion.hidden && (!mapLoading.hidden || !retryMap.hidden))) return;
  const { country, answer } = questions[position];
  const isMap = mode === 'countries';
  const correct = chosen === (isMap ? country.id : answer);
  answered = true;
  if (correct) score++;
  if (isMap) map.reveal(country, chosen);
  else {
    for (const button of answers.children) {
      button.setAttribute('aria-disabled', 'true');
      if (button.textContent === answer) button.dataset.result = 'correct';
      else if (button.textContent === chosen) button.dataset.result = 'wrong';
    }
  }
  if (mode === 'flags') flag.setAttribute('aria-label', `Flag of ${country.name}`);
  if (mode === 'silhouette') silhouette.setAttribute('aria-label', `Outline of ${country.name}`);
  feedback.dataset.result = correct ? 'correct' : 'wrong';
  const correctName = isMap ? country.name : answer;
  feedback.textContent = correct
    ? `Correct! ${correctName}.`
    : `You chose ${name}. The answer is ${correctName}.`;
  element('progress').value = position + 1;
  next.hidden = false;
}

function returnToMenu() {
  ++requestId;
  show(menu, element('title'));
}

for (const button of menu.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => start(button.dataset.mode, regionInput.value));
}
element('again').addEventListener('click', () => start(mode, region));
element('back').addEventListener('click', returnToMenu);
menuButton.addEventListener('click', returnToMenu);
retryMap.addEventListener('click', () => { void showGeography(questions[position].country); });
next.addEventListener('click', () => {
  if (!answered || quiz.hidden) return;
  if (++position < questions.length) {
    presentQuestion();
    return;
  }
  element('result-score').textContent = `${score} of ${questions.length} correct`;
  element('result-round').textContent = `${MODES[mode]} · ${region}`;
  show(results, element('results-title'));
});
