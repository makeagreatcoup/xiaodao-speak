"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReloadIcon,
  PlayIcon,
  StopIcon,
  MagnifyingGlassIcon,
  SpeakerLoudIcon,
} from "@radix-ui/react-icons";
import { categories, type CategoryKey, type Prompt } from "@/lib/prompts";

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const handler = () => setReduce(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduce;
}

const RESEARCH_DURATIONS = [
  { label: "5 分钟", value: 5 * 60 },
  { label: "10 分钟", value: 10 * 60 },
  { label: "15 分钟", value: 15 * 60 },
];

const SPEAK_DURATIONS = [
  { label: "30 秒", value: 30 },
  { label: "60 秒", value: 60 },
  { label: "90 秒", value: 90 },
  { label: "120 秒", value: 120 },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmt(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function PromptStage() {
  const reduce = usePrefersReducedMotion();
  const [cat, setCat] = useState<CategoryKey>("all");
  const [prompt, setPrompt] = useState<Prompt>(() => pickRandom(categories.find((c) => c.key === "all")!.prompts));
  const [spinning, setSpinning] = useState(false);

  // phase: idle（已抽题，未开始）| research（查资料中）| ready（查完待讲）| speak（开讲中）| done（讲完）
  const [phase, setPhase] = useState<"idle" | "research" | "ready" | "speak" | "done">("idle");
  const [running, setRunning] = useState(false);

  const [researchDuration, setResearchDuration] = useState(10 * 60);
  const [speakDuration, setSpeakDuration] = useState(60);
  const [left, setLeft] = useState(60);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeCat = useMemo(
    () => categories.find((c) => c.key === cat)!,
    [cat],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spinRef.current) clearTimeout(spinRef.current);
    };
  }, []);

  function clearTimers() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (spinRef.current) {
      clearTimeout(spinRef.current);
      spinRef.current = null;
    }
  }

  function spin() {
    clearTimers();
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
    const pool = activeCat.prompts;
    if (reduce) {
      setPrompt(pickRandom(pool));
      return;
    }
    setSpinning(true);
    let ticks = 0;
    const maxTicks = 9;
    const step = () => {
      setPrompt(pickRandom(pool));
      ticks += 1;
      if (ticks >= maxTicks) {
        setSpinning(false);
        spinRef.current = null;
      } else {
        spinRef.current = setTimeout(step, 60);
      }
    };
    spinRef.current = setTimeout(step, 60);
  }

  function switchCat(next: CategoryKey) {
    if (next === cat) return;
    clearTimers();
    setCat(next);
    setPrompt(pickRandom(categories.find((c) => c.key === next)!.prompts));
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
  }

  function startResearch() {
    clearTimers();
    setPhase("research");
    setRunning(true);
    setLeft(researchDuration);
    timerRef.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearTimers();
          setRunning(false);
          setPhase("ready");
          setLeft(speakDuration);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  }

  function startSpeak() {
    clearTimers();
    setPhase("speak");
    setRunning(true);
    setLeft(speakDuration);
    timerRef.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearTimers();
          setRunning(false);
          setPhase("done");
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  }

  function toggleRunning() {
    if (running) {
      clearTimers();
      setRunning(false);
      return;
    }
    // 续表：从中断处继续
    const total = phase === "research" ? researchDuration : speakDuration;
    setRunning(true);
    timerRef.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearTimers();
          setRunning(false);
          if (phase === "research") {
            setPhase("ready");
            setLeft(speakDuration);
          } else {
            setPhase("done");
          }
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    void total;
  }

  function changeResearch(v: number) {
    setResearchDuration(v);
    if (phase === "idle" || phase === "ready") setLeft(speakDuration);
  }

  function changeSpeak(v: number) {
    setSpeakDuration(v);
    if (phase === "idle" || phase === "research" || phase === "ready") {
      setLeft(v);
    }
  }

  const pct = (() => {
    const total = phase === "research" ? researchDuration : speakDuration;
    return total > 0 ? (left / total) * 100 : 0;
  })();
  const ringR = 78;
  const circ = 2 * Math.PI * ringR;
  const lowTime = (phase === "research" || phase === "speak") && running && left <= 10;

  const phaseLabel =
    phase === "research"
      ? "查资料中"
      : phase === "ready"
        ? "查完了，待开讲"
        : phase === "speak"
          ? "开讲中"
          : phase === "done"
            ? "这段讲完了"
            : "准备就绪";

  return (
    <section
      id="stage"
      className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20"
    >
      {/* 步骤指示 */}
      <div className="mb-7 flex items-center justify-center gap-3 text-sm">
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors " +
            (phase === "research" || phase === "ready" || phase === "speak" || phase === "done"
              ? "bg-accent text-accent-fg"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400")
          }
        >
          <MagnifyingGlassIcon className="h-3.5 w-3.5" />
          1 查资料
        </span>
        <span className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" />
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors " +
            (phase === "speak" || phase === "done"
              ? "bg-accent text-accent-fg"
              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400")
          }
        >
          <SpeakerLoudIcon className="h-3.5 w-3.5" />
          2 开讲
        </span>
      </div>

      {/* 分类切换（含全池混抽） */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {categories.map((c) => {
          const active = c.key === cat;
          const isAll = c.key === "all";
          return (
            <button
              key={c.key}
              onClick={() => switchCat(c.key)}
              className={
                "rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "bg-accent text-accent-fg"
                  : isAll
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800")
              }
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* 命题卡 */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] bg-accent/10 blur-3xl"
        />
        <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <MagnifyingGlassIcon className="h-3.5 w-3.5" />
              {activeCat.name}
            </span>
            <span className="text-xs text-zinc-400">{activeCat.tag}</span>
          </div>

          <p
            className={
              "mt-5 text-balance text-2xl font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[28px] " +
              (spinning ? "opacity-60" : "opacity-100")
            }
          >
            {prompt.text}
          </p>

          {prompt.note && (
            <p className="mt-4 border-l-2 border-accent/50 pl-3 text-sm text-zinc-500 dark:text-zinc-400">
              小导支招：{prompt.note}
            </p>
          )}

          {/* 阶段引导 */}
          {phase === "research" && (
            <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              打开浏览器，查这个词的来历、案例、还有反方观点。时间一到自动进入开讲。
            </p>
          )}
          {phase === "ready" && (
            <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              资料查得差不多了？合上屏幕，用 1 分钟把它讲清楚。先给结论，再补细节。
            </p>
          )}
          {phase === "speak" && (
            <p className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              别看屏幕。开口就讲，卡壳也别停，想到哪说到哪。
            </p>
          )}
        </div>
      </div>

      {/* 计时环 + 控制 */}
      <div className="mt-8 flex flex-col items-center">
        <div className="relative h-[180px] w-[180px]">
          <svg
            viewBox="0 0 180 180"
            className="h-full w-full -rotate-90"
            aria-hidden
          >
            <circle
              cx="90"
              cy="90"
              r={ringR}
              fill="none"
              strokeWidth="9"
              className="stroke-zinc-200 dark:stroke-zinc-800"
            />
            <circle
              cx="90"
              cy="90"
              r={ringR}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              className="stroke-accent"
              style={{
                transition: reduce ? "none" : "stroke-dashoffset 1s linear",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === "done" ? (
              <span className="text-xl font-bold text-accent">讲完啦</span>
            ) : (
              <span
                className={
                  "font-mono text-4xl font-semibold tabular-nums tracking-tight " +
                  (lowTime ? "text-accent" : "text-zinc-900 dark:text-zinc-50")
                }
              >
                {fmt(left)}
              </span>
            )}
            <span className="mt-1 text-xs text-zinc-400">{phaseLabel}</span>
          </div>
        </div>

        {/* 主控制按钮 */}
        <div className="mt-7 flex items-center gap-3">
          {phase === "idle" && (
            <button
              onClick={startResearch}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              开始查资料
            </button>
          )}

          {phase === "research" && (
            <>
              <button
                onClick={toggleRunning}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <StopIcon className="h-4 w-4" />
                {running ? "暂停" : "继续"}
              </button>
              <button
                onClick={startSpeak}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0"
              >
                不查了，直接开讲
              </button>
            </>
          )}

          {phase === "ready" && (
            <button
              onClick={startSpeak}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0"
            >
              <SpeakerLoudIcon className="h-4 w-4" />
              开讲
            </button>
          )}

          {phase === "speak" && (
            <button
              onClick={toggleRunning}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0"
            >
              {running ? (
                <>
                  <StopIcon className="h-4 w-4" />
                  暂停
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  继续
                </>
              )}
            </button>
          )}

          {phase === "done" && (
            <button
              onClick={spin}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0"
            >
              <ReloadIcon className="h-4 w-4" />
              换个命题
            </button>
          )}

          {(phase === "research" || phase === "ready" || phase === "speak") && (
            <button
              onClick={spin}
              disabled={spinning}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <ReloadIcon className="h-4 w-4" />
              换命题
            </button>
          )}
        </div>

        {/* 时长选择：查资料 / 开讲 */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-zinc-400">查资料</span>
            {RESEARCH_DURATIONS.map((d) => {
              const active = d.value === researchDuration;
              return (
                <button
                  key={d.value}
                  onClick={() => changeResearch(d.value)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                    (active
                      ? "bg-accent/10 text-accent"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-zinc-400">开讲</span>
            {SPEAK_DURATIONS.map((d) => {
              const active = d.value === speakDuration;
              return (
                <button
                  key={d.value}
                  onClick={() => changeSpeak(d.value)}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                    (active
                      ? "bg-accent/10 text-accent"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
