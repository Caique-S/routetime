import { useState, useEffect, useRef } from 'react';

export function useLiveTimer(startTime: string | Date | null | undefined): number {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toMs = (v: string | Date | null | undefined): number | null => {
    if (!v) return null;
  
    if (typeof v === 'object' && !(v instanceof Date) && '$date' in v) {
      const d = new Date((v as any).$date);
      return isNaN(d.getTime()) ? null : d.getTime();
    }
    const d = new Date(v as string | Date);
    return isNaN(d.getTime()) ? null : d.getTime();
  };

  const startMs = toMs(startTime);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (startMs === null) {
      setElapsed(0);
      return;
    }

    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick(); 
    intervalRef.current = setInterval(tick, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startMs]);

  return elapsed;
}