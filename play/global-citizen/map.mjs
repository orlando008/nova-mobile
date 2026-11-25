import { mapFrame, panFrame, worldOffset, zoomFrame } from '../../carts/global-citizen/code.js?v=1';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgNode(tag, attributes) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

export function createMap(svg, controls, countries, onAnswer) {
  const countryById = new Map(countries.map(country => [country.id, country]));
  const copies = [-360, 0, 360].map(offset => ({ offset }));
  let shapes = [];
  let home;
  let frame;
  let answer;
  let drag;
  let ignoreClick = false;

  function load(outlines) {
    const defs = svgNode('defs', {});
    shapes = outlines.map(([id, name, path, area], index) => {
      defs.append(svgNode('path', { id: `outline-${id}`, d: path }));
      return { id, name, area, tone: index % 4, country: countryById.get(id) };
    });
    const layers = copies.map(copy => {
      const { offset } = copy;
      const layer = svgNode('g', { transform: `translate(${offset} 0)` });
      const markers = svgNode('g', {});
      copy.nodes = shapes.map(({ id, name, tone, country }) => {
        const path = svgNode('use', {
          href: `#outline-${id}`, class: 'map-country', 'data-tone': tone, 'data-country': id,
          'data-name': name, 'aria-label': name, role: 'button', tabindex: '-1', 'aria-hidden': 'true',
        });
        layer.append(path);
        let marker;
        if (country) {
          marker = svgNode('circle', {
            cx: country.center[0], cy: country.center[1], class: 'map-country map-marker', 'data-country': id,
            'data-name': name, 'aria-label': name, role: 'button', tabindex: '-1', 'aria-hidden': 'true',
          });
          markers.append(marker);
        }
        return { path, marker };
      });
      layer.append(markers);
      return layer;
    });
    svg.replaceChildren(defs, ...layers);
  }

  function visible(x, y) {
    return x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;
  }

  function draw() {
    const { x, y, width, height } = frame;
    svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    controls.in.disabled = width <= 6;
    controls.out.disabled = width >= 180;
    const unitsPerPixel = width / (svg.clientWidth || 340);
    for (const { offset, nodes } of copies) {
      for (const [index, { country, area }] of shapes.entries()) {
        if (!country) continue;
        const { path, marker } = nodes[index];
        const [cx, cy] = country.center;
        const inFrame = visible(cx + offset, cy);
        const tiny = area / unitsPerPixel ** 2 < 190;
        const enabled = !answer && inFrame;
        path.setAttribute('tabindex', enabled && !tiny ? '0' : '-1');
        path.setAttribute('aria-hidden', String(tiny || !inFrame));
        path.setAttribute('aria-disabled', String(Boolean(answer)));
        marker.style.display = tiny ? '' : 'none';
        marker.setAttribute('r', 5.5 * unitsPerPixel);
        marker.setAttribute('tabindex', enabled && tiny ? '0' : '-1');
        marker.setAttribute('aria-hidden', String(!tiny || !inFrame));
        marker.setAttribute('aria-disabled', String(Boolean(answer)));
      }
    }
  }

  function mark(correctId, chosenId) {
    for (const node of svg.querySelectorAll('[data-country]')) {
      const id = node.dataset.country;
      if (id === correctId) node.dataset.result = 'correct';
      else if (id === chosenId) node.dataset.result = 'wrong';
      else delete node.dataset.result;
    }
  }

  function start(country) {
    home = mapFrame(country.center);
    frame = home;
    answer = null;
    drag = null;
    ignoreClick = false;
    svg.removeAttribute('data-dragging');
    mark();
    draw();
  }

  function reveal(country, chosenId) {
    answer = country.id;
    const [x, y] = country.center;
    if (!visible(x + worldOffset(x, frame), y)) frame = home;
    mark(country.id, chosenId);
    draw();
  }

  function choose(node) {
    if (answer || !node.dataset.country) return;
    onAnswer(node.dataset.country, node.dataset.name);
  }

  svg.addEventListener('pointerdown', event => {
    if (!frame || drag || event.button !== 0) return;
    ignoreClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: frame, moved: false };
  });
  svg.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      svg.setPointerCapture(event.pointerId);
      svg.setAttribute('data-dragging', '');
    }
    const scale = drag.start.width / svg.clientWidth;
    frame = panFrame(drag.start, -dx * scale, -dy * scale);
    svg.setAttribute('viewBox', `${frame.x} ${frame.y} ${frame.width} ${frame.height}`);
  });

  function finishDrag(event) {
    if (drag?.id !== event.pointerId) return;
    ignoreClick = drag.moved;
    drag = null;
    svg.removeAttribute('data-dragging');
    if (ignoreClick) draw();
  }

  for (const type of ['pointerup', 'pointercancel']) {
    svg.addEventListener(type, finishDrag);
  }
  svg.addEventListener('lostpointercapture', event => {
    if (event.target === svg) finishDrag(event);
  });
  svg.addEventListener('pointerleave', event => {
    if (!drag?.moved) finishDrag(event);
  });
  svg.addEventListener('click', event => {
    if (!ignoreClick) choose(event.target);
  });
  svg.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    choose(event.target);
  });
  controls.in.addEventListener('click', () => { frame = zoomFrame(frame, 2 / 3); draw(); });
  controls.out.addEventListener('click', () => { frame = zoomFrame(frame, 1.5); draw(); });
  controls.reset.addEventListener('click', () => { frame = home; draw(); });
  new ResizeObserver(() => {
    if (frame && svg.clientWidth) draw();
  }).observe(svg);
  return { load, start, reveal };
}
