import { Nav } from "@/components/Nav";
import { PromptStage } from "@/components/PromptStage";
import { HowItWorks } from "@/components/HowItWorks";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { XiaodaoSays } from "@/components/XiaodaoSays";
import { Footer } from "@/components/Footer";

export default function Page() {
  return (
    <main id="top">
      <Nav />

      <section className="mx-auto max-w-6xl px-4 pb-4 pt-16 sm:px-6 sm:pt-24">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-6xl">
            抽个词，
            <br />
            先查再讲
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-500 dark:text-zinc-400">
            小导随机甩你一个话题。你上网查 10 分钟资料，再用 1 分钟把它讲清楚。练的是把陌生东西讲到别人听懂的本事。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#stage"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-fg transition-transform hover:-translate-y-px"
            >
              进片场开练
            </a>
            <a
              href="#library"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-6 py-3 font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              看看命题库
            </a>
          </div>
        </div>
      </section>

      <PromptStage />
      <HowItWorks />
      <CategoryShowcase />
      <XiaodaoSays />
      <Footer />
    </main>
  );
}
