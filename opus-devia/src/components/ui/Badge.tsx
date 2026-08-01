import clsx from "clsx";

type BadgeVariant = "archetype" | "tier";

interface BadgeProps {
  variant: BadgeVariant;
  label: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  archetype: "bg-crimson text-white-soft",
  tier: "bg-silver-1 text-black-base",
};

export default function Badge({ variant, label }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wider",
        variantClasses[variant]
      )}
      style={{
        background: "var(--glossy-pill-bg, undefined)",
        border: "1px solid var(--glossy-pill-border, transparent)",
        boxShadow: "var(--glossy-pill-shadow, none)",
      }}
    >
      {label}
    </span>
  );
}
