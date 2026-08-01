import clsx from "clsx";
import type { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-crimson text-white-soft hover:bg-crimson-light active:bg-crimson border-transparent",
  secondary:
    "bg-panel text-silver-2 hover:bg-[#252836] active:bg-black-base border-transparent",
  ghost:
    "bg-transparent text-silver-1 hover:text-white-soft hover:border-crimson-light border-silver-1",
};

export default function Button({
  variant = "primary",
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 border",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson-light focus-visible:ring-offset-2 focus-visible:ring-offset-black-base",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        className
      )}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
