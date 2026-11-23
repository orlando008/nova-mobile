import { STUDIO_ITEMS, changeStudioItem, progressSummary, readProgress, rewardLesson } from './progress.mjs?v=piano-upgrades';

const STORAGE_KEY = 'nova-mobile:music-tutor:progress';
const element = id => document.getElementById(id);
const pointsText = count => `${count} studio point${count === 1 ? '' : 's'}`;
const artwork = id => `../../carts/music-tutor/assets/studio/${id}.webp`;

export function createStudio() {
  const shop = element('studio-items');
  const pianos = element('piano-items');
  const room = element('studio-room');
  const roomItems = [
    ['piano', room.querySelector('.piano-furniture')],
    ['rug', room.querySelector('.rug')],
    ['wall', room.querySelector('.wall')],
    ['plant', room.querySelector('.plant')],
  ];
  const status = element('studio-status');
  let progress = readProgress();
  let saved = true;

  function restore() {
    if (!saved) return;
    try {
      progress = readProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Leave the current progress intact when storage is unavailable.
    }
  }

  function update(change) {
    const apply = () => {
      restore();
      const result = change(progress);
      if (!result) return null;
      progress = result.progress;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        saved = true;
      } catch {
        saved = false;
      }
      render();
      return result;
    };

    return navigator.locks ? navigator.locks.request(STORAGE_KEY, apply) : Promise.resolve(apply());
  }

  function render() {
    const { level, rank, nextRank, points, levelXP, goal } = progressSummary(progress);
    element('player-rank').textContent = `Level ${level} · ${rank}`;
    element('player-xp').textContent = `${levelXP} / ${goal} XP`;
    const meter = element('player-meter');
    meter.max = goal;
    meter.value = levelXP;
    element('next-rank').textContent = nextRank ? `Next rank: ${nextRank.name} at level ${nextRank.level}` : 'Highest rank attained';
    element('studio-points').textContent = pointsText(points);
    element('save-notice').hidden = saved;

    for (const [slot, layer] of roomItems) {
      const id = progress.equipped[slot];
      layer.hidden = !id;
      if (!id || layer.dataset.item === id) continue;
      layer.src = artwork(id);
      layer.dataset.item = id;
    }
    const placed = STUDIO_ITEMS.filter(item => progress.equipped[item.slot] === item.id).map(item => item.name);
    room.setAttribute('aria-label', `Piano studio with ${placed.join(', ')}`);

    for (const [item, button] of controls) {
      const piano = item.slot === 'piano';
      const owned = item.cost === 0 || progress.owned.includes(item.id);
      const active = progress.equipped[item.slot] === item.id;
      const action = active ? (piano ? 'In use' : 'Remove') : owned ? (piano ? 'Use' : 'Place') : 'Buy';
      button.textContent = owned ? action : `Buy · ${item.cost} pt${item.cost === 1 ? '' : 's'}`;
      button.setAttribute('aria-label', active && piano ? `${item.name} in use` :
        `${action} ${item.name}${owned ? '' : ` for ${pointsText(item.cost)}`}`);
      button.disabled = active && piano || !owned && item.cost > points;
      button.closest('li').toggleAttribute('data-placed', active);
    }
  }

  const controls = STUDIO_ITEMS.map(item => {
    const row = document.createElement('li');
    const heading = document.createElement('div');
    heading.className = 'studio-item-heading';
    const preview = document.createElement('img');
    preview.className = 'studio-preview';
    preview.alt = '';
    preview.loading = 'lazy';
    preview.src = artwork(item.id);
    const name = document.createElement('span');
    name.textContent = item.name;
    heading.append(preview, name);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-action';
    button.addEventListener('click', async () => {
      const result = await update(current => changeStudioItem(current, item));
      status.textContent = result?.message ?? 'You need more studio points.';
    });
    row.append(heading, button);
    (item.slot === 'piano' ? pianos : shop).append(row);
    return [item, button];
  });

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    restore();
    render();
  });

  restore();
  render();
  return {
    earn: correct => update(current => rewardLesson(current, correct)),
    open() {
      restore();
      status.textContent = '';
      render();
    },
  };
}
