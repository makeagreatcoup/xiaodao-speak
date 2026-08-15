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
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  prompts,
  promptsFor,
  categories,
  parseWordList,
  makeCustomPrompt,
  categoryMeta,
  type CategoryKey,
  type Prompt,
  type CustomPrompt,
} from "@/lib/prompts";

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

// 轮盘：行高 / 动画时长须与 globals.css 的 .reel-window / .reel-row 一致
const REEL_ROW = 200;
const REEL_DURATION = 2200; // ms，平滑减速定格

// 拼一段轮盘词列：末尾固定为抽中的词，前面随机铺满
function buildReel(pool: Prompt[], chosen: Prompt): string[] {
  const LEN = 24;
  const arr: string[] = [];
  for (let i = 0; i < LEN - 1; i++) arr.push(pickRandom(pool).term);
  arr.push(chosen.term);
  return arr;
}

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

// 个人词库每个词带一个领域标签；具体领域时混入该领域的上传词
function buildPool(
  cat: CategoryKey,
  custom: CustomPrompt[],
  includeExpressed: boolean,
  expressed: Set<string>,
): Prompt[] {
  const customPrompts = custom.map((c) => makeCustomPrompt(c.term, c.category));
  let base: Prompt[];
  if (cat === "all") base = [...promptsFor("all"), ...customPrompts];
  else if (cat === "custom") base = customPrompts;
  else base = [...promptsFor(cat), ...customPrompts.filter((p) => p.category === cat)];
  return includeExpressed ? base : base.filter((p) => !expressed.has(p.id));
}

export function PromptStage() {
  const [cat, setCat] = useState<CategoryKey>("all");
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  const [customTerms, setCustomTerms] = useState<CustomPrompt[]>([]);
  const [expressed, setExpressed] = useState<Set<string>>(new Set());
  const [includeExpressed, setIncludeExpressed] = useState(false);

  // phase: idle | research | ready | speak | done
  const [phase, setPhase] = useState<"idle" | "research" | "ready" | "speak" | "done">("idle");
  const [running, setRunning] = useState(false);
  const [emptyReason, setEmptyReason] = useState<"none" | "all-done" | "no-custom">("none");

  const [researchDuration, setResearchDuration] = useState(10 * 60);
  const [speakDuration, setSpeakDuration] = useState(60);
  const [left, setLeft] = useState(60);

  // 轮盘滚动状态
  const [spinning, setSpinning] = useState(false);
  const [reelWords, setReelWords] = useState<string[]>([]);
  const reelRef = useRef<HTMLDivElement | null>(null);

  // 批量导入弹层
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importCat, setImportCat] = useState<CategoryKey>("custom");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const builtinTerms = useMemo(
    () => new Set(prompts.map((p) => p.term.toLowerCase())),
    [],
  );
  const parsed = useMemo(() => parseWordList(importText), [importText]);
  const importDupes = useMemo(
    () =>
      parsed.filter((t) => {
        const k = t.toLowerCase();
        return (
          customTerms.some((c) => c.term.toLowerCase() === k) ||
          builtinTerms.has(k)
        );
      }),
    [parsed, customTerms, builtinTerms],
  );
  const importNew = useMemo(
    () => parsed.filter((t) => !importDupes.includes(t)),
    [parsed, importDupes],
  );

  // 载入本地存储：已表达 + 个人词库，并完成首抽（直接定格，无动画）
  useEffect(() => {
    let exp: Set<string> = new Set();
    let cust: CustomPrompt[] = [];
    try {
      const e = JSON.parse(localStorage.getItem(EXP_KEY) || "[]");
      if (Array.isArray(e)) exp = new Set(e as string[]);
    } catch {}
    try {
      const c = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
      if (Array.isArray(c)) {
        const VALID: CategoryKey[] = [
          "psychology",
          "economy",
          "science",
          "philosophy",
          "all",
          "custom",
        ];
        cust = c
          .map((x: unknown): CustomPrompt | null => {
            if (typeof x === "string") {
              const t = x.trim();
              return t ? { term: t, category: "custom" } : null;
            }
            if (x && typeof x === "object" && "term" in (x as object)) {
              const o = x as { term?: string; category?: CategoryKey };
              const t = (o.term ?? "").trim();
              if (!t) return null;
              const cat: CategoryKey =
                o.category && VALID.includes(o.category) ? o.category : "custom";
              return { term: t, category: cat };
            }
            return null;
          })
          .filter((v): v is CustomPrompt => v !== null);
      }
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
    };
  }, []);

  // 轮盘滚动：平滑减速定格到抽中的词（无模糊 / 无回弹放大）
  useEffect(() => {
    if (!spinning) return;
    const el = reelRef.current;
    if (!el || reelWords.length === 0) {
      setSpinning(false);
      return;
    }
    const target = (reelWords.length - 1) * REEL_ROW;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.style.transform = `translateY(-${target}px)`;
      setSpinning(false);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / REEL_DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.style.transform = `translateY(-${target * eased}px)`;
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else {
        el.style.transform = `translateY(-${target}px)`;
        setSpinning(false);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  function clearTimers() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function drawFromPool(pool: Prompt[]) {
    if (pool.length === 0) {
      setPrompt(null);
      return;
    }
    setPrompt(pickRandom(pool));
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
    const chosen = pickRandom(pool);
    setPrompt(chosen);
    setReelWords(buildReel(pool, chosen));
    setSpinning(true);
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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      setImportText((prev) => (prev ? `${prev}\n${text}` : text));
    } catch {}
    e.target.value = ""; // 允许重复选择同一文件
  }

  function confirmImport() {
    if (importNew.length === 0) return;
    const next: CustomPrompt[] = [
      ...customTerms,
      ...importNew.map((t) => ({ term: t, category: importCat })),
    ];
    setCustomTerms(next);
    setImportOpen(false);
    setImportText("");
    setEmptyReason("none");
    // 若当前空闲，抽一个出来，立刻能练
    if (phase === "idle") {
      const pool = buildPool(cat, next, includeExpressed, expressed);
      if (pool.length > 0) drawFromPool(pool);
    }
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

  const researchShown = phase === "research" ? left : researchDuration;
  const speakShown = phase === "speak" ? left : speakDuration;

  const hint =
    phase === "research"
      ? "打开浏览器，查它的来历、案例和反面观点"
      : phase === "ready"
        ? "查得差不多了？合上屏幕，用 1 分钟讲清楚"
        : phase === "speak"
          ? "别看屏幕，开口就讲，卡壳也别停"
          : phase === "done"
            ? "这段讲得顺不顺都算数，已记成「已表达」"
            : "小导随机抽一个词，先查资料，再开讲";

  // 轮盘下方小字：说明当前抽题范围 / 定格词的领域类型
  const typeCaption = prompt
    ? cat === "all" || cat === "custom"
      ? `抽题范围 · ${categoryMeta(cat).name}　｜　本词类别 · ${categoryMeta(prompt.category).name}`
      : `类别 · ${categoryMeta(prompt.category).name}`
    : `抽题范围 · ${categoryMeta(cat).name}`;

  return (
    <section
      id="stage"
      className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-6 sm:px-6"
    >
      {/* 导入词库：极简图标入口，不写说明、不占主视觉 */}
      <button
        onClick={() => setImportOpen(true)}
        aria-label="导入词库"
        title="导入词库"
        className="fixed right-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 backdrop-blur transition-colors hover:text-accent dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400"
      >
        <UploadIcon className="h-4 w-4" />
      </button>

      {/* 头部：站点名 + 一句话说明 */}
      <header className="mb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          小导片场
          <span className="ml-2 align-middle text-sm font-semibold text-accent">
            先查后讲
          </span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          抽个词，先查资料，再开口讲 · 练即席表达
        </p>
      </header>

      {/* 命题分类：随机全场 + 内置 4 领域 + 我的命题 */}
      <div className="mb-5 flex flex-wrap justify-center gap-2">
        {categories.map((c) => {
          const active = c.key === cat;
          const isAll = c.key === "all";
          return (
            <button
              key={c.key}
              onClick={() => switchCat(c.key)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
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
        {customTerms.length > 0 && (
          <button
            onClick={() => switchCat("custom")}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (cat === "custom"
                ? "bg-accent text-accent-fg"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800")
            }
          >
            我的命题 {customTerms.length}
          </button>
        )}
      </div>

      {/* 命题卡：大词轮盘（老虎机），居中核心 */}
      <div className="relative w-full">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="reel-window mx-auto" aria-live="polite">
            {spinning ? (
              <div key="reel-col" ref={reelRef} className="reel-col">
                {reelWords.map((w, i) => (
                  <div key={i} className="reel-row">
                    {w}
                  </div>
                ))}
              </div>
            ) : prompt ? (
              <div key={prompt.id} className="reel-word">
                {prompt.term}
              </div>
            ) : (
              <div key="reel-empty" className="reel-word reel-word--empty">
                抽一个词
              </div>
            )}
          </div>

          {/* 类型说明小字：当前抽题范围 / 定格词的领域 */}
          <p className="mt-3 text-xs tracking-wide text-zinc-400 dark:text-zinc-500">
            {typeCaption}
          </p>

          {/* 极简阶段提示 */}
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{hint}</p>
        </div>
      </div>

      {/* 计时：左右两个大号时间 —— 查资料动左、表达动右，无进度条 */}
      <div className="mt-5 w-full max-w-lg">
        <div className="flex items-stretch justify-center gap-3">
          {/* 左：查资料时间 */}
          <div
            className={
              "flex-1 rounded-2xl border px-3 py-3 text-center transition-colors " +
              (phase === "research"
                ? "border-accent bg-accent/5"
                : "border-zinc-200 dark:border-zinc-800")
            }
          >
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              查资料
            </div>
            <div
              className={
                "font-mono text-5xl font-bold tabular-nums tracking-tight sm:text-6xl " +
                (phase === "research"
                  ? "text-accent"
                  : "text-zinc-900 dark:text-zinc-50")
              }
            >
              {fmt(researchShown)}
            </div>
          </div>
          {/* 右：表达时间 */}
          <div
            className={
              "flex-1 rounded-2xl border px-3 py-3 text-center transition-colors " +
              (phase === "speak"
                ? "border-accent bg-accent/5"
                : "border-zinc-200 dark:border-zinc-800")
            }
          >
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              表达
            </div>
            <div
              className={
                "font-mono text-5xl font-bold tabular-nums tracking-tight sm:text-6xl " +
                (phase === "speak"
                  ? "text-accent"
                  : "text-zinc-900 dark:text-zinc-50")
              }
            >
              {fmt(speakShown)}
            </div>
          </div>
        </div>
      </div>

      {/* 时间选择：放在两个时间底下，查资料 / 表达 两组小按钮 */}
      <div className="mt-3 w-full max-w-lg">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              查资料
            </span>
            {RESEARCH_DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => changeResearch(d.value)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                  (d.value === researchDuration
                    ? "bg-accent text-accent-fg"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              表达
            </span>
            {SPEAK_DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => changeSpeak(d.value)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                  (d.value === speakDuration
                    ? "bg-accent text-accent-fg"
                    : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主控制按钮 */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <ReloadIcon className="h-4 w-4" />
            换命题
          </button>
        )}
        {(phase === "idle" || phase === "done") && (
          <button
            onClick={spin}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <ReloadIcon className="h-4 w-4" />
            抽命题
          </button>
        )}
      </div>

      {/* 批量导入弹层 */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setImportOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  批量导入命题
                </h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  粘贴你的词库：支持一行一个，或用逗号 / 顿号分隔；也可以上传 .txt / .csv 文件。
                </p>
              </div>
              <button
                onClick={() => setImportOpen(false)}
                className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                aria-label="关闭"
              >
                <span className="block h-5 w-5 text-center text-lg leading-5">×</span>
              </button>
            </div>

            {/* 这批命题归为哪个领域 */}
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                这批命题归为
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "psychology", name: "心理学" },
                  { key: "economy", name: "经济商业" },
                  { key: "science", name: "科学科技" },
                  { key: "philosophy", name: "思维哲学" },
                  { key: "custom", name: "自命题" },
                ].map((o) => (
                  <button
                    key={o.key}
                    onClick={() => setImportCat(o.key as CategoryKey)}
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                      (importCat === o.key
                        ? "bg-accent text-accent-fg"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800")
                    }
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              placeholder={"内卷\n延迟满足\n信息茧房\n复利, 沉没成本, 机会成本"}
              className="mt-4 w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-800 outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900">
                <UploadIcon className="h-4 w-4" />
                上传 .txt / .csv
                <input
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {parsed.length === 0
                  ? "还没识别到词"
                  : `共识别 ${parsed.length} 个词`}
              </span>
              {importDupes.length > 0 && (
                <span className="text-xs text-zinc-400">
                  （{importDupes.length} 个已存在，自动跳过）
                </span>
              )}
            </div>

            {importNew.length > 0 && (
              <div className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {importNew.slice(0, 60).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent"
                  >
                    {t}
                  </span>
                ))}
                {importNew.length > 60 && (
                  <span className="rounded-full px-2.5 py-1 text-xs text-zinc-400">
                    +{importNew.length - 60}
                  </span>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setImportOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={confirmImport}
                disabled={importNew.length === 0}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                导入 {importNew.length > 0 ? `${importNew.length} 个` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
