export function createPiano() {
  let context;
  let master;
  let source;
  let cached;
  let origin = 0;

  async function unlock(volume) {
    if (!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('This browser does not support Web Audio.');
      context = new Audio();
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
    }
    if (context.state !== 'running') await context.resume();
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
    source.stop();
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
    // Correlate the output device's audio clock with pointer event timestamps.
    const output = context.getOutputTimestamp?.();
    if (output?.performanceTime > 0) {
      return timestamp - output.performanceTime + (output.contextTime - origin) * 1000;
    }
    const latency = (context.baseLatency ?? 0) + (context.outputLatency ?? 0);
    return timestamp - performance.now() + (context.currentTime - latency - origin) * 1000;
  }

  function setVolume(volume) {
    if (master) master.gain.setTargetAtTime(volume, context.currentTime, .02);
  }

  return { unlock, load, start, stop, positionAt, setVolume, get context() { return context; } };
}
