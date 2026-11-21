export const PLANETS = [
  { id: 'kepler', name: 'Kepler', zones: [0, 1, 2], position: [24.6, 79.5], diameter: 35 },
  { id: 'vesper', name: 'Vesper', zones: [3, 4, 5], position: [62.4, 57.2], diameter: 27 },
  { id: 'caldera', name: 'Caldera', zones: [6, 7, 8], position: [24.9, 36.2], diameter: 28 },
  { id: 'nacre', name: 'Nacre', zones: [9, 10, 11], position: [63, 15.2], diameter: 25 },
];

export const STAR_THRESHOLDS = [1, 10, 13];
export const STARS_PER_ZONE = STAR_THRESHOLDS.length;

export function starsForWin(core) {
  return STAR_THRESHOLDS.filter(threshold => core >= threshold).length;
}

export function loadRatings(save) {
  const ratings = Array.isArray(save?.stars) ? save.stars : [];
  const clearance = Array.isArray(save?.clearance) ? new Set(save.clearance) : new Set();
  return PLANETS.flatMap(({ zones }) => zones.map(zone => {
    const stars = ratings[zone];
    if (Number.isInteger(stars) && stars >= 0 && stars <= STARS_PER_ZONE) return stars;
    // Early builds saved a clear but not the core integrity it was earned with.
    return zone < PLANETS[0].zones.length && clearance.has(zone) ? 1 : 0;
  }));
}

export function planetStars(index, ratings) {
  return PLANETS[index].zones.reduce((sum, zone) => sum + ratings[zone], 0);
}

export function planetCapacity(index) {
  return PLANETS[index].zones.length * STARS_PER_ZONE;
}

export function planetUnlocked(index, ratings) {
  return Boolean(PLANETS[index]) &&
    PLANETS.slice(0, index).every((_, previous) => planetStars(previous, ratings) === planetCapacity(previous));
}

export function zoneUnlocked(planet, zone, ratings) {
  const index = PLANETS[planet].zones.indexOf(zone);
  return index >= 0 && planetUnlocked(planet, ratings) &&
    (index === 0 || ratings[zone] > 0 || ratings[PLANETS[planet].zones[index - 1]] > 0);
}

export function recordWin(ratings, zone, core) {
  ratings[zone] = Math.max(ratings[zone], starsForWin(core));
  return ratings[zone];
}
