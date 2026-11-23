export const LESSON_LENGTH = 10;

const LETTERS = ['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F'];
const PITCHES = [64, 65, 67, 69, 71, 72, 74, 76, 77];

export const DIFFICULTIES = {
  natural: 'Natural notes',
  sharps: 'Sharps',
  mixed: 'Sharps & flats',
  key: 'Key signatures',
};

const SHARP_SIGNATURE = [
  { letter: 'F', step: 8 }, { letter: 'C', step: 5 },
  { letter: 'G', step: 9 }, { letter: 'D', step: 6 },
];
const FLAT_SIGNATURE = [
  { letter: 'B', step: 4 }, { letter: 'E', step: 7 },
  { letter: 'A', step: 3 }, { letter: 'D', step: 6 },
];

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

function makeQuestion(target, pool, random, signature = [], writtenAccidental = target.accidental || null) {
  const nearby = note => Math.abs(note.midi - target.midi) <= 5;
  const candidates = shuffle(pool, random);
  const choices = [target];
  for (const candidate of [...candidates.filter(nearby), ...candidates.filter(note => !nearby(note))]) {
    if (choices.some(note => note.label === candidate.label || note.midi === candidate.midi)) continue;
    choices.push(candidate);
    if (choices.length === 3) break;
  }
  return { target, choices: shuffle(choices, random), signature, writtenAccidental };
}

function makeKeyLesson(random) {
  const sign = random() < .5 ? -1 : 1;
  const count = random() < .5 ? 3 : 4;
  const marks = sign === 1 ? SHARP_SIGNATURE : FLAT_SIGNATURE;
  const signature = marks.slice(0, count).map(mark => ({ ...mark, sign }));
  const scale = LETTERS.map((letter, step) =>
    makeNote(step, signature.some(mark => mark.letter === letter) ? sign : 0));
  const inKey = shuffle(scale.filter(note => note.accidental !== 0), random).slice(0, 3);
  const unaltered = shuffle(scale.filter(note => note.accidental === 0), random).slice(0, 3);
  const questions = [...inKey, ...unaltered].map(note => makeQuestion(note, scale, random, signature, null));

  for (const [writtenAccidental, total] of [[1, 1], [-1, 1], [0, 2]]) {
    // A note accidental replaces the key signature for that note.
    const pool = scale.filter(note => note.accidental !== writtenAccidental)
      .map(note => makeNote(note.step, writtenAccidental));
    for (const note of shuffle(pool, random).slice(0, total)) {
      questions.push(makeQuestion(note, pool, random, signature, writtenAccidental));
    }
  }
  return shuffle(questions, random);
}

export function createLesson(difficulty, seed) {
  // Advance a seeded generator so a lesson can be reproduced from its level and seed.
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  if (difficulty === 'key') return makeKeyLesson(random);

  const targets = shuffle(naturals, random);
  if (difficulty === 'natural') {
    const extra = targets.find(note => note.label !== targets[targets.length - 1].label);
    return [...targets, extra].map(note => makeQuestion(note, naturals, random));
  }

  const lesson = targets.slice(0, 5);
  if (difficulty === 'mixed') {
    lesson.push(...shuffle(sharps, random).slice(0, 2), ...shuffle(flats, random).slice(0, 3));
  } else {
    lesson.push(...shuffle(sharps, random).slice(0, 5));
  }
  const notesByAccidental = [flats, naturals, sharps];
  return shuffle(lesson, random).map(note => makeQuestion(note, notesByAccidental[note.accidental + 1], random));
}
