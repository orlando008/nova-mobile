export const LESSON_LENGTH = 10;
export const MIDDLE_C_MIDI = 60;
export const MIDDLE_C_STEP = -2;
export const KEYBOARD_END_MIDI = 78;

const LETTERS = 'CDEFGABCDEF';
const PITCHES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77];

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
  const index = step - MIDDLE_C_STEP;
  const letter = LETTERS[index];
  const suffix = accidental === 1 ? '♯' : accidental === -1 ? '♭' : '';
  const spokenSuffix = accidental === 1 ? ' sharp' : accidental === -1 ? ' flat' : '';
  return {
    step, accidental, midi: PITCHES[index] + accidental,
    label: letter + suffix, spoken: letter + spokenSuffix,
  };
}

const naturals = PITCHES.map((_, index) => makeNote(index + MIDDLE_C_STEP, 0));
const letterNotes = naturals.filter(note => note.step >= 0);
const onKeyboard = note => note.midi >= MIDDLE_C_MIDI && note.midi <= KEYBOARD_END_MIDI;

function shuffle(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function makeChoices(target, pool, random) {
  const nearby = note => Math.abs(note.midi - target.midi) <= 5;
  const candidates = shuffle(pool, random);
  const choices = [target];
  for (const candidate of [...candidates.filter(nearby), ...candidates.filter(note => !nearby(note))]) {
    if (choices.some(note => note.label === candidate.label || note.midi === candidate.midi)) continue;
    choices.push(candidate);
    if (choices.length === 3) break;
  }
  return shuffle(choices, random);
}

function makeKeyLesson(notes, keyboard, random, makeQuestion) {
  const sign = random() < .5 ? -1 : 1;
  const count = random() < .5 ? 3 : 4;
  const marks = sign === 1 ? SHARP_SIGNATURE : FLAT_SIGNATURE;
  const signature = marks.slice(0, count).map(mark => ({ ...mark, sign }));
  const scale = notes.map(note =>
    makeNote(note.step, signature.some(mark => mark.letter === note.label) ? sign : 0));
  const inKey = shuffle(scale.filter(note => note.accidental !== 0), random).slice(0, 3);
  const unaltered = shuffle(scale.filter(note => note.accidental === 0), random).slice(0, 3);
  const questions = [...inKey, ...unaltered].map(note => makeQuestion(note, scale, signature, null));

  for (const [writtenAccidental, total] of [[1, 1], [-1, 1], [0, 2]]) {
    // A note accidental replaces the key signature for that note.
    let pool = scale.filter(note => note.accidental !== writtenAccidental)
      .map(note => makeNote(note.step, writtenAccidental));
    if (keyboard) pool = pool.filter(onKeyboard);
    for (const note of shuffle(pool, random).slice(0, total)) {
      questions.push(makeQuestion(note, pool, signature, writtenAccidental));
    }
  }
  return shuffle(questions, random);
}

export function createLesson(difficulty, seed, mode = 'letters') {
  // Advance a seeded generator so a lesson can be reproduced from its level and seed.
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const keyboard = mode === 'keyboard';
  const notes = keyboard ? naturals : letterNotes;
  const makeQuestion = (target, pool, signature = [], writtenAccidental = target.accidental || null) => ({
    target, signature, writtenAccidental, choices: keyboard ? [] : makeChoices(target, pool, random),
  });
  if (difficulty === 'key') return makeKeyLesson(notes, keyboard, random, makeQuestion);

  const targets = shuffle(notes, random);
  if (difficulty === 'natural') {
    const selected = targets.slice(0, LESSON_LENGTH);
    const extra = targets.filter(note => note.label !== targets.at(-1).label)
      .slice(0, LESSON_LENGTH - selected.length);
    return [...selected, ...extra].map(note => makeQuestion(note, notes));
  }

  const sharps = notes.filter(note => 'CDFGA'.includes(note.label)).map(note => makeNote(note.step, 1));
  const flats = notes.filter(note => 'DEGAB'.includes(note.label)).map(note => makeNote(note.step, -1));
  const lesson = targets.slice(0, 5);
  if (difficulty === 'mixed') {
    lesson.push(...shuffle(sharps, random).slice(0, 2), ...shuffle(flats, random).slice(0, 3));
  } else {
    lesson.push(...shuffle(sharps, random).slice(0, 5));
  }
  const notesByAccidental = [flats, notes, sharps];
  return shuffle(lesson, random).map(note => makeQuestion(note, notesByAccidental[note.accidental + 1]));
}
