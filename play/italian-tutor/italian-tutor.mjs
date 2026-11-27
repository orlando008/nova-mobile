import {
  createLesson, currentStreak, fillSentence, finishLesson, MASTERED_BOX, progressSummary, readProgress,
  recordAnswer, ruleStatus, togglePin, trickiestRules, atSentenceStart, capitalize,
} from '../../carts/italian-tutor/code.js?v=1';
import { RULES, TOPICS } from '../../carts/italian-tutor/assets/bank.mjs?v=1';

const STORAGE_KEY = 'nova-mobile.italian-tutor.progress';
const element = id => document.getElementById(id);
const screens = ['home', 'quiz', 'results', 'rules', 'rule'].map(element);
const ruleById = new Map(RULES.map(rule => [rule.id, rule]));
const topicById = new Map(TOPICS.map(topic => [topic.id, topic]));
const voice = 'speechSynthesis' in window ? window.speechSynthesis : null;

let progress = load();
let lesson = null;
let ruleReturn = 'rules';
let openRuleId = null;

function load() {
  try {
    return readProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)), RULES);
  } catch {
    return readProgress(null, RULES);
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private browsing can refuse storage; the session still works.
  }
}

function today() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function show(id, focus) {
  for (const screen of screens) screen.hidden = screen.id !== id;
  element('home-button').hidden = id === 'home';
  element('rules-button').hidden = id === 'rules' || id === 'quiz';
  voice?.cancel();
  window.scrollTo(0, 0);
  (focus ?? element(id).querySelector('h1'))?.focus({ preventScroll: true });
}

function dots(box) {
  const wrap = make('span', 'dots');
  wrap.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 5; index++) wrap.append(make('i', index < box ? 'on' : ''));
  return wrap;
}

function describe(status) {
  if (!status.seen) return status.pinned ? 'New · marked tricky' : 'New';
  const record = `${Math.round(status.accuracy * 100)}% of ${status.seen}`;
  return `${status.label} · ${record}${status.pinned ? ' · marked tricky' : ''}`;
}

function ruleRow(rule, onClick, extra) {
  const status = ruleStatus(progress, rule.id);
  const item = make('li');
  const button = make('button', 'rule-row');
  button.type = 'button';
  button.dataset.level = status.level;
  const copy = make('span', 'rule-copy');
  copy.append(make('strong', '', rule.title), make('small', '', extra ?? describe(status)));
  button.append(copy, dots(status.box));
  if (status.pinned) button.append(make('span', 'pin-mark', '★'));
  button.addEventListener('click', onClick);
  item.append(button);
  return item;
}

// Home

function renderHome() {
  const summary = progressSummary(progress);
  element('stat-level').textContent = `Level ${summary.level}`;
  element('stat-rank').textContent = summary.rank;
  element('stat-meter').style.transform = `scaleX(${summary.levelXP / summary.goal})`;
  element('stat-streak').textContent = currentStreak(progress, today());
  const mastered = RULES.filter(rule => (progress.rules[rule.id]?.box ?? 0) >= MASTERED_BOX).length;
  element('stat-mastered').textContent = `${mastered} / ${RULES.length}`;

  const tricky = trickiestRules(progress, RULES);
  element('review-detail').textContent = tricky.length
    ? `Focus: ${tricky.slice(0, 3).map(({ rule }) => rule.title).join(' · ')}`
    : 'Ten questions from every topic. Your misses will shape the next review.';

  element('topic-list').replaceChildren(...TOPICS.map(topic => {
    const rules = RULES.filter(rule => rule.topic === topic.id);
    const boxes = rules.reduce((sum, rule) => sum + (progress.rules[rule.id]?.box ?? 0), 0);
    const button = make('button', 'topic');
    button.type = 'button';
    button.dataset.topic = topic.id;
    const copy = make('span', 'topic-copy');
    copy.append(make('span', 'topic-italian', topic.italian), make('strong', '', topic.name),
      make('small', '', topic.blurb));
    const meter = make('span', 'meter');
    const fill = make('span');
    fill.style.transform = `scaleX(${boxes / (rules.length * 5)})`;
    meter.append(fill);
    meter.setAttribute('aria-hidden', 'true');
    copy.append(meter);
    button.append(copy, make('span', 'go', '›'));
    button.setAttribute('aria-label', `${topic.name}: ${topic.italian}. ${rules.length} rules.`);
    button.addEventListener('click', () => start(topic.id));
    return button;
  }));

  element('tricky').hidden = !tricky.length;
  element('tricky-list').replaceChildren(...tricky.map(({ rule }) =>
    ruleRow(rule, () => openRule(rule.id, 'home'))));
}

// Lessons

function start(focus) {
  const [seed] = crypto.getRandomValues(new Uint32Array(1));
  const questions = createLesson(RULES, { focus, seed, progress });
  lesson = {
    focus,
    queue: questions.map(question => ({ question, retry: false })),
    total: questions.length,
    position: 0,
    firstTry: 0,
    answered: false,
    touched: new Map(),
    boxesBefore: Object.fromEntries(RULES.map(rule => [rule.id, progress.rules[rule.id]?.box ?? 0])),
  };
  element('quiz-title').textContent = focus === 'review' ? 'Ripasso mirato'
    : topicById.get(focus)?.name ?? ruleById.get(focus).title;
  show('quiz', element('sentence'));
  present();
}

function renderSentence(question, filled) {
  const sentence = element('sentence');
  const { before, word, after } = filled ? fillSentence(question.sentence, question.answer)
    : { before: question.sentence.split('___')[0], word: '', after: question.sentence.split('___')[1] ?? '' };
  const blank = make('span', filled ? 'blank filled' : 'blank', filled ? word : '');
  if (!filled) blank.setAttribute('aria-label', 'blank');
  sentence.replaceChildren(before, blank, after);
}

function present() {
  const { question, retry } = lesson.queue[lesson.position];
  lesson.answered = false;
  const done = lesson.position;
  element('quiz-count').textContent = `${Math.min(done + 1, lesson.queue.length)} / ${lesson.queue.length}`;
  element('quiz-progress').style.transform = `scaleX(${done / lesson.queue.length})`;
  element('retry-note').hidden = !retry;
  renderSentence(question, false);
  element('english').textContent = question.english;
  const capital = atSentenceStart(question.sentence.split('___')[0]);
  element('choices').replaceChildren(...question.choices.map((choice, index) => {
    const button = make('button', 'choice');
    button.type = 'button';
    button.lang = 'it';
    button.dataset.choice = choice;
    button.append(make('span', 'key', String(index + 1)), make('span', '', capital ? capitalize(choice) : choice));
    button.addEventListener('click', () => answer(choice));
    return button;
  }));
  element('feedback').hidden = true;
  element('next').hidden = true;
  element('sentence').focus({ preventScroll: true });
}

function answer(choice) {
  if (!lesson || lesson.answered) return;
  const entry = lesson.queue[lesson.position];
  const { question } = entry;
  const correct = choice === question.answer;
  lesson.answered = true;
  progress = recordAnswer(progress, question, correct);
  save();
  if (correct && !entry.retry) lesson.firstTry++;
  const tally = lesson.touched.get(question.rule) ?? { right: 0, tries: 0 };
  lesson.touched.set(question.rule, { right: tally.right + (correct ? 1 : 0), tries: tally.tries + 1 });
  if (!correct && !entry.retry) lesson.queue.push({ question, retry: true });

  for (const button of element('choices').children) {
    button.disabled = true;
    if (button.dataset.choice === question.answer) button.dataset.result = 'correct';
    else if (button.dataset.choice === choice) button.dataset.result = 'wrong';
  }
  renderSentence(question, true);
  element('sentence').dataset.result = correct ? 'correct' : 'wrong';
  const rule = ruleById.get(question.rule);
  const praise = ['Esatto!', 'Perfetto!', 'Bravo!', 'Giusto!'][lesson.position % 4];
  const { before, word, after } = fillSentence(question.sentence, question.answer);
  element('feedback-head').textContent = correct ? praise
    : `Not quite. It’s “${word}”${entry.retry ? '.' : ', and this one will come back at the end.'}`;
  element('feedback').dataset.result = correct ? 'correct' : 'wrong';
  element('feedback-chip').textContent = rule.title;
  element('feedback-explain').textContent = correct ? rule.summary : rule.explain;
  element('feedback').hidden = false;
  element('speak').hidden = !voice;
  element('speak').onclick = () => speak(before + word + after);
  element('quiz-progress').style.transform = `scaleX(${(lesson.position + 1) / lesson.queue.length})`;
  element('quiz-count').textContent = `${lesson.position + 1} / ${lesson.queue.length}`;
  const next = element('next');
  next.textContent = lesson.position + 1 < lesson.queue.length ? 'Continue' : 'See results';
  next.hidden = false;
  next.focus({ preventScroll: true });
}

function speak(text) {
  if (!voice) return;
  voice.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'it-IT';
  utterance.rate = .92;
  const italian = voice.getVoices().find(option => option.lang?.toLowerCase().startsWith('it'));
  if (italian) utterance.voice = italian;
  voice.speak(utterance);
}

function advance() {
  if (!lesson?.answered) return;
  delete element('sentence').dataset.result;
  if (++lesson.position < lesson.queue.length) {
    present();
    return;
  }
  finish();
}

function finish() {
  const reward = finishLesson(progress, lesson.firstTry, today());
  progress = reward.progress;
  save();
  const { firstTry, total } = lesson;
  const ratio = firstTry / total;
  element('results-badge').textContent = ratio === 1 ? '★' : ratio >= .7 ? '✓' : '↻';
  element('results-title').textContent = ratio === 1 ? 'Perfetto!' : ratio >= .7 ? 'Ben fatto!' : 'Keep going!';
  element('results-score').textContent = `${firstTry} of ${total} right on the first try`;
  const levelNote = reward.levels ? ` · Level ${progressSummary(progress).level}!` : '';
  const rankNote = reward.rank ? ` You’re now a ${reward.rank}.` : '';
  element('results-xp').textContent = `+${reward.xp} XP${levelNote}${rankNote}`;
  element('results-rules').replaceChildren(...[...lesson.touched].map(([id, { right, tries }]) => {
    const before = lesson.boxesBefore[id];
    const after = progress.rules[id]?.box ?? 0;
    const trend = after > before ? '▲ stronger' : after < before ? '▼ needs work' : '● steady';
    return ruleRow(ruleById.get(id), () => openRule(id, 'results'), `${right} / ${tries} right · ${trend}`);
  }));
  show('results');
}

// Rule book

function renderRules() {
  element('rules-groups').replaceChildren(...TOPICS.map(topic => {
    const group = make('section', 'rule-group');
    const heading = make('h2', 'section-title');
    heading.append(topic.name, make('span', 'section-italian', ` · ${topic.italian}`));
    const list = make('ul', 'rule-list');
    list.append(...RULES.filter(rule => rule.topic === topic.id).map(rule =>
      ruleRow(rule, () => openRule(rule.id, 'rules'))));
    const drill = make('button', 'ghost wide', `Practice all ${topic.name.toLowerCase()}`);
    drill.type = 'button';
    drill.addEventListener('click', () => start(topic.id));
    group.append(heading, list, drill);
    return group;
  }));
}

function renderRule(id) {
  const rule = ruleById.get(id);
  const status = ruleStatus(progress, id);
  element('rule-topic').textContent = topicById.get(rule.topic).name;
  element('rule-title').textContent = rule.title;
  element('rule-summary').textContent = rule.summary;
  element('rule-dots').replaceChildren(...dots(status.box).children);
  element('rule-record').textContent = describe(status);
  element('rule-explain').textContent = rule.explain;
  element('rule-table').replaceChildren(...rule.table.map(([form, meaning]) => {
    const row = make('tr');
    row.append(make('th', '', form), make('td', '', meaning));
    return row;
  }));
  element('rule-examples').replaceChildren(...rule.examples.map(([italian, english]) => {
    const item = make('li');
    const line = make('span', 'example-it', italian);
    line.lang = 'it';
    item.append(line, make('span', 'example-en', english));
    if (voice) {
      const play = make('button', 'speak-mini', '🔊');
      play.type = 'button';
      play.setAttribute('aria-label', `Listen: ${italian}`);
      play.addEventListener('click', () => speak(italian.replace(/→.*$/, '')));
      item.append(play);
    }
    return item;
  }));
  const pin = element('rule-pin');
  pin.setAttribute('aria-pressed', String(status.pinned));
  pin.textContent = status.pinned ? '★ Marked as tricky' : '☆ Mark as tricky';
}

function openRule(id, from) {
  openRuleId = id;
  ruleReturn = from;
  renderRule(id);
  show('rule');
}

function goHome() {
  lesson = null;
  renderHome();
  show('home');
}

function goRules() {
  lesson = null;
  renderRules();
  show('rules');
}

element('review-start').addEventListener('click', () => start('review'));
element('home-button').addEventListener('click', goHome);
element('rules-button').addEventListener('click', goRules);
element('results-home').addEventListener('click', goHome);
element('again').addEventListener('click', () => start(lesson.focus));
element('next').addEventListener('click', advance);
element('open-rule').addEventListener('click', () => {
  const { question } = lesson.queue[lesson.position];
  openRule(question.rule, 'quiz');
});
element('rule-drill').addEventListener('click', () => start(openRuleId));
element('rule-pin').addEventListener('click', () => {
  progress = togglePin(progress, openRuleId);
  save();
  renderRule(openRuleId);
});
element('rule-back').addEventListener('click', () => {
  if (ruleReturn === 'quiz' && lesson) {
    show('quiz', element('next'));
    return;
  }
  if (ruleReturn === 'results' && lesson) {
    show('results');
    return;
  }
  if (ruleReturn === 'home') goHome();
  else goRules();
});

document.addEventListener('keydown', event => {
  if (element('quiz').hidden || !lesson || event.metaKey || event.ctrlKey || event.altKey) return;
  const index = Number(event.key) - 1;
  if (!lesson.answered && index >= 0 && index < 4) {
    const button = element('choices').children[index];
    if (button) answer(button.dataset.choice);
  } else if (lesson.answered && event.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') {
    advance();
  }
});

voice?.getVoices();
renderHome();
