export const cases = [
  {
    id: 'missing-envelope',
    title: 'La busta scomparsa',
    englishTitle: 'The Missing Envelope',
    setting: 'Caffè Aurora · Florence',
    focus: 'Times and places',
    brief: 'An envelope left for a customer has disappeared from the café counter. Find out when it was moved and where it ended up.',
    witnesses: [
      { id: 'lucia', name: 'Lucia', role: 'Café owner', voice: 'paola' },
      { id: 'marco', name: 'Marco', role: 'Coffee supplier', voice: 'riccardo' },
    ],
    clues: [
      {
        id: 'counter', witness: 'lucia', question: 'Quando hai visto la busta?',
        ask: 'When did you see the envelope?',
        title: 'A sighting at the counter', time: '07:10',
        line: 'Quando sono arrivata alle sette e dieci, la busta era ancora sul bancone.',
        gloss: 'era ancora sul bancone — it was still on the counter',
      },
      {
        id: 'gone', witness: 'marco', question: 'C’era ancora la busta?',
        ask: 'Was the envelope still there?',
        title: 'The coffee delivery', time: '07:20',
        line: 'Ho portato il caffè alle sette e venti. La busta non era più sul bancone.',
        gloss: 'non era più — it was no longer there',
      },
      {
        id: 'move', witness: 'marco', question: 'Hai visto qualcuno spostarla?',
        ask: 'Did you see anyone move it?',
        title: 'The baker’s delivery', time: '07:15', after: 'window',
        line: 'Alle sette e un quarto, il ragazzo del forno l’ha portata al tavolo vicino alla finestra.',
        gloss: 'l’ha portata — he took it · vicino alla finestra — by the window',
      },
      {
        id: 'paper', witness: 'lucia', question: 'Cos’hai trovato al tavolo?',
        ask: 'What did you find at the table?',
        title: 'A closer look at the table', pins: ['move'],
        line: 'Al tavolo vicino alla finestra c’era un giornale. La busta era proprio sotto il giornale.',
        gloss: 'proprio sotto — right underneath',
      },
    ],
    deductions: [
      {
        id: 'window', kind: 'choice', evidence: ['counter', 'gone'],
        prompt: 'When did the envelope disappear from the counter?',
        options: ['Before 07:10', 'Between 07:10 and 07:20', 'After 07:20'],
        answer: 1, hint: 'Compare when Lucia says “ancora” with when Marco says “non … più.”',
        explanation: 'Lucia saw it at 07:10. By Marco’s delivery at 07:20, it was gone from the counter.',
      },
      {
        id: 'envelope', kind: 'choice', evidence: ['move', 'paper'],
        prompt: 'Where should you look for the envelope?',
        options: ['By the window, inside the newspaper', 'Under a newspaper on the counter', 'Under the newspaper at the window table'],
        answer: 2, hint: 'Marco names the table. Listen for “sotto” in Lucia’s description.',
        explanation: 'Marco saw the baker’s assistant take it to the window table at 07:15. Lucia found it right under the newspaper there.',
      },
    ],
    resolution: 'The envelope never left the café. It was under a newspaper at the window table.',
  },
  {
    id: 'wrong-suitcase',
    title: 'La valigia sbagliata',
    englishTitle: 'The Wrong Suitcase',
    setting: 'Train station · Bologna',
    focus: 'Descriptions and pronouns',
    brief: 'Elena left a blue suitcase at the station. When she came back, only a similar bag was left. Work out who handed hers to whom.',
    witnesses: [
      { id: 'elena', name: 'Elena', role: 'Traveler', voice: 'paola' },
      { id: 'paolo', name: 'Paolo', role: 'Station porter', voice: 'riccardo' },
    ],
    clues: [
      {
        id: 'ribbon', witness: 'elena', question: 'Com’era fatta la tua valigia?',
        ask: 'What did your suitcase look like?',
        title: 'Elena’s description',
        line: 'La mia era blu, con un nastro rosso legato al manico.',
        gloss: 'un nastro rosso legato al manico — a red ribbon tied to the handle',
      },
      {
        id: 'spare', witness: 'paolo', question: 'Quale valigia è rimasta?',
        ask: 'Which suitcase was left behind?',
        title: 'The bag still at the station',
        line: 'È rimasta quella blu con l’etichetta gialla. Quella con il nastro non c’era più.',
        gloss: 'è rimasta — was left behind · l’etichetta gialla — the yellow tag',
      },
      {
        id: 'handoff', witness: 'paolo', question: 'A chi l’ha data l’addetta?',
        ask: 'Who did the attendant give it to?',
        title: 'A handoff on the platform', after: 'bag',
        line: 'L’addetta ha chiamato la signora con il cappotto verde e le ha dato la valigia con il nastro rosso.',
        gloss: 'l’addetta — the attendant · le ha dato — gave her',
      },
      {
        id: 'coat', witness: 'elena', question: 'Hai visto quella signora?',
        ask: 'Did you see that woman?',
        title: 'Two travelers on the platform', pins: ['handoff'],
        line: 'Sì, la signora con il cappotto verde è salita sul treno. Quella con il cappotto beige è rimasta sul binario.',
        gloss: 'è salita sul treno — boarded the train · è rimasta sul binario — stayed on the platform',
      },
    ],
    deductions: [
      {
        id: 'bag', kind: 'choice', evidence: ['ribbon', 'spare'],
        prompt: 'Which suitcase belongs to Elena?',
        options: ['The blue one with the yellow tag', 'The blue one with the red ribbon', 'The blue one with the red tag'],
        answer: 1, hint: 'Listen for the difference between “nastro” and “etichetta.”',
        explanation: 'Elena tied a red ribbon to her handle. Paolo says the blue one left behind has a yellow tag.',
      },
      {
        id: 'recipient', kind: 'choice', evidence: ['handoff', 'coat'],
        prompt: 'Who gave Elena’s suitcase to whom?',
        options: ['The woman in green gave it to the attendant', 'The attendant gave it to the woman in green', 'The attendant gave it to the woman in beige'],
        answer: 1, hint: 'In Paolo’s line, “l’addetta” is the person doing the giving. Who does “le” refer to?',
        explanation: 'Paolo saw the attendant give the red-ribbon suitcase to the woman in green. Elena saw that traveler board the train.',
      },
    ],
    resolution: 'The station attendant gave Elena’s suitcase to the woman in the green coat, who boarded the train with it.',
  },
  {
    id: 'missing-painting',
    title: 'Il quadro sparito',
    englishTitle: 'The Missing Painting',
    setting: 'Art gallery · Turin',
    focus: 'Before, after, and already',
    brief: 'A painting disappeared before a gallery opening. Reconstruct what had already happened when the curator and a volunteer arrived.',
    witnesses: [
      { id: 'sofia', name: 'Sofia', role: 'Curator', voice: 'paola' },
      { id: 'davide', name: 'Davide', role: 'Gallery volunteer', voice: 'riccardo' },
    ],
    clues: [
      {
        id: 'wall', witness: 'sofia', question: 'Com’era la sala quando sei arrivata?',
        ask: 'What was the gallery like when you arrived?',
        title: 'Sofia enters the gallery',
        line: 'Quando sono arrivata in sala, avevano già tolto il quadro dalla parete.',
        gloss: 'avevano già tolto — they had already taken it down',
      },
      {
        id: 'empty', witness: 'davide', question: 'Cos’hai visto nel corridoio?',
        ask: 'What did you see in the hallway?',
        title: 'Davide enters the hallway',
        line: 'Sono entrato in corridoio dopo Sofia. Il carrello era lì, ma era già vuoto.',
        gloss: 'dopo Sofia — after Sofia · già vuoto — already empty',
      },
      {
        id: 'crate', witness: 'sofia', question: 'Dov’era il quadro al tuo arrivo?',
        ask: 'Where was the painting when you arrived?',
        title: 'A crate by the gallery door', after: 'before',
        line: 'Quando sono arrivata, il quadro era già nella cassa sul carrello. Il carrello era ancora in sala.',
        gloss: 'già nella cassa — already in the crate · ancora in sala — still in the gallery',
      },
      {
        id: 'storage', witness: 'davide', question: 'Dov’era finita la cassa?',
        ask: 'Where did the crate end up?',
        title: 'A note from the conservator', pins: ['crate'],
        line: 'Prima che io entrassi in corridoio, il restauratore aveva già scaricato la cassa in deposito. Ha lasciato un biglietto.',
        gloss: 'prima che io entrassi — before I came in · aveva già scaricato — had already unloaded it',
      },
    ],
    deductions: [
      {
        id: 'before', kind: 'choice', evidence: ['wall', 'empty'],
        prompt: 'What had happened before Sofia arrived?',
        options: ['Davide had entered the hallway', 'Sofia had taken down the painting', 'Someone had taken down the painting'],
        answer: 2, hint: '“Avevano già tolto” describes something that had already happened.',
        explanation: 'The painting was off the wall when Sofia arrived. Davide entered the hallway later.',
      },
      {
        id: 'timeline', kind: 'sequence', evidence: ['wall', 'crate', 'storage', 'empty'],
        prompt: 'Put the events in order, earliest first.',
        options: ['Davide enters the hallway', 'The crate is unloaded in storage', 'The painting comes off the wall', 'Sofia sees the crate on the cart'],
        answer: [2, 3, 1, 0],
        hint: 'Compare where the crate is when Sofia arrives with what has already happened before Davide enters.',
        explanation: 'The painting came off the wall before Sofia saw it crated on the cart. The conservator unloaded it in storage before Davide entered the hallway.',
      },
    ],
    resolution: 'The conservator moved the painting to storage in its crate before Davide reached the hallway.',
  },
];

export function isCaseUnlocked(index, completed) {
  return Boolean(cases[index]) && cases.slice(0, index).every(file => completed.has(file.id));
}

export function newInvestigation(file) {
  return { file, heard: new Set(), pinned: new Set(), solved: new Set() };
}

export function isClueAvailable(investigation, clue) {
  return (!clue.after || investigation.solved.has(clue.after))
    && (clue.pins || []).every(id => investigation.pinned.has(id));
}

export function hearClue(investigation, id) {
  const clue = investigation.file.clues.find(entry => entry.id === id);
  if (!clue || !isClueAvailable(investigation, clue)) return null;
  investigation.heard.add(id);
  return clue;
}

export function pinClue(investigation, id) {
  if (!investigation.heard.has(id) || investigation.pinned.has(id)) return false;
  investigation.pinned.add(id);
  return true;
}

export function currentDeduction(investigation) {
  return investigation.file.deductions.find(step => !investigation.solved.has(step.id));
}

export function missingEvidence(investigation, step) {
  return step.evidence.filter(id => !investigation.pinned.has(id));
}

export function submitDeduction(investigation, guess) {
  const step = currentDeduction(investigation);
  if (!step || missingEvidence(investigation, step).length) return null;
  const correct = step.kind === 'sequence'
    ? Array.isArray(guess) && guess.length === step.answer.length && step.answer.every((id, index) => id === guess[index])
    : guess === step.answer;
  if (correct) investigation.solved.add(step.id);
  return { step, correct, complete: correct && !currentDeduction(investigation) };
}
