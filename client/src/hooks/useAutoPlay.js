import { useEffect, useRef } from 'react';

export default function useAutoPlay({
  activeWordId,
  blanks,
  enabled,
  delay,
  showCloze,
  triggerAutoPlay,
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
    const run = async () => {
      try {
        await triggerAutoPlay(current.value);
      } catch {
        // ignore play errors for auto flow
      }
      if (cancelled) return;
      timerRef.current = setTimeout(() => {
        if (!cancelled) moveActive(1, { skipPlay: true });
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
  }, [activeWordId, enabled, showCloze, blanks, delay, moveActive, triggerAutoPlay]);

  return { timerRef };
}
