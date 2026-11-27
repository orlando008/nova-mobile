import {
  cases, isCaseUnlocked, newInvestigation, isClueAvailable, hearClue, pinClue,
  currentDeduction, missingEvidence, submitDeduction,
} from '../../carts/italian-detective/code.js';

const assets = '../../carts/italian-detective/assets/';
const game = document.querySelector('#game');
const casebookBack = document.querySelector('#casebook-back');
const saveNotice = document.querySelector('#save-notice');
const audioNotice = document.querySelector('#audio-notice');
const tabs = [
  ['interview', 'Interview'],
  ['board', 'Case Board'],
  ['deduction', 'Deduction'],
];
const portraits = cases.flatMap(file => file.witnesses);
const completed = new Set();
const saveKey = id => 'nova-mobile.italian-detective.completed.' + id;

let investigation;
let caseIndex;
let view = 'casebook';
let witnessId;
let line;
let audio;
let showTranscript = false;
let showGloss = false;
let sequence = [];
let result;

try {
  for (const file of cases) {
    if (localStorage.getItem(saveKey(file.id)) === 'yes') completed.add(file.id);
  }
} catch {
  saveNotice.hidden = false;
}

function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content) element.textContent = content;
  return element;
}

function italian(tag, className, content) {
  const element = node(tag, className, content);
  element.lang = 'it';
  return element;
}

function button(label, className, action) {
  const element = node('button', className, label);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}

function focusOn(element) {
  element.focus({ preventScroll: true });
  if (!element.classList.contains('sr-only')) element.scrollIntoView({ block: 'nearest' });
}

function render(focusId) {
  casebookBack.hidden = view === 'casebook';
  if (view === 'casebook') game.replaceChildren(renderCasebook());
  else if (view === 'solved') game.replaceChildren(renderSolved());
  else {
    const file = investigation.file;
    const header = node('div', 'case-heading');
    header.append(
      node('p', 'eyebrow', file.setting),
      italian('h2', '', file.title),
    );

    const nav = node('nav', 'tabs');
    nav.setAttribute('aria-label', 'Investigation');
    for (const [id, label] of tabs) {
      const tab = button(label, 'tab', () => openView(id));
      tab.id = 'tab-' + id;
      if (id === view) tab.setAttribute('aria-current', 'page');
      nav.append(tab);
    }

    const panel = node('section', 'case-panel');
    const heading = node('h3', 'sr-only', tabs.find(([id]) => id === view)[1]);
    heading.id = 'view-title';
    heading.tabIndex = -1;
    panel.setAttribute('aria-labelledby', heading.id);
    panel.append(heading);
    if (view === 'interview') renderInterview(panel);
    if (view === 'board') renderBoard(panel);
    if (view === 'deduction') renderDeduction(panel);
    game.replaceChildren(header, nav, panel);
  }
  if (focusId) focusOn(document.getElementById(focusId));
}

function title(text) {
  const element = node('h2', '', text);
  element.id = 'view-title';
  element.tabIndex = -1;
  return element;
}

function renderCasebook() {
  const panel = node('section', 'casebook');
  panel.setAttribute('aria-labelledby', 'view-title');
  const list = node('ol', 'case-list');
  for (const [index, file] of cases.entries()) {
    const unlocked = isCaseUnlocked(index, completed);
    const solved = completed.has(file.id);
    const row = node('li', 'case-entry');
    const card = button('', 'case-card', () => startCase(index));
    card.disabled = !unlocked;
    const name = node('span', 'case-name');
    name.append(
      italian('strong', '', file.title),
      node('span', 'translation', file.englishTitle),
      node('small', '', unlocked ? file.focus : 'Solve the previous case to unlock'),
    );
    card.append(name, node('span', solved ? 'badge solved-badge' : 'badge', solved ? 'Solved' : unlocked ? 'Open' : 'Locked'));
    row.append(card);
    list.append(row);
  }
  panel.append(
    title('Casebook'),
    node('p', 'intro', 'Listen to the witnesses in Italian. Pin the clues and piece together what happened.'),
    list,
  );
  return panel;
}

function startCase(index) {
  if (!isCaseUnlocked(index, completed)) return;
  caseIndex = index;
  investigation = newInvestigation(cases[index]);
  witnessId = investigation.file.witnesses[0].id;
  line = null;
  sequence = [];
  result = null;
  openView('interview');
  window.scrollTo(0, 0);
}

function openView(next, focusId = 'view-title') {
  stopAudio();
  if (view === 'deduction' && next !== 'deduction' && result?.correct) result = null;
  view = next;
  render(focusId);
  if (next === 'casebook' || next === 'solved') window.scrollTo(0, 0);
}

function selectLine(clue) {
  line = clue;
  showTranscript = false;
  showGloss = false;
  witnessId = clue.witness;
}

function askQuestion(clue) {
  if (!hearClue(investigation, clue.id)) return;
  selectLine(clue);
  playLine(1);
  render('replay');
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio = null;
  }
  audioNotice.textContent = '';
  audioNotice.className = 'sr-only';
}

function playLine(rate) {
  stopAudio();
  const player = new Audio(assets + 'dialogue/' + line.id + '.mp3');
  player.defaultPlaybackRate = rate;
  player.playbackRate = rate;
  player.preservesPitch = true;
  audio = player;
  const showError = () => {
    if (audio !== player) return;
    audioNotice.className = 'audio-notice';
    audioNotice.textContent = 'Audio unavailable. Try again or show the Italian transcript.';
  };
  player.addEventListener('error', showError, { once: true });
  player.play().catch(showError);
}

function renderInterview(panel) {
  const file = investigation.file;
  if (!investigation.heard.size) panel.append(node('p', 'brief', file.brief));

  const picker = node('div', 'witness-picker');
  picker.setAttribute('role', 'group');
  picker.setAttribute('aria-label', 'Witnesses');
  for (const witness of file.witnesses) {
    const control = button(witness.name, 'secondary', () => {
      stopAudio();
      witnessId = witness.id;
      const last = file.clues.find(clue => clue.witness === witnessId && investigation.heard.has(clue.id));
      if (line?.witness !== witnessId) {
        line = null;
        if (last) selectLine(last);
      }
      render(control.id);
    });
    control.id = 'witness-' + witness.id;
    control.setAttribute('aria-pressed', witness.id === witnessId);
    picker.append(control);
  }
  panel.append(picker);

  const witness = file.witnesses.find(entry => entry.id === witnessId);
  const portrait = node('figure', 'portrait');
  const art = node('div', 'witness-art');
  const index = portraits.indexOf(witness);
  art.style.backgroundPosition = (index % 3) * 50 + '% ' + Math.floor(index / 3) * 100 + '%';
  art.setAttribute('aria-hidden', 'true');
  const caption = node('figcaption', 'portrait-caption');
  caption.append(node('strong', '', witness.name), node('span', '', witness.role));
  portrait.append(art, caption);
  panel.append(portrait);

  if (line) panel.append(renderReply());
  const questions = node('div', 'questions');
  questions.append(node('h4', '', 'Ask ' + witness.name));
  for (const clue of file.clues.filter(clue => clue.witness === witnessId && isClueAvailable(investigation, clue))) {
    const control = button('', 'question', () => askQuestion(clue));
    control.append(italian('strong', '', clue.question), node('span', '', clue.ask));
    if (investigation.pinned.has(clue.id)) control.append(node('small', 'question-state', 'Pinned'));
    questions.append(control);
  }
  panel.append(questions);
  if (line && investigation.pinned.has(line.id)) {
    const step = currentDeduction(investigation);
    if (step && !missingEvidence(investigation, step).length) {
      panel.append(button('Make a deduction', 'primary', () => openView('deduction')));
    }
  }
}

function toggleDetail(label, className, detail, shown, update) {
  detail.hidden = !shown;
  const control = button(label, className, () => {
    detail.hidden = !detail.hidden;
    control.setAttribute('aria-expanded', String(!detail.hidden));
    update(!detail.hidden);
  });
  control.setAttribute('aria-controls', detail.id);
  control.setAttribute('aria-expanded', String(shown));
  return control;
}

function renderReply() {
  const reply = node('div', 'reply');
  const listening = node('div', 'listen-controls');
  const replay = button('Listen again', 'primary', () => playLine(1));
  replay.id = 'replay';
  listening.append(replay, button('Listen slowly', 'secondary', () => playLine(0.78)));
  const transcript = italian('blockquote', 'transcript', '“' + line.line + '”');
  transcript.id = 'transcript';
  const gloss = node('p', 'gloss', line.gloss);
  gloss.id = 'gloss';
  const support = node('div', 'support-controls');
  support.append(
    toggleDetail('Italian transcript', 'secondary', transcript, showTranscript, value => { showTranscript = value; }),
    toggleDetail('English hints', 'secondary', gloss, showGloss, value => { showGloss = value; }),
  );
  reply.append(listening, audioNotice, support, transcript, gloss);
  if (investigation.pinned.has(line.id)) {
    const status = node('p', 'pinned-status', '✓ Clue pinned to the Case Board');
    status.id = 'pinned-status';
    status.tabIndex = -1;
    reply.append(status);
  } else {
    reply.append(button('Pin clue', 'secondary pin', () => {
      if (pinClue(investigation, line.id)) render('pinned-status');
    }));
  }
  return reply;
}

function reviewClue(clue) {
  selectLine(clue);
  openView('interview', 'replay');
}

function renderBoard(panel) {
  const file = investigation.file;
  panel.append(node('h4', 'panel-title', 'Pinned evidence'));
  if (!investigation.pinned.size) {
    panel.append(
      node('p', 'brief', 'Ask a witness a question, then tap Pin clue to add their reply here.'),
      button('Interview a witness', 'primary', () => openView('interview')),
    );
    return;
  }

  const list = node('ul', 'evidence');
  const relevant = result && !result.correct ? result.step.evidence : [];
  for (const id of investigation.pinned) {
    const clue = file.clues.find(entry => entry.id === id);
    const witness = file.witnesses.find(entry => entry.id === clue.witness);
    const item = node('li', relevant.includes(id) ? 'evidence-card relevant' : 'evidence-card');
    const source = node('p', 'source', clue.time ? clue.time + ' · ' + witness.name : witness.name);
    const control = button('Review clue', 'secondary', () => reviewClue(clue));
    control.setAttribute('aria-label', 'Review ' + clue.title + ' with ' + witness.name);
    item.append(source, node('h5', '', clue.title), control);
    list.append(item);
  }
  panel.append(list, button('Go to deduction', 'primary', () => openView('deduction')));
}

function solve(guess) {
  result = submitDeduction(investigation, guess);
  if (!result) return;
  if (result.complete) {
    const id = investigation.file.id;
    completed.add(id);
    try {
      localStorage.setItem(saveKey(id), 'yes');
    } catch {
      saveNotice.hidden = false;
    }
    openView('solved');
  } else {
    if (!result.correct) sequence = [];
    render('deduction-result');
  }
}

function renderFeedback() {
  const feedback = node('div', result.correct ? 'feedback success' : 'feedback retry');
  const message = node('p', '', result.correct ? result.step.explanation : 'Try again. ' + result.step.hint);
  message.id = 'deduction-result';
  message.tabIndex = -1;
  message.setAttribute('role', 'status');
  feedback.append(message);
  if (result.correct) {
    const followUp = investigation.file.clues.find(clue => clue.after === result.step.id);
    feedback.append(button('Follow up with witnesses', 'primary', () => {
      if (followUp) {
        line = null;
        witnessId = followUp.witness;
      }
      openView('interview');
    }));
  } else {
    feedback.append(button('Review the evidence', 'secondary', () => openView('board')));
  }
  return feedback;
}

function renderDeduction(panel) {
  const step = currentDeduction(investigation);
  if (result?.correct) {
    panel.append(node('h4', 'panel-title', 'Deduction confirmed'), renderFeedback());
    return;
  }
  panel.append(node('h4', 'panel-title', step.prompt));
  const missing = missingEvidence(investigation, step);
  if (missing.length) {
    const names = new Set(missing.map(id => investigation.file.clues.find(clue => clue.id === id).witness));
    const witnesses = investigation.file.witnesses.filter(witness => names.has(witness.id)).map(witness => witness.name);
    panel.append(
      node('p', 'brief', 'You still need to pin evidence from ' + witnesses.join(' and ') + '.'),
      button('Back to interviews', 'primary', () => {
        if (!names.has(witnessId)) {
          witnessId = names.values().next().value;
          line = null;
        }
        openView('interview');
      }),
    );
    return;
  }
  if (result) panel.append(renderFeedback());
  if (step.kind === 'sequence') renderSequence(panel, step);
  else {
    const options = node('div', 'options');
    step.options.forEach((label, index) => options.append(button(label, 'secondary answer', () => solve(index))));
    panel.append(options);
  }
}

function renderSequence(panel, step) {
  const instructions = node('p', 'brief', 'Tap events to add them. Tap an event in your timeline to remove it.');
  const chosen = node('ol', 'timeline');
  chosen.setAttribute('aria-label', 'Your timeline');
  for (const index of sequence) {
    const item = node('li', '');
    const remove = button(step.options[index], 'secondary answer', () => {
      sequence = sequence.filter(value => value !== index);
      render('order-' + index);
    });
    remove.id = 'remove-' + index;
    remove.setAttribute('aria-label', 'Remove ' + step.options[index]);
    item.append(remove);
    chosen.append(item);
  }
  const options = node('div', 'options');
  step.options.forEach((label, index) => {
    if (sequence.includes(index)) return;
    const control = button(label, 'secondary answer', () => {
      sequence.push(index);
      render('remove-' + index);
    });
    control.id = 'order-' + index;
    options.append(control);
  });
  const check = button('Check timeline', 'primary', () => solve(sequence));
  check.disabled = sequence.length !== step.options.length;
  panel.append(instructions, chosen, options, check);
}

function renderSolved() {
  const file = investigation.file;
  const panel = node('section', 'field-report');
  panel.setAttribute('aria-labelledby', 'view-title');
  panel.append(
    node('p', 'eyebrow', file.setting),
    title('Case solved'),
    italian('p', 'solved-title', file.title),
    node('p', 'resolution', file.resolution),
    node('h3', '', 'How the clues fit'),
  );

  const evidence = node('ol', 'proof');
  for (const step of file.deductions) {
    const item = node('li', '', step.explanation);
    const list = node('ul', 'proof-lines');
    for (const clue of file.clues.filter(clue => step.evidence.includes(clue.id))) {
      const witness = file.witnesses.find(entry => entry.id === clue.witness);
      const record = node('li', '');
      record.append(
        node('strong', 'source', clue.time ? witness.name + ' · ' + clue.time : witness.name),
        italian('blockquote', '', '“' + clue.line + '”'),
      );
      list.append(record);
    }
    item.append(list);
    evidence.append(item);
  }
  const nextIndex = caseIndex + 1;
  panel.append(evidence);
  if (isCaseUnlocked(nextIndex, completed)) {
    panel.append(button('Open next case', 'primary', () => startCase(nextIndex)));
  } else {
    panel.append(node('p', 'pinned-status', 'All three cases solved.'));
  }
  panel.append(button('Back to Casebook', 'secondary', () => openView('casebook')));
  return panel;
}

casebookBack.addEventListener('click', () => openView('casebook'));
window.addEventListener('pagehide', stopAudio);
render();
