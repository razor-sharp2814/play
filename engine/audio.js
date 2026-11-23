// Sound, made from scratch, so no files and no internet are needed.
//
// Devices only allow sound after a tap, so call ensureAudio() at the start of
// every tap (it also brings the sound back after a call or another app,
// and plays even when an iPhone is on silent). Until the first tap `audio` is
// null, and every sound should start with `if (!audio) return;`.

export let audio = null;      // the AudioContext
export let noiseBuf = null;   // 0.6s of white noise, for splashes, puffs and drums

export function ensureAudio() {
  // On iPhones, sound made this way is muted by the silent switch unless the
  // page says it's playing sound on purpose, like a music or video app would.
  // (Safari 16.4 and later. Other devices ignore this.)
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (_) {}

  // A device can close the sound completely (e.g. when it's low on memory),
  // so start again from scratch if that's happened.
  if (audio && audio.state === 'closed') audio = null;
  if (!audio) {
    try {
      audio = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = audio.createBuffer(1, audio.sampleRate * 0.6, audio.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (_) {}
  }
  // Wake the sound up if it isn't playing. As well as 'suspended', iPhones
  // use 'interrupted' after a call, an alarm or another app playing
  // sound, and the sound stays off until it's woken up from a tap like this.
  if (audio && audio.state !== 'running') {
    try { const woken = audio.resume(); if (woken && woken.catch) woken.catch(() => {}); } catch (_) {}
  }
}

// A single note sliding from f0 to f1 Hz. type is 'sine', 'triangle',
// 'square' or 'sawtooth'. start and len are in seconds from now.
export function tone(type, f0, f1, start, len, vol, dest) {
  const t = audio.currentTime + start;
  const osc = audio.createOscillator(), g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  osc.frequency.exponentialRampToValueAtTime(f1, t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, len / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(g).connect(dest || audio.destination);
  osc.start(t); osc.stop(t + len + 0.02);
  return osc;
}

// A burst of filtered noise, with the filter sweeping from f0 to f1 Hz.
// filterType is 'lowpass', 'highpass' or 'bandpass'. dest is where the sound
// goes (the speaker if left out), as for tone().
export function noise(start, len, vol, filterType, f0, f1, q, dest) {
  if (!noiseBuf) return;
  const t = audio.currentTime + start;
  const src = audio.createBufferSource(); src.buffer = noiseBuf;
  const f = audio.createBiquadFilter(); f.type = filterType; f.Q.value = q || 1;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + len);
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(dest || audio.destination);
  src.start(t); src.stop(t + len + 0.02);
}

// Nudge a number up or down at random, so repeated sounds aren't identical.
// vary(300, 0.2) gives somewhere between 270 and 330.
export const vary = (n, amt) => n * (1 + (Math.random() - 0.5) * amt);

// Little rising fanfare for the party
export function fanfare(vol = 0.15) {
  if (!audio) return;
  const t0 = audio.currentTime;
  [523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
    const t = t0 + i * 0.11 + (i > 3 ? 0.08 : 0);
    const osc = audio.createOscillator(), g = audio.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (i === 5 ? 0.6 : 0.2));
    osc.connect(g).connect(audio.destination);
    osc.start(t); osc.stop(t + 0.65);
  });
}
