"use client";

import { ButtonHTMLAttributes, ReactNode, useEffect, useState } from "react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: ReactNode;
  estimatedSeconds?: number;
  showEta?: boolean;
};

function formatRemaining(seconds: number) {
  if (seconds <= 0) return "finishing up";
  if (seconds < 60) return `~${seconds}s left`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `~${minutes}m ${rest}s left` : `~${minutes}m left`;
}

function useEstimatedRemaining(active: boolean, estimatedSeconds = 12) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      setStartedAt(null);
      return;
    }

    const start = Date.now();
    setStartedAt(start);
    setNow(start);
    const interval = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(interval);
  }, [active]);

  if (!active || startedAt === null) {
    return estimatedSeconds;
  }

  const elapsedSeconds = Math.floor((now - startedAt) / 1000);
  return Math.max(0, estimatedSeconds - elapsedSeconds);
}

export function LoadingButton({
  loading = false,
  loadingLabel = "Working…",
  estimatedSeconds = 12,
  showEta = true,
  disabled,
  className = "",
  children,
  ...props
}: LoadingButtonProps) {
  const remainingSeconds = useEstimatedRemaining(loading, estimatedSeconds);

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={["loading-button", loading ? "loading-button--active" : "", className].filter(Boolean).join(" ")}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <span className="loading-button__spinner" aria-hidden="true" />
          <span className="loading-button__content">{loadingLabel}</span>
          {showEta ? <span className="loading-button__eta">{formatRemaining(remainingSeconds)}</span> : null}
        </>
      ) : (
        children
      )}
    </button>
  );
}
