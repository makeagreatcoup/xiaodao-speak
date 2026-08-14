import { Reveal } from "./Reveal";

export function XiaodaoSays() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50 py-20 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <p className="text-sm font-semibold text-accent">小导说</p>
          <blockquote className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            在小导的片场，没有标准答案，只有你查没查、讲没讲。
          </blockquote>
          <p className="mt-6 text-zinc-500 dark:text-zinc-400">
            表达的底气来自资料，不在天赋。先花 10 分钟把一件事查明白，再用 1 分钟讲出来。今天这段磕巴，就是明天那段顺溜的预演。
          </p>
        </Reveal>
      </div>
    </section>
  );
}
