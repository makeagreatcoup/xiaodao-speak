import { categories, promptsFor } from "@/lib/prompts";
import { Reveal } from "./Reveal";

// 5 个分类在 3 列网格里的节奏
const spanMap: Record<string, string> = {
  psychology: "sm:col-span-2",
  economy: "sm:col-span-1",
  science: "sm:col-span-2",
  philosophy: "sm:col-span-1",
  all: "sm:col-span-3",
};

// 视觉变化：心理学、随机全场用强调色；科学用深色；经济、思维用描边底
const tintMap: Record<string, string> = {
  psychology: "bg-accent text-accent-fg",
  economy: "border border-zinc-200 dark:border-zinc-800",
  science: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
  philosophy: "border border-zinc-200 dark:border-zinc-800",
  all: "bg-accent text-accent-fg",
};

export function CategoryShowcase() {
  return (
    <section id="library" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          命题库
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          小导的词场
        </h2>
        <p className="mt-3 max-w-xl text-zinc-500 dark:text-zinc-400">
          每个场子一套词性。点开上面的分类就能切换，下面挑几个样词先过过眼。
        </p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {categories.map((c, i) => {
          const sample = promptsFor(c.key)[0];
          const tinted = tintMap[c.key].includes("bg-");
          return (
            <Reveal key={c.key} delay={i * 0.06} className={spanMap[c.key]}>
              <div
                className={
                  "flex h-full flex-col justify-between rounded-2xl p-6 " +
                  tintMap[c.key]
                }
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3
                      className={
                        "text-xl font-semibold tracking-tight " +
                        (tinted ? "" : "text-zinc-900 dark:text-zinc-50")
                      }
                    >
                      {c.name}
                    </h3>
                    <span
                      className={
                        "text-xs " +
                        (tinted
                          ? "text-accent-fg/70"
                          : "text-zinc-400 dark:text-zinc-500")
                      }
                    >
                      {promptsFor(c.key).length} 词
                    </span>
                  </div>
                  <p
                    className={
                      "mt-1 text-sm " +
                      (tinted
                        ? "text-accent-fg/80"
                        : "text-zinc-500 dark:text-zinc-400")
                    }
                  >
                    {c.tag}
                  </p>
                  <p
                    className={
                      "mt-4 text-sm leading-relaxed " +
                      (tinted
                        ? "text-accent-fg/90"
                        : "text-zinc-600 dark:text-zinc-300")
                    }
                  >
                    {c.blurb}
                  </p>
                  {sample && (
                    <p
                      className={
                        "mt-4 inline-block rounded-full px-3 py-1 text-sm font-semibold " +
                        (tinted
                          ? "bg-white/20 text-accent-fg"
                          : "bg-accent/10 text-accent")
                      }
                    >
                      样词：{sample.term}
                    </p>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
