import { QUALITY_META, type Axis, type Choice, type Quality } from "../data/scenarios";

/* ----------------------------- امتیاز ----------------------------- */

export const comboMult = (combo: number) => 1 + Math.min(combo, 8) * 0.14;

export function pointsFor(quality: Quality, combo: number, timeFrac: number) {
  const base = QUALITY_META[quality].base;
  if (base === 0) return 0;
  const speed = Math.round(base * 0.55 * Math.max(0, Math.min(1, timeFrac)));
  return Math.round((base + speed) * comboMult(combo));
}

export interface Grade {
  label: string;
  color: string;
  note: string;
}

export function gradeFor(pct: number): Grade {
  if (pct >= 90)
    return {
      label: "آمادهٔ بالین",
      color: "#49d9a4",
      note: "تصمیم‌ها دقیق، انسانی و ایمن بودند؛ همین الگو را در بخش تکرار کن.",
    };
  if (pct >= 76)
    return {
      label: "توانمند",
      color: "#7fd6c8",
      note: "عملکرد خوبی داشتی؛ روی جزئیات ارزیابی خطر کار کن تا به سطح بالاتر برسی.",
    };
  if (pct >= 60)
    return {
      label: "در حال پیشرفت",
      color: "#f6b73f",
      note: "مسیر درست است، اما چند تصمیم کلیدی می‌توانست پیامد بهتری داشته باشد.",
    };
  if (pct >= 40)
    return {
      label: "نیاز به تمرین",
      color: "#ff9a5c",
      note: "بازخوردها را دوباره بخوان و سناریو را تکرار کن؛ الگوی تصمیم‌ها در حال شکل‌گیری است.",
    };
  return {
    label: "وضعیت بحرانی",
    color: "#ff6a55",
    note: "بیمار از دست رفت. سناریو را از ابتدا با تمرکز بر ایمنی و ارتباط بازی کن.",
  };
}

export function performancePct(
  optimal: number,
  partial: number,
  total: number,
  finalTension: number,
  finalTrust: number,
  crises: number
) {
  if (total <= 0) return 0;
  const decisions = (optimal + partial * 0.45) / total;
  const outcome = Math.max(0, Math.min(1, (100 - finalTension) / 70)) * 0.6 + Math.min(1, finalTrust / 80) * 0.4;
  return Math.round(Math.max(0, Math.min(1, decisions * 0.72 + outcome * 0.28 - crises * 0.06)) * 100);
}

export const AXIS_MAX = { empathy: 0, assessment: 0, safety: 0, professional: 0 } as Record<Axis, number>;

/* ----------------------------- حافظه ----------------------------- */

export interface ScoreEntry {
  name: string;
  scenario: string;
  scenarioTitle: string;
  score: number;
  pct: number;
  grade: string;
  date: number;
  axes: Record<Axis, number>;
}

const K_SCORES = "mrv.scores.v3";
const K_NAME = "mrv.name.v3";
const K_MUTE = "mrv.mute.v3";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* حالت خصوصی مرورگر */
  }
}

export const loadScores = () => read<ScoreEntry[]>(K_SCORES, []);
export const saveScores = (s: ScoreEntry[]) => write(K_SCORES, s.slice(0, 40));
export const clearScores = () => write(K_SCORES, []);

export function submitScore(entry: ScoreEntry): { list: ScoreEntry[]; rank: number } {
  const list = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, 40);
  saveScores(list);
  return { list, rank: list.indexOf(entry) + 1 };
}

export const loadName = () => read<string>(K_NAME, "");
export const saveName = (n: string) => write(K_NAME, n);
export const loadMuted = () => read<boolean>(K_MUTE, false);
export const saveMuted = (m: boolean) => write(K_MUTE, m);

/* ----------------------------- ابزار ----------------------------- */

export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed >>> 0 || 1;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const FA = "۰۱۲۳۴۵۶۷۸۹";
export const faNum = (n: number | string) => String(n).replace(/\d/g, (d) => FA[Number(d)]);

export function bestOf(choices: Choice[]): Quality {
  if (choices.some((c) => c.quality === "optimal")) return "optimal";
  if (choices.some((c) => c.quality === "partial")) return "partial";
  return "poor";
}

export const dateFmt = (ts: number) => {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  } catch {
    return "";
  }
};
