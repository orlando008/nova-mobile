const XP_PER_LEVEL = 100;
const RANKS = [
  { level: 1, name: 'Apprentice' },
  { level: 3, name: 'Musician' },
  { level: 5, name: 'Pianist' },
  { level: 8, name: 'Virtuoso' },
  { level: 12, name: 'Maestro' },
];

export const DECOR = [
  { id: 'crimson-rug', slot: 'rug', name: 'Crimson rug', cost: 1 },
  { id: 'navy-rug', slot: 'rug', name: 'Midnight rug', cost: 2 },
  { id: 'botanical-print', slot: 'wall', name: 'Botanical print', cost: 1 },
  { id: 'framed-score', slot: 'wall', name: 'Gilded score', cost: 2 },
  { id: 'fern', slot: 'plant', name: 'Potted fern', cost: 1 },
  { id: 'olive-tree', slot: 'plant', name: 'Olive tree', cost: 2 },
];

export const PIANOS = [
  { id: 'wooden-upright', slot: 'piano', name: 'Wooden Upright', cost: 0 },
  { id: 'carved-upright', slot: 'piano', name: 'Carved Mahogany Upright', cost: 2 },
  { id: 'baby-grand', slot: 'piano', name: 'Baby Grand', cost: 4 },
  { id: 'concert-grand', slot: 'piano', name: 'Concert Grand', cost: 7 },
];
export const STUDIO_ITEMS = [...PIANOS, ...DECOR];

export function readProgress(data) {
  const xp = Number.isSafeInteger(data?.xp) && data.xp >= 0 ? data.xp : 0;
  const owned = STUDIO_ITEMS.filter(item => item.cost > 0 && Array.isArray(data?.owned) && data.owned.includes(item.id));
  const placed = owned.filter(item => data.equipped?.[item.slot] === item.id)
    .map(item => [item.slot, item.id]);
  const equipped = { piano: PIANOS[0].id, ...Object.fromEntries(placed) };
  return { xp, owned: owned.map(item => item.id), equipped };
}

export function progressSummary({ xp, owned }) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const rank = RANKS.findLast(entry => entry.level <= level).name;
  const nextRank = RANKS.find(entry => entry.level > level);
  const spent = STUDIO_ITEMS.reduce((sum, item) => sum + (owned.includes(item.id) ? item.cost : 0), 0);
  return { level, rank, nextRank, points: level - 1 - spent, levelXP: xp % XP_PER_LEVEL, goal: XP_PER_LEVEL };
}

export function rewardLesson(progress, correct) {
  const before = progressSummary(progress);
  const xp = 40 + correct * 6;
  const updated = { ...progress, xp: progress.xp + xp };
  const after = progressSummary(updated);
  return {
    progress: updated,
    xp,
    levels: after.level - before.level,
    rank: after.rank === before.rank ? null : after.rank,
    level: after.level,
  };
}

export function changeStudioItem(progress, item) {
  if (progress.equipped[item.slot] === item.id) {
    if (item.slot === 'piano') return null;
    const equipped = { ...progress.equipped };
    delete equipped[item.slot];
    return { progress: { ...progress, equipped }, message: `${item.name} put away.` };
  }

  const owned = item.cost === 0 || progress.owned.includes(item.id);
  if (!owned && progressSummary(progress).points < item.cost) return null;
  return {
    progress: {
      ...progress,
      owned: owned ? progress.owned : [...progress.owned, item.id],
      equipped: { ...progress.equipped, [item.slot]: item.id },
    },
    message: owned ? `${item.name} placed.` : `${item.name} purchased and placed.`,
  };
}
