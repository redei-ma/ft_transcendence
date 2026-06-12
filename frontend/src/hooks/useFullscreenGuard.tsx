// src/hooks/useFullscreenGuard.ts
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Requisito "schermo intero" durante la partita.
 * - enter(): va a schermo intero (chiamala da un onClick).
 * - isFullscreen: stato corrente.
 * - se esci dal fullscreen mentre `active` è true, dopo `graceMs` parte onViolation (il kick).
 */
export function useFullscreenGuard(
  active: boolean,
  onViolation: () => void,
  graceMs = 15000
) {
  const [isFullscreen, setIsFullscreen] = useState(
    () => document.fullscreenElement !== null
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;

  const enter = useCallback(() => {
    if (document.fullscreenElement) {   // già a schermo intero → sincronizza e basta
      setIsFullscreen(true);
      return;
    }
    document.documentElement
      .requestFullscreen()
      .catch((e) => console.warn('Fullscreen negato dal browser', e));
  }, []);

  useEffect(() => {
    const clear = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    };

    const onChange = () => {
      const fs = document.fullscreenElement !== null;
      setIsFullscreen(fs);
      if (!active) return;
      if (fs) clear();
      else timer.current = setTimeout(() => onViolationRef.current(), graceMs);
    };

    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      clear();
    };
  }, [active, graceMs]);

  return { isFullscreen, enter };
}