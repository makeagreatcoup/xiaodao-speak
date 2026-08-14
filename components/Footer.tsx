export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-start justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-accent-fg">
            导
          </span>
          <span className="text-sm font-semibold tracking-tight">
            小导片场
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          先查后讲，讲完别忘喝水。
        </p>
        <p className="text-xs text-zinc-400">
          © {new Date().getFullYear()} 小导片场
        </p>
      </div>
    </footer>
  );
}
