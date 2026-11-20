export function readChallenge(page) {
  const params = new URL(page).searchParams;
  const seed = params.get('seed');
  if (!/^\d{1,10}$/.test(seed ?? '') || Number(seed) > 0xffffffff) return null;
  const score = params.get('score');
  const target = /^\d{1,3}(?:\.\d)?$/.test(score ?? '') && Number(score) <= 100 ? Number(score) : null;
  return { seed: Number(seed), target };
}

export function challengeUrl(page, seed, score) {
  const url = new URL(page);
  url.search = '';
  url.hash = '';
  if (seed !== undefined) url.searchParams.set('seed', String(seed));
  if (score !== undefined) url.searchParams.set('score', score.toFixed(1));
  return url;
}
