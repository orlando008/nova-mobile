export const ROUND_LENGTH = 10;
export const MODES = {
  countries: 'Countries',
  flags: 'Flags',
  capitals: 'Capitals',
};

function shuffled(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

export function createRound(countries, { mode, region, seed }) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const pool = countries.filter(country => region === 'World' || country.region === region);
  return shuffled(pool, random).slice(0, ROUND_LENGTH).map(country => {
    if (mode === 'countries') return { country, prompt: `Tap ${country.name}` };

    const isFlag = mode === 'flags';
    const field = isFlag ? 'name' : 'capital';
    const answer = country[field];
    const neighbors = shuffled(countries.filter(other => other.region === country.region), random);
    const fallback = shuffled(countries, random);
    const options = new Set([answer]);
    for (const other of [...neighbors, ...fallback]) {
      options.add(other[field]);
      if (options.size === 3) break;
    }
    const prompt = isFlag ? 'Which country uses this flag?'
      : country.capitalPrompt ?? `What is the capital of ${country.name}?`;
    return { country, prompt, answer, options: shuffled(options, random) };
  });
}

// Map coordinates are longitude + 180 and 90 minus latitude. Snap the
// frame to a grid so many neighboring questions share the same initial view.
export function mapFrame([x, y]) {
  const width = 90;
  const height = 72;
  return {
    x: Math.round(x / 30) * 30 - width / 2,
    y: clamp(Math.round(y / 24) * 24 - height / 2, 0, 180 - height),
    width,
    height,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function panFrame(frame, dx, dy) {
  const { width, height } = frame;
  return {
    ...frame,
    x: ((frame.x + dx + width / 2) % 360 + 360) % 360 - width / 2,
    y: clamp(frame.y + dy, 0, 180 - height),
  };
}

const center = { x: .5, y: .5 };

// Keep the map point at the previous finger midpoint under the new midpoint.
export function zoomFrame(frame, factor, from = center, to = from) {
  const width = clamp(frame.width * factor, 6, 180);
  const height = width * 4 / 5;
  return panFrame({
    x: frame.x + from.x * frame.width - to.x * width,
    y: frame.y + from.y * frame.height - to.y * height,
    width,
    height,
  }, 0, 0);
}

export function worldOffset(x, frame) {
  return 360 * Math.round((frame.x + frame.width / 2 - x) / 360);
}
