import { useEffect, useMemo, useRef, useState } from "react";
import { SCENARIOS, type Scenario } from "../data/scenarios";
import { faNum, type ScoreEntry } from "../game/logic";
import { sfx } from "../game/audio";
import {
  Btn,
  Chip,
  IconBolt,
  IconChart,
  IconMute,
  IconPlay,
  IconSound,
  IconTrophy,
  Panel,
} from "./ui";
import { cn } from "../utils/cn";

const TIPS = [
  "پرسش مستقیم دربارهٔ خودکشی، فکر را القا نمی‌کند؛ تنها راه معتبر ارزیابی خطر است.",
  "با محتوای هذیان نجنگ؛ به هیجان پشت آن اعتبار بده و ایمنی را ارزیابی کن.",
  "کاهش محرک‌ها — نور، جمعیت، صدا — مؤثرترین مداخلهٔ غیردارویی در تحریک است.",
  "«قول می‌دهم کاری نکنم» معیار ایمنی نیست؛ نقشه، قصد و دسترسی به ابزار را بپرس.",
  "پس از هر رویداد بحرانی، بازگویی تیمی (Debriefing) مهم‌ترین محافظ در برابر فرسودگی است.",
  "دادن دو گزینهٔ امن و واقعی، حس کنترل را به بیمار برمی‌گرداند و تنش را پایین می‌آورد.",
];

function DiffPips({ level, color }: { level: number; color: string }) {
  return (
    <span className="flex items-center gap-[3px]" title={`سطح چالش ${faNum(level)} از ۳`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-3 w-[3px] rounded-full transition-all"
          style={{ background: i <= level ? color : "rgba(255,255,255,0.16)" }}
        />
      ))}
    </span>
  );
}

function FileCard({
  sc,
  index,
  active,
  best,
  onPick,
  onOpen,
}: {
  sc: Scenario;
  index: number;
  active: boolean;
  best?: ScoreEntry;
  onPick: () => void;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.click();
        active ? onOpen() : onPick();
      }}
      onDoubleClick={onOpen}
      onMouseEnter={() => !active && sfx.hover()}
      className={cn(
        "group anim-choice relative w-full overflow-hidden rounded-lg border p-3 text-right transition-all duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint",
        active
          ? "-translate-y-[2px] border-transparent bg-ward-800/95 shadow-[0_16px_36px_-16px_rgba(0,0,0,0.9)]"
          : "border-white/10 bg-ward-900/70 hover:-translate-y-[2px] hover:border-white/25 hover:bg-ward-800/80"
      )}
      style={active ? { boxShadow: `inset 0 0 0 1.5px ${sc.accent}, 0 16px 36px -16px rgba(0,0,0,0.9)` } : undefined}
    >
      <span
        className="absolute inset-y-0 right-0 w-[3px] transition-all duration-300"
        style={{ background: active ? sc.accent : "rgba(255,255,255,0.08)" }}
      />
      <div className="flex items-start gap-3">
        <span
          className="font-display text-[26px] leading-none"
          style={{ color: active ? sc.accent : "rgba(157,179,184,0.55)" }}
        >
          {faNum(String(index + 1).padStart(2, "0"))}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-display text-[19px] leading-tight text-bone">{sc.title}</h3>
            <DiffPips level={sc.difficulty} color={sc.accent} />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-ash">
            {sc.patient} · <span style={{ color: `${sc.accent}cc` }}>{sc.dx}</span>
          </p>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.7] text-ash/70">{sc.blurb}</p>
          <div className="mt-2 flex items-center gap-2">
            <Chip color={sc.accent}>{faNum(sc.stages.length)} مرحله</Chip>
            {best ? (
              <Chip color="#f6b73f">
                <IconTrophy className="h-3 w-3" />
                {faNum(best.score.toLocaleString("en-US"))}
              </Chip>
            ) : (
              <Chip>بدون رکورد</Chip>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function TitleScreen({
  name,
  setName,
  scores,
  muted,
  toggleMute,
  onStart,
  onBoard,
  onDash,
  registerKeys,
}: {
  name: string;
  setName: (n: string) => void;
  scores: ScoreEntry[];
  muted: boolean;
  toggleMute: () => void;
  onStart: (sc: Scenario) => void;
  onBoard: () => void;
  onDash: () => void;
  registerKeys: (fn: (e: KeyboardEvent) => void) => void;
}) {
  const [sel, setSel] = useState(0);
  const [brief, setBrief] = useState(false);
  const [tip, setTip] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const sc = SCENARIOS[sel];
  const bests = useMemo(() => {
    const m: Record<string, ScoreEntry> = {};
    for (const s of scores) if (!m[s.scenario] || m[s.scenario].score < s.score) m[s.scenario] = s;
    return m;
  }, [scores]);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 5200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);

  useEffect(() => {
    registerKeys((e: KeyboardEvent) => {
      if (brief) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onStart(SCENARIOS[sel]);
        } else if (e.key === "Escape") setBrief(false);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT") return;
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        setSel((s) => (s + 1) % SCENARIOS.length);
        sfx.hover();
      } else if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        setSel((s) => (s - 1 + SCENARIOS.length) % SCENARIOS.length);
        sfx.hover();
      } else if (e.key === "Enter") {
        e.preventDefault();
        sfx.select();
        setBrief(true);
      } else if (/^[1-5]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < SCENARIOS.length) {
          sfx.select();
          setSel(i);
          setBrief(true);
        }
      } else if (e.key.toLowerCase() === "b") onBoard();
    });
  }, [registerKeys, brief, sel, onStart, onBoard]);

  return (
    <div className="relative z-10 h-full w-full overflow-hidden">
      {/* نوار بالا */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="relative grid h-10 w-10 place-items-center rounded-lg border border-mint/40 bg-ward-800/80">
            <IconBolt className="h-5 w-5 text-mint" />
            <span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 animate-ping rounded-full bg-mint/70" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[17px] text-bone">میدان روان</div>
            <div className="text-[9.5px] tracking-wide text-ash">PSYCHE FIELD · v۰.۹</div>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Btn variant="ghost" onClick={onBoard} className="px-3" title="جدول رتبه‌بندی (B)">
            <IconTrophy className="h-4 w-4 text-lamp" />
            <span className="hidden sm:inline">رتبه‌بندی</span>
          </Btn>
          <Btn variant="ghost" onClick={onDash} className="px-3" title="داشبورد استاد">
            <IconChart className="h-4 w-4 text-sky" />
            <span className="hidden sm:inline">داشبورد استاد</span>
          </Btn>
          <Btn variant="ghost" onClick={toggleMute} className="px-2.5" title="صدا (M)">
            {muted ? <IconMute className="h-4 w-4 text-ash" /> : <IconSound className="h-4 w-4 text-mint" />}
          </Btn>
        </div>
      </div>

      {/* محتوا */}
      <div className="thin-scroll h-full overflow-y-auto px-3 pt-20 pb-24 sm:px-6 sm:pt-24">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-8">
          {/* ستون اصلی */}
          <div className="order-2 lg:order-1">
            <div className="flex flex-wrap items-center gap-2">
              <Chip color="#49d9a4">شبیه‌ساز بالینی</Chip>
              <Chip color="#6cbfe4">آموزش پرستاری روان‌پزشکی</Chip>
              <Chip>۲.۵ بعدی · تحت وب</Chip>
            </div>

            <h1 className="mt-3 font-display text-[clamp(52px,10.5vw,124px)] leading-[0.82] text-bone text-shadow-deep">
              میدانِ
              <span className="mr-3 text-mint">روان</span>
            </h1>

            <p className="mt-4 max-w-[46ch] text-[13.5px] leading-[2] text-ash sm:text-[15px]">
              وارد بخش شو، پرونده را بخوان و روبه‌روی بیمار بنشین. هر جمله‌ای که می‌گویی و هر
              اقدامی که انتخاب می‌کنی، <span className="text-bone">تنش</span> و{" "}
              <span className="text-bone">اعتماد</span> بیمار را تغییر می‌دهد — و سرنوشت سناریو را.
            </p>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="min-w-[190px] flex-1">
                <span className="mb-1.5 block text-[10.5px] font-bold text-ash">نام دانشجو</span>
                <input
                  value={name}
                  maxLength={18}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً: زهرا محمدی"
                  className="w-full rounded-lg border border-white/12 bg-abyss/70 px-3 py-2.5 text-[13px] text-bone outline-none transition-all placeholder:text-ash/40 focus:border-mint/60 focus:bg-abyss"
                />
              </label>
              <Btn
                variant="primary"
                accent={sc.accent}
                className="px-6 py-3 text-[15px] anim-glow"
                onClick={() => {
                  sfx.select();
                  setBrief(true);
                }}
              >
                <IconPlay className="h-4 w-4" />
                ورود به بخش
              </Btn>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] text-ash/80">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-display text-bone">۱…۴</kbd>
                انتخاب اقدام
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-display text-bone">Space</kbd>
                ادامه / آرام‌سازی بحران
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-display text-bone">P</kbd>
                توقف
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-display text-bone">R</kbd>
                شروع دوباره
              </span>
            </div>
          </div>

          {/* ستون پرونده‌ها */}
          <div className="order-1 lg:order-2">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-[20px] text-bone">پرونده‌های بخش</h2>
              <span className="text-[10.5px] text-ash">{faNum(SCENARIOS.length)} سناریو</span>
            </div>
            <div ref={listRef} className="thin-scroll flex max-h-[46vh] flex-col gap-2 overflow-y-auto pl-1 lg:max-h-[62vh]">
              {SCENARIOS.map((s, i) => (
                <div key={s.id} data-idx={i}>
                  <FileCard
                    sc={s}
                    index={i}
                    active={sel === i}
                    best={bests[s.id]}
                    onPick={() => setSel(i)}
                    onOpen={() => {
                      setSel(i);
                      setBrief(true);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* نوار نکته بالینی */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-abyss/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <span className="shrink-0 rounded border border-lamp/40 bg-lamp/10 px-2 py-0.5 font-display text-[12px] text-lamp">
            نکته بالینی
          </span>
          <p key={tip} className="anim-rise truncate text-[11.5px] text-ash sm:text-[12.5px]">{TIPS[tip]}</p>
        </div>
      </div>

      {/* بریفینگ */}
      {brief && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-abyss/80 p-4 backdrop-blur-sm">
          <Panel className="anim-pop w-full max-w-lg p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Chip color={sc.accent}>پروندهٔ {faNum(String(sel + 1).padStart(2, "0"))}</Chip>
                <h3 className="mt-2 font-display text-[30px] leading-tight text-bone">{sc.title}</h3>
                <p className="text-[12px] text-ash">
                  {sc.patient} — {sc.dx}
                </p>
              </div>
              <DiffPips level={sc.difficulty} color={sc.accent} />
            </div>
            <p className="mt-3 rounded-lg border border-white/10 bg-abyss/60 p-3 text-[12.5px] leading-[1.95] text-bone/90">
              {sc.blurb}
            </p>
            <div className="mt-3">
              <div className="mb-1.5 text-[10.5px] font-bold text-ash">اهداف یادگیری</div>
              <ul className="space-y-1.5">
                {sc.objectives.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-[12px] leading-relaxed text-bone/85">
                    <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: sc.accent }} />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Btn
                variant="primary"
                accent={sc.accent}
                className="flex-1 py-3"
                onClick={() => onStart(sc)}
              >
                <IconPlay className="h-4 w-4" />
                شروع موقعیت بالینی
              </Btn>
              <Btn variant="ghost" onClick={() => setBrief(false)}>
                بازگشت
              </Btn>
            </div>
            <p className="mt-2.5 text-center text-[10px] text-ash/70">
              Enter برای شروع · محتوای بالینی نیازمند تأیید متخصص روان‌پزشکی است
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
