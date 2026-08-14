import { ReloadIcon, MagnifyingGlassIcon, SpeakerLoudIcon } from "@radix-ui/react-icons";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: ReloadIcon,
    title: "抽个词",
    body: "小导从题库随机甩一个话题，生活、职场、观点、脑洞，四块场子随你挑，也能全池混抽。",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "查 10 分钟",
    body: "按下开始，计时 10 分钟。打开浏览器，把这个词的来历、案例、反方观点都摸一遍。",
  },
  {
    icon: SpeakerLoudIcon,
    title: "讲 1 分钟",
    body: "查完合上屏幕，用 1 分钟把它讲清楚。先给结论，再补细节，卡壳也别停。",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          先查后讲，三步走
        </h2>
        <p className="mt-3 max-w-xl text-zinc-500 dark:text-zinc-400">
          不是考你临场发挥，是练你把查到的东西，在 1 分钟里讲明白。查得越透，讲得越顺。
        </p>
      </Reveal>

      <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <div className="flex h-full flex-col border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <s.icon
                className="h-7 w-7 text-accent"
                aria-hidden
              />
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {s.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
