import { useState, useRef, useEffect } from "react";

export function useChartReady() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number;
    const check = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setReady(true);
        return;
      }
      rafId = requestAnimationFrame(check);
    };

    const observer = new ResizeObserver(() => {
      check();
    });
    observer.observe(el);
    check(); // verificação inicial

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return { containerRef, ready };
}