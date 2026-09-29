import { useEffect, useMemo, useState } from "react";
import type { Axis, Quality, Scenario } from "../data/scenarios";
import { AXIS_LABEL, QUALITY_META } from "../data/scenarios";
import { faNum } from "../game/logic";
import { sfx } from "../game/audio";
import { AXIS_ICON, Btn, Chip, IconBolt, IconPlay, IconRestart, IconTrophy, Panel } from "./ui";
import { cn } from "../utils/cn";

export interface Mistake {
  stage: string;
  picked: string;
  note: string;
}

export interface RunStats {
  optimal: number;
  partial: number;
  poor: number;
  timeout: number;
  bestCombo: number;
  axes: Record<Axis, number>;
  mistakes: Mistake[];
  crisesAverted: number;
  timeUsed: number;
  trail: Quality[];
}

const C = 2 * Math.PI * 54;

export default function Report({
  scenario,
  outcome,
  score,
  pct,
  grade,
  stats,
  tension,
  trust,
  rank,
  isNewBest,
  hasNext,
  onRestart,
  onNext,
  onMenu,
  registerKeys,
}: {
  scenario: Scenario;
  outcome: "cleared" | "crisis";
  score: number;
  pct: number;
  grade: { label: string; color: string; note: string };
  stats: RunStats;
  tension: number;
  trust: number;
  rank: number;
  isNewBest: boolean;
  hasNext: boolean;
  onRestart: () => void;
  onNext: () => void;
  onMenu: () => void;
  registerKeys: (fn: (e: KeyboardEvent) => void) => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setShown(pct), 120);
    return () => window.clearTimeout(id);
  }, [pct]);

  useEffect(() => {
    registerKeys((e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") onRestart();
      else if (e.key === "Escape") onMenu();
      else if (e.key === "Enter" && hasNext) onNext();
    });
  });

  const axisMax = useMemo(() => {
    const m: Record<Axis, number> = { empathy: 0, assessment: 0, safety: 0, professional: 0 };
    for (const st of scenario.stages) {
      const best = st.choices.find((c) => c.quality === "optimal") ?? st.choices[0];
      (Object.keys(m) as Axis[]).forEach((a) => {
        m[a] += Math.max(0, best.axes[a] ?? 0);
      });
    }
    return m;
  }, [scenario]);

  const axisPct = (a: Axis) => Math.round(Math.min(1, (stats.axes[a] || 0) / Math.max(1, axisMax[a])) * 100);
  const strengths = (Object.keys(AXIS_LABEL) as Axis[]).filter((a) => axisPct(a) >= 58);
  const weak = (Object.keys(AXIS_LABEL) as Axis[]).filter((a) => axisPct(a) < 38);

  const narrative =
    outcome === "crisis"
      ? "تنش بیمار از آستانهٔ کنترل گذشت و مداخلهٔ بحران ناموفق بود. تیم اضطراری اعزام شد و سناریو با پیامد نامطلوب پایان یافت."
      : tension <= 40 && trust >= 55
        ? "بیمار آرام شد، همکاری درمانی شکل گرفت و وضعیت برای ادامهٔ درمان تثبیت شد."
        : tension <= 68
          ? "وضعیت کنترل شد، اما تنش باقی‌مانده نیازمند پایش بیشتر و مداخلهٔ تیم درمان است."
          : "سناریو به پایان رسید، اما بیمار در وضعیت پرتنش و با اعتماد آسیب‌دیده تحویل داده شد.";

  const cleared = outcome === "cleared";

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 overflow-y-auto thin-scroll bg-abyss/88 p-3 backdrop-blur-md sm:p-6">
      <div className="mx-auto max-w-5xl">
        {/* سربرگ پرونده */}
        <div className="anim-rise flex flex-wrap items-center gap-2">
          <Chip color={cleared ? "#49d9a4" : "#ff6a55"}>
            {cleared ? "پایان سناریو" : "بحران کنترل‌نشده"}
          </Chip>
          <Chip>{scenario.title}</Chip>
          <Chip>{scenario.patient}</Chip>
          {isNewBest && (
            <Chip color="#f6b73f">
              <IconTrophy className="h-3 w-3" />
              رکورد شخصی جدید
            </Chip>
          )}
          {rank > 0 && rank <= 3 && <Chip color="#f6b73f">رتبهٔ {faNum(rank)} جدول</Chip>}
        </div>

        <h1
          className={cn(
            "mt-2 font-display text-[clamp(34px,7.6vw,64px)] leading-[0.95] text-shadow-deep",
            cleared ? "text-bone" : "text-coral"
          )}
        >
          {grade.label}
        </h1>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          {/* ستون اصلی */}
          <div className="space-y-3">
            <Panel className="anim-rise p-4" corner={false}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[20px] text-bone">نتیجهٔ موقعیت بالینی</h2>
                <Chip color={grade.color}>{faNum(pct)}٪ عملکرد</Chip>
              </div>
              <p className="mt-2 text-[12.5px] leading-[2] text-ash">{narrative}</p>
              <p className="mt-2 rounded-lg border-r-2 p-2.5 text-[12.5px] leading-[1.95] text-bone/90" style={{ borderColor: grade.color, background: `${grade.color}12` }}>
                {grade.note}
              </p>

              {/* خط زمانی تصمیم‌ها */}
              <div className="mt-4">
                <div className="mb-2 text-[10.5px] font-bold text-ash">خط زمانی تصمیم‌ها</div>
                <div className="flex flex-wrap gap-1.5">
                  {stats.trail.map((q, i) => {
                    const m = QUALITY_META[q];
                    return (
                      <span
                        key={i}
                        title={`${scenario.stages[i]?.title ?? ""} — ${m.label}`}
                        className="anim-pop grid h-8 w-8 place-items-center rounded-md border font-display text-[13px]"
                        style={{
                          borderColor: `${m.color}66`,
                          background: `${m.color}18`,
                          color: m.color,
                          animationDelay: `${i * 70}ms`,
                        }}
                      >
                        {faNum(i + 1)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {/* محورهای ارزیابی */}
            <Panel className="anim-rise p-4" corner={false}>
              <h2 className="mb-3 font-display text-[20px] text-bone">محورهای ارزیابی عملکرد</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(AXIS_LABEL) as Axis[]).map((a, i) => {
                  const Ic = AXIS_ICON[a];
                  const p = axisPct(a);
                  return (
                    <div key={a} className="anim-rise" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-bold text-bone">
                          <Ic className="h-3.5 w-3.5" style={{ color: p >= 58 ? "#49d9a4" : p >= 38 ? "#f6b73f" : "#ff6a55" }} />
                          {AXIS_LABEL[a]}
                        </span>
                        <span className="tnum font-display text-[14px]" style={{ color: p >= 58 ? "#49d9a4" : p >= 38 ? "#f6b73f" : "#ff6a55" }}>
                          {faNum(p)}٪
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-abyss">
                        <div
                          className="h-full rounded-full transition-[width] duration-1000 ease-out"
                          style={{
                            width: `${shown ? p : 0}%`,
                            background: p >= 58 ? "#49d9a4" : p >= 38 ? "#f6b73f" : "#ff6a55",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-mint/25 bg-mint/8 p-3">
                  <div className="mb-1.5 font-display text-[15px] text-mint">نقاط قوت</div>
                  {strengths.length ? (
                    <ul className="space-y-1 text-[11.5px] leading-relaxed text-bone/85">
                      {strengths.map((a) => (
                        <li key={a}>• {AXIS_LABEL[a]} — سطح قابل اتکا</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11.5px] leading-relaxed text-ash">
                      هنوز محور برجسته‌ای شکل نگرفته؛ سناریو را با تمرکز بر بازخوردها تکرار کن.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-lamp/25 bg-lamp/8 p-3">
                  <div className="mb-1.5 font-display text-[15px] text-lamp">نیاز به کار</div>
                  {weak.length ? (
                    <ul className="space-y-1 text-[11.5px] leading-relaxed text-bone/85">
                      {weak.map((a) => (
                        <li key={a}>• {AXIS_LABEL[a]} — بازخوردهای این محور را مرور کن</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11.5px] leading-relaxed text-ash">
                      ضعف چشمگیری ثبت نشد؛ برای کسب امتیاز بالاتر، سرعت تصمیم را افزایش بده.
                    </p>
                  )}
                </div>
              </div>
            </Panel>

            {/* تصمیم‌های نامناسب */}
            {stats.mistakes.length > 0 && (
              <Panel className="anim-rise p-4" corner={false}>
                <h2 className="mb-2 font-display text-[20px] text-coral">تصمیم‌های نامناسب و دلیل آن</h2>
                <ul className="space-y-2.5">
                  {stats.mistakes.map((m, i) => (
                    <li key={i} className="anim-rise rounded-lg border border-white/10 bg-white/[0.03] p-3" style={{ animationDelay: `${i * 60}ms` }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip color="#ff6a55">{m.stage}</Chip>
                      </div>
                      <p className="mt-1.5 text-[12px] font-semibold text-bone">«{m.picked}»</p>
                      <p className="mt-1 text-[11.5px] leading-[1.95] text-ash">{m.note}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          {/* ستون امتیاز */}
          <div className="space-y-3">
            <Panel className="anim-pop p-5 text-center" corner={false}>
              <div className="relative mx-auto h-[136px] w-[136px]">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke={grade.color}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - (shown / 100 || 0))}
                    style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.9,.25,1), stroke .4s", filter: `drop-shadow(0 0 8px ${grade.color}aa)` }}
                  />
                </svg>
                <div className="absolute inset-0 grid place-content-center">
                  <div className="tnum font-display text-[40px] leading-none" style={{ color: grade.color }}>
                    {faNum(shown)}
                  </div>
                  <div className="text-[10px] text-ash">از ۱۰۰</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[10.5px] font-bold text-ash">امتیاز کل</div>
                <div className="tnum font-display text-[44px] leading-none text-lamp">
                  {faNum(score.toLocaleString("en-US"))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <Stat label="اقدام مطلوب" value={stats.optimal} color="#49d9a4" />
                <Stat label="قابل قبول" value={stats.partial} color="#f6b73f" />
                <Stat label="نامناسب" value={stats.poor} color="#ff6a55" />
                <Stat label="تعلل" value={stats.timeout} color="#e8547f" />
                <Stat label="بهترین زنجیره" value={stats.bestCombo} color="#6cbfe4" icon={<IconBolt className="h-3 w-3" />} />
                <Stat label="بحران مهارشده" value={stats.crisesAverted} color="#7fd6c8" />
              </div>

              <div className="mt-4 grid gap-2 text-[11px]">
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-ash">تنش نهایی بیمار</span>
                  <span className="tnum font-display text-[16px]" style={{ color: tension > 66 ? "#ff6a55" : tension > 40 ? "#f6b73f" : "#49d9a4" }}>
                    {faNum(Math.round(tension))}٪
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-ash">اعتماد نهایی بیمار</span>
                  <span className="tnum font-display text-[16px] text-sky">{faNum(Math.round(trust))}٪</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-ash">زمان صرف‌شده</span>
                  <span className="tnum font-display text-[16px] text-bone">{faNum(Math.round(stats.timeUsed))} ثانیه</span>
                </div>
              </div>
            </Panel>

            <div className="grid gap-2">
              <Btn variant="primary" accent={scenario.accent} className="py-3.5 text-[14px]" onClick={() => { sfx.select(); onRestart(); }}>
                <IconRestart className="h-4 w-4" />
                تلاش دوباره
                <kbd className="rounded border border-black/25 px-1.5 text-[10px]">R</kbd>
              </Btn>
              {hasNext && (
                <Btn variant="ghost" className="py-3" onClick={() => { sfx.select(); onNext(); }}>
                  <IconPlay className="h-4 w-4" />
                  پروندهٔ بعدی
                </Btn>
              )}
              <Btn variant="ghost" className="py-3" onClick={() => { sfx.page(); onMenu(); }}>
                بازگشت به بخش
              </Btn>
            </div>

            <p className="px-1 text-center text-[10px] leading-relaxed text-ash/70">
              محتوای بالینی این سناریوها نمونهٔ آموزشی است و جایگزین نظر متخصص روان‌پزشکی و پروتکل
              بخش نیست.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-2">
      <div className="tnum font-display text-[20px] leading-none" style={{ color }}>
        {faNum(value)}
        {icon}
      </div>
      <div className="mt-1 text-[9.5px] text-ash">{label}</div>
    </div>
  );
}
