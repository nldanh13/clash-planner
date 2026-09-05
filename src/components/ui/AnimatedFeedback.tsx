import React, { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 750,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const change = value - startValue;

    if (Math.abs(change) < 0.001) {
      setDisplayValue(value);
      return;
    }

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic: 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + change * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

interface AnimatedProgressBarProps {
  percent: number;
  duration?: number;
  className?: string;
  barClassName?: string;
}

export function AnimatedProgressBar({
  percent,
  duration = 750,
  className = "w-full h-2 rounded-full bg-slate-800/80 overflow-hidden",
  barClassName = "h-full rounded-full bg-gradient-to-r from-cyan-400 to-amber-400",
}: AnimatedProgressBarProps) {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(Math.max(0, Math.min(100, percent)));
    }, 40);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div className={className}>
      <div
        className={`${barClassName} transition-all ease-out`}
        style={{
          width: `${width}%`,
          transitionDuration: `${duration}ms`,
        }}
      />
    </div>
  );
}
