import { useEffect, useRef } from 'react';

export default function useAutoPlay({
  activeWordId,
  blanks,
  enabled,
  delay,
  showCloze,
  moveActive,
}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!enabled || showCloze || !blanks.length) return () => {};
    const current = blanks.find((b) => b.id === activeWordId) || blanks[0];
    if (!current) return () => {};
    let cancelled = false;
    timerRef.current = setTimeout(() => {
      if (!cancelled) moveActive(1);
    }, (delay || 1) * 1000);
    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeWordId, enabled, showCloze, blanks, delay, moveActive]);

  return { timerRef };
}
