export const COUNT_IN = 2200;
export const APPROACH = 1450;
export const HIT_WINDOW = 135;
export const TOGETHER_WINDOW = 85;

const LANE_MASKS = new Set([1, 2, 3, 4, 5]);

const RATINGS = [
  { name: 'Perfect', window: 44, points: 1000 },
  { name: 'Great', window: 85, points: 800 },
  { name: 'Good', window: HIT_WINDOW, points: 500 },
];

export function createPerformance(cues) {
  if (cues.some(([, mask]) => !LANE_MASKS.has(mask))) {
    throw new Error('Each cue needs one lane or bass and one treble lane.');
  }
  let cursor = 0;
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  let strayTaps = 0;
  let firstHit;
  const counts = { Perfect: 0, Great: 0, Good: 0, Miss: 0 };
  let feedback;

  function record(name, time, offset, points = 0) {
    feedback = { name, time, offset };
    score += points;
    combo = points ? combo + 1 : 0;
    bestCombo = Math.max(bestCombo, combo);
  }

  function finish(name, time, offset, points) {
    counts[name]++;
    record(name, time, offset, points);
    firstHit = undefined;
    cursor++;
  }

  function deadline(index) {
    const beat = cues[index][0];
    const next = cues[index + 1]?.[0] ?? Infinity;
    // Adjacent cues share the space between them without blocking a hit on the next beat.
    return Math.min(beat + HIT_WINDOW, (beat + next) / 2);
  }

  function advance(time) {
    while (cursor < cues.length && deadline(cursor) < time) {
      finish('Miss', deadline(cursor));
    }
  }

  function tap(lane, time) {
    advance(time);
    const cue = cues[cursor];
    if (!cue || time < cues[0][0] - HIT_WINDOW) return;
    const [beat, required] = cue;
    const laneMask = 1 << lane;
    const offset = time - beat;
    const previous = cues[cursor - 1]?.[0] ?? -Infinity;
    const opens = Math.max(beat - HIT_WINDOW, (previous + beat) / 2);
    if (time < opens || !(required & laneMask) || firstHit?.laneMask === laneMask) {
      strayTaps++;
      record('Off beat', time, offset);
      return 'Off beat';
    }

    if (firstHit && Math.abs(time - firstHit.time) > TOGETHER_WINDOW) {
      finish('Miss', time);
      return 'Miss';
    }

    if (((firstHit?.laneMask ?? 0) | laneMask) !== required) {
      firstHit = { time, laneMask };
      feedback = { name: 'Both together', time };
      return 'Together';
    }

    const firstOffset = (firstHit?.time ?? time) - beat;
    const worst = Math.abs(firstOffset) > Math.abs(offset) ? firstOffset : offset;
    const rating = RATINGS.find(({ window }) => Math.abs(worst) <= window);
    finish(rating.name, time, worst, rating.points);
    return rating.name;
  }

  function result() {
    const accuracy = score / (10 * (cues.length + strayTaps));
    const stars = accuracy >= 95 ? 3 : accuracy >= 80 ? 2 : accuracy >= 60 ? 1 : 0;
    return { score, accuracy, stars, bestCombo, counts: { ...counts } };
  }

  return {
    advance, tap, result,
    clearPartial() {
      firstHit = undefined;
      if (feedback?.name === 'Both together') feedback = undefined;
    },
    get cursor() { return cursor; },
    get hitLanes() { return firstHit?.laneMask ?? 0; },
    get score() { return score; },
    get combo() { return combo; },
    get feedback() { return feedback; },
  };
}
