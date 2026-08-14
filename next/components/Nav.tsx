import { ArrowRightIcon } from "@radix-ui/react-icons";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md dark:border-zinc-800/70 dark:bg-zinc-950/80">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-fg">
            导
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            小导片场
          </span>
        </a>
        <div className="flex items-center gap-5 text-sm sm:gap-7">
          <a
            href="#how"
            className="hidden text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:block"
          >
            怎么玩
          </a>
          <a
            href="#library"
            className="hidden text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:block"
          >
            命题库
          </a>
          <a
            href="#stage"
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 font-medium text-accent-fg transition-transform hover:-translate-y-px"
          >
            <ArrowRightIcon className="h-4 w-4" />
            开练
          </a>
        </div>
      </nav>
    </header>
  );
}
