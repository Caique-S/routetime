import { useState, useEffect } from 'react';

export function useLiveTimer(startTimestamp?: string | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTimestamp) {
      setElapsed(0);
      return;
    }

    const start = new Date(startTimestamp).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTimestamp]);

  return elapsed;
}