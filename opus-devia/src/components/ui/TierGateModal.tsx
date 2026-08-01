import { useEffect, useCallback } from "react";
import GlassCard from "./GlassCard";
import Button from "./Button";

interface TierGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export default function TierGateModal({
  isOpen,
  onClose,
  featureName,
}: TierGateModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black-base/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <GlassCard className="max-w-sm w-full mx-4 p-8 text-center flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-crimson/20 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--theme-accent, #DC143C)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-white-soft">
          {featureName} Locked
        </h2>

        <p className="text-sm text-silver-1 leading-relaxed">
          Upgrade your tier to unlock{" "}
          <span className="text-crimson-light font-medium">{featureName}</span>{" "}
          and gain access to premium features, higher limits, and more.
        </p>

        <div className="flex gap-3 w-full mt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
          >
            Not now
          </Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Upgrade Tier
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
