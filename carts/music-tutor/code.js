export const LESSON_LENGTH = 10;

const LETTERS = ['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F'];
const PITCHES = [64, 65, 67, 69, 71, 72, 74, 76, 77];

export const DIFFICULTIES = {
  natural: 'Natural notes',
  sharps: 'Sharps',
  mixed: 'Sharps & flats',
};

function makeNote(step, accidental) {
  const letter = LETTERS[step];
  const suffix = accidental === 1 ? '♯' : accidental === -1 ? '♭' : '';
  const spokenSuffix = accidental === 1 ? ' sharp' : accidental === -1 ? ' flat' : '';
  return {
    step, accidental, midi: PITCHES[step] + accidental,
    label: letter + suffix, spoken: letter + spokenSuffix,
  };
}

const naturals = LETTERS.map((_, step) => makeNote(step, 0));
const sharps = [1, 2, 3, 5, 6, 8].map(step => makeNote(step, 1));
const flats = [0, 2, 3, 4, 6, 7].map(step => makeNote(step, -1));

function shuffle(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function makeQuestion(target, pool, random) {
  const nearby = pool.filter(note => Math.abs(note.midi - target.midi) <= 5);
  const choices = [target];
  for (const candidate of shuffle(nearby, random)) {
    if (choices.some(note => note.label === candidate.label || note.midi === candidate.midi)) continue;
    choices.push(candidate);
    if (choices.length === 3) break;
  }
  return { target, choices: shuffle(choices, random) };
}

export function createLesson(difficulty, seed) {
  // Advance a seeded generator so a lesson can be reproduced from its level and seed.
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const pool = [...naturals];
  const targets = shuffle(naturals, random);
  if (difficulty === 'natural') {
    const extra = targets.find(note => note.label !== targets[targets.length - 1].label);
    return [...targets, extra].map(note => makeQuestion(note, pool, random));
  }

  pool.push(...sharps);
  const lesson = targets.slice(0, 5);
  if (difficulty === 'mixed') {
    pool.push(...flats);
    lesson.push(...shuffle(sharps, random).slice(0, 2), ...shuffle(flats, random).slice(0, 3));
  } else {
    lesson.push(...shuffle(sharps, random).slice(0, 5));
  }
  return shuffle(lesson, random).map(note => makeQuestion(note, pool, random));
}
