const FEEDBACK_DELAY_MS = 800;
const SUCCESS = { pitches: [79, 83, 86], spacingMs: 75, tailMs: 650 };
const MISS = { pitches: [65, 63, 60], spacingMs: 105, tailMs: 280 };

export function nextNoteDelayMs(correct) {
  const { pitches, spacingMs } = correct ? SUCCESS : MISS;
  return FEEDBACK_DELAY_MS + (pitches.length - 1) * spacingMs + 30;
}

export function createInstrument() {
  let context;
  let pluck;
  let chime;
  let output;
  let muted = false;
  let request = 0;
  const voices = new Set();

  function stop() {
    request++;
    if (!context || context.state === 'closed') return;
    const time = context.currentTime;
    for (const { oscillator, envelope } of voices) {
      envelope.gain.cancelScheduledValues(time);
      envelope.gain.setTargetAtTime(0, time, .004);
      oscillator.stop(time + .02);
    }
    voices.clear();
  }

  async function unlock() {
    if (!context || context.state === 'closed') {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      context = new Audio();
      output = context.createGain();
      output.gain.value = .58;
      output.connect(context.destination);
      const harmonics = new Float32Array([0, 1, .42, .24, .13, .085, .045, .029, .017]);
      pluck = context.createPeriodicWave(new Float32Array(harmonics.length), harmonics);
      const chimeHarmonics = new Float32Array([0, 1, .38, .17, .07, .055]);
      chime = context.createPeriodicWave(new Float32Array(chimeHarmonics.length), chimeHarmonics);
    }
    if (context.state !== 'running') await context.resume();
    return context.state === 'running';
  }

  function note(midi, time, duration, volume, ring = false) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const voice = { oscillator, envelope };
    voices.add(voice);
    oscillator.addEventListener('ended', () => {
      voices.delete(voice);
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
    oscillator.setPeriodicWave(ring ? chime : pluck);
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(volume, time + .009);
    envelope.gain.exponentialRampToValueAtTime(volume * .21, time + (ring ? .28 : .09));
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(time);
    oscillator.stop(time + duration + .015);
  }

  async function play(midi, correct) {
    stop();
    const current = request;
    if (muted) return;
    try {
      if (!await unlock() || current !== request) return;
      const time = context.currentTime + .012;
      note(midi, time, .55, .38);
      if (correct === undefined) return;
      const { pitches, spacingMs, tailMs } = correct ? SUCCESS : MISS;
      pitches.forEach((pitch, index) => {
        const start = time + (FEEDBACK_DELAY_MS + index * spacingMs) / 1000;
        const duration = correct || index === pitches.length - 1 ? tailMs / 1000 : .19;
        note(pitch, start, duration, .19, correct);
      });
    } catch {
      // The quiz can still be played if the browser interrupts audio.
    }
  }

  function setMuted(value) {
    muted = value;
    if (muted) stop();
  }

  return { play, stop, setMuted };
}
