export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
    >
      <div
        className="h-full rounded-full bg-brand transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
