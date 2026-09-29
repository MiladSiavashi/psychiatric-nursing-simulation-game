import type { Mood } from "../data/scenarios";

/* ------------------------------------------------------------------ */
/*  میدان روان — موتور صحنه (Canvas 2.5D)                              */
/* ------------------------------------------------------------------ */

const VW = 1000;
const VH = 620;

type Kind = "spark" | "shard" | "dust" | "rain" | "drip" | "smoke";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: Kind;
  rot: number;
  vr: number;
  drag: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  vr: number;
  life: number;
  max: number;
  color: string;
  w: number;
}

interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
  text: string;
  color: string;
  size: number;
}

const FA = "۰۱۲۳۴۵۶۷۸۹";
export const faNum = (n: number | string) =>
  String(n).replace(/\d/g, (d) => FA[Number(d)]);

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

interface FaceSpec {
  brow: number;
  browLift: number;
  mouth: number;
  mouthOpen: number;
  eye: number;
  tear: boolean;
  sweat: boolean;
  blush: number;
}

const FACES: Record<Mood, FaceSpec> = {
  calm: { brow: 0.05, browLift: 0, mouth: 7, mouthOpen: 0, eye: 1, tear: false, sweat: false, blush: 0.12 },
  anxious: { brow: 0.42, browLift: 3, mouth: -3, mouthOpen: 1, eye: 1.15, tear: false, sweat: true, blush: 0.2 },
  sad: { brow: 0.6, browLift: 5, mouth: -9, mouthOpen: 0, eye: 0.68, tear: true, sweat: false, blush: 0.06 },
  fearful: { brow: 0.75, browLift: 7, mouth: -4, mouthOpen: 3, eye: 1.35, tear: false, sweat: true, blush: 0.1 },
  angry: { brow: -0.75, browLift: -2, mouth: -11, mouthOpen: 2, eye: 0.82, tear: false, sweat: true, blush: 0.45 },
  agitated: { brow: -0.9, browLift: -3, mouth: -8, mouthOpen: 8, eye: 1.05, tear: false, sweat: true, blush: 0.55 },
  flat: { brow: 0, browLift: 0, mouth: 0, mouthOpen: 0, eye: 0.45, tear: false, sweat: false, blush: 0.02 },
};

export class Scene {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private raf = 0;
  private last = 0;
  private t = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;

  tension = 50;
  trust = 30;
  mood: Mood = "anxious";
  accent = "#6cbfe4";
  dim = 0;

  private parts: Particle[] = [];
  private rings: Ring[] = [];
  private floats: FloatText[] = [];
  private rain: { x: number; y: number; v: number; l: number }[] = [];
  private motes: { x: number; y: number; v: number; p: number }[] = [];

  private shakeAmt = 0;
  private flash = 0;
  private flashColor = "255,106,85";
  private reactT = 0;
  private reactKind: "good" | "bad" | "mid" = "good";
  private ecgPhase = 0;
  private ecgBuf: number[] = [];
  private blink = 0;
  private nextBlink = rnd(1.5, 4);
  private drip = 0;
  onBeat: (() => void) | null = null;

  mount(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.resize();
    for (let i = 0; i < 46; i++)
      this.rain.push({ x: rnd(74, 306), y: rnd(84, 300), v: rnd(90, 220), l: rnd(8, 22) });
    for (let i = 0; i < 34; i++)
      this.motes.push({ x: rnd(0, VW), y: rnd(60, VH), v: rnd(3, 12), p: rnd(0, 6.28) });
    this.ecgBuf = new Array(150).fill(0);
    this.last = performance.now();
    this.loop(this.last);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas = null;
    this.ctx = null;
  }

  resize() {
    const c = this.canvas;
    if (!c) return;
    const r = c.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(r.width, 1);
    this.h = Math.max(r.height, 1);
    c.width = Math.floor(this.w * this.dpr);
    c.height = Math.floor(this.h * this.dpr);
  }

  setVitals(v: { tension?: number; trust?: number; mood?: Mood; accent?: string }) {
    if (v.tension !== undefined) this.tension = clamp(v.tension, 0, 100);
    if (v.trust !== undefined) this.trust = clamp(v.trust, 0, 100);
    if (v.mood) this.mood = v.mood;
    if (v.accent) this.accent = v.accent;
  }

  shake(a: number) {
    this.shakeAmt = Math.min(this.shakeAmt + a, 34);
  }

  ring(x: number, y: number, color: string, vr = 420, w = 5, life = 0.6) {
    if (this.rings.length > 24) this.rings.shift();
    this.rings.push({ x, y, r: 8, vr, life, max: life, color, w });
  }

  private burst(
    x: number,
    y: number,
    n: number,
    colors: string[],
    opts: Partial<Particle> & { spread?: number; speed?: number } = {}
  ) {
    const speed = opts.speed ?? 260;
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 320) break;
      const a = rnd(0, Math.PI * 2);
      const s = rnd(speed * 0.35, speed);
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rnd(20, 120),
        g: opts.g ?? 620,
        life: 0,
        max: opts.max ?? rnd(0.5, 1.1),
        size: opts.size ?? rnd(2.5, 6),
        color: colors[(Math.random() * colors.length) | 0],
        kind: opts.kind ?? "spark",
        rot: rnd(0, 6.28),
        vr: rnd(-9, 9),
        drag: opts.drag ?? 0.86,
      });
    }
  }

  /** بازخورد آب‌نباتی پس از هر تصمیم */
  react(kind: "good" | "bad" | "mid", power = 1) {
    this.reactKind = kind;
    this.reactT = 1;
    const px = 520;
    const py = 250;
    if (kind === "good") {
      this.flash = 0.5 * power;
      this.flashColor = "73,217,164";
      this.burst(px, py, Math.round(34 * power), ["#49d9a4", "#8ef0cd", "#dff9ef", "#6cbfe4"], {
        g: -110,
        speed: 300,
        kind: "spark",
        max: 1.3,
        drag: 0.93,
      });
      this.ring(px, py, "rgba(73,217,164,0.85)", 520 * power, 6, 0.65);
      this.ring(px, py, "rgba(255,255,255,0.5)", 300 * power, 3, 0.5);
      this.shake(5 * power);
    } else if (kind === "mid") {
      this.flash = 0.34 * power;
      this.flashColor = "246,183,63";
      this.burst(px, py, Math.round(20 * power), ["#f6b73f", "#ffd98a", "#f4efe4"], {
        g: 120,
        speed: 230,
        max: 1,
      });
      this.ring(px, py, "rgba(246,183,63,0.7)", 380, 4, 0.5);
      this.shake(3.5 * power);
    } else {
      this.flash = 0.62 * power;
      this.flashColor = "255,80,60";
      this.burst(px, py, Math.round(30 * power), ["#ff6a55", "#ff9a76", "#e8547f", "#2a0f0c"], {
        g: 780,
        speed: 380,
        kind: "shard",
        max: 1.1,
        size: rnd(4, 10),
      });
      this.ring(px, py, "rgba(255,106,85,0.9)", 700 * power, 8, 0.55);
      this.shake(16 * power);
    }
  }

  crisis() {
    this.flash = 1;
    this.flashColor = "255,60,40";
    this.shake(34);
    for (let i = 0; i < 3; i++)
      this.ring(520, 260, "rgba(255,80,60,0.75)", 900, 10 - i * 2, 0.9);
    this.burst(520, 250, 60, ["#ff6a55", "#ffb199", "#7a1b10"], { g: 900, speed: 620, kind: "shard" });
  }

  confetti() {
    for (let i = 0; i < 90; i++) {
      if (this.parts.length > 380) break;
      this.parts.push({
        x: rnd(60, 940),
        y: rnd(-60, 60),
        vx: rnd(-60, 60),
        vy: rnd(60, 240),
        g: 120,
        life: 0,
        max: rnd(1.6, 2.8),
        size: rnd(4, 9),
        color: ["#49d9a4", "#f6b73f", "#6cbfe4", "#e8547f", "#f4efe4"][(Math.random() * 5) | 0],
        kind: "shard",
        rot: rnd(0, 6.28),
        vr: rnd(-7, 7),
        drag: 0.99,
      });
    }
  }

  floatText(text: string, color: string, size = 34) {
    if (this.floats.length > 8) this.floats.shift();
    this.floats.push({
      x: rnd(470, 570),
      y: 180,
      vy: -70,
      life: 0,
      max: 1.25,
      text,
      color,
      size,
    });
  }

  /* -------------------------------------------------- loop -------- */

  private loop = (ts: number) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min((ts - this.last) / 1000, 0.05);
    this.last = ts;
    this.t += dt;
    this.update(dt);
    this.draw();
  };

  private update(dt: number) {
    const ag = this.tension / 100;

    this.shakeAmt *= Math.pow(0.0015, dt);
    if (this.shakeAmt < 0.05) this.shakeAmt = 0;
    this.flash = Math.max(0, this.flash - dt * 2.1);
    this.reactT = Math.max(0, this.reactT - dt * 1.5);

    // چشمک
    this.blink -= dt;
    if (this.blink < -0.12) {
      this.nextBlink -= dt;
      if (this.nextBlink <= 0) {
        this.blink = 0.13;
        this.nextBlink = rnd(1.2, 4.5) * (1 - ag * 0.5);
      }
    }

    // ذرات
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > 610 && p.kind === "shard") {
        p.y = 610;
        p.vy *= -0.32;
        p.vx *= 0.7;
      }
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.r += r.vr * dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }

    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life += dt;
      f.y += f.vy * dt;
      f.vy *= Math.pow(0.94, dt * 60);
      if (f.life >= f.max) this.floats.splice(i, 1);
    }

    // باران پشت پنجره
    for (const r of this.rain) {
      r.y += r.v * dt * (1 + ag);
      if (r.y > 300) {
        r.y = 82;
        r.x = rnd(74, 306);
      }
    }
    for (const m of this.motes) {
      m.y -= m.v * dt;
      m.x += Math.sin(this.t * 0.5 + m.p) * 6 * dt;
      if (m.y < 40) {
        m.y = VH - 10;
        m.x = rnd(0, VW);
      }
    }

    // سرم
    this.drip += dt;
    if (this.drip > 1.6) {
      this.drip = 0;
      this.parts.push({
        x: 342,
        y: 268,
        vx: 0,
        vy: 40,
        g: 260,
        life: 0,
        max: 0.7,
        size: 3,
        color: "#bfe9f2",
        kind: "drip",
        rot: 0,
        vr: 0,
        drag: 1,
      });
    }

    // ECG
    const hr = 56 + ag * 82;
    const period = 60 / hr;
    this.ecgPhase += dt / period;
    if (this.ecgPhase >= 1) {
      this.ecgPhase -= 1;
      if (this.onBeat && ag > 0.72) this.onBeat();
    }
    const ph = this.ecgPhase;
    let v = 0;
    if (ph < 0.16) v = Math.sin((ph / 0.16) * Math.PI) * 0.16;
    else if (ph > 0.24 && ph < 0.3) v = -0.2;
    else if (ph >= 0.3 && ph < 0.34) v = 1;
    else if (ph >= 0.34 && ph < 0.38) v = -0.42;
    else if (ph > 0.5 && ph < 0.68) v = Math.sin(((ph - 0.5) / 0.18) * Math.PI) * 0.24;
    this.ecgBuf.push(v);
    if (this.ecgBuf.length > 150) this.ecgBuf.shift();

    // هاله هیجانی بیمار
    if (Math.random() < ag * 0.42) {
      this.parts.push({
        x: rnd(486, 556),
        y: rnd(180, 230),
        vx: rnd(-26, 26),
        vy: rnd(-70, -28),
        g: -12,
        life: 0,
        max: rnd(0.7, 1.5),
        size: rnd(2, 5),
        color: ag > 0.66 ? "#ff6a55" : ag > 0.4 ? "#f6b73f" : "#49d9a4",
        kind: "smoke",
        rot: 0,
        vr: 0,
        drag: 0.97,
      });
    }
  }

  /* -------------------------------------------------- draw -------- */

  private draw() {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;
    const scale = Math.max(this.w / VW, this.h / VH);
    const s = this.shakeAmt;
    const sx = s ? rnd(-s, s) : 0;
    const sy = s ? rnd(-s, s) : 0;
    ctx.setTransform(
      scale * this.dpr,
      0,
      0,
      scale * this.dpr,
      (this.canvas.width - VW * scale * this.dpr) / 2 + sx * this.dpr,
      (this.canvas.height - VH * scale * this.dpr) / 2 + sy * this.dpr
    );

    const ag = this.tension / 100;
    this.drawRoom(ag);
    this.drawFurniture(ag);
    this.drawPatient(ag);
    this.drawParticles();
    this.drawRings();
    this.drawFloats();
    this.drawAtmosphere(ag);

    if (this.dim > 0.001) {
      ctx.fillStyle = `rgba(4,22,27,${this.dim})`;
      ctx.fillRect(-200, -200, VW + 400, VH + 400);
    }
  }

  private rr(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx!;
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  private drawRoom(ag: number) {
    const ctx = this.ctx!;
    // دیوار
    const g = ctx.createLinearGradient(0, 0, 0, 430);
    g.addColorStop(0, "#0a2630");
    g.addColorStop(0.62, "#0e3541");
    g.addColorStop(1, "#0b2b35");
    ctx.fillStyle = g;
    ctx.fillRect(-100, -100, VW + 200, 530);

    // نوار کاغذ دیواری
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#ffffff";
    for (let x = -40; x < VW + 60; x += 46) ctx.fillRect(x, 0, 14, 430);
    ctx.globalAlpha = 1;

    // قرنیز
    ctx.fillStyle = "#08222b";
    ctx.fillRect(-100, 408, VW + 200, 26);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(-100, 408, VW + 200, 2);

    // کف
    const fg = ctx.createLinearGradient(0, 430, 0, VH);
    fg.addColorStop(0, "#0c2b33");
    fg.addColorStop(1, "#05181d");
    ctx.fillStyle = fg;
    ctx.fillRect(-100, 430, VW + 200, VH - 400);

    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 1;
    for (let i = -7; i <= 7; i++) {
      ctx.beginPath();
      ctx.moveTo(500 + i * 62, 432);
      ctx.lineTo(500 + i * 235, VH + 20);
      ctx.stroke();
    }
    for (let i = 1; i <= 6; i++) {
      const y = 432 + Math.pow(i / 6, 2) * (VH - 430);
      ctx.beginPath();
      ctx.moveTo(-100, y);
      ctx.lineTo(VW + 100, y);
      ctx.stroke();
    }

    // نور پنجره روی کف
    ctx.save();
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = "#8ecfe8";
    ctx.beginPath();
    ctx.moveTo(74, 432);
    ctx.lineTo(306, 432);
    ctx.lineTo(400, VH);
    ctx.lineTo(-40, VH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    this.drawWindow(ag);
    this.drawDoor(ag);
    this.drawBoard();
    this.drawMonitor(ag);
    this.drawClock();
    this.drawLamp(ag);
  }

  private drawWindow(ag: number) {
    const ctx = this.ctx!;
    const x = 70;
    const y = 80;
    const w = 240;
    const h = 220;

    // آسمان
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, "#0a1d33");
    sky.addColorStop(0.55, "#123a52");
    sky.addColorStop(1, "#1d5566");
    ctx.fillStyle = sky;
    this.rr(x + 6, y + 6, w - 12, h - 12, 6);
    ctx.fill();

    ctx.save();
    this.rr(x + 6, y + 6, w - 12, h - 12, 6);
    ctx.clip();

    // ستاره‌ها
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let i = 0; i < 26; i++) {
      const sx = x + 14 + ((i * 97) % (w - 28));
      const sy = y + 14 + ((i * 53) % 110);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.4 + i));
      ctx.globalAlpha = tw * 0.75;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;

    // ماه
    const mx = x + w - 62;
    const my = y + 54;
    const mg = ctx.createRadialGradient(mx, my, 2, mx, my, 46);
    mg.addColorStop(0, "rgba(255,238,200,0.55)");
    mg.addColorStop(1, "rgba(255,238,200,0)");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, 46, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = "#fdf1d2";
    ctx.beginPath();
    ctx.arc(mx, my, 17, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = "rgba(200,180,140,0.35)";
    ctx.beginPath();
    ctx.arc(mx - 5, my - 4, 4, 0, 6.283);
    ctx.arc(mx + 6, my + 5, 3, 0, 6.283);
    ctx.fill();

    // ابرها
    ctx.fillStyle = "rgba(220,240,250,0.1)";
    for (let i = 0; i < 3; i++) {
      const cx = x + (((this.t * (7 + i * 4) + i * 130) % (w + 120)) - 60);
      const cy = y + 40 + i * 46;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 46, 13, 0, 0, 6.283);
      ctx.ellipse(cx + 26, cy - 8, 30, 11, 0, 0, 6.283);
      ctx.fill();
    }

    // خط آسمان شهر
    ctx.fillStyle = "rgba(6,20,28,0.85)";
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    let bx = x;
    let i = 0;
    while (bx < x + w) {
      const bw = 22 + ((i * 13) % 26);
      const bh = 26 + ((i * 29) % 54);
      ctx.lineTo(bx, y + h - bh);
      ctx.lineTo(bx + bw, y + h - bh);
      bx += bw;
      i++;
    }
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(246,183,63,0.5)";
    for (let k = 0; k < 18; k++) {
      const wx = x + 10 + ((k * 37) % (w - 20));
      const wy = y + h - 12 - ((k * 19) % 44);
      if ((k + Math.floor(this.t / 3)) % 5 !== 0) ctx.fillRect(wx, wy, 3, 4);
    }

    // باران
    ctx.strokeStyle = "rgba(180,225,245,0.42)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const r of this.rain) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 2, r.y + r.l);
    }
    ctx.stroke();
    ctx.restore();

    // قاب
    ctx.strokeStyle = "#15424e";
    ctx.lineWidth = 12;
    this.rr(x, y, w, h, 10);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = 2;
    this.rr(x + 6, y + 6, w - 12, h - 12, 6);
    ctx.stroke();
    ctx.strokeStyle = "#15424e";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + 4);
    ctx.lineTo(x + w / 2, y + h - 4);
    ctx.moveTo(x + 4, y + h / 2);
    ctx.lineTo(x + w - 4, y + h / 2);
    ctx.stroke();

    // طاقچه
    ctx.fillStyle = "#123c47";
    this.rr(x - 14, y + h - 2, w + 28, 16, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x - 14, y + h - 2, w + 28, 2);

    // گلدان روی طاقچه
    const sway = Math.sin(this.t * 1.1) * (2 + ag * 3);
    ctx.fillStyle = "#1d5a52";
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.ellipse(x + 222 + k * 10 + sway, y + h - 22, 7, 15, k * 0.4, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = "#8a5a3c";
    this.rr(x + 208, y + h - 8, 28, 12, 3);
    ctx.fill();
  }

  private drawDoor(ag: number) {
    const ctx = this.ctx!;
    const x = 812;
    const y = 96;
    const w = 128;
    const h = 312;

    ctx.fillStyle = "#07222b";
    this.rr(x - 8, y - 8, w + 16, h + 16, 8);
    ctx.fill();

    const dg = ctx.createLinearGradient(x, y, x + w, y + h);
    dg.addColorStop(0, "#12414e");
    dg.addColorStop(1, "#0c2f3a");
    ctx.fillStyle = dg;
    this.rr(x, y, w, h, 5);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.32)";
    ctx.lineWidth = 3;
    this.rr(x + 16, y + 22, w - 32, 108, 4);
    ctx.stroke();
    this.rr(x + 16, y + 156, w - 32, 130, 4);
    ctx.stroke();

    // شیشه دید
    ctx.fillStyle = "rgba(150,220,235,0.14)";
    this.rr(x + 30, y + 34, w - 60, 84, 4);
    ctx.fill();
    const flick = 0.08 + 0.06 * Math.sin(this.t * 6);
    ctx.fillStyle = `rgba(246,183,63,${flick + ag * 0.06})`;
    this.rr(x + 30, y + 34, w - 60, 84, 4);
    ctx.fill();

    // نشت نور از درز
    const lg = ctx.createLinearGradient(x - 10, 0, x + 6, 0);
    lg.addColorStop(0, "rgba(246,183,63,0)");
    lg.addColorStop(1, "rgba(246,183,63,0.28)");
    ctx.fillStyle = lg;
    ctx.fillRect(x - 12, y + 6, 18, h - 12);

    // دستگیره
    ctx.fillStyle = "#d8c9a4";
    ctx.beginPath();
    ctx.arc(x + 16, y + h / 2, 6, 0, 6.283);
    ctx.fill();

    // تابلو خروج
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(this.t * (ag > 0.75 ? 6 : 1.4)));
    ctx.fillStyle = `rgba(255,90,70,${0.25 + pulse * 0.5})`;
    this.rr(x + 34, y - 34, 60, 20, 4);
    ctx.fill();
    ctx.fillStyle = "#0a1a1c";
    ctx.fillRect(x + 42, y - 28, 44, 3);
    ctx.fillRect(x + 42, y - 22, 28, 3);
  }

  private drawBoard() {
    const ctx = this.ctx!;
    ctx.save();
    ctx.translate(398, 150);
    ctx.rotate(-0.018);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    this.rr(-78, -58, 156, 116, 6);
    ctx.fill();
    ctx.fillStyle = "#e8e0cd";
    this.rr(-80, -60, 156, 116, 6);
    ctx.fill();
    ctx.fillStyle = "#0e3541";
    ctx.fillRect(-80, -60, 156, 16);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(-80, -60, 156, 2);

    // یادداشت‌ها
    const notes = [
      { x: -68, y: -34, c: "#f6b73f", r: -0.06 },
      { x: -14, y: -30, c: "#8fd8c4", r: 0.05 },
      { x: 34, y: -36, c: "#e8a1b4", r: -0.03 },
      { x: -50, y: 12, c: "#cfe3ea", r: 0.04 },
      { x: 16, y: 8, c: "#f6b73f", r: -0.05 },
    ];
    for (const n of notes) {
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.r);
      ctx.fillStyle = n.c;
      this.rr(0, 0, 42, 34, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(20,40,45,0.45)";
      for (let i = 0; i < 4; i++) ctx.fillRect(5, 7 + i * 6, 30 - (i % 2) * 8, 2);
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.arc(21, 3, 3, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawMonitor(ag: number) {
    const ctx = this.ctx!;
    const x = 566;
    const y = 96;
    const w = 142;
    const h = 96;

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    this.rr(x - 4, y + 4, w + 8, h + 8, 8);
    ctx.fill();
    ctx.fillStyle = "#123540";
    this.rr(x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = "#04161b";
    this.rr(x + 7, y + 7, w - 14, h - 22, 4);
    ctx.fill();

    // شبکه
    ctx.strokeStyle = "rgba(120,190,200,0.1)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 7 + ((h - 22) / 5) * i);
      ctx.lineTo(x + w - 7, y + 7 + ((h - 22) / 5) * i);
      ctx.stroke();
    }

    // ECG
    const baseY = y + 7 + (h - 22) * 0.62;
    const amp = (h - 22) * 0.42;
    const col = ag > 0.78 ? "#ff6a55" : "#49d9a4";
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const n = this.ecgBuf.length;
    for (let i = 0; i < n; i++) {
      const px = x + 8 + ((w - 18) * i) / (n - 1);
      const py = baseY - this.ecgBuf[i] * amp;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // اعداد
    const hr = Math.round(56 + ag * 82);
    ctx.fillStyle = col;
    ctx.font = "700 15px Vazirmatn, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(faNum(hr), x + w - 34, y + h - 6);
    ctx.fillStyle = "#6cbfe4";
    ctx.font = "700 11px Vazirmatn, sans-serif";
    ctx.fillText("BPM", x + 12, y + h - 6);
    ctx.textAlign = "start";

    // بازوی مانیتور
    ctx.fillStyle = "#0d2c35";
    ctx.fillRect(x + w / 2 - 6, y + h, 12, 22);
  }

  private drawClock() {
    const ctx = this.ctx!;
    const cx = 754;
    const cy = 126;
    const r = 27;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 3, r, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = "#e9e3d3";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 6.283);
    ctx.fill();
    ctx.strokeStyle = "#12414e";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "rgba(20,50,60,0.5)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.283;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.stroke();
    }
    const now = new Date();
    const hr = now.getHours() % 12;
    const mn = now.getMinutes();
    const sc = now.getSeconds() + this.t % 1;
    const hands: [number, number, number, string][] = [
      [((hr + mn / 60) / 12) * 6.283 - 1.5708, r * 0.48, 3.4, "#12414e"],
      [(mn / 60) * 6.283 - 1.5708, r * 0.72, 2.4, "#12414e"],
      [(sc / 60) * 6.283 - 1.5708, r * 0.82, 1.2, "#e8547f"],
    ];
    for (const [a, len, wdt, c] of hands) {
      ctx.strokeStyle = c;
      ctx.lineWidth = wdt;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.fillStyle = "#e8547f";
    ctx.beginPath();
    ctx.arc(cx, cy, 2.4, 0, 6.283);
    ctx.fill();
  }

  private drawLamp(ag: number) {
    const ctx = this.ctx!;
    const swing = Math.sin(this.t * (0.7 + ag * 1.6)) * (2.5 + ag * 7);
    const lx = 500 + swing;
    const ly = 74;

    // مخروط نور
    const cone = ctx.createLinearGradient(0, ly, 0, 560);
    cone.addColorStop(0, "rgba(246,183,63,0.20)");
    cone.addColorStop(0.5, "rgba(246,183,63,0.07)");
    cone.addColorStop(1, "rgba(246,183,63,0)");
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(lx - 26, ly + 10);
    ctx.lineTo(lx + 26, ly + 10);
    ctx.lineTo(lx + 260, 600);
    ctx.lineTo(lx - 260, 600);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#0a2229";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(500, -20);
    ctx.lineTo(lx, ly - 16);
    ctx.stroke();

    ctx.fillStyle = "#12414e";
    ctx.beginPath();
    ctx.moveTo(lx - 34, ly + 8);
    ctx.lineTo(lx + 34, ly + 8);
    ctx.lineTo(lx + 16, ly - 20);
    ctx.lineTo(lx - 16, ly - 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(lx - 34, ly + 5, 68, 3);

    const flick = 0.82 + 0.18 * Math.sin(this.t * 22) * (ag > 0.7 ? 1 : 0.25);
    const bg = ctx.createRadialGradient(lx, ly + 12, 2, lx, ly + 12, 60);
    bg.addColorStop(0, `rgba(255,226,160,${0.85 * flick})`);
    bg.addColorStop(1, "rgba(255,226,160,0)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(lx, ly + 12, 60, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = `rgba(255,240,200,${flick})`;
    ctx.beginPath();
    ctx.ellipse(lx, ly + 9, 12, 6, 0, 0, 6.283);
    ctx.fill();
  }

  private drawFurniture(ag: number) {
    const ctx = this.ctx!;

    // صندلی
    ctx.save();
    ctx.translate(196, 0);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 512, 52, 12, 0, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = "#144852";
    this.rr(-40, 400, 80, 16, 5);
    ctx.fill();
    ctx.fillStyle = "#0f3a44";
    this.rr(-44, 330, 14, 78, 5);
    ctx.fill();
    ctx.fillStyle = "#123f4a";
    for (const dx of [-34, 30]) {
      ctx.fillRect(dx, 416, 9, 92);
    }
    ctx.restore();

    // پایه سرم
    ctx.strokeStyle = "#9fb6bb";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(342, 486);
    ctx.lineTo(342, 214);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(318, 486);
    ctx.lineTo(366, 486);
    ctx.moveTo(322, 226);
    ctx.lineTo(362, 226);
    ctx.stroke();
    ctx.fillStyle = "rgba(190,235,245,0.5)";
    this.rr(326, 232, 32, 44, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    this.rr(330, 236, 6, 34, 3);
    ctx.fill();
    ctx.strokeStyle = "rgba(190,235,245,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(342, 276);
    ctx.bezierCurveTo(346, 330, 420, 340, 468, 336);
    ctx.stroke();

    // تخت
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(596, 500, 210, 26, 0, 0, 6.283);
    ctx.fill();

    ctx.fillStyle = "#0f3742";
    this.rr(762, 292, 22, 176, 6);
    ctx.fill();
    ctx.fillStyle = "#164c59";
    this.rr(762, 292, 22, 12, 6);
    ctx.fill();

    ctx.fillStyle = "#123f4a";
    this.rr(392, 424, 392, 26, 6);
    ctx.fill();
    for (const dx of [404, 750]) {
      ctx.fillStyle = "#0d323c";
      ctx.fillRect(dx, 448, 14, 52);
    }

    // تشک
    ctx.fillStyle = "#dce7e6";
    this.rr(386, 386, 392, 42, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    this.rr(386, 410, 392, 18, 8);
    ctx.fill();

    // پتو با رنگ سناریو
    ctx.fillStyle = this.accent;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(596, 388);
    ctx.lineTo(778, 388);
    ctx.lineTo(778, 428);
    ctx.lineTo(596, 428);
    ctx.bezierCurveTo(620, 452, 580, 462, 596, 486);
    ctx.lineTo(560, 486);
    ctx.bezierCurveTo(576, 452, 566, 414, 596, 388);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    this.rr(596, 388, 182, 8, 4);
    ctx.fill();

    // بالش
    ctx.fillStyle = "#f2ece1";
    this.rr(690, 358, 88, 34, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    this.rr(690, 376, 88, 16, 8);
    ctx.fill();

    void ag;
  }

  private drawPatient(ag: number) {
    const ctx = this.ctx!;
    const cx = 520;
    const baseY = 372;
    const jitter = ag > 0.55 ? (Math.random() - 0.5) * ag * 5 : 0;
    const breathe = Math.sin(this.t * (1.6 + ag * 2.2)) * (2 + ag * 3);
    const react = this.reactT;
    const kind = this.reactKind;
    const lean =
      kind === "good" ? -react * 8 : kind === "bad" ? react * 14 : react * 3;
    const slump = (1 - this.trust / 100) * 6 + (1 - ag) * -3;
    const x = cx + jitter + lean * 0.4;
    const shoulderY = 258 + breathe * 0.35 + slump * 0.5 + (kind === "bad" ? react * 6 : 0);
    const headY = 208 + breathe * 0.6 + slump * 0.8 - (kind === "good" ? react * 4 : 0);

    // سایه
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.beginPath();
    ctx.ellipse(cx, 512, 74, 15, 0, 0, 6.283);
    ctx.fill();

    // هاله وضعیت
    const auraCol =
      ag > 0.72 ? "255,106,85" : ag > 0.45 ? "246,183,63" : "73,217,164";
    const auraR = 96 + Math.sin(this.t * (1.4 + ag * 3)) * (6 + ag * 12);
    const aura = ctx.createRadialGradient(cx, 290, 10, cx, 290, auraR);
    aura.addColorStop(0, `rgba(${auraCol},${0.06 + ag * 0.12})`);
    aura.addColorStop(1, `rgba(${auraCol},0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, 290, auraR, 0, 6.283);
    ctx.fill();

    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate((lean * Math.PI) / 900);
    ctx.translate(-x, 0);

    // پاها
    ctx.fillStyle = "#2f4d5c";
    for (const [dx, dy] of [
      [-20, 0],
      [18, 4],
    ] as const) {
      this.rr(cx + dx - 13, baseY - 12, 26, 128 + dy, 12);
      ctx.fill();
    }
    // کفش
    ctx.fillStyle = "#16323c";
    for (const [dx, dy] of [
      [-20, 0],
      [18, 4],
    ] as const) {
      this.rr(cx + dx - 17, baseY + 112 + dy, 34, 16, 7);
      ctx.fill();
    }

    // تن / لباس بیمارستان
    const gown = ctx.createLinearGradient(0, shoulderY - 10, 0, baseY + 8);
    gown.addColorStop(0, "#eef3f2");
    gown.addColorStop(1, "#c3d4d6");
    ctx.fillStyle = gown;
    ctx.beginPath();
    ctx.moveTo(cx - 46, shoulderY + 6);
    ctx.bezierCurveTo(cx - 60, shoulderY + 40, cx - 58, baseY - 24, cx - 52, baseY + 6);
    ctx.lineTo(cx + 52, baseY + 6);
    ctx.bezierCurveTo(cx + 58, baseY - 24, cx + 60, shoulderY + 40, cx + 46, shoulderY + 6);
    ctx.bezierCurveTo(cx + 26, shoulderY - 12, cx - 26, shoulderY - 12, cx - 46, shoulderY + 6);
    ctx.closePath();
    ctx.fill();

    // خطوط لباس
    ctx.strokeStyle = this.accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - 56 + i * 2, shoulderY + 34 + i * 26);
      ctx.lineTo(cx + 56 - i * 2, shoulderY + 34 + i * 26);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // یقه
    ctx.fillStyle = "#b9cdd0";
    ctx.beginPath();
    ctx.moveTo(cx - 18, shoulderY - 4);
    ctx.lineTo(cx + 18, shoulderY - 4);
    ctx.lineTo(cx, shoulderY + 22);
    ctx.closePath();
    ctx.fill();

    // بازوها
    const armLift = kind === "bad" ? react * 22 : kind === "good" ? -react * 10 : 0;
    ctx.strokeStyle = "#dfe9e8";
    ctx.lineWidth = 19;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 42, shoulderY + 14);
    ctx.quadraticCurveTo(cx - 68, shoulderY + 62 - armLift, cx - 40, baseY - 6 - armLift);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 42, shoulderY + 14);
    ctx.quadraticCurveTo(cx + 68, shoulderY + 62 - armLift * 0.6, cx + 40, baseY - 6 - armLift * 0.6);
    ctx.stroke();

    // دست‌ها
    ctx.fillStyle = "#d7a379";
    const clench = ag > 0.6 ? 2 + ag * 3 : 0;
    ctx.beginPath();
    ctx.arc(cx - 40, baseY - 6 - armLift, 10 + clench * 0.4, 0, 6.283);
    ctx.arc(cx + 40, baseY - 6 - armLift * 0.6, 10 + clench * 0.4, 0, 6.283);
    ctx.fill();

    // گردن
    ctx.fillStyle = "#c08d64";
    this.rr(cx - 11, headY + 22, 22, 24, 8);
    ctx.fill();

    // سر
    const skin = ctx.createLinearGradient(cx - 34, headY - 34, cx + 34, headY + 34);
    skin.addColorStop(0, "#e3b189");
    skin.addColorStop(1, "#c68f66");
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, headY, 34, 38, 0, 0, 6.283);
    ctx.fill();

    // گوش
    ctx.fillStyle = "#cf9a70";
    ctx.beginPath();
    ctx.ellipse(cx - 34, headY + 4, 6, 9, 0, 0, 6.283);
    ctx.ellipse(cx + 34, headY + 4, 6, 9, 0, 0, 6.283);
    ctx.fill();

    // مو
    ctx.fillStyle = "#241d18";
    ctx.beginPath();
    ctx.ellipse(cx, headY - 16, 35, 26, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 35, headY - 12);
    ctx.quadraticCurveTo(cx - 30, headY + 6, cx - 22, headY - 8);
    ctx.quadraticCurveTo(cx - 6, headY - 26, cx + 12, headY - 12);
    ctx.quadraticCurveTo(cx + 26, headY - 2, cx + 35, headY - 14);
    ctx.lineTo(cx + 35, headY - 24);
    ctx.lineTo(cx - 35, headY - 24);
    ctx.closePath();
    ctx.fill();

    this.drawFace(cx, headY, ag);
    ctx.restore();
  }

  private drawFace(cx: number, hy: number, ag: number) {
    const ctx = this.ctx!;
    const f = FACES[this.mood] ?? FACES.anxious;
    const eyeY = hy + 2;
    const ex = 13;
    const blinkClose = this.blink > 0 ? Math.sin((this.blink / 0.13) * Math.PI) : 0;
    const look = Math.sin(this.t * 0.6) * 2 + (ag > 0.7 ? Math.sin(this.t * 7) * 2 : 0);

    // گونه
    if (f.blush > 0.05) {
      ctx.fillStyle = `rgba(232,120,100,${f.blush * (0.5 + ag * 0.6)})`;
      ctx.beginPath();
      ctx.ellipse(cx - ex - 4, eyeY + 14, 9, 5, 0, 0, 6.283);
      ctx.ellipse(cx + ex + 4, eyeY + 14, 9, 5, 0, 0, 6.283);
      ctx.fill();
    }

    // چشم‌ها
    for (const s of [-1, 1]) {
      const ox = cx + s * ex;
      const open = Math.max(0.06, f.eye * (1 - blinkClose));
      ctx.fillStyle = "#f7f4ee";
      ctx.beginPath();
      ctx.ellipse(ox, eyeY, 8.4, 8.4 * open, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = "#20180f";
      ctx.beginPath();
      ctx.arc(ox + look * 0.6, eyeY, 3.6 * Math.max(open, 0.4), 0, 6.283);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(ox + look * 0.6 - 1.4, eyeY - 1.6, 1.2, 0, 6.283);
      ctx.fill();
      // پلک پایین
      if (open < 0.8) {
        ctx.strokeStyle = "rgba(60,40,30,0.5)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(ox - 8, eyeY + 2);
        ctx.lineTo(ox + 8, eyeY + 2);
        ctx.stroke();
      }
    }

    // ابرو
    ctx.strokeStyle = "#241d18";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      const ox = cx + s * ex;
      const tilt = f.brow * s;
      ctx.beginPath();
      ctx.moveTo(ox - s * 9, eyeY - 12 + tilt * 5 - f.browLift);
      ctx.quadraticCurveTo(
        ox,
        eyeY - 16 - f.browLift + Math.abs(tilt) * 2,
        ox + s * 9,
        eyeY - 12 - tilt * 5 - f.browLift
      );
      ctx.stroke();
    }

    // بینی
    ctx.strokeStyle = "rgba(140,90,60,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, eyeY + 6);
    ctx.quadraticCurveTo(cx + 3, eyeY + 14, cx - 1, eyeY + 15);
    ctx.stroke();

    // دهان
    const my = eyeY + 22;
    if (f.mouthOpen > 0) {
      ctx.fillStyle = "#5d2a26";
      ctx.beginPath();
      ctx.ellipse(cx, my + 1, 8, 3 + f.mouthOpen, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(cx - 6, my - 2, 12, 2);
    } else {
      ctx.strokeStyle = "#7c3f33";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 11, my);
      ctx.quadraticCurveTo(cx, my + f.mouth, cx + 11, my);
      ctx.stroke();
    }

    // اشک
    if (f.tear) {
      const ty = ((this.t * 26) % 34);
      ctx.fillStyle = "rgba(150,215,240,0.85)";
      ctx.beginPath();
      ctx.ellipse(cx - ex + 3, eyeY + 8 + ty, 2.6, 4, 0, 0, 6.283);
      ctx.fill();
    }

    // عرق
    if (f.sweat && ag > 0.35) {
      const sy = ((this.t * 30) % 26);
      ctx.fillStyle = "rgba(180,230,245,0.8)";
      ctx.beginPath();
      ctx.ellipse(cx + 30, hy - 18 + sy, 3, 4.6, 0, 0, 6.283);
      ctx.fill();
    }

    // خط استرس روی پیشانی
    if (ag > 0.6) {
      ctx.strokeStyle = `rgba(120,80,60,${(ag - 0.6) * 0.7})`;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 16, hy - 24 - i * 6);
        ctx.quadraticCurveTo(cx, hy - 28 - i * 6, cx + 16, hy - 24 - i * 6);
        ctx.stroke();
      }
    }
  }

  private drawParticles() {
    const ctx = this.ctx!;
    const glow = this.parts.length < 120;
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = clamp(k * 1.3, 0, 1);
      if (p.kind === "shard") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.kind === "smoke") {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = k * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * 2.4), 0, 6.283);
        ctx.fill();
      } else if (p.kind === "drip") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.7, p.size * 1.4, 0, 0, 6.283);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        if (glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 9;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k + 0.6, 0, 6.283);
        ctx.fill();
        if (glow) ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawRings() {
    const ctx = this.ctx!;
    for (const r of this.rings) {
      const k = r.life / r.max;
      ctx.globalAlpha = clamp(k, 0, 1) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.w * k + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, 6.283);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloats() {
    const ctx = this.ctx!;
    ctx.textAlign = "center";
    for (const f of this.floats) {
      const k = 1 - f.life / f.max;
      const pop = f.life < 0.18 ? f.life / 0.18 : 1;
      ctx.globalAlpha = clamp(k * 1.6, 0, 1);
      ctx.font = `${f.size * (0.8 + pop * 0.35)}px Lalezar, Vazirmatn, sans-serif`;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(4,22,27,0.85)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "start";
  }

  private drawAtmosphere(ag: number) {
    const ctx = this.ctx!;
    // غبار در نور
    ctx.fillStyle = "rgba(255,232,180,0.35)";
    for (const m of this.motes) {
      ctx.globalAlpha = 0.1 + 0.22 * Math.abs(Math.sin(this.t + m.p));
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.4, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // وینیت
    const vg = ctx.createRadialGradient(500, 300, 200, 500, 300, 700);
    vg.addColorStop(0, "rgba(4,22,27,0)");
    vg.addColorStop(1, "rgba(3,14,18,0.92)");
    ctx.fillStyle = vg;
    ctx.fillRect(-100, -100, VW + 200, VH + 200);

    // تنشن قرمز
    if (ag > 0.6) {
      const p = 0.12 + 0.2 * Math.abs(Math.sin(this.t * (2 + ag * 5))) * ((ag - 0.6) / 0.4);
      const rg = ctx.createRadialGradient(500, 300, 220, 500, 300, 760);
      rg.addColorStop(0, "rgba(255,60,40,0)");
      rg.addColorStop(1, `rgba(255,60,40,${p})`);
      ctx.fillStyle = rg;
      ctx.fillRect(-100, -100, VW + 200, VH + 200);
    }

    // فلش تصمیم
    if (this.flash > 0.002) {
      ctx.fillStyle = `rgba(${this.flashColor},${this.flash * 0.3})`;
      ctx.fillRect(-100, -100, VW + 200, VH + 200);
    }
  }
}
