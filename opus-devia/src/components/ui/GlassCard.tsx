import type { ReactNode, HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function GlassCard({
  className = "",
  children,
  ...rest
}: GlassCardProps) {
  return (
    <div className={`glass ${className}`} {...rest}>
      {children}
    </div>
  );
}
