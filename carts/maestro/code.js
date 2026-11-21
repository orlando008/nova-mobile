export const COUNT_IN = 2200;
export const APPROACH = 1000;
export const HIT_WINDOW = 135;

const RATINGS = [
  { name: 'Perfect', window: 44, points: 1000 },
  { name: 'Great', window: 85, points: 800 },
  { name: 'Good', window: HIT_WINDOW, points: 500 },
];

export function createPerformance(beats) {
  let cursor = 0;
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  let strayTaps = 0;
  const counts = { Perfect: 0, Great: 0, Good: 0, Miss: 0 };
  let feedback;

  function record(name, time, offset, points = 0) {
    feedback = { name, time, offset };
    score += points;
    combo = points ? combo + 1 : 0;
    bestCombo = Math.max(bestCombo, combo);
  }

  function advance(time) {
    while (beats[cursor] + HIT_WINDOW < time) {
      counts.Miss++;
      record('Miss', beats[cursor] + HIT_WINDOW);
      cursor++;
    }
  }

  function tap(time) {
    advance(time);
    const beat = beats[cursor];
    if (beat === undefined || time < beats[0] - HIT_WINDOW) return;
    const offset = time - beat;
    const rating = RATINGS.find(rating => Math.abs(offset) <= rating.window);
    if (rating) {
      counts[rating.name]++;
      record(rating.name, time, offset, rating.points);
      cursor++;
    } else {
      strayTaps++;
      record('Off beat', time, offset);
    }
  }

  function result() {
    const accuracy = score / (10 * (beats.length + strayTaps));
    const stars = accuracy >= 95 ? 3 : accuracy >= 80 ? 2 : accuracy >= 60 ? 1 : 0;
    return { score, accuracy, stars, bestCombo, counts: { ...counts } };
  }

  return {
    advance, tap, result,
    get cursor() { return cursor; },
    get score() { return score; },
    get combo() { return combo; },
    get feedback() { return feedback; },
  };
}
