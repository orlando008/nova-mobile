const sounds = {
  select: [[660, 550, .10, .045]],
  denied: [[160, 95, .18, .08]],
  build: [[360, 520, .14, .09], [740, 1010, .13, .06, .09]],
  pulse: [[900, 265, .07, .045]],
  nova: [[176, 69, .16, .08]],
  cryo: [[1310, 675, .10, .035]],
  wave: [[116, 220, .35, .13], [230, 460, .24, .08, .19]],
  leak: [[375, 90, .28, .16]],
  clear: [[370, 555, .20, .12], [550, 780, .25, .09, .16]],
  win: [[294, 415, .26, .12], [440, 585, .28, .10, .16], [595, 880, .38, .10, .32]],
  loss: [[240, 108, .5, .16], [156, 72, .6, .13, .24]],
};

export function createAudio() {
  let context;
  let bus;
  let enabled = true;

  function setEnabled(value) {
    enabled = value;
    if (bus) bus.gain.setTargetAtTime(value ? .55 : 0, context.currentTime, .025);
  }

  async function unlock() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!enabled || !Audio) return;
    try {
      if (!context) {
        context = new Audio();
        bus = context.createGain();
        bus.gain.value = .55;
        bus.connect(context.destination);
      }
      if (context.state !== 'running') await context.resume();
    } catch {
      // The game remains playable when audio is unavailable.
    }
  }

  function play(type) {
    if (!enabled || context?.state !== 'running' || document.hidden) return;
    for (const [start, end, duration, level, offset = 0] of sounds[type] ?? []) {
      const time = context.currentTime + offset;
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.type = type === 'nova' || type === 'leak' ? 'triangle' : 'sine';
      tone.frequency.setValueAtTime(start, time);
      tone.frequency.exponentialRampToValueAtTime(end, time + duration);
      envelope.gain.setValueAtTime(.0001, time);
      envelope.gain.exponentialRampToValueAtTime(level, time + .012);
      envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
      tone.connect(envelope).connect(bus);
      tone.start(time);
      tone.stop(time + duration);
      tone.onended = () => {
        tone.disconnect();
        envelope.disconnect();
      };
    }
  }

  return { unlock, play, setEnabled };
}
