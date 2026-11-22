export function createGlassAudio() {
  let context;
  let master;
  let noise;
  let enabled = true;

  function makeNoise() {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 1.2), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let random = 1755239;
    for (let i = 0; i < samples.length; i++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      samples[i] = random / 2147483648 - 1;
    }
    return buffer;
  }

  async function unlock() {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!enabled || !Audio) return;
    try {
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.gain.value = .56;
        const limit = context.createDynamicsCompressor();
        master.connect(limit).connect(context.destination);
        noise = makeNoise();
      }
      if (context.state !== 'running') await context.resume();
    } catch {
      // The cart works on browsers with audio disabled.
    }
  }

  function setEnabled(value) {
    enabled = value;
    if (master) master.gain.setTargetAtTime(value ? .56 : 0, context.currentTime, .025);
  }

  function envelope(source, time, duration, volume, attack, filter) {
    const voice = context.createGain();
    voice.gain.setValueAtTime(.0001, time);
    voice.gain.exponentialRampToValueAtTime(volume, time + attack);
    voice.gain.exponentialRampToValueAtTime(.0001, time + duration);
    if (filter) source.connect(filter).connect(voice);
    else source.connect(voice);
    voice.connect(master);
    source.start(time);
    source.stop(time + duration);
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      voice.disconnect();
    };
  }

  function resonance(time, duration, from, to, volume, attack = .004) {
    const tone = context.createOscillator();
    tone.frequency.setValueAtTime(from, time);
    tone.frequency.exponentialRampToValueAtTime(to, time + duration * .75);
    envelope(tone, time, duration, volume, attack);
  }

  function texture(time, duration, from, to, volume, attack, kind, q = .66) {
    const air = context.createBufferSource();
    air.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = kind;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, time);
    filter.frequency.exponentialRampToValueAtTime(to, time + duration * .83);
    envelope(air, time, duration, volume, attack, filter);
  }

  function play({ name, duration }) {
    if (!enabled || context?.state !== 'running' || document.hidden) return;
    const time = context.currentTime + .008;
    switch (name) {
      case 'fire':
        texture(time, .17, 620, 140, .13, .01, 'bandpass');
        resonance(time, .12, 260, 122, .047);
        break;
      case 'grow':
        texture(time, duration, 320, 1450, .135, duration * .47, 'bandpass', 2.3);
        resonance(time, duration, 115, 355, .045, duration * .42);
        resonance(time + .04, duration, 238, 848, .024, duration * .55);
        break;
      case 'settle':
        resonance(time, .26, 1202, 1191, .037);
        resonance(time + .011, .31, 1747, 1740, .021);
        break;
      case 'bounce':
        resonance(time, .14, 925, 872, .057);
        resonance(time + .004, .11, 1467, 1432, .026);
        break;
      case 'miss':
        texture(time, .13, 840, 350, .13, .004, 'bandpass');
        resonance(time, .11, 205, 160, .051);
        break;
      case 'mulligan-earned':
        resonance(time, .28, 1047, 1043, .042);
        resonance(time + .09, .37, 1568, 1562, .036);
        break;
      case 'mulligan-used':
        texture(time, .16, 1410, 520, .13, .004, 'bandpass');
        resonance(time, .20, 784, 523, .05);
        break;
      case 'shatter':
        texture(time, .24, 2950, 1350, .45, .003, 'highpass');
        texture(time + .035, .25, 2320, 4270, .19, .01, 'bandpass');
        for (const [offset, pitch, volume] of [[0, 2177, .089], [.029, 3210, .077], [.093, 2723, .078],
          [.161, 4120, .065], [.223, 2976, .069], [.272, 3934, .048], [.362, 3566, .036], [.464, 4873, .024]]) {
          resonance(time + offset, .31, pitch, pitch * .989, volume);
          resonance(time + offset + .006, .24, pitch * 1.472, pitch * 1.47, volume * .28);
        }
        break;
    }
  }

  return { unlock, play, setEnabled };
}
