import { categories } from "@/lib/prompts";
import { Reveal } from "./Reveal";

// 让 4 个分类在 3 列网格里有节奏：脑洞(2) + 生活(1) / 职场(2) + 观点(1)
const spanMap: Record<string, string> = {
  whimsy: "sm:col-span-2",
  life: "sm:col-span-1",
  work: "sm:col-span-2",
  opinion: "sm:col-span-1",
  all: "sm:col-span-3",
};

// 视觉变化：脑洞、随机全场用强调色；职场用深色；生活、观点用描边底
const tintMap: Record<string, string> = {
  whimsy: "bg-accent text-accent-fg",
  work: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
  life: "border border-zinc-200 dark:border-zinc-800",
  opinion: "border border-zinc-200 dark:border-zinc-800",
  all: "bg-accent text-accent-fg",
};

export function CategoryShowcase() {
  return (
    <section
      id="library"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6"
    >
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          命题库
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          小导的片场
        </h2>
        <p className="mt-3 max-w-xl text-zinc-500 dark:text-zinc-400">
          每个场子一套脾气。点开上面的分类就能切换，下面挑几个样题先过过眼。
        </p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {categories.map((c, i) => {
          const sample = c.prompts[0];
          const tinted = tintMap[c.key].includes("bg-");
          return (
            <Reveal
              key={c.key}
              delay={i * 0.06}
              className={spanMap[c.key]}
            >
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
                      {c.prompts.length} 题
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
                    {sample.text}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
