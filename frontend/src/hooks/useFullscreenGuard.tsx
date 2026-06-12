// src/hooks/useFullscreenGuard.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../configs/logger';

/**
 * Requisito "schermo intero" durante la partita.
 * - enter(): va a schermo intero (chiamala da un onClick).
 * - isFullscreen: stato corrente.
 * - kickAt: epoch ms a cui scatterà il kick, oppure null se nessun kick è armato.
 *   La gate lo usa per visualizzare il countdown — singola fonte di verità,
 *   nessun timer parallelo che possa desincronizzarsi.
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
  const [kickAt, setKickAt] = useState<number | null>(null);
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
      .catch((e) => logger.warn('FullscreenGuard', 'Fullscreen negato dal browser', e));
  }, []);

  useEffect(() => {
    const clear = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      setKickAt(null);
    };

    const arm = () => {
      timer.current = setTimeout(() => {
        setKickAt(null);
        onViolationRef.current();
      }, graceMs);
      setKickAt(Date.now() + graceMs);
    };

    const onChange = () => {
      const fs = document.fullscreenElement !== null;
      setIsFullscreen(fs);
      if (!active) return;
      if (fs) clear();
      else arm();
    };

    // Stato iniziale: se la guard è attiva e siamo già fuori dal fullscreen,
    // l'evento `fullscreenchange` non scatterà mai → bisogna armare subito.
    if (active && document.fullscreenElement === null) {
      arm();
    }

    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      clear();
    };
  }, [active, graceMs]);

  return { isFullscreen, enter, kickAt };
}
