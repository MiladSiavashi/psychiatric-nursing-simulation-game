import { useEffect, useMemo, useRef, useState } from "react";
import type { Axis, Choice, Quality, Scenario, Stage } from "../data/scenarios";
import { AXIS_LABEL, QUALITY_META } from "../data/scenarios";
import { faNum } from "../game/logic";
import { sfx } from "../game/audio";
import { AXIS_ICON, Btn, Chip, IconBolt, IconMute, IconPause, IconPlay, IconSound, Panel } from "./ui";
import { cn } from "../utils/cn";

export interface TurnResult {
  quality: Quality;
  points: number;
  tensionDelta: number;
  trustDelta: number;
  combo: number;
  axes: Partial<Record<Axis, number>>;
  timedOut?: boolean;
}

/* --------------------------- تایپ‌رایتر --------------------------- */

function Typewriter({ text, speed = 34 }: { text: string; speed?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let i = 0;
    let acc = 0;
    let last = performance.now();
    let raf = 0;
    el.textContent = "";
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      acc += ts - last;
      last = ts;
      while (acc > speed && i < text.length) {
        acc -= speed;
        i++;
        el.textContent = text.slice(0, i);
      }
      if (i >= text.length) {
        cancelAnimationFrame(raf);
        el.textContent = text;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [text, speed]);
  return (
    <span ref={ref} className="whitespace-pre-wrap">
      {text}
    </span>
  );
}

/* ------------------------------ نوار زمان ------------------------------ */

function useStageTimer(
  running: boolean,
  duration: number,
  onExpire: () => void,
  accent: string
) {
  const barRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const state = useRef({ left: duration, running: false, expired: false });
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    state.current = { left: duration, running, expired: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, running]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const paint = () => {
      const frac = Math.max(0, Math.min(1, state.current.left / duration));
      const bar = barRef.current;
      if (bar) {
        bar.style.transform = `scaleX(${frac})`;
        const col = frac > 0.5 ? accent : frac > 0.25 ? "#f6b73f" : "#ff6a55";
        bar.style.background = `linear-gradient(270deg, ${col}, ${col}55)`;
        bar.style.boxShadow = `0 0 12px ${col}aa`;
        bar.parentElement?.classList.toggle("anim-danger", frac <= 0.22 && frac > 0);
      }
      if (numRef.current) {
        const s = Math.ceil(state.current.left);
        numRef.current.textContent = faNum(s);
        numRef.current.style.color = frac > 0.25 ? "#9db3b8" : "#ff6a55";
      }
    };
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      const st = state.current;
      if (st.running && st.left > 0) {
        st.left = Math.max(0, st.left - dt);
        paint();
        if (st.left === 0 && !st.expired) {
          st.expired = true;
          st.running = false;
          expireRef.current();
        }
      }
    };
    paint();
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [duration, accent]);

  const frac = () => Math.max(0, Math.min(1, state.current.left / duration));
  return { barRef, numRef, frac };
}

/* ------------------------------ کارت اقدام ------------------------------ */

function ChoiceCard({
  c,
  i,
  hot,
  disabled,
  reveal,
  picked,
  accent,
  onPick,
  onHover,
}: {
  c: Choice;
  i: number;
  hot: boolean;
  disabled: boolean;
  reveal: boolean;
  picked: boolean;
  accent: string;
  onPick: () => void;
  onHover: () => void;
}) {
  const q = QUALITY_META[c.quality];
  const borderColor = reveal && picked ? q.color : hot ? accent : "rgba(255,255,255,0.12)";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      onMouseEnter={onHover}
      className={cn(
        "anim-choice group relative w-full overflow-hidden rounded-lg border p-2.5 pr-3 text-right transition-all duration-150 sm:p-3 sm:pr-3.5",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint",
        disabled ? "cursor-default" : "hover:-translate-y-[3px] active:translate-y-0",
        reveal && !picked ? "opacity-35" : "opacity-100"
      )}
      style={{
        borderColor,
        background: reveal && picked ? `${q.color}14` : hot ? "rgba(255,255,255,0.075)" : "rgba(7,30,37,0.82)",
        boxShadow: hot || (reveal && picked) ? `0 12px 26px -14px ${borderColor}` : undefined,
        animationDelay: `${i * 45}ms`,
      }}
    >
      <span
        className="absolute inset-y-0 right-0 w-[3px] transition-all"
        style={{ background: hot || (reveal && picked) ? borderColor : "rgba(255,255,255,0.08)" }}
      />
      <div className="flex items-start gap-2.5">
        <span
          className="mt-[1px] grid h-6 w-6 shrink-0 place-items-center rounded border font-display text-[14px] leading-none transition-all"
          style={{
            color: hot ? "#04161b" : borderColor,
            background: hot ? borderColor : "rgba(255,255,255,0.05)",
            borderColor: `${borderColor}88`,
          }}
        >
          {faNum(i + 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-medium leading-[1.75] text-bone sm:text-[13.5px]">
            {c.text}
          </span>
          {reveal && picked && (
            <span
              className="anim-pop mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] font-black"
              style={{ color: q.color, background: `${q.color}1e` }}
            >
              {q.label}
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

/* ------------------------------ صفحه بازی ------------------------------ */

export default function PlayScreen({
  scenario,
  stage,
  stageIndex,
  choices,
  chosen,
  result,
  tension,
  trust,
  score,
  combo,
  phase,
  muted,
  onChoose,
  onNext,
  onTimeout,
  onPause,
  toggleMute,
  registerKeys,
}: {
  scenario: Scenario;
  stage: Stage;
  stageIndex: number;
  choices: Choice[];
  chosen: Choice | null;
  result: TurnResult | null;
  tension: number;
  trust: number;
  score: number;
  combo: number;
  phase: "choosing" | "feedback" | "paused" | "crisis";
  muted: boolean;
  onChoose: (c: Choice, timeFrac: number) => void;
  onNext: () => void;
  onTimeout: () => void;
  onPause: () => void;
  toggleMute: () => void;
  registerKeys: (fn: (e: KeyboardEvent) => void) => void;
}) {
  const [hot, setHot] = useState(-1);
  const picking = phase === "choosing";
  const { barRef, numRef, frac } = useStageTimer(picking, stage.time, onTimeout, scenario.accent);
  const chosenRef = useRef<Choice | null>(null);
  chosenRef.current = chosen;

  const pick = (i: number) => {
    if (!picking || i < 0 || i >= choices.length) return;
    const c = choices[i];
    sfx.click();
    onChoose(c, frac());
  };

  useEffect(() => {
    setHot(-1);
  }, [stageIndex]);

  useEffect(() => {
    registerKeys((e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        e.preventDefault();
        onPause();
        return;
      }
      if (phase === "feedback" || phase === "crisis") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onNext();
        }
        return;
      }
      if (/^[1-4]$/.test(e.key)) {
        e.preventDefault();
        pick(Number(e.key) - 1);
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        setHot((h) => (h + 1) % choices.length);
        sfx.hover();
      } else if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        setHot((h) => (h - 1 + choices.length) % choices.length);
        sfx.hover();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick(hot < 0 ? 0 : hot);
      } else if (e.key.toLowerCase() === "m") {
        toggleMute();
      }
    });
  });

  const q = result ? QUALITY_META[result.quality] : null;
  const stagePips = useMemo(
    () => scenario.stages.map((_, i) => i),
    [scenario]
  );

  return (
    <div className="pointer-events-none relative z-10 flex h-full w-full flex-col">
      {/* ---------- نوار بالا ---------- */}
      <div className="safe-top pointer-events-auto shrink-0 border-b border-white/10 bg-abyss/72 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border font-display text-[15px]"
              style={{ borderColor: `${scenario.accent}66`, color: scenario.accent, background: scenario.accentSoft }}
            >
              {faNum(stageIndex + 1)}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-[16px] text-bone sm:text-[18px]">{stage.title}</div>
              <div className="truncate text-[10px] text-ash">
                {scenario.title} · {scenario.patient}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-[3px]">
            {stagePips.map((i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === stageIndex ? 20 : 8,
                  background: i < stageIndex ? scenario.accent : i === stageIndex ? "#f4efe4" : "rgba(255,255,255,0.18)",
                }}
              />
            ))}
          </div>

          <div className="ms-auto flex items-center gap-3 sm:gap-5">
            <div className="hidden w-32 sm:block">
              <MeterMini label="تنش" value={tension} color={tension > 70 ? "#ff6a55" : tension > 45 ? "#f6b73f" : "#49d9a4"} />
            </div>
            <div className="hidden w-32 sm:block">
              <MeterMini label="اعتماد" value={trust} color="#6cbfe4" />
            </div>
            <div className="text-left leading-none">
              <div key={score} className="anim-pop tnum font-display text-[22px] text-lamp sm:text-[26px]">
                {faNum(score.toLocaleString("en-US"))}
              </div>
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-ash">
                {combo > 1 && (
                  <span className="flex items-center gap-0.5 font-bold text-mint">
                    <IconBolt className="h-3 w-3" />
                    {faNum(`×${(1 + Math.min(combo, 8) * 0.14).toFixed(2)}`)}
                  </span>
                )}
                <span ref={numRef} className="tnum font-display text-[15px]">
                  {faNum(stage.time)}
                </span>
                <span>ثانیه</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Btn variant="ghost" className="p-2" onClick={toggleMute} title="صدا (M)">
                {muted ? <IconMute className="h-4 w-4 text-ash" /> : <IconSound className="h-4 w-4 text-mint" />}
              </Btn>
              <Btn variant="ghost" className="p-2" onClick={onPause} title="توقف (P)">
                <IconPause className="h-4 w-4 text-bone" />
              </Btn>
            </div>
          </div>
        </div>

        {/* مترهای موبایل */}
        <div className="flex gap-3 px-3 pb-2 sm:hidden">
          <div className="flex-1">
            <MeterMini label="تنش بیمار" value={tension} color={tension > 70 ? "#ff6a55" : tension > 45 ? "#f6b73f" : "#49d9a4"} />
          </div>
          <div className="flex-1">
            <MeterMini label="اعتماد" value={trust} color="#6cbfe4" />
          </div>
        </div>

        {/* نوار زمان */}
        <div className="relative h-[5px] w-full overflow-hidden bg-abyss">
          <div
            ref={barRef}
            className="absolute inset-y-0 right-0 w-full origin-right"
            style={{ background: scenario.accent, transform: "scaleX(1)" }}
          />
        </div>
      </div>

      {/* ---------- فضای صحنه ---------- */}
      <div className="relative min-h-0 flex-1">
        {tension > 74 && phase !== "paused" && (
          <div className="pointer-events-none absolute inset-0 anim-danger bg-[radial-gradient(circle_at_50%_45%,transparent_35%,rgba(255,60,40,0.22))]" />
        )}
        {combo >= 3 && (
          <div className="pointer-events-none absolute left-4 top-4 anim-pop">
            <Chip color="#49d9a4">
              <IconBolt className="h-3 w-3" />
              زنجیرهٔ {faNum(combo)} اقدام درست
            </Chip>
          </div>
        )}
      </div>

      {/* ---------- برگه پایین ---------- */}
      <div className="thin-scroll pointer-events-auto max-h-[68vh] shrink-0 overflow-y-auto px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:max-h-none sm:overflow-visible sm:px-4 sm:pb-4">
        <div className="mx-auto max-w-6xl">
          {/* گفت‌وگو */}
          <Panel corner={false} className="mb-2 overflow-hidden rounded-xl">
            <div className="flex items-start gap-3 p-3 sm:p-4">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border font-display text-[15px]"
                style={{ borderColor: `${scenario.accent}66`, color: scenario.accent, background: scenario.accentSoft }}
              >
                {scenario.patient.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-[11px] leading-[1.85] text-ash">{stage.situation}</p>
                <p className="text-[13.5px] font-semibold leading-[1.95] text-bone sm:text-[15px]">
                  <Typewriter text={stage.line} speed={picking ? 26 : 6} />
                  <span className="anim-caret ms-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-mint" />
                </p>
              </div>
            </div>
          </Panel>

          {/* اقدام‌ها یا بازخورد */}
          {phase === "feedback" && result && q ? (
            <Panel
              corner={false}
              className="anim-pop overflow-hidden rounded-xl"
            >
              <div className="h-1 w-full" style={{ background: q.color }} />
              <div className="thin-scroll max-h-[38vh] overflow-y-auto p-3 sm:max-h-[42vh] sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-[15px]"
                    style={{ color: q.color, background: `${q.color}1c` }}
                  >
                    {q.label}
                  </span>
                  {result.timedOut && <Chip color="#ff6a55">اتمام زمان — تعلل در اقدام</Chip>}
                  <span className="ms-auto text-[11px] text-ash">
                    {result.points > 0 ? (
                      <span className="tnum font-display text-[18px] text-lamp">+{faNum(result.points)}</span>
                    ) : (
                      <span className="font-bold text-coral">بدون امتیاز</span>
                    )}
                  </span>
                </div>

                <p className="mt-2.5 rounded-lg border-r-2 bg-white/[0.03] px-3 py-2 text-[12px] leading-[1.9] text-bone/85">
                  «{chosen?.text ?? "زمان تمام شد و اقدامی انجام نشد"}»
                </p>

                <p className="mt-2.5 text-[12.5px] leading-[2.05] text-bone sm:text-[13.5px]">{result.timedOut ? "در موقعیت بالینی، تعلل هم یک تصمیم است — و معمولاً بدترین تصمیم. تنش بیمار بالا رفت و فرصت مداخلهٔ به‌موقع از دست رفت." : chosen?.feedback}</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Chip color={result.tensionDelta < 0 ? "#49d9a4" : "#ff6a55"}>
                    تنش {result.tensionDelta > 0 ? "+" : ""}
                    {faNum(result.tensionDelta)}
                  </Chip>
                  <Chip color={result.trustDelta >= 0 ? "#6cbfe4" : "#ff6a55"}>
                    اعتماد {result.trustDelta > 0 ? "+" : ""}
                    {faNum(result.trustDelta)}
                  </Chip>
                  {(Object.entries(result.axes) as [Axis, number][])
                    .filter(([, v]) => v > 0)
                    .map(([a, v]) => {
                      const Ic = AXIS_ICON[a];
                      return (
                        <Chip key={a} color="#f4efe4">
                          <Ic className="h-3 w-3" />
                          {AXIS_LABEL[a]} +{faNum(v)}
                        </Chip>
                      );
                    })}
                </div>

                <Btn
                  variant="primary"
                  accent={scenario.accent}
                  className="mt-3 w-full py-3 text-[14px]"
                  onClick={() => {
                    sfx.page();
                    onNext();
                  }}
                >
                  <IconPlay className="h-4 w-4" />
                  {stageIndex + 1 >= scenario.stages.length ? "پایان سناریو و گزارش عملکرد" : "ادامهٔ موقعیت"}
                  <span className="ms-1 rounded border border-black/25 px-1.5 text-[10px] opacity-70">Space</span>
                </Btn>
              </div>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {choices.map((c, i) => (
                <ChoiceCard
                  key={c.text}
                  c={c}
                  i={i}
                  hot={hot === i}
                  disabled={!picking}
                  reveal={false}
                  picked={false}
                  accent={scenario.accent}
                  onPick={() => pick(i)}
                  onHover={() => {
                    if (picking) {
                      setHot(i);
                      sfx.hover();
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- توقف ---------- */}
      {phase === "paused" && (
        <div className="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-abyss/85 p-4 backdrop-blur-sm">
          <Panel className="anim-pop w-full max-w-sm p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-lamp/40 bg-lamp/10">
              <IconPause className="h-6 w-6 text-lamp" />
            </div>
            <h3 className="mt-3 font-display text-[30px] text-bone">توقف موقت</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-ash">
              وضعیت بیمار ثابت نگه داشته شد. هر وقت آماده بودی ادامه بده.
            </p>
            <div className="mt-4 grid gap-2">
              <Btn variant="primary" accent={scenario.accent} className="py-3" onClick={onPause}>
                <IconPlay className="h-4 w-4" />
                ادامه (P)
              </Btn>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function MeterMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-[3px] flex items-baseline justify-between gap-2">
        <span className="text-[9.5px] font-bold text-ash">{label}</span>
        <span className="tnum font-display text-[12px]" style={{ color }}>
          {faNum(Math.round(value))}
        </span>
      </div>
      <div className="relative h-[6px] overflow-hidden rounded-full border border-white/10 bg-abyss">
        <div
          className="absolute inset-y-0 right-0 rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, boxShadow: `0 0 10px ${color}` }}
        />
      </div>
    </div>
  );
}
