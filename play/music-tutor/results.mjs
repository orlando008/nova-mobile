const element = id => document.getElementById(id);
const fillTransform = ratio => `scaleX(${ratio})`;

export function createResults(instrument) {
  const meter = element('result-meter');
  const fill = element('result-meter-fill');
  const levelReward = element('level-reward');
  const popup = element('rank-popup');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeFill;
  let currentReward;

  function renderMeter({ level, rank, goal, levelXP }, xp = levelXP) {
    element('result-rank').textContent = `Level ${level} · ${rank}`;
    element('result-xp').textContent = `${xp} / ${goal} XP`;
    meter.setAttribute('aria-valuemax', goal);
    meter.setAttribute('aria-valuenow', xp);
    fill.style.transform = fillTransform(xp / goal);
  }

  function renderLevelReward({ levels }) {
    levelReward.textContent = levels ? `Level up! +${levels} studio point${levels === 1 ? '' : 's'}` : '';
  }

  function fillMeter(from, to, goal, duration) {
    activeFill?.cancel();
    const animation = fill.animate([
      { transform: fillTransform(from / goal) },
      { transform: fillTransform(to / goal) },
    ], { duration, easing: 'ease-out', fill: 'forwards' });
    activeFill = animation;
    return animation.finished.then(() => true, () => false);
  }

  function finish() {
    activeFill?.cancel();
    activeFill = undefined;
    meter.removeAttribute('data-level-up');
    if (popup.open) popup.close();
    if (currentReward) {
      renderMeter(currentReward.after);
      renderLevelReward(currentReward);
      currentReward = undefined;
    }
  }

  async function present(reward) {
    currentReward = reward;
    const { before, after, levels, rank, xp } = reward;
    const animate = !motion.matches;
    element('lesson-xp').textContent = `+${xp} XP`;
    levelReward.textContent = '';
    renderMeter(before);

    if (levels) {
      if (animate && !await fillMeter(before.levelXP, before.goal, before.goal, 540)) return;
      renderLevelReward(reward);
      meter.setAttribute('data-level-up', '');
      if (animate || !rank) instrument.celebrate();
      renderMeter(after, 0);
    }

    if (animate && !await fillMeter(levels ? 0 : before.levelXP, after.levelXP, after.goal, 540)) return;
    renderMeter(after);
    activeFill?.cancel();
    activeFill = undefined;
    currentReward = undefined;
    if (rank) {
      element('rank-title').textContent = `New Rank: ${rank}!`;
      popup.showModal();
      instrument.celebrate(true);
    }
  }

  return { present, finish };
}
