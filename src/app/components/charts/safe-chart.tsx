"use client";
import { ReactNode } from "react";
import { useChartReady } from "@/app/hooks/useChartReady";

interface SafeChartProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SafeChart({ children, className, style }: SafeChartProps) {
  const { containerRef, ready } = useChartReady();

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, minHeight: style?.minHeight || 200 }}
    >
      {ready && children}
    </div>
  );
}