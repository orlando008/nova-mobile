const CUES = {
  recruit: [[530, 820, 0, 0.1]],
  tag: [[425, 650, 0, 0.13], [705, 950, 0.05, 0.12]],
  hit: [[285, 125, 0, 0.18]],
  win: [[440, 440, 0, 0.2], [554, 554, 0.08, 0.2], [659, 659, 0.16, 0.32]],
  end: [[392, 392, 0, 0.2], [294, 294, 0.14, 0.29]],
};

export function createAudio(enabled) {
  let audio;
  let last = -Infinity;

  async function unlock() {
    if (!enabled()) return;
    try {
      if (!audio) {
        const Audio = window.AudioContext ?? window.webkitAudioContext;
        if (!Audio) return;
        audio = new Audio();
      }
      await audio.resume();
    } catch {
      // The match can continue if the browser blocks audio.
    }
  }

  function play(cue) {
    if (!enabled() || audio?.state !== 'running') return;
    const tones = CUES[cue];
    if (!tones) return;
    const now = audio.currentTime;
    if (cue === 'recruit' && now - last < 0.18) return;
    last = now;
    for (const [from, to, delay, duration] of tones) {
      const start = now + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.setValueAtTime(from, start);
      oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.082, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + duration);
    }
  }
  return { unlock, play };
}
