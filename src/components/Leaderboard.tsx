import { useEffect, useMemo, useState } from "react";
import { AXIS_LABEL, SCENARIOS, type Axis } from "../data/scenarios";
import { dateFmt, faNum, type ScoreEntry } from "../game/logic";
import { sfx } from "../game/audio";
import { AXIS_ICON, Btn, Chip, IconChart, IconClose, IconPlay, IconTrophy, Panel } from "./ui";
import { cn } from "../utils/cn";

type Tab = "board" | "teacher" | "guide";

const TABS: { id: Tab; label: string; icon: typeof IconTrophy }[] = [
  { id: "board", label: "جدول رتبه‌بندی", icon: IconTrophy },
  { id: "teacher", label: "داشبورد استاد", icon: IconChart },
  { id: "guide", label: "راهنما و معیارها", icon: IconPlay },
];

export default function Leaderboard({
  scores,
  initialTab = "board",
  onBack,
  onClear,
  onPlay,
  registerKeys,
}: {
  scores: ScoreEntry[];
  initialTab?: Tab;
  onBack: () => void;
  onClear: () => void;
  onPlay: (id: string) => void;
  registerKeys: (fn: (e: KeyboardEvent) => void) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => setTab(initialTab), [initialTab]);

  useEffect(() => {
    registerKeys((e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
      else if (e.key === "1") setTab("board");
      else if (e.key === "2") setTab("teacher");
      else if (e.key === "3") setTab("guide");
    });
  });

  const filtered = useMemo(
    () => (filter === "all" ? scores : scores.filter((s) => s.scenario === filter)).slice(0, 12),
    [scores, filter]
  );

  const agg = useMemo(() => {
    const runs = scores.length;
    const avgPct = runs ? Math.round(scores.reduce((a, s) => a + s.pct, 0) / runs) : 0;
    const best = runs ? scores.reduce((a, s) => (s.score > a.score ? s : a), scores[0]) : null;
    const axes: Record<Axis, { sum: number; n: number }> = {
      empathy: { sum: 0, n: 0 },
      assessment: { sum: 0, n: 0 },
      safety: { sum: 0, n: 0 },
      professional: { sum: 0, n: 0 },
    };
    for (const s of scores)
      (Object.keys(axes) as Axis[]).forEach((a) => {
        axes[a].sum += s.axes?.[a] ?? 0;
        axes[a].n += 1;
      });
    const perScenario = SCENARIOS.map((sc) => {
      const rows = scores.filter((s) => s.scenario === sc.id);
      return {
        sc,
        runs: rows.length,
        avg: rows.length ? Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length) : 0,
        top: rows.length ? Math.max(...rows.map((r) => r.score)) : 0,
      };
    });
    const students = aggregateStudents(scores);
    return { runs, avgPct, best, axes, perScenario, students };
  }, [scores]);

  const weakest = (Object.keys(agg.axes) as Axis[]).sort(
    (a, b) => agg.axes[a].sum / Math.max(1, agg.axes[a].n) - agg.axes[b].sum / Math.max(1, agg.axes[b].n)
  )[0];

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 overflow-y-auto thin-scroll bg-abyss/90 p-3 backdrop-blur-md sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="anim-rise flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[clamp(28px,6vw,46px)] leading-none text-bone text-shadow-deep">
            مرکز ارزیابی
          </h1>
          <div className="ms-auto flex items-center gap-2">
            <Btn variant="ghost" onClick={() => { sfx.page(); onBack(); }} title="بازگشت (Esc)">
              <IconClose className="h-4 w-4" />
              بازگشت
            </Btn>
          </div>
        </div>

        <div className="anim-rise mt-3 flex flex-wrap gap-2">
          {TABS.map((t, i) => {
            const Ic = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { sfx.click(); setTab(t.id); }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[12.5px] font-bold transition-all",
                  tab === t.id
                    ? "border-mint/60 bg-mint/14 text-mint"
                    : "border-white/12 bg-white/[0.03] text-ash hover:border-white/25 hover:text-bone"
                )}
              >
                <Ic className="h-4 w-4" />
                {t.label}
                <kbd className="rounded border border-white/15 px-1 font-display text-[10px] opacity-60">{faNum(i + 1)}</kbd>
              </button>
            );
          })}
        </div>

        {/* ------------------------- رتبه‌بندی ------------------------- */}
        {tab === "board" && (
          <Panel className="anim-rise mt-4 overflow-hidden" corner={false}>
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-3">
              <span className="font-display text-[18px] text-bone">برترین‌های بخش</span>
              <span className="text-[11px] text-ash">{faNum(scores.length)} اجرای ثبت‌شده روی این دستگاه</span>
              <div className="ms-auto flex flex-wrap gap-1.5">
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="همه" />
                {SCENARIOS.map((s) => (
                  <FilterChip
                    key={s.id}
                    active={filter === s.id}
                    color={s.accent}
                    onClick={() => setFilter(s.id)}
                    label={s.title}
                  />
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="p-10 text-center">
                <IconTrophy className="mx-auto h-10 w-10 text-ash/40" />
                <p className="mt-3 font-display text-[20px] text-bone">هنوز رکوردی ثبت نشده</p>
                <p className="mt-1 text-[12px] text-ash">اولین سناریو را بازی کن تا نامت در جدول بخش قرار بگیرد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-right">
                  <thead>
                    <tr className="border-b border-white/10 text-[10.5px] text-ash">
                      <th className="p-2.5 font-bold">رتبه</th>
                      <th className="p-2.5 font-bold">دانشجو</th>
                      <th className="p-2.5 font-bold">پرونده</th>
                      <th className="p-2.5 font-bold">امتیاز</th>
                      <th className="p-2.5 font-bold">عملکرد</th>
                      <th className="p-2.5 font-bold">ارزیابی</th>
                      <th className="p-2.5 font-bold">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const medal = ["#f6b73f", "#cfd8dc", "#cd8b5e"][i];
                      const sc = SCENARIOS.find((x) => x.id === s.scenario);
                      return (
                        <tr
                          key={`${s.date}-${i}`}
                          className="anim-rise border-b border-white/[0.06] transition-colors hover:bg-white/[0.04]"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          <td className="p-2.5">
                            <span
                              className="grid h-7 w-7 place-items-center rounded-md border font-display text-[14px]"
                              style={{
                                color: medal ?? "#9db3b8",
                                borderColor: `${medal ?? "#9db3b8"}55`,
                                background: `${medal ?? "#9db3b8"}14`,
                              }}
                            >
                              {faNum(i + 1)}
                            </span>
                          </td>
                          <td className="p-2.5 text-[12.5px] font-bold text-bone">{s.name || "دانشجوی مهمان"}</td>
                          <td className="p-2.5 text-[11.5px]" style={{ color: sc?.accent ?? "#9db3b8" }}>
                            {s.scenarioTitle}
                          </td>
                          <td className="tnum p-2.5 font-display text-[17px] text-lamp">{faNum(s.score.toLocaleString("en-US"))}</td>
                          <td className="tnum p-2.5 text-[12.5px] text-bone">{faNum(s.pct)}٪</td>
                          <td className="p-2.5 text-[11px]">{s.grade}</td>
                          <td className="p-2.5 text-[10.5px] text-ash">{dateFmt(s.date)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {scores.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-t border-white/10 p-3">
                <span className="text-[10.5px] text-ash">رکوردها فقط روی همین دستگاه ذخیره می‌شوند.</span>
                <Btn variant="danger" className="py-1.5 text-[11.5px]" onClick={onClear}>
                  پاک کردن جدول
                </Btn>
              </div>
            )}
          </Panel>
        )}

        {/* ------------------------- داشبورد استاد ------------------------- */}
        {tab === "teacher" && (
          <div className="anim-rise mt-4 grid gap-3 lg:grid-cols-2">
            <Panel className="p-4" corner={false}>
              <h2 className="font-display text-[20px] text-bone">گزارش کلی کلاس</h2>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <KPI label="تعداد اجرا" value={faNum(agg.runs)} color="#6cbfe4" />
                <KPI label="میانگین عملکرد" value={`${faNum(agg.avgPct)}٪`} color="#49d9a4" />
                <KPI label="بالاترین امتیاز" value={faNum(agg.best ? agg.best.score.toLocaleString("en-US") : 0)} color="#f6b73f" />
              </div>
              <div className="mt-4 rounded-lg border border-lamp/25 bg-lamp/8 p-3">
                <div className="font-display text-[15px] text-lamp">ضعیف‌ترین محور گروه</div>
                <p className="mt-1 text-[12px] leading-relaxed text-bone/85">
                  {weakest ? AXIS_LABEL[weakest] : "—"} — پیشنهاد می‌شود این محور در جلسهٔ بعدی با
                  مرور موردی و بحث گروهی تقویت شود.
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {(Object.keys(AXIS_LABEL) as Axis[]).map((a) => {
                  const Ic = AXIS_ICON[a];
                  const v = agg.axes[a].n ? agg.axes[a].sum / agg.axes[a].n : 0;
                  const norm = Math.min(100, Math.round(v * 12));
                  return (
                    <div key={a}>
                      <div className="mb-1 flex items-center justify-between text-[11.5px]">
                        <span className="flex items-center gap-1.5 text-bone">
                          <Ic className="h-3.5 w-3.5 text-ash" />
                          {AXIS_LABEL[a]}
                        </span>
                        <span className="tnum text-ash">{faNum(Math.round(v))} امتیاز میانگین</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-abyss">
                        <div className="h-full rounded-full bg-mint/70 transition-[width] duration-700" style={{ width: `${norm}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel className="p-4" corner={false}>
              <h2 className="font-display text-[20px] text-bone">عملکرد به تفکیک سناریو</h2>
              <div className="mt-3 space-y-2.5">
                {agg.perScenario.map((r) => (
                  <div key={r.sc.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-[16px]" style={{ color: r.sc.accent }}>
                        {r.sc.title}
                      </span>
                      <Btn variant="ghost" className="px-2 py-1 text-[10.5px]" onClick={() => onPlay(r.sc.id)}>
                        <IconPlay className="h-3 w-3" />
                        اجرا
                      </Btn>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-abyss">
                        <div
                          className="h-full rounded-full transition-[width] duration-700"
                          style={{ width: `${r.avg}%`, background: r.sc.accent }}
                        />
                      </div>
                      <span className="tnum text-[10.5px] text-ash">
                        {faNum(r.runs)} اجرا · میانگین {faNum(r.avg)}٪ · رکورد {faNum(r.top.toLocaleString("en-US"))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-4 lg:col-span-2" corner={false}>
              <h2 className="font-display text-[20px] text-bone">دانشجویان</h2>
              {agg.students.length === 0 ? (
                <p className="mt-2 text-[12px] text-ash">هنوز داده‌ای ثبت نشده است.</p>
              ) : (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {agg.students.map((s) => (
                    <div key={s.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-display text-[16px] text-bone">{s.name}</span>
                        <Chip color="#f6b73f">{faNum(s.runs)} اجرا</Chip>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-ash">
                        <span>بهترین امتیاز</span>
                        <span className="tnum font-display text-[15px] text-lamp">{faNum(s.best.toLocaleString("en-US"))}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-ash">
                        <span>میانگین عملکرد</span>
                        <span className="tnum font-display text-[15px] text-mint">{faNum(s.avg)}٪</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 text-[10.5px] leading-relaxed text-ash/70">
                در نسخهٔ نهایی، این داشبورد به حساب کاربری دانشجویان متصل می‌شود و استاد امکان مدیریت
                سناریوها، مراحل، گزینه‌ها، معیارهای امتیازدهی و دریافت گزارش خروجی را خواهد داشت.
              </p>
            </Panel>
          </div>
        )}

        {/* ------------------------- راهنما ------------------------- */}
        {tab === "guide" && (
          <div className="anim-rise mt-4 grid gap-3 lg:grid-cols-2">
            <Panel className="p-4" corner={false}>
              <h2 className="font-display text-[20px] text-bone">کنترل‌ها</h2>
              <ul className="mt-3 space-y-2 text-[12.5px] text-ash">
                {[
                  ["۱ تا ۴", "انتخاب اقدام بالینی"],
                  ["↑ ↓ / ← →", "جابه‌جایی بین اقدام‌ها"],
                  ["Enter / Space", "تأیید، ادامهٔ سناریو و مداخلهٔ بحران"],
                  ["P / Esc", "توقف موقت"],
                  ["R", "شروع دوبارهٔ سناریو"],
                  ["M", "قطع و وصل صدا"],
                  ["لمس", "روی همهٔ کارت‌ها و نوار مداخلهٔ بحران قابل لمس است"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center gap-3">
                    <kbd className="min-w-[74px] rounded border border-white/15 bg-white/5 px-2 py-1 text-center font-display text-[12px] text-bone">
                      {k}
                    </kbd>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="p-4" corner={false}>
              <h2 className="font-display text-[20px] text-bone">معیارهای امتیازدهی</h2>
              <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ash">
                <li>
                  <span className="font-bold text-mint">اقدام مطلوب:</span> ۱۲۰ امتیاز پایه + پاداش
                  سرعت تا ۶۶ امتیاز، ضرب‌در ضریب زنجیره.
                </li>
                <li>
                  <span className="font-bold text-lamp">قابل قبول:</span> ۵۰ امتیاز پایه — اقدامی که
                  بی‌ضرر است اما بهترین گزینهٔ لحظه نیست.
                </li>
                <li>
                  <span className="font-bold text-coral">نامناسب:</span> بدون امتیاز، افزایش تنش، از
                  دست رفتن زنجیره و ثبت در گزارش خطاها.
                </li>
                <li>
                  <span className="font-bold text-sky">زنجیره:</span> هر اقدام درست متوالی ضریب را ۱۴٪
                  افزایش می‌دهد (تا ×۲٫۱۲).
                </li>
                <li>
                  <span className="font-bold text-rose">تنش ≥ ۱۰۰٪:</span> کد بحران فعال می‌شود؛ با
                  زمان‌بندی درست می‌توانی وضعیت را برگردانی.
                </li>
              </ul>
            </Panel>

            <Panel className="p-4 lg:col-span-2" corner={false}>
              <h2 className="font-display text-[20px] text-bone">حلقهٔ یادگیری</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
                {["ورود به سامانه", "انتخاب سناریو", "مشاهدهٔ موقعیت", "گفت‌وگو با بیمار", "انتخاب اقدام", "بازخورد فوری", "تغییر وضعیت بیمار", "پایان سناریو", "گزارش و امتیاز"].map(
                  (s, i, arr) => (
                    <span key={s} className="flex items-center gap-2">
                      <span className="rounded-md border border-white/12 bg-white/[0.04] px-2.5 py-1.5 text-bone">{s}</span>
                      {i < arr.length - 1 && <span className="text-mint">←</span>}
                    </span>
                  )
                )}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  ["مرحلهٔ توسعهٔ اول", "سناریوهای بیشتر، شخصیت‌های متنوع، انیمیشن پیشرفته، صدا و گزارش آموزشی غنی‌تر"],
                  ["مرحلهٔ توسعهٔ دوم", "بیمار مبتنی بر هوش مصنوعی، مکالمهٔ طبیعی، تبدیل گفتار به متن و ارزیابی هوشمند"],
                  ["مرحلهٔ توسعهٔ سوم", "محیط سه‌بعدی، واقعیت افزوده و واقعیت مجازی برای کارآموزی غوطه‌ور"],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <div className="font-display text-[15px] text-sky">{t}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ash">{d}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-lg border-r-2 border-lamp/60 bg-lamp/8 p-3 text-[11.5px] leading-relaxed text-bone/85">
                محتوای بالینی، دیالوگ‌ها، واکنش‌های بیمار و معیارهای ارزیابی باید توسط متخصص
                روان‌پزشکی بازبینی و تأیید شود تا اتکای علمی سامانه تضمین گردد.
              </p>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function aggregateStudents(scores: ScoreEntry[]) {
  const map = new Map<string, { name: string; runs: number; best: number; pctSum: number }>();
  for (const s of scores) {
    const key = (s.name || "دانشجوی مهمان").trim();
    const cur = map.get(key) ?? { name: key, runs: 0, best: 0, pctSum: 0 };
    cur.runs += 1;
    cur.best = Math.max(cur.best, s.score);
    cur.pctSum += s.pct;
    map.set(key, cur);
  }
  return [...map.values()]
    .map((s) => ({ ...s, avg: Math.round(s.pctSum / s.runs) }))
    .sort((a, b) => b.best - a.best)
    .slice(0, 9);
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
      <div className="tnum font-display text-[24px] leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-1.5 text-[10px] text-ash">{label}</div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={() => { sfx.click(); onClick(); }}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-all",
        active ? "border-transparent text-abyss" : "border-white/12 bg-white/[0.03] text-ash hover:text-bone"
      )}
      style={active ? { background: color ?? "#49d9a4", color: "#04161b" } : undefined}
    >
      {label}
    </button>
  );
}
