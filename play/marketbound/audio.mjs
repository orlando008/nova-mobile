const STEP = .29;
const MELODY = [
  67, 71, 72, null, 76, 74, 71, null,
  67, 69, 71, 67, 64, null, 67, null,
  65, 69, 72, 74, 72, null, 69, 65,
  67, 71, 74, null, 72, 69, 67, null,
  64, 67, 72, 76, 74, null, 71, 67,
  69, 72, 76, null, 74, 72, 69, null,
  65, 69, 72, null, 74, 72, 69, 65,
  67, 71, 74, 71, 72, null, 67, null,
];
const CHORDS = [[48, 55, 64], [43, 55, 59], [41, 53, 57], [43, 55, 59],
  [48, 55, 64], [45, 57, 60], [41, 53, 57], [43, 55, 59]];
const CUES = {
  select: [77],
  swap: [65, 69],
  miss: [55, 49],
  win: [67, 72, 76, 79, 84],
  lose: [64, 61, 57],
};

export function createAudio(settings) {
  let context;
  let music;
  let effects;
  let musicRun;
  let timer;
  let step = 0;
  let next;

  function note(bus, pitch, time, duration, amplitude, type = 'sine') {
    const osc = context.createOscillator();
    const volume = context.createGain();
    osc.type = type;
    osc.frequency.value = 440 * 2 ** ((pitch - 69) / 12);
    volume.gain.setValueAtTime(.0001, time);
    volume.gain.exponentialRampToValueAtTime(amplitude, time + .012);
    volume.gain.exponentialRampToValueAtTime(.0001, time + duration);
    osc.connect(volume).connect(bus);
    osc.start(time);
    osc.stop(time + duration);
    osc.onended = () => {
      osc.disconnect();
      volume.disconnect();
    };
  }

  function schedule() {
    if (next < context.currentTime) next = context.currentTime + .03;
    while (next < context.currentTime + .22) {
      const chord = CHORDS[Math.floor(step / 8)];
      const beat = step % 8;
      if (MELODY[step] !== null) note(musicRun, MELODY[step], next, .34, .17, 'triangle');
      if (beat === 0 || beat === 4) note(musicRun, chord[0] + (beat === 4 ? 12 : 0), next, .5, .31);
      if (beat % 2 === 0) note(musicRun, chord[beat === 2 || beat === 6 ? 2 : 1], next + .045, .39, .15);
      next += STEP;
      step = (step + 1) % MELODY.length;
    }
  }

  function refresh() {
    if (!context) return;
    const active = !document.hidden && context.state === 'running';
    const now = context.currentTime;
    music.gain.setTargetAtTime(settings.music && active ? .18 : 0, now, .03);
    effects.gain.setTargetAtTime(settings.effects && active ? .32 : 0, now, .025);
    if (settings.music && active && !timer) {
      musicRun = context.createGain();
      musicRun.connect(music);
      next = now + .045;
      schedule();
      timer = setInterval(schedule, 75);
    } else if ((!active || !settings.music) && timer) {
      clearInterval(timer);
      timer = undefined;
      musicRun.disconnect();
    }
  }

  async function unlock() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio || (!settings.music && !settings.effects)) return;
    try {
      if (!context) {
        context = new Audio();
        music = context.createGain();
        effects = context.createGain();
        for (const bus of [music, effects]) {
          bus.gain.value = 0;
          bus.connect(context.destination);
        }
        context.addEventListener('statechange', refresh);
      }
      if (context.state !== 'running') await context.resume();
      refresh();
    } catch {
      // The game is still playable on browsers that block audio.
    }
  }

  function play(name, combo = 1) {
    if (!context || context.state !== 'running' || !settings.effects || document.hidden) return;
    const root = 69 + Math.min(Math.max(combo - 1, 0), 7);
    const notes = name === 'match' ? [root, root + 4, root + 7] : CUES[name];
    if (!notes) return;
    const time = context.currentTime + .008;
    const spacing = name === 'win' || name === 'lose' ? .105 : .045;
    notes.forEach((pitch, i) => note(effects, pitch, time + i * spacing, name === 'win' ? .32 : .17, .22,
      name === 'miss' ? 'triangle' : 'sine'));
  }

  document.addEventListener('visibilitychange', refresh);
  return { unlock, play, refresh };
}
