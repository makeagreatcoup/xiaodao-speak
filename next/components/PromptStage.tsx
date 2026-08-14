"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReloadIcon,
  PlayIcon,
  StopIcon,
  MagnifyingGlassIcon,
  SpeakerLoudIcon,
  PlusIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import {
  categories,
  categoryMeta,
  promptsFor,
  type CategoryKey,
  type Prompt,
} from "@/lib/prompts";

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

const EXP_KEY = "xd-expressed";
const CUSTOM_KEY = "xd-custom";

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

function buildPool(
  cat: CategoryKey,
  custom: Prompt[],
  includeExpressed: boolean,
  expressed: Set<string>,
): Prompt[] {
  let base: Prompt[];
  if (cat === "all") base = [...promptsFor("all"), ...custom];
  else if (cat === "custom") base = custom;
  else base = promptsFor(cat);
  return includeExpressed ? base : base.filter((p) => !expressed.has(p.id));
}

export function PromptStage() {
  const reduce = usePrefersReducedMotion();
  const [cat, setCat] = useState<CategoryKey>("all");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [spinning, setSpinning] = useState(false);

  const [customTerms, setCustomTerms] = useState<Prompt[]>([]);
  const [expressed, setExpressed] = useState<Set<string>>(new Set());
  const [includeExpressed, setIncludeExpressed] = useState(false);

  // phase: idle | research | ready | speak | done
  const [phase, setPhase] = useState<"idle" | "research" | "ready" | "speak" | "done">("idle");
  const [running, setRunning] = useState(false);
  const [emptyReason, setEmptyReason] = useState<"none" | "all-done" | "no-custom">("none");

  const [researchDuration, setResearchDuration] = useState(10 * 60);
  const [speakDuration, setSpeakDuration] = useState(60);
  const [left, setLeft] = useState(60);

  const [newTerm, setNewTerm] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeMeta = useMemo(() => categoryMeta(cat), [cat]);

  // 载入本地存储：已表达 + 自命题，并完成首抽
  useEffect(() => {
    let exp: Set<string> = new Set();
    let cust: Prompt[] = [];
    try {
      const e = JSON.parse(localStorage.getItem(EXP_KEY) || "[]");
      if (Array.isArray(e)) exp = new Set(e as string[]);
    } catch {}
    try {
      const c = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
      if (Array.isArray(c)) cust = c as Prompt[];
    } catch {}
    setExpressed(exp);
    setCustomTerms(cust);
    const pool = buildPool("all", cust, false, exp);
    if (pool.length > 0) setPrompt(pickRandom(pool));
  }, []);

  // 持久化
  useEffect(() => {
    localStorage.setItem(EXP_KEY, JSON.stringify([...expressed]));
  }, [expressed]);
  useEffect(() => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customTerms));
  }, [customTerms]);

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

  function drawFromPool(pool: Prompt[]) {
    if (pool.length === 0) {
      setPrompt(null);
      return;
    }
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

  function spin() {
    clearTimers();
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
    const pool = buildPool(cat, customTerms, includeExpressed, expressed);
    if (pool.length === 0) {
      setEmptyReason(cat === "custom" ? "no-custom" : "all-done");
      setPrompt(null);
      return;
    }
    setEmptyReason("none");
    drawFromPool(pool);
  }

  function switchCat(next: CategoryKey) {
    if (next === cat) return;
    clearTimers();
    setCat(next);
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
    const pool = buildPool(next, customTerms, includeExpressed, expressed);
    if (pool.length === 0) {
      setEmptyReason(next === "custom" ? "no-custom" : "all-done");
      setPrompt(null);
      return;
    }
    setEmptyReason("none");
    drawFromPool(pool);
  }

  function markDone() {
    if (!prompt) return;
    const nextExp = new Set(expressed);
    nextExp.add(prompt.id);
    setExpressed(nextExp);
    // 抽下一题（已排除刚标记的）
    const pool = buildPool(cat, customTerms, includeExpressed, nextExp);
    if (pool.length === 0) {
      setEmptyReason("all-done");
      setPrompt(null);
      setPhase("idle");
      return;
    }
    setEmptyReason("none");
    drawFromPool(pool);
  }

  function addCustom() {
    const t = newTerm.trim();
    if (!t) return;
    const p: Prompt = {
      id: `custom-${Date.now()}`,
      term: t,
      category: "custom",
    };
    const next = [...customTerms, p];
    setCustomTerms(next);
    setNewTerm("");
    setCat("custom");
    setEmptyReason("none");
    clearTimers();
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
    setPrompt(p);
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

  // 进度统计
  const basePool = useMemo(() => {
    if (cat === "all") return [...promptsFor("all"), ...customTerms];
    if (cat === "custom") return customTerms;
    return promptsFor(cat);
  }, [cat, customTerms]);
  const availableCount = includeExpressed
    ? basePool.length
    : basePool.filter((p) => !expressed.has(p.id)).length;
  const expressedCount = basePool.filter((p) => expressed.has(p.id)).length;

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

  const showCustomChip = customTerms.length > 0;

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

      {/* 分类切换（含全池混抽 + 我的命题） */}
      <div className="mb-5 flex flex-wrap justify-center gap-2">
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
        {showCustomChip && (
          <button
            onClick={() => switchCat("custom")}
            className={
              "rounded-full px-4 py-2 text-sm font-medium transition-colors " +
              (cat === "custom"
                ? "bg-accent text-accent-fg"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800")
            }
          >
            我的命题 {customTerms.length}
          </button>
        )}
      </div>

      {/* 进度 + 设置行 */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          已表达 <b className="text-zinc-700 dark:text-zinc-200">{expressedCount}</b> · 剩余{" "}
          <b className="text-zinc-700 dark:text-zinc-200">{availableCount}</b>
        </span>
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={includeExpressed}
            onChange={(e) => {
              setIncludeExpressed(e.target.checked);
              if (phase === "idle") spin();
            }}
            className="h-3.5 w-3.5 accent-[var(--accent)]"
          />
          包含已表达过的
        </label>
        {expressedCount > 0 && (
          <button
            onClick={() => {
              setExpressed(new Set());
              if (phase === "idle") spin();
            }}
            className="underline-offset-2 hover:underline"
          >
            重置进度
          </button>
        )}
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
              {activeMeta.name}
            </span>
            <span className="text-xs text-zinc-400">{activeMeta.tag}</span>
          </div>

          {prompt ? (
            <>
              <p
                className={
                  "mt-5 text-balance text-4xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl " +
                  (spinning ? "opacity-60" : "opacity-100")
                }
              >
                {prompt.term}
              </p>
              {prompt.note && (
                <p className="mt-4 border-l-2 border-accent/50 pl-3 text-sm text-zinc-500 dark:text-zinc-400">
                  小导支招：{prompt.note}
                </p>
              )}
            </>
          ) : (
            <p className="mt-5 text-2xl font-semibold leading-snug text-zinc-400">
              {emptyReason === "no-custom"
                ? "还没有你的命题。在下面输入框加一个词，开始练。"
                : emptyReason === "all-done"
                  ? "这一场都讲完啦。重置进度，或勾上「包含已表达过的」再练一轮。"
                  : "点「抽命题」，小导给你抛个词。"}
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
          {phase === "done" && (
            <p className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-sm text-accent">
              时间到。这段讲得顺不顺都算数，已帮你记成「已表达」。
            </p>
          )}
        </div>
      </div>

      {/* 计时环 + 控制 */}
      <div className="mt-8 flex flex-col items-center">
        <div className="relative h-[180px] w-[180px]">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" aria-hidden>
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
              style={{ transition: reduce ? "none" : "stroke-dashoffset 1s linear" }}
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
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {phase === "idle" && (
            <button
              onClick={startResearch}
              disabled={!prompt}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
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
              onClick={markDone}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0"
            >
              <CheckIcon className="h-4 w-4" />
              标记已表达，换下一个
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
          {(phase === "idle" || phase === "done") && (
            <button
              onClick={spin}
              disabled={spinning}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              <ReloadIcon className="h-4 w-4" />
              换个命题
            </button>
          )}
        </div>

        {/* 时长选择 */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-zinc-400">查资料</span>
            {RESEARCH_DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => changeResearch(d.value)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                  (d.value === researchDuration
                    ? "bg-accent/10 text-accent"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs text-zinc-400">开讲</span>
            {SPEAK_DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => changeSpeak(d.value)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors " +
                  (d.value === speakDuration
                    ? "bg-accent/10 text-accent"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 我的命题：录入 */}
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          加自己的命题
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          想练哪个词，直接写进来。存在本机浏览器，换命题时会出现在「我的命题」里。
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addCustom();
            }}
            placeholder="比如：内卷、延迟满足、信息茧房"
            className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            onClick={addCustom}
            disabled={!newTerm.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            添加
          </button>
        </div>
      </div>
    </section>
  );
}
