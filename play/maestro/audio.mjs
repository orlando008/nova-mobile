const TIMESTAMP_MAX_AGE = 250;
const OUTPUT_MAX_DELAY = 1;
const CLOCK_SLOP = .025;

export function createPiano() {
  let context;
  let master;
  let source;
  let cached;
  let origin = 0;
  let outputDelay;

  async function unlock(volume) {
    if (!context || context.state === 'closed') {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('This browser does not support Web Audio.');
      context = new Audio();
      outputDelay = undefined;
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
    }
    if (context.state !== 'running') await context.resume();
    if (context.state !== 'running') throw new Error('The audio output is still interrupted.');
  }

  async function load(url) {
    if (cached?.url === url) return cached.buffer;
    cached = undefined;
    const response = await fetch(url);
    if (!response.ok) throw new Error('The piano track could not load.');
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    cached = { url, buffer };
    return buffer;
  }

  function stop() {
    if (!source) return;
    if (context.state !== 'closed') source.stop();
    source = undefined;
  }

  function start(buffer, position, lead) {
    stop();
    source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    const startAt = context.currentTime + lead / 1000;
    origin = startAt - position / 1000;
    source.start(startAt, position / 1000);
  }

  function positionAt(timestamp) {
    const now = performance.now();
    const current = context.currentTime;
    const output = context.state === 'running' ? context.getOutputTimestamp?.() : undefined;
    if (output?.contextTime > 0 && output.performanceTime > 0) {
      const age = now - output.performanceTime;
      const delay = current - output.contextTime - age / 1000;
      if (age >= -CLOCK_SLOP * 1000 && age <= TIMESTAMP_MAX_AGE &&
          delay >= -CLOCK_SLOP && delay <= OUTPUT_MAX_DELAY) {
        outputDelay = Math.max(0, delay);
      }
    }
    // The output timestamp estimates delay. The render clock controls the transport.
    const reportedDelay = (context.baseLatency ?? 0) + (context.outputLatency ?? 0);
    const delay = outputDelay ?? (Number.isFinite(reportedDelay) ? Math.max(0, reportedDelay) : 0);
    return (current - origin - delay) * 1000 + timestamp - now;
  }

  function setVolume(volume) {
    if (master) master.gain.setTargetAtTime(volume, context.currentTime, .02);
  }

  return { unlock, load, start, stop, positionAt, setVolume, get context() { return context; } };
}
