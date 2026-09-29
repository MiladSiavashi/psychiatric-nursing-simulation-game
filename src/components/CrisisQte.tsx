import { useEffect, useRef, useState } from "react";
import { faNum } from "../game/logic";
import { sfx } from "../game/audio";
import { Btn, Panel } from "./ui";
import { cn } from "../utils/cn";

/** مداخلهٔ بحران — مهار نشانگر در ناحیهٔ سبز (Space / لمس) */
export default function CrisisQte({
  tension,
  accent,
  onAvert,
  onFail,
  registerKeys,
}: {
  tension: number;
  accent: string;
  onAvert: () => void;
  onFail: () => void;
  registerKeys: (fn: (e: KeyboardEvent) => void) => void;
}) {
  const [tries, setTries] = useState(3);
  const [flash, setFlash] = useState<"none" | "hit" | "miss">("none");
  const markerRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const st = useRef({ p: 0, dir: 1, speed: 0.78, live: true, tries: 3 });

  const overshoot = Math.max(0, tension - 96);
  const zoneW = Math.max(13, 32 - overshoot * 1.6);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      const s = st.current;
      if (!s.live) return;
      s.p += s.dir * s.speed * dt;
      if (s.p > 1) {
        s.p = 1;
        s.dir = -1;
      } else if (s.p < 0) {
        s.p = 0;
        s.dir = 1;
      }
      if (markerRef.current) markerRef.current.style.left = `${s.p * 100}%`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const attempt = () => {
    const s = st.current;
    if (!s.live) return;
    const lo = (100 - zoneW) / 200;
    const hi = 1 - lo;
    const hit = s.p >= lo && s.p <= hi;
    if (hit) {
      s.live = false;
      sfx.qteHit();
      setFlash("hit");
      window.setTimeout(() => onAvert(), 520);
    } else {
      sfx.qteMiss();
      setFlash("miss");
      s.speed = Math.min(2.3, s.speed * 1.3);
      const left = s.tries - 1;
      s.tries = left;
      setTries(left);
      window.setTimeout(() => setFlash("none"), 320);
      if (left <= 0) {
        s.live = false;
        window.setTimeout(() => onFail(), 480);
      }
    }
  };

  useEffect(() => {
    registerKeys((e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key.toLowerCase() === "k") {
        e.preventDefault();
        attempt();
      }
    });
  });

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 grid place-items-center p-4",
        "bg-[radial-gradient(circle_at_50%_45%,rgba(120,10,0,0.55),rgba(4,14,18,0.94))]",
        flash === "hit" && "anim-pop"
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        attempt();
      }}
    >
      <div className="pointer-events-none absolute inset-0 anim-danger bg-[radial-gradient(circle_at_50%_50%,transparent_40%,rgba(255,60,40,0.28))]" />

      <Panel className={cn("anim-pop w-full max-w-lg p-5", flash === "miss" && "anim-shake")}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-coral" />
          </span>
          <span className="font-display text-[15px] tracking-wide text-coral">کد بحران — تنش بیمار از کنترل خارج شد</span>
        </div>

        <h2 className="mt-2 font-display text-[clamp(30px,7vw,46px)] leading-none text-bone text-shadow-deep">
          مداخلهٔ فوری
        </h2>
        <p className="mt-2 text-[12.5px] leading-[1.9] text-ash">
          نشانگر را دقیقاً داخل ناحیهٔ سبز متوقف کن: یک نفس عمیق، تماس چشمی آرام و یک جملهٔ کوتاهِ
          اعتباربخشی. <span className="text-bone">Space</span> یا لمس صفحه.
        </p>

        <div className="relative mt-5 h-14 select-none overflow-hidden rounded-lg border border-white/12 bg-abyss">
          <div className="hatch absolute inset-0 opacity-60" />
          {/* ناحیه هدف */}
          <div
            ref={zoneRef}
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-x-2 border-mint/70 bg-mint/22"
            style={{ width: `${zoneW}%`, boxShadow: "0 0 26px rgba(73,217,164,0.4) inset" }}
          />
          {/* درجه‌بندی */}
          {[20, 40, 60, 80].map((p) => (
            <span key={p} className="absolute inset-y-0 w-px bg-white/8" style={{ left: `${p}%` }} />
          ))}
          {/* نشانگر */}
          <div
            ref={markerRef}
            className="absolute inset-y-1 w-[5px] -translate-x-1/2 rounded-full"
            style={{
              left: "0%",
              background: flash === "hit" ? "#49d9a4" : flash === "miss" ? "#ff6a55" : accent,
              boxShadow: `0 0 18px ${flash === "hit" ? "#49d9a4" : flash === "miss" ? "#ff6a55" : accent}`,
            }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] text-ash">فرصت باقی‌مانده</span>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2.5 w-6 rounded-full transition-all duration-300"
                style={{ background: i < tries ? "#ff6a55" : "rgba(255,255,255,0.12)" }}
              />
            ))}
          </div>
          <span className="tnum font-display text-[22px] text-coral">
            {faNum(Math.round(tension))}٪ تنش
          </span>
        </div>

        {flash === "hit" && (
          <div className="anim-pop mt-3 rounded-lg border border-mint/50 bg-mint/12 p-3 text-center">
            <span className="font-display text-[22px] text-mint">مداخله موفق — بیمار آرام شد</span>
          </div>
        )}
        {flash === "miss" && (
          <div className="mt-3 rounded-lg border border-coral/50 bg-coral/12 p-3 text-center">
            <span className="font-display text-[20px] text-coral">زمان‌بندی نامناسب!</span>
          </div>
        )}
        <div className="mt-3 sm:hidden" onPointerDown={(e) => e.stopPropagation()}>
          <Btn variant="primary" className="w-full py-3.5" accent="#ff6a55" onClick={attempt}>
            لمس کن — آرام‌سازی
          </Btn>
        </div>
      </Panel>
    </div>
  );
}
