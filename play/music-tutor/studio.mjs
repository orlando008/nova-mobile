import { DECOR, changeDecor, progressSummary, readProgress, rewardLesson } from './progress.mjs';

const STORAGE_KEY = 'nova-mobile:music-tutor:progress';
const element = id => document.getElementById(id);
const slots = ['rug', 'wall', 'plant'];
const pointsText = count => `${count} studio point${count === 1 ? '' : 's'}`;

export function createStudio() {
  const shop = element('studio-items');
  const room = element('studio-room');
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

    for (const slot of slots) room.querySelector(`.${slot}`).dataset.decor = progress.equipped[slot] ?? '';
    const placed = DECOR.filter(item => progress.equipped[item.slot] === item.id).map(item => item.name);
    room.setAttribute('aria-label', placed.length ? `Baroque piano room with ${placed.join(', ')}` : 'Baroque piano room');

    for (const [item, button] of controls) {
      const owned = progress.owned.includes(item.id);
      const active = progress.equipped[item.slot] === item.id;
      const label = active ? 'Remove' : owned ? 'Place' : `Buy · ${item.cost} pt${item.cost === 1 ? '' : 's'}`;
      button.textContent = label;
      button.setAttribute('aria-label', `${active ? 'Remove' : owned ? 'Place' : 'Buy'} ${item.name}${owned ? '' : ` for ${pointsText(item.cost)}`}`);
      button.disabled = !owned && item.cost > points;
      button.closest('li').toggleAttribute('data-placed', active);
    }
  }

  const controls = DECOR.map(item => {
    const row = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = item.name;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'studio-action';
    button.addEventListener('click', async () => {
      const result = await update(current => changeDecor(current, item));
      status.textContent = result?.message ?? 'You need more studio points.';
    });
    row.append(name, button);
    shop.append(row);
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
