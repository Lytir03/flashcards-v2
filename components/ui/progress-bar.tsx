export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-4 w-full overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
    >
      <div
        className="h-full rounded-full bg-brand shadow-[inset_0_-2px_0_rgb(70_163_2_/_0.45)] transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
