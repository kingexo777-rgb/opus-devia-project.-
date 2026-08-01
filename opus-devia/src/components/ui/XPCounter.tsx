interface XPCounterProps {
  amount: number;
}

export default function XPCounter({ amount }: XPCounterProps) {
  return (
    <div className="inline-flex items-baseline gap-1.5">
      <span className="text-2xl font-bold text-crimson-light tabular-nums">
        {amount.toLocaleString()}
      </span>
      <span className="text-sm font-semibold uppercase tracking-widest text-crimson">
        XP
      </span>
    </div>
  );
}
