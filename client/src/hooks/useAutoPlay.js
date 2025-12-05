import { useEffect, useRef } from 'react';

export default function useAutoPlay({
  activeWordId,
  blanks,
  enabled,
  delay,
  showCloze,
  playCount,
  triggerAutoPlay,
  moveActive,
}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!enabled || showCloze || !blanks.length || !playCount) return () => {};
    const current = blanks.find((b) => b.id === activeWordId) || blanks[0];
    if (!current) return () => {};
    let cancelled = false;
    const run = async () => {
      try {
        await triggerAutoPlay(current.value);
      } catch {
        // ignore
      }
      if (cancelled) return;
      timerRef.current = setTimeout(() => {
        moveActive(1);
      }, (delay || 1) * 1000);
    };
    run();
    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeWordId, enabled, showCloze, blanks, playCount, delay, triggerAutoPlay, moveActive]);

  return { timerRef };
}
