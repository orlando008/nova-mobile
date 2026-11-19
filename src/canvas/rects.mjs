import { DRAW_STRIDE, PICTURE_INDEX } from '../draw-list.mjs';

export function createCanvasRenderer(canvas, pictures = []) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('This browser could not start a canvas renderer');

  function draw(list, { w, h }) {
    ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    ctx.fillStyle = '#0e1b1b';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < list.length; i += DRAW_STRIDE) {
      const [x, y, width, height, red, green, blue, alpha] = list.subarray(i, i + 8);
      const image = list[i + PICTURE_INDEX];
      if (image) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(pictures[image - 1], x, y, width, height);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = 'rgba(' + [red * 255, green * 255, blue * 255, alpha].join(',') + ')';
        ctx.fillRect(x, y, width, height);
      }
    }
  }

  return { name: 'Canvas 2D', draw };
}
