export function createCanvasRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('This browser could not start a canvas renderer');

  function draw(list, { w, h }) {
    ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    ctx.fillStyle = '#0e1b1b';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < list.length; i += 8) {
      const [x, y, width, height, red, green, blue, alpha] = list.subarray(i, i + 8);
      ctx.fillStyle = 'rgba(' + [red * 255, green * 255, blue * 255, alpha].join(',') + ')';
      ctx.fillRect(x, y, width, height);
    }
  }

  return { name: 'Canvas 2D', draw };
}
