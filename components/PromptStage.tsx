"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ReloadIcon,
  PlayIcon,
  StopIcon,
  MagnifyingGlassIcon,
  SpeakerLoudIcon,
  PlusIcon,
  CheckIcon,
  UploadIcon,
  GearIcon,
  ChevronDownIcon,
  SpeakerOffIcon,
  EnterFullScreenIcon,
  ExitFullScreenIcon,
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
import { playResearchEnd, playSpeakEnd, playSpinEnd, primeAudio } from "@/lib/sound";

// 「已表达」记录类型：把词本身（term + 学科）也存进 localStorage，
// 这样即使将来种子 id 重新编号，记过的词也能在列表里显示，不再依赖 id 去词库反查。
type ExpressedRecord = { id: string; term: string; category: string };

// id -> { term, category } 映射：载入旧数据时反查词名用
const META_BY_ID = new Map(prompts.map((p) => [p.id, { term: p.term, category: p.category }]));

const RESEARCH_DURATIONS = [
  { label: "10 分钟", value: 10 * 60 },
  { label: "15 分钟", value: 15 * 60 },
  { label: "20 分钟", value: 20 * 60 },
];

const SPEAK_DURATIONS = [
  { label: "1 分钟", value: 60 },
  { label: "2 分钟", value: 120 },
  { label: "3 分钟", value: 180 },
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
  cat: string,
  custom: CustomPrompt[],
  includeExpressed: boolean,
  expressedIds: Set<string>,
  expressedTerms: Set<string>,
): Prompt[] {
  const customPrompts = custom.map((c) => makeCustomPrompt(c.term, c.category));
  let base: Prompt[];
  if (cat === "all") {
    base = [...promptsFor("all"), ...customPrompts];
  } else if (cat === "mine") {
    // 我的命题：所有上传词
    base = customPrompts;
  } else if (cat.startsWith("cat:")) {
    // 自定义命名分类（如 法律 / 历史）
    const name = cat.slice(4);
    const builtinKey = categories.find(
      (c) => c.key !== "all" && c.key !== "custom" && c.name === name,
    )?.key;
    base = builtinKey
      ? [...promptsFor(builtinKey), ...customPrompts.filter((p) => p.category === name)]
      : customPrompts.filter((p) => p.category === name);
  } else {
    // 内置领域 key：内置该领域 + 上传里归到同名领域的词
    const name = categoryMeta(cat).name;
    base = [...promptsFor(cat as CategoryKey), ...customPrompts.filter((p) => p.category === name)];
  }
  if (includeExpressed) return base;
  // 按「词」排除已表达：说过这个 term，无论它有几条记录、属于哪个学科，都不再随机抽到
  return base.filter((p) => !expressedIds.has(p.id) && !expressedTerms.has(p.term));
}

export function PromptStage() {
  const [cat, setCat] = useState<string>("all");
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  const [customTerms, setCustomTerms] = useState<CustomPrompt[]>([]);
  // 「已表达」以记录数组为真源（含 id/词/学科），派生出 id 集合与词集合供抽词排除
  const [expressedRecords, setExpressedRecords] = useState<ExpressedRecord[]>([]);
  const expressed = useMemo(() => new Set(expressedRecords.map((r) => r.id)), [expressedRecords]);
  const expressedTerms = useMemo(() => new Set(expressedRecords.map((r) => r.term)), [expressedRecords]);
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
  // 抽中的词暂存：滚动期间不写入 prompt，定格结束才显示，避免类别小字提前出现
  const chosenRef = useRef<Prompt | null>(null);

  // 设置面板（由右上角「设置」按钮打开）
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"bank" | "expressed" | "import">("bank");
  const [bankSearch, setBankSearch] = useState("");
  const [bankExpanded, setBankExpanded] = useState<Set<string>>(new Set());

  // 批量导入弹层
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // 声音开关：默认开，跟随 localStorage 持久化
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    try {
      setMuted(localStorage.getItem("xd-muted") === "1");
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("xd-muted", muted ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [muted]);

  // 全屏：跟随浏览器 Fullscreen API，状态监听 fullscreenchange
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFs = () => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch?.(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch?.(() => {});
    }
  };
  // 自适应：主内容按视口高度等比缩放，任何屏幕高度都完整显示、无页面滚动条
  const sectionRef = useRef<HTMLElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const sec = sectionRef.current;
      const inner = innerRef.current;
      if (!sec || !inner) return;
      const avail = sec.clientHeight;
      const need = inner.offsetHeight;
      setScale(need > avail ? Math.min(1, avail / need) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (sectionRef.current) ro.observe(sectionRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [phase, prompt, cat, spinning]);

  const [importCat, setImportCat] = useState<string>("");
  // 导入时可归到的内置领域（从 categories 派生，含保留的深奥主题）
  const IMPORT_BUILTINS = useMemo(
    () =>
      categories
        .filter((c) => c.key !== "all")
        .map((c) => ({ key: c.key, name: c.name })),
    [],
  );

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
  // 个人词库里出现过的自定义领域名（去掉与内置重名的，避免重复芯片）
  const customCats = useMemo(
    () =>
      Array.from(new Set(customTerms.map((c) => c.category))).filter(
        (name) => !IMPORT_BUILTINS.some((b) => b.name === name),
      ),
    [customTerms],
  );

  // 设置面板用：个人命题 Prompt 列表 + 全量（种子 + 个人）用于「已表达」查询
  const customPrompts = useMemo(
    () => customTerms.map((c) => makeCustomPrompt(c.term, c.category)),
    [customTerms],
  );
  const allPrompts = useMemo(() => [...prompts, ...customPrompts], [customPrompts]);

  // 载入本地存储：已表达 + 个人词库，并完成首抽（直接定格，无动画）
  useEffect(() => {
    let exp: ExpressedRecord[] = [];
    let cust: CustomPrompt[] = [];
    try {
      const e = JSON.parse(localStorage.getItem(EXP_KEY) || "[]");
      if (Array.isArray(e)) {
        const seen = new Set<string>();
        for (const x of e) {
          let rec: ExpressedRecord;
          if (typeof x === "string") {
            // 旧版：localStorage 里只存了 id。合并重编号后这些旧 id 已对不上词库，
            // 查不到真实词名就直接丢弃，绝不把原始 id 当名字显示出来。
            const m = META_BY_ID.get(x);
            if (!m) continue;
            rec = { id: x, term: m.term, category: m.category };
          } else if (x && typeof x === "object" && "id" in (x as object)) {
            const o = x as Partial<ExpressedRecord>;
            const id = o.id ?? "";
            if (!id) continue;
            const m = META_BY_ID.get(id);
            const term = o.term ?? m?.term;
            const category = o.category ?? m?.category ?? "—";
            // 既没存词名、词库也查不到 → 丢弃，绝不把原始 id 当名字显示出来
            if (!term) continue;
            rec = { id, term, category };
          } else {
            continue;
          }
          if (seen.has(rec.id)) continue;
          seen.add(rec.id);
          exp.push(rec);
        }
      }
    } catch {}
    try {
      const c = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
      if (Array.isArray(c)) {
        cust = c
          .map((x: unknown): CustomPrompt | null => {
            if (typeof x === "string") {
              const t = x.trim();
              return t ? { term: t, category: "自命题" } : null;
            }
            if (x && typeof x === "object" && "term" in (x as object)) {
              const o = x as { term?: string; category?: string };
              const t = (o.term ?? "").trim();
              if (!t) return null;
              // 旧数据里的 "custom"/"all" 一律归为「自命题」
              const raw = (o.category ?? "").trim();
              const cat = raw === "custom" || raw === "all" || raw === "" ? "自命题" : raw;
              return { term: t, category: cat };
            }
            return null;
          })
          .filter((v): v is CustomPrompt => v !== null);
      }
    } catch {}
    setExpressedRecords(exp);
    setCustomTerms(cust);
  }, []);

  // 持久化
  useEffect(() => {
    localStorage.setItem(EXP_KEY, JSON.stringify(expressedRecords));
  }, [expressedRecords]);
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
      setPrompt(chosenRef.current);
      setSpinning(false);
      if (!muted) playSpinEnd(); // 抽中落定：一声「叮咚」确认抽到了词
      return;
    }
    const target = (reelWords.length - 1) * REEL_ROW;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.style.transform = `translateY(-${target}px)`;
      setPrompt(chosenRef.current);
      setSpinning(false);
      if (!muted) playSpinEnd(); // 抽中落定：一声「叮咚」确认抽到了词
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
        setPrompt(chosenRef.current);
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
    primeAudio(); // 先在用户手势内解锁音频，落定时的音效才能响
    clearTimers();
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
    const pool = buildPool(cat, customTerms, includeExpressed, expressed, expressedTerms);
    if (pool.length === 0) {
      setEmptyReason(cat === "mine" || cat.startsWith("cat:") ? "no-custom" : "all-done");
      setPrompt(null);
      return;
    }
    setEmptyReason("none");
    const chosen = pickRandom(pool);
    chosenRef.current = chosen;
    setReelWords(buildReel(pool, chosen));
    setSpinning(true);
  }

  function switchCat(next: string) {
    if (next === cat) return;
    primeAudio(); // 解锁音频（切分类也会立刻抽到词、落定发声）
    clearTimers();
    setCat(next);
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
    const pool = buildPool(next, customTerms, includeExpressed, expressed, expressedTerms);
    if (pool.length === 0) {
      setEmptyReason(next === "mine" || next.startsWith("cat:") ? "no-custom" : "all-done");
      setPrompt(null);
      return;
    }
    setEmptyReason("none");
    drawFromPool(pool);
    if (!muted) playSpinEnd(); // 抽中落定：一声「叮咚」确认抽到了词
  }

  function markDone() {
    if (!prompt) return;
    // 记一条「已表达」记录（词本身也存进去，不再依赖 id 反查）
    const rec: ExpressedRecord = { id: prompt.id, term: prompt.term, category: prompt.category };
    setExpressedRecords((prev) => {
      if (prev.some((r) => r.id === rec.id)) return prev;
      return [...prev, rec];
    });
    // 抽下一题（已排除刚标记的）：用本地更新后的 id/词集合，保证本次抽题不重复
    const nextExpIds = new Set(expressed);
    nextExpIds.add(prompt.id);
    const nextExpTerms = new Set(expressedTerms);
    nextExpTerms.add(prompt.term);
    const pool = buildPool(cat, customTerms, includeExpressed, nextExpIds, nextExpTerms);
    // 标记后回到空闲态：展示下一个词，由用户决定是否查资料 / 开讲
    setPhase("idle");
    setRunning(false);
    setLeft(speakDuration);
    if (pool.length === 0) {
      setEmptyReason("all-done");
      setPrompt(null);
      return;
    }
    setEmptyReason("none");
    drawFromPool(pool);
  }

  // 仅记为「已表达」，不自动抽下一题：计时归零时调用，停在 done 态由用户手动「抽命题」
  function markExpressedOnly() {
    if (!prompt) return;
    const rec: ExpressedRecord = { id: prompt.id, term: prompt.term, category: prompt.category };
    setExpressedRecords((prev) => {
      if (prev.some((r) => r.id === rec.id)) return prev;
      return [...prev, rec];
    });
    setPhase("done");
    setRunning(false);
  }

  // 清除全部「已表达」内容（localStorage 中的 xd-expressed 会随状态变更自动清空）
  function clearExpressed() {
    if (expressedRecords.length === 0) return;
    setExpressedRecords([]);
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
    // importCat 可能是内置 key（如 deep-research）或自定义名称（如 法律 / 自命题）
    const catName = IMPORT_BUILTINS.some((b) => b.key === importCat)
      ? categoryMeta(importCat).name
      : importCat.trim() || "自命题";
    const next: CustomPrompt[] = [
      ...customTerms,
      ...importNew.map((t) => ({ term: t, category: catName })),
    ];
    setCustomTerms(next);
    setImportOpen(false);
    setImportText("");
    setEmptyReason("none");
    // 若当前空闲，抽一个出来，立刻能练
    if (phase === "idle") {
      const pool = buildPool(cat, next, includeExpressed, expressed, expressedTerms);
      if (pool.length > 0) drawFromPool(pool);
    }
  }

  function startResearch() {
    primeAudio();
    clearTimers();
    setPhase("research");
    setRunning(true);
    setLeft(researchDuration);
    timerRef.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearTimers();
          setRunning(false);
          if (!muted) playResearchEnd(); // 查资料结束：提示该开口讲了
          setPhase("ready");
          setLeft(speakDuration);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  }

  function startSpeak() {
    primeAudio();
    clearTimers();
    setPhase("speak");
    setRunning(true);
    setLeft(speakDuration);
    timerRef.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearTimers();
          setRunning(false);
          if (!muted) playSpeakEnd(); // 表达计时结束：提示时间到
          markExpressedOnly(); // 表达计时结束：仅记为「已表达」，停在 done 态等用户手动抽命题
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
    primeAudio();
    setRunning(true);
    timerRef.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearTimers();
          setRunning(false);
          if (phase === "research") {
            if (!muted) playResearchEnd(); // 查资料结束：提示该开口讲了
            setPhase("ready");
            setLeft(speakDuration);
          } else {
            if (!muted) playSpeakEnd(); // 表达计时结束：提示时间到
            markExpressedOnly(); // 表达计时结束：仅记为「已表达」，停在 done 态等用户手动抽命题
          }
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  }

  function changeResearch(v: number) {
    setResearchDuration(v);
  }

  function changeSpeak(v: number) {
    setSpeakDuration(v);
  }

  const researchShown = phase === "research" ? left : researchDuration;
  const speakShown = phase === "speak" ? left : speakDuration;

  // 抽题范围标签（cat 可能是内置 key / all / mine / cat:名称）
  const catLabel = (c: string): string =>
    c === "all"
      ? "随机全场"
      : c === "mine"
        ? "我的命题"
        : c.startsWith("cat:")
          ? c.slice(4)
          : categoryMeta(c).name;

  // 轮盘下方小字：滚动中保留抽题范围、本词类别留空，定格后填值
  // 拆成「前缀 + 值」两段，值放进预留宽度的 span，使整行居中且值出现时不横移
  const wordCat = prompt ? categoryMeta(prompt.category).name : "";
  const isRangeCat = cat === "all" || cat === "mine" || cat.startsWith("cat:");
  let capPrefix = "";
  let capValue = "";
  if (spinning || prompt) {
    capPrefix = isRangeCat
      ? `抽题范围 · ${catLabel(cat)}　｜　本词类别 ·`
      : `类别 ·`;
    capValue = spinning ? "" : wordCat;
  } else {
    capPrefix = `抽题范围 · ${catLabel(cat)}`;
  }

  return (
    <section
      id="stage"
      ref={sectionRef}
      className="relative mx-auto flex h-[100dvh] w-full max-w-2xl flex-col items-center overflow-hidden bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-300 px-4 sm:px-6 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900"
    >
      {/* 背景层次：顶部一抹暖色光晕，避免纯色过曝、增强拍照可读性 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_42%_at_50%_0%,rgba(255,75,51,0.08),transparent_72%)] dark:bg-[radial-gradient(60%_42%_at_50%_0%,rgba(255,75,51,0.14),transparent_72%)]"
      />
      {/* 右上角：设置入口（已表达可在设置里查看，主屏不挂徽标） */}
      <div className="fixed right-4 top-4 z-40 flex items-center gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "开启声音" : "关闭声音"}
          title={muted ? "开启声音" : "关闭声音"}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur transition-colors hover:text-accent dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          {muted ? (
            <SpeakerOffIcon className="h-4 w-4" />
          ) : (
            <SpeakerLoudIcon className="h-4 w-4" />
          )}
          {muted ? "静音" : "声音"}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="设置"
          title="设置"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur transition-colors hover:text-accent dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          <GearIcon className="h-4 w-4" />
          设置
        </button>
        <button
          onClick={toggleFs}
          aria-label={isFs ? "退出全屏" : "进入全屏"}
          title={isFs ? "退出全屏" : "进入全屏"}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur transition-colors hover:text-accent dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          {isFs ? (
            <ExitFullScreenIcon className="h-4 w-4" />
          ) : (
            <EnterFullScreenIcon className="h-4 w-4" />
          )}
          {isFs ? "退出全屏" : "全屏"}
        </button>
        <button
          onClick={() => {
            primeAudio();
            playResearchEnd();
          }}
          aria-label="试听提示音"
          title="试听提示音（点击立即播放一段，验证音频是否可用）"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur transition-colors hover:text-accent dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300"
        >
          <SpeakerLoudIcon className="h-4 w-4" />
          试听
        </button>
      </div>

      {/* 主内容：按视口高度等比缩放，保证任何屏幕高度都完整显示、无页面滚动条 */}
      <div className="flex w-full flex-1 flex-col items-center justify-center overflow-hidden">
        <div
          ref={innerRef}
          className="flex w-full flex-col items-center"
          style={{
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: "center center",
          }}
        >
      {/* 头部：站点名 + 一句话说明 */}
      <header className="mb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          小导片场
          <span className="ml-2 align-middle text-sm font-semibold text-accent">
            先查后讲
          </span>
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          抽个词，先查资料，再开口，练即兴表达
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
        {customCats.length > 0 && (
          customCats.map((name) => {
            const active = cat === `cat:${name}`;
            return (
              <button
                key={`cat:${name}`}
                onClick={() => switchCat(`cat:${name}`)}
                className={
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-accent text-accent-fg"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800")
                }
              >
                {name}
              </button>
            );
          })
        )}
        {customTerms.length > 0 && (
          <button
            onClick={() => switchCat("mine")}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (cat === "mine"
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

          {/* 类型说明小字：居中且固定——值放进预留宽度的 span，滚动→定格时本词类别值出现也不横移 */}
          <p className="mt-3 text-center text-xs tracking-wide text-zinc-400 dark:text-zinc-500">
            {capPrefix}
            {(spinning || prompt) && (
              <span className="inline-block min-w-[4em] text-left">{capValue}</span>
            )}
          </p>
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
          <>
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
            <button
              onClick={markDone}
              className="inline-flex items-center gap-2 rounded-full border border-accent px-5 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/5"
            >
              <CheckIcon className="h-4 w-4" />
              标记已表达，换下一个
            </button>
          </>
        )}

        {phase === "done" && (
          <button
            onClick={() => {
              setSettingsTab("expressed");
              setSettingsOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
          >
            <CheckIcon className="h-4 w-4" />
            已记为「已表达」：{prompt?.term}（累计 {expressedRecords.length} 条 · 点此查看）
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
      </div>
      </div>

      {/* 设置面板：话题库（按主题浏览）/ 已表达 / 导入 */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSettingsOpen(false)}
            aria-hidden
          />
          <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            {/* 头部 + 标签切换 */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">设置</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                aria-label="关闭"
              >
                <span className="block h-5 w-5 text-center text-lg leading-5">×</span>
              </button>
            </div>
            <div className="flex gap-1 border-b border-zinc-200 px-3 dark:border-zinc-800">
              {([
                { k: "bank", label: "话题库" },
                { k: "expressed", label: "已表达" },
                { k: "import", label: "导入" },
              ] as const).map((t) => (
                <button
                  key={t.k}
                  onClick={() => setSettingsTab(t.k)}
                  className={
                    "relative px-3 py-2.5 text-sm font-medium transition-colors " +
                    (settingsTab === t.k
                      ? "text-accent"
                      : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200")
                  }
                >
                  {t.label}
                  {settingsTab === t.k && (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* ===== 话题库：按主题浏览全部话题 ===== */}
              {settingsTab === "bank" && (
                <div>
                  <div className="relative mb-4">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      placeholder="搜索话题…"
                      className="w-full rounded-full border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 outline-none transition-colors focus:border-accent dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                  {(() => {
                    const q = bankSearch.trim().toLowerCase();
                    const allCats = categories.filter((c) => c.key !== "all");
                    // 搜索态：跨主题平铺命中项
                    if (q) {
                      const hits = allPrompts.filter((p) =>
                        p.term.toLowerCase().includes(q),
                      );
                      return (
                        <div className="space-y-1.5">
                          {hits.length === 0 && (
                            <p className="py-6 text-center text-sm text-zinc-400">
                              没有匹配「{bankSearch}」的话题。
                            </p>
                          )}
                          {hits.map((p) => {
                            const done = expressed.has(p.id) || expressedTerms.has(p.term);
                            return (
                              <div
                                key={p.id}
                                className={
                                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 " +
                                  (done
                                    ? "bg-accent/10 dark:bg-accent/10"
                                    : "bg-zinc-50 dark:bg-zinc-800/60")
                                }
                              >
                                <span className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
                                  {done && <CheckIcon className="h-3.5 w-3.5 text-accent" />}
                                  {p.term}
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5">
                                  {done && (
                                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-fg">
                                      已表达
                                    </span>
                                  )}
                                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                                    {categoryMeta(p.category).name}
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    // 非搜索态：按主题折叠展示
                    const sections = [
                      ...allCats.map((c) => ({
                        key: c.key,
                        name: c.name,
                        items: promptsFor(c.key),
                      })),
                      { key: "mine", name: "我的命题", items: customPrompts },
                    ];
                    return (
                      <div className="space-y-2">
                        {sections.map((s) => {
                          const open = bankExpanded.has(s.key);
                          const expressedInSection = s.items.filter(
                            (p) => expressed.has(p.id) || expressedTerms.has(p.term),
                          ).length;
                          return (
                            <div
                              key={s.key}
                              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
                            >
                              <button
                                onClick={() =>
                                  setBankExpanded((prev) => {
                                    const n = new Set(prev);
                                    if (n.has(s.key)) n.delete(s.key);
                                    else n.add(s.key);
                                    return n;
                                  })
                                }
                                className="flex w-full items-center justify-between gap-2 bg-zinc-50 px-3 py-2.5 text-left transition-colors hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                              >
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                  {s.name}
                                  <span className="ml-2 text-xs font-normal text-zinc-400">
                                    {s.items.length}
                                  </span>
                                </span>
                                <span className="flex items-center gap-2">
                                  {expressedInSection > 0 && (
                                    <span className="text-xs font-semibold text-accent">
                                      {expressedInSection}
                                    </span>
                                  )}
                                  <ChevronDownIcon
                                    className={
                                      "h-4 w-4 shrink-0 text-zinc-400 transition-transform " +
                                      (open ? "rotate-180" : "")
                                    }
                                  />
                                </span>
                              </button>
                              {open && (
                                <div className="flex flex-wrap gap-1.5 p-3">
                                  {s.items.length === 0 ? (
                                    <span className="text-xs text-zinc-400">还没有话题</span>
                                  ) : (
                                    s.items.map((p) => {
                                      const done = expressed.has(p.id) || expressedTerms.has(p.term);
                                      return (
                                        <span
                                          key={p.id}
                                          className={
                                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs " +
                                            (done
                                              ? "border border-accent/40 bg-accent/10 text-accent"
                                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
                                          }
                                        >
                                          {done && <CheckIcon className="h-3 w-3" />}
                                          {p.term}
                                        </span>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ===== 已表达：查看标记过的内容 ===== */}
              {settingsTab === "expressed" && (
                <div>
                  {expressedRecords.length === 0 ? (
                    <p className="py-10 text-center text-sm text-zinc-400">
                      还没有标记过「已表达」的内容。抽到一个词、讲完等表达计时归零会自动记到这里；讲的过程中也能随时点「标记已表达，换下一个」。
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-zinc-400">
                          共 {expressedRecords.length} 条已表达
                        </p>
                        <button
                          onClick={clearExpressed}
                          className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-500 transition-colors hover:border-red-400 hover:text-red-500 dark:border-zinc-700 dark:text-zinc-400"
                        >
                          清除全部
                        </button>
                      </div>
                      {expressedRecords.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"
                        >
                          <span className="text-sm text-zinc-800 dark:text-zinc-100">
                            {r.term}
                          </span>
                          <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                            {categories.find((c) => c.key === r.category)?.name ?? r.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===== 导入：入口打开原有导入弹层 ===== */}
              {settingsTab === "import" && (
                <div className="text-center">
                  <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                    批量粘贴或上传 .txt / .csv，按领域归类到话题库；也可以一行一个词直接加。
                  </p>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      setImportOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-transform hover:-translate-y-px active:translate-y-0"
                  >
                    <PlusIcon className="h-4 w-4" />
                    打开导入窗口
                  </button>
                  {customTerms.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-400">
                      当前个人命题 {customTerms.length} 个
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <div className="flex flex-wrap items-center gap-2">
                {IMPORT_BUILTINS.map((o) => {
                  const active = importCat === o.key;
                  return (
                    <button
                      key={o.key}
                      onClick={() => setImportCat(o.key)}
                      className={
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
                        (active
                          ? "bg-accent text-accent-fg"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800")
                      }
                    >
                      {o.name}
                    </button>
                  );
                })}
                {/* 自定义命名：不输则默认「自命题」 */}
                <input
                  value={IMPORT_BUILTINS.some((b) => b.key === importCat) ? "" : importCat}
                  onChange={(e) => setImportCat(e.target.value)}
                  placeholder="自命题（可自定义命名，如：法律、职场）"
                  className="w-48 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-800 outline-none transition-colors focus:border-accent dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
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
