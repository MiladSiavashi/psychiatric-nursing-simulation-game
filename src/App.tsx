import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SCENARIOS,
  type Axis,
  type Choice,
  type Scenario,
} from "./data/scenarios";
import {
  faNum,
  gradeFor,
  loadMuted,
  loadName,
  loadScores,
  performancePct,
  pointsFor,
  saveMuted,
  saveName,
  shuffle,
  submitScore,
  type ScoreEntry,
} from "./game/logic";
import { Scene } from "./game/scene";
import { isMuted, setMuted, sfx, unlockAudio } from "./game/audio";
import TitleScreen from "./components/TitleScreen";
import PlayScreen, { type TurnResult } from "./components/PlayScreen";
import CrisisQte from "./components/CrisisQte";
import Report, { type RunStats } from "./components/Report";
import Leaderboard from "./components/Leaderboard";
import { Chip } from "./components/ui";
import { cn } from "./utils/cn";
import {
  avertPatientCrisis,
  createSimulatedPatient,
  getPatientStatus,
  isPatientInCrisis,
  resolvePatientInteraction,
} from "./features/simulated-patient";

type Screen = "title" | "play" | "report" | "center";
type Phase = "choosing" | "feedback" | "paused" | "crisis";

const freshStats = (): RunStats => ({
  optimal: 0,
  partial: 0,
  poor: 0,
  timeout: 0,
  bestCombo: 0,
  axes: { empathy: 0, assessment: 0, safety: 0, professional: 0 },
  mistakes: [],
  crisesAverted: 0,
  timeUsed: 0,
  trail: [],
});

export default function App() {
  /* ---------------------------- وضعیت کلی ---------------------------- */
  const [screen, setScreen] = useState<Screen>("title");
  const [tab, setTab] = useState<"board" | "teacher" | "guide">("board");
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("choosing");
  const [choices, setChoices] = useState<Choice[]>([]);
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [result, setResult] = useState<TurnResult | null>(null);
  const [tension, setTension] = useState(52);
  const [trust, setTrust] = useState(28);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [stats, setStats] = useState<RunStats>(freshStats);
  const [outcome, setOutcome] = useState<"cleared" | "crisis">("cleared");
  const [rank, setRank] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [pct, setPct] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [name, setName] = useState("");
  const [muted, setMutedState] = useState(false);
  const [intro, setIntro] = useState(false);
  const [uiShake, setUiShake] = useState(false);
  const shakeTimer = useRef(0);
  const kick = useCallback((hard = false) => {
    setUiShake(true);
    window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setUiShake(false), hard ? 540 : 420);
  }, []);

  const statsRef = useRef<RunStats>(freshStats());
  const seedRef = useRef(1);
  const startedAt = useRef(0);
  const failedCrises = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const screenRef = useRef<Screen>("title");
  screenRef.current = screen;
  const scoreRef = useRef(0);
  const tensionRef = useRef(52);
  const trustRef = useRef(28);
  scoreRef.current = score;
  tensionRef.current = tension;
  trustRef.current = trust;

  /* ------------------------------ حافظه ------------------------------ */
  useEffect(() => {
    setScores(loadScores());
    const n = loadName();
    setName(n);
    const m = loadMuted();
    setMutedState(m);
    setMuted(m);
  }, []);

  const persistName = (n: string) => {
    setName(n);
    saveName(n);
  };

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const next = !m;
      setMuted(next);
      saveMuted(next);
      if (!next) sfx.click();
      return next;
    });
  }, []);

  /* ------------------------------ صحنه ------------------------------ */
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const s = new Scene();
    sceneRef.current = s;
    s.onBeat = () => sfx.alarm();
    s.mount(c);
    const onResize = () => s.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("pointerdown", unlock);
      s.destroy();
      sceneRef.current = null;
    };
  }, []);

  const stage = scenario.stages[Math.min(stageIndex, scenario.stages.length - 1)];

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setVitals({
      tension,
      trust,
      mood: screen === "play" ? stage?.mood ?? "anxious" : "anxious",
      accent: scenario.accent,
    });
    s.dim = screen === "play" ? (phase === "paused" ? 0.5 : 0) : screen === "title" ? 0.42 : 0.68;
  }, [tension, trust, screen, phase, scenario, stage]);

  /* ---------------------------- صفحه‌کلید ---------------------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && screenRef.current === "play") {
        e.preventDefault();
        restartRef.current();
        return;
      }
      keyRef.current(e);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerKeys = useCallback((fn: (e: KeyboardEvent) => void) => {
    keyRef.current = fn;
  }, []);

  /* ------------------------------ اجرا ------------------------------ */
  const startRun = useCallback((sc: Scenario) => {
    unlockAudio();
    const patient = createSimulatedPatient(sc);
    seedRef.current = ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0) || 7;
    statsRef.current = freshStats();
    failedCrises.current = 0;
    setStats(freshStats());
    setScenario(sc);
    setStageIndex(0);
    setChoices(shuffle(sc.stages[0].choices, seedRef.current));
    setTension(patient.tension);
    setTrust(patient.trust);
    setScore(0);
    setCombo(0);
    setChosen(null);
    setResult(null);
    setPhase("choosing");
    setOutcome("cleared");
    setRank(0);
    setIsNewBest(false);
    setPct(0);
    startedAt.current = performance.now();
    setScreen("play");
    setIntro(true);
    window.setTimeout(() => setIntro(false), 1700);
    const s = sceneRef.current;
    if (s) {
      s.setVitals({ tension: patient.tension, trust: patient.trust, mood: patient.mood, accent: sc.accent });
      s.dim = 0;
      s.ring(520, 250, `${sc.accent}cc`, 620, 6, 0.8);
    }
    sfx.select();
  }, []);

  const restartRef = useRef<() => void>(() => {});
  restartRef.current = () => {
    if (scenario) startRun(scenario);
  };

  const applyStats = (mut: (s: RunStats) => void) => {
    mut(statsRef.current);
    setStats({ ...statsRef.current, axes: { ...statsRef.current.axes }, mistakes: [...statsRef.current.mistakes], trail: [...statsRef.current.trail] });
  };

  const addAxes = (target: Record<Axis, number>, src: Partial<Record<Axis, number>>) => {
    (Object.keys(src) as Axis[]).forEach((a) => {
      target[a] = Math.max(0, (target[a] ?? 0) + (src[a] ?? 0));
    });
  };

  const pick = useCallback(
    (c: Choice | null, timeFrac: number) => {
      if (phase !== "choosing") return;
      const s = sceneRef.current;
      const interaction = resolvePatientInteraction(
        {
          tension,
          trust,
          mood: stage?.mood ?? "anxious",
          status: getPatientStatus(tension),
        },
        c
      );
      const { quality } = interaction;
      const gained = c ? pointsFor(quality, combo, timeFrac) : 0;
      const nextCombo = quality === "poor" ? 0 : combo + 1;
      const dT = interaction.tensionDelta;
      const dTr = interaction.trustDelta;
      const nt = interaction.patient.tension;
      const ntr = interaction.patient.trust;

      setTension(nt);
      setTrust(ntr);
      setScore((v) => v + gained);
      setCombo(nextCombo);
      setChosen(c);
      setResult({
        quality,
        points: gained,
        tensionDelta: dT,
        trustDelta: dTr,
        combo: nextCombo,
        axes: interaction.axes,
        timedOut: interaction.timedOut,
      });
      setPhase("feedback");

      applyStats((st) => {
        if (quality === "optimal") st.optimal++;
        else if (quality === "partial") st.partial++;
        else if (c) st.poor++;
        else st.timeout++;
        st.bestCombo = Math.max(st.bestCombo, nextCombo);
        if (c) addAxes(st.axes, c.axes);
        st.trail.push(quality);
        if (quality === "poor")
          st.mistakes.push({
            stage: stage?.title ?? "",
            picked: c ? c.text : "تعلل — هیچ اقدامی در زمان مقرر انجام نشد",
            note: c ? c.feedback : "در موقعیت بالینی، تعلل هم یک تصمیم است و معمولاً تنش را بالا می‌برد.",
          });
      });

      if (s) {
        if (quality === "optimal") {
          s.react("good", 1);
          s.floatText(`+${faNum(gained)}`, "#49d9a4", 40);
          sfx.good(nextCombo);
          if (nextCombo >= 3) window.setTimeout(() => sfx.combo(nextCombo), 140);
        } else if (quality === "partial") {
          s.react("mid", 1);
          s.floatText(`+${faNum(gained)}`, "#f6b73f", 34);
          sfx.partial();
        } else {
          s.react("bad", c ? 1 : 0.8);
          s.floatText(nt >= 100 ? "بحران!" : "−", "#ff6a55", 34);
          c ? sfx.bad() : sfx.timeout();
        }
        s.setVitals({ tension: nt, trust: ntr });
      }
      if (quality === "poor") kick(nt >= 100);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, combo, tension, trust, stage]
  );

  const finish = useCallback(
    (res: "cleared" | "crisis") => {
      const st = statsRef.current;
      st.timeUsed = (performance.now() - startedAt.current) / 1000;
      setStats({ ...st, axes: { ...st.axes }, mistakes: [...st.mistakes], trail: [...st.trail] });
      const total = Math.max(1, st.trail.length);
      const finalScore = scoreRef.current;
      const p = performancePct(
        st.optimal,
        st.partial,
        total,
        tensionRef.current,
        trustRef.current,
        res === "crisis" ? 1 : 0
      );
      const g = gradeFor(p);
      setPct(p);
      setOutcome(res);

      const prevBest = scores.filter((x) => x.scenario === scenario.id).reduce((a, b) => Math.max(a, b.score), 0);
      const entry: ScoreEntry = {
        name: name.trim() || "دانشجوی مهمان",
        scenario: scenario.id,
        scenarioTitle: scenario.title,
        score: finalScore,
        pct: p,
        grade: g.label,
        date: Date.now(),
        axes: st.axes,
      };
      const { list, rank: r } = submitScore(entry);
      setScores(list);
      setRank(r);
      setIsNewBest(finalScore > prevBest && finalScore > 0);

      const s = sceneRef.current;
      if (res === "cleared") {
        sfx.win();
        if (s) {
          s.confetti();
          s.react("good", 1.5);
        }
      } else {
        sfx.lose();
        if (s) s.crisis();
      }
      setScreen("report");
    },
    [name, scenario, score, scores, tension, trust]
  );

  const advance = useCallback(() => {
    if (phase === "crisis") return;
    if (isPatientInCrisis({ tension })) {
      setPhase("crisis");
      failedCrises.current = 0;
      kick(true);
      const s = sceneRef.current;
      if (s) {
        s.crisis();
        sfx.alarm();
      }
      return;
    }
    if (stageIndex + 1 >= scenario.stages.length) {
      finish("cleared");
      return;
    }
    const ni = stageIndex + 1;
    setStageIndex(ni);
    setChoices(shuffle(scenario.stages[ni].choices, seedRef.current + ni * 7919));
    setChosen(null);
    setResult(null);
    setPhase("choosing");
    sfx.page();
    const s = sceneRef.current;
    if (s) {
      s.setVitals({ mood: scenario.stages[ni].mood });
      s.ring(520, 260, `${scenario.accent}88`, 420, 4, 0.6);
    }
  }, [phase, tension, stageIndex, scenario, finish]);

  const crisisAvert = useCallback(() => {
    statsRef.current.crisesAverted += 1;
    setStats({ ...statsRef.current });
    setScore((v) => v + 90);
    const patient = avertPatientCrisis({
      tension,
      trust: trustRef.current,
      mood: stage?.mood ?? "anxious",
      status: "critical",
    });
    const nt = patient.tension;
    setTension(nt);
    setTrust(patient.trust);
    const s = sceneRef.current;
    if (s) {
      s.react("good", 1.6);
      s.floatText("آرام‌سازی موفق +۹۰", "#49d9a4", 32);
      s.setVitals({ tension: nt });
      sfx.good(4);
    }
    window.setTimeout(() => {
      if (stageIndex + 1 >= scenario.stages.length) finish("cleared");
      else {
        const ni = stageIndex + 1;
        setStageIndex(ni);
        setChoices(shuffle(scenario.stages[ni].choices, seedRef.current + ni * 7919));
        setChosen(null);
        setResult(null);
        setPhase("choosing");
      }
    }, 420);
  }, [tension, stageIndex, scenario, finish]);

  const crisisFail = useCallback(() => {
    failedCrises.current += 1;
    kick(true);
    finish("crisis");
  }, [finish, kick]);

  const togglePause = useCallback(() => {
    setPhase((p) => {
      if (p === "paused") {
        sfx.page();
        return "choosing";
      }
      if (p === "choosing" || p === "feedback") {
        sfx.page();
        return "paused";
      }
      return p;
    });
  }, []);

  const hasNext = useMemo(() => {
    const i = SCENARIOS.findIndex((s) => s.id === scenario.id);
    return i >= 0 && i < SCENARIOS.length - 1;
  }, [scenario]);

  /* ------------------------------ رندر ------------------------------ */
  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-abyss", uiShake && "anim-shake")}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {/* لایهٔ نور محیطی روی بوم */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(246,183,63,0.07),transparent_58%)]" />

      {screen === "title" && (
        <TitleScreen
          name={name}
          setName={persistName}
          scores={scores}
          muted={muted}
          toggleMute={toggleMute}
          onStart={startRun}
          onBoard={() => { sfx.page(); setTab("board"); setScreen("center"); }}
          onDash={() => { sfx.page(); setTab("teacher"); setScreen("center"); }}
          registerKeys={registerKeys}
        />
      )}

      {(screen === "play" || screen === "report") && (
        <PlayScreen
          scenario={scenario}
          stage={stage}
          stageIndex={stageIndex}
          choices={choices}
          chosen={chosen}
          result={result}
          tension={tension}
          trust={trust}
          score={score}
          combo={combo}
          phase={screen === "report" ? "feedback" : phase}
          muted={muted || isMuted()}
          onChoose={(c, tf) => pick(c, tf)}
          onNext={advance}
          onTimeout={() => pick(null, 0)}
          onPause={togglePause}
          toggleMute={toggleMute}
          registerKeys={registerKeys}
        />
      )}

      {screen === "play" && phase === "crisis" && (
        <CrisisQte
          tension={tension}
          accent={scenario.accent}
          onAvert={crisisAvert}
          onFail={crisisFail}
          registerKeys={registerKeys}
        />
      )}

      {intro && screen === "play" && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center px-4">
          <div className="anim-pop flex items-center gap-2 rounded-full border border-white/15 bg-abyss/80 px-4 py-2 backdrop-blur">
            <span className="h-2 w-2 animate-ping rounded-full" style={{ background: scenario.accent }} />
            <span className="font-display text-[16px] text-bone">ورود به بخش — {scenario.title}</span>
            <Chip color={scenario.accent}>{scenario.dx}</Chip>
          </div>
        </div>
      )}

      {screen === "report" && (
        <Report
          scenario={scenario}
          outcome={outcome}
          score={score}
          pct={pct}
          grade={gradeFor(pct)}
          stats={stats}
          tension={tension}
          trust={trust}
          rank={rank}
          isNewBest={isNewBest}
          hasNext={hasNext}
          onRestart={() => startRun(scenario)}
          onNext={() => {
            const i = SCENARIOS.findIndex((s) => s.id === scenario.id);
            startRun(SCENARIOS[Math.min(SCENARIOS.length - 1, i + 1)]);
          }}
          onMenu={() => { sfx.page(); setScreen("title"); }}
          registerKeys={registerKeys}
        />
      )}

      {screen === "center" && (
        <Leaderboard
          scores={scores}
          initialTab={tab}
          onBack={() => { sfx.page(); setScreen("title"); }}
          onClear={() => {
            setScores([]);
            try {
              localStorage.removeItem("mrv.scores.v3");
            } catch {
              /* noop */
            }
            sfx.click();
          }}
          onPlay={(id) => {
            const sc = SCENARIOS.find((s) => s.id === id);
            if (sc) startRun(sc);
          }}
          registerKeys={registerKeys}
        />
      )}
    </div>
  );
}
