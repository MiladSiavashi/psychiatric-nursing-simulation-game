/* صدای رویه‌ای با WebAudio — بدون فایل خارجی */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  ac();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.value = m ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.22,
  delay = 0,
  glideTo?: number
) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol = 0.2, freq = 900, delay = 0) {
  const c = ac();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, Math.max(len, 1), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = freq;
  filt.Q.value = 0.9;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt);
  filt.connect(g);
  g.connect(master);
  src.start(t0);
}

export const sfx = {
  hover: () => tone(520, 0.05, "sine", 0.05),
  click: () => tone(320, 0.09, "triangle", 0.14, 0, 200),
  select: () => {
    tone(660, 0.07, "triangle", 0.12);
    tone(990, 0.09, "sine", 0.08, 0.05);
  },
  good: (combo = 1) => {
    const base = 523.25 * Math.pow(1.0595, Math.min(combo, 8));
    tone(base, 0.16, "triangle", 0.2);
    tone(base * 1.5, 0.2, "sine", 0.14, 0.06);
    tone(base * 2, 0.24, "sine", 0.09, 0.12);
  },
  partial: () => {
    tone(440, 0.14, "triangle", 0.16);
    tone(554, 0.16, "sine", 0.1, 0.07);
  },
  bad: () => {
    tone(180, 0.28, "sawtooth", 0.18, 0, 90);
    noise(0.22, 0.18, 420);
  },
  timeout: () => {
    tone(240, 0.4, "square", 0.1, 0, 120);
  },
  alarm: () => {
    tone(880, 0.12, "square", 0.09);
    tone(660, 0.14, "square", 0.09, 0.13);
  },
  qteHit: () => {
    tone(700, 0.1, "sine", 0.2, 0, 1400);
    noise(0.1, 0.08, 2200);
  },
  qteMiss: () => {
    tone(150, 0.3, "sawtooth", 0.2, 0, 70);
    noise(0.3, 0.16, 260);
  },
  combo: (n: number) => {
    const s = [523, 659, 784, 1046, 1318];
    for (let i = 0; i < Math.min(n, 5); i++)
      tone(s[i], 0.13, "triangle", 0.13, i * 0.055);
  },
  win: () => {
    const notes = [523, 659, 784, 1046, 1318, 1568];
    notes.forEach((n, i) => tone(n, 0.42, "triangle", 0.16, i * 0.1));
    noise(0.5, 0.06, 3000, 0.1);
  },
  lose: () => {
    const notes = [440, 392, 330, 262, 196];
    notes.forEach((n, i) => tone(n, 0.5, "sawtooth", 0.13, i * 0.14));
    noise(0.8, 0.1, 180, 0.2);
  },
  page: () => tone(400, 0.08, "sine", 0.08, 0, 600),
};
