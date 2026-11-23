// Procedural Web Audio: engine hum, siren, footsteps, gunfire, pickups and UI blips, all
// synthesised at runtime with oscillators and noise. Nothing is loaded and nothing is muted by
// default until the player presses M. Safe to construct without an AudioContext (shot mode).
export function createAudio() {
  let ctx = null;
  let master = null;
  let engine = null;
  let engineGain = null;
  let siren = null;
  let sirenGain = null;
  let muted = false;
  let stepClock = 0;

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.32;
      master.connect(ctx.destination);
      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engine.connect(filter).connect(engineGain).connect(master);
      engine.start();
      siren = ctx.createOscillator();
      siren.type = 'square';
      siren.frequency.value = 620;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      siren.connect(sirenGain).connect(master);
      siren.start();
      return true;
    } catch {
      ctx = null;
      return false;
    }
  }

  function resume() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(frequency, duration, type = 'sine', volume = 0.3, slide = 0) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noise(duration, volume, highpass = 600) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(master);
    source.start(now);
  }

  function update(state, dt) {
    if (!ctx) return;
    const inCar = state.mode === 'car' && state.playerCar;
    const speed = inCar ? Math.abs(state.playerCar.speed) : 0;
    const targetEngine = inCar ? 52 + speed * 0.22 : 0;
    engine.frequency.value += (targetEngine - engine.frequency.value) * Math.min(1, dt * 5);
    engineGain.gain.value += ((inCar ? 0.16 : 0) - engineGain.gain.value) * Math.min(1, dt * 5);
    const wanted = state.player.wanted;
    sirenGain.gain.value += ((wanted > 0 ? 0.045 * wanted : 0) - sirenGain.gain.value) * Math.min(1, dt * 4);
    if (wanted > 0) siren.frequency.value = 560 + Math.sin(performance.now() * 0.006) * 140;
    stepClock -= dt;
    if (!inCar && state.moving && stepClock <= 0) {
      stepClock = 0.34;
      noise(0.05, 0.05, 1400);
    }
    if (state.pPlayerShot) { state.pPlayerShot = false; noise(0.13, 0.36, 900); tone(180, 0.09, 'square', 0.12, -100); }
    if (state.pCrash) { state.pCrash = false; noise(0.22, 0.3, 220); }
    if (state.pPickup) { state.pPickup = false; tone(660, 0.12, 'triangle', 0.22, 320); }
    if (state.pUi) { state.pUi = false; tone(430, 0.08, 'sine', 0.16, 120); }
    if (state.pBusted) { state.pBusted = false; tone(220, 0.5, 'sawtooth', 0.2, -140); }
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.32;
    return muted;
  }

  return { resume, update, setMuted, isMuted: () => muted, tone, noise, get ready() { return ctx !== null; } };
}
