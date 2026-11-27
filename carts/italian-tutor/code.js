export const LESSON_LENGTH = 10;
export const DRILL_LENGTH = 6;
export const MASTERED_BOX = 4;
const MAX_BOX = 5;
const RECENT_LIMIT = 40;
const XP_PER_LEVEL = 100;

export const RANKS = [
  { level: 1, name: 'Turista' },
  { level: 3, name: 'Viaggiatore' },
  { level: 5, name: 'Studente' },
  { level: 8, name: 'Chiacchierone' },
  { level: 12, name: 'Quasi madrelingua' },
];

// Flatten the rule book into questions with stable ids.
export function questionsOf(rules) {
  return rules.flatMap(rule => rule.q.map(([sentence, answer, wrong, english], index) => ({
    id: `${rule.id}-${index + 1}`, rule: rule.id, topic: rule.topic, sentence, answer, wrong, english,
  })));
}

function randomFrom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffled(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function emptyProgress() {
  return { xp: 0, lessons: 0, streak: { count: 0, day: null }, rules: {}, pinned: [], recent: [] };
}

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;

export function readProgress(data, rules) {
  const progress = emptyProgress();
  if (!data || typeof data !== 'object') return progress;
  const ids = new Set(rules.map(rule => rule.id));
  progress.xp = count(data.xp);
  progress.lessons = count(data.lessons);
  if (typeof data.streak?.day === 'string') progress.streak = { count: count(data.streak.count), day: data.streak.day };
  for (const [id, stat] of Object.entries(data.rules ?? {})) {
    if (!ids.has(id)) continue;
    const seen = count(stat?.seen);
    progress.rules[id] = {
      seen,
      correct: Math.min(seen, count(stat?.correct)),
      box: Math.min(MAX_BOX, count(stat?.box)),
    };
  }
  if (Array.isArray(data.pinned)) progress.pinned = [...new Set(data.pinned.filter(id => ids.has(id)))];
  if (Array.isArray(data.recent)) progress.recent = data.recent.filter(id => typeof id === 'string').slice(-RECENT_LIMIT);
  return progress;
}

export function ruleStatus(progress, id) {
  const stat = progress.rules[id];
  const pinned = progress.pinned.includes(id);
  if (!stat?.seen) return { label: 'New', level: 'new', accuracy: null, box: 0, seen: 0, pinned };
  const accuracy = stat.correct / stat.seen;
  const level = stat.box >= MASTERED_BOX ? 'mastered' : stat.box >= 2 ? 'growing' : 'shaky';
  const label = { mastered: 'Mastered', growing: 'Getting there', shaky: 'Shaky' }[level];
  return { label, level, accuracy, box: stat.box, seen: stat.seen, pinned };
}

// How strongly a rule should be favored: weak, missed, new and marked rules come up more.
export function ruleWeight(progress, id) {
  const stat = progress.rules[id];
  let weight = stat?.seen ? 1 + (MAX_BOX - stat.box) * .8 + (1 - stat.correct / stat.seen) * 3 : 2.5;
  if (progress.pinned.includes(id)) weight += 3;
  return weight;
}

// Rules that need the most work, hardest first. Unseen rules are left out.
export function trickiestRules(progress, rules, limit = 5) {
  return rules
    .map(rule => ({ rule, status: ruleStatus(progress, rule.id), weight: ruleWeight(progress, rule.id) }))
    .filter(({ status }) => status.pinned || (status.seen && (status.level !== 'mastered' || status.accuracy < .8)))
    .sort((a, b) => b.weight - a.weight || a.rule.id.localeCompare(b.rule.id))
    .slice(0, limit);
}

// Build a lesson. A focus of 'review' covers every rule and leans hard on weak ones;
// a topic or a rule id narrows the pool. The same bank, focus, seed and progress give the same lesson.
export function createLesson(rules, { focus = 'review', seed = 0, progress = emptyProgress() } = {}) {
  const random = randomFrom(seed);
  const all = questionsOf(rules);
  const drill = rules.some(rule => rule.id === focus);
  const pool = drill ? all.filter(question => question.rule === focus)
    : focus === 'review' ? all : all.filter(question => question.topic === focus);
  const length = Math.min(drill ? DRILL_LENGTH : LESSON_LENGTH, pool.length);
  const perRule = drill ? Infinity : focus === 'review' ? 3 : 2;
  const recent = new Set(progress.recent);
  const weightOf = question => {
    const weight = ruleWeight(progress, question.rule);
    return (focus === 'review' ? weight * weight : weight) * (recent.has(question.id) ? .15 : 1);
  };

  const remaining = shuffled(pool, random);
  const chosen = [];
  const perRuleCount = {};
  while (chosen.length < length) {
    const open = remaining.filter(question => (perRuleCount[question.rule] ?? 0) < perRule);
    const candidates = open.length ? open : remaining;
    const total = candidates.reduce((sum, question) => sum + weightOf(question), 0);
    let pick = random() * total;
    let question = candidates.at(-1);
    for (const candidate of candidates) {
      pick -= weightOf(candidate);
      if (pick < 0) {
        question = candidate;
        break;
      }
    }
    remaining.splice(remaining.indexOf(question), 1);
    perRuleCount[question.rule] = (perRuleCount[question.rule] ?? 0) + 1;
    chosen.push(question);
  }
  return chosen.map(question => ({ ...question, choices: shuffled([question.answer, ...question.wrong], random) }));
}

// Record one answer: Leitner-style boxes go up one on a hit and down two on a miss.
export function recordAnswer(progress, question, correct) {
  const stat = progress.rules[question.rule] ?? { seen: 0, correct: 0, box: 0 };
  const box = correct ? Math.min(MAX_BOX, stat.box + 1) : Math.max(0, stat.box - 2);
  return {
    ...progress,
    rules: { ...progress.rules, [question.rule]: { seen: stat.seen + 1, correct: stat.correct + (correct ? 1 : 0), box } },
    recent: [...progress.recent.filter(id => id !== question.id), question.id].slice(-RECENT_LIMIT),
  };
}

export function togglePin(progress, id) {
  const pinned = progress.pinned.includes(id)
    ? progress.pinned.filter(other => other !== id) : [...progress.pinned, id];
  return { ...progress, pinned };
}

export function progressSummary({ xp }) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return {
    level,
    rank: RANKS.findLast(entry => entry.level <= level).name,
    nextRank: RANKS.find(entry => entry.level > level) ?? null,
    levelXP: xp % XP_PER_LEVEL,
    goal: XP_PER_LEVEL,
  };
}

function dayNumber(day) {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / 86400000;
}

// Finish a lesson on a local calendar day (YYYY-MM-DD). XP rewards first-try answers.
export function finishLesson(progress, firstTryCorrect, day) {
  const before = progressSummary(progress);
  const xp = 20 + firstTryCorrect * 5;
  const last = progress.streak.day;
  const gap = last ? dayNumber(day) - dayNumber(last) : null;
  const streak = gap === 0 ? progress.streak : { count: gap === 1 ? progress.streak.count + 1 : 1, day };
  const updated = { ...progress, xp: progress.xp + xp, lessons: progress.lessons + 1, streak };
  const after = progressSummary(updated);
  return { progress: updated, xp, levels: after.level - before.level, rank: after.rank === before.rank ? null : after.rank };
}

// A streak survives until a full day is skipped.
export function currentStreak(progress, day) {
  const last = progress.streak.day;
  return last && dayNumber(day) - dayNumber(last) <= 1 ? progress.streak.count : 0;
}

// Fill the blank for display. An answer ending in an apostrophe joins the next word.
export function fillSentence(sentence, answer) {
  const [before, after = ''] = sentence.split('___');
  const word = atSentenceStart(before) ? capitalize(answer) : answer;
  return { before, word, after: answer.endsWith('’') ? after.replace(/^ /, '') : after };
}

export function atSentenceStart(before) {
  return before === '' || /[.!?]\s*$/.test(before);
}

export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
