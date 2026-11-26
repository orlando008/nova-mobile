export function silhouetteOutline(outline, { id, center: [centerX, centerY] }) {
  const rings = outline.slice(1, -1).split('ZM')
    .map(ring => ring.split(' ').map(point => point.split(',').map(Number)));
  const scaleX = Math.cos((90 - centerY) * Math.PI / 180);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const paths = [];

  for (const ring of rings) {
    const xs = ring.map(([x]) => x);
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    // Use metropolitan France so overseas territories don't shrink its outline.
    if (id === 'FRA' && Math.abs(midX - centerX) > 12) continue;
    // Map polygons on either side of the date line sit together in the silhouette.
    const offset = 360 * Math.round((centerX - midX) / 360);
    const points = ring.map(([x, y]) => {
      const projectedX = (x + offset) * scaleX;
      minX = Math.min(minX, projectedX);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, projectedX);
      maxY = Math.max(maxY, y);
      return `${projectedX.toFixed(5)},${y}`;
    });
    paths.push(`M${points.join(' ')}Z`);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const padding = Math.max(width, height) * .08;
  return {
    path: paths.join(''),
    viewBox: [minX - padding, minY - padding, width + 2 * padding, height + 2 * padding],
  };
}
