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
    () => document.fullscreenElement !== null // lazy initializer useState: eseguito una sola volta al mount — legge lo stato reale del DOM
  );
  const [kickAt, setKickAt] = useState<number | null>(null); // useState: epoch ms del kick futuro — causa re-render per aggiornare il countdown nella FullscreenGate
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null); // useRef: handle del timeout — clearTimeout non deve causare re-render
  const onViolationRef = useRef(onViolation); // useRef come "latest ref": cattura sempre la versione aggiornata della callback senza ri-registrare il listener
  onViolationRef.current = onViolation; // aggiornato a ogni render — il setTimeout leggerà sempre la callback corrente

  const enter = useCallback(() => { // useCallback con deps=[]: funzione stabile — il bottone "Entra" non causa re-render inutili dei figli
    if (document.fullscreenElement) {   // già a schermo intero → sincronizza e basta
      setIsFullscreen(true);
      return;
    }
    document.documentElement
      .requestFullscreen()
      .catch((e) => logger.warn('FullscreenGuard', 'Fullscreen negato dal browser', e));
  }, []);

  useEffect(() => { // deps=[active, graceMs]: si ri-registra solo se cambiano le condizioni della guard
    const clear = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; }
      setKickAt(null);
    };

    const arm = () => {
      timer.current = setTimeout(() => { // setTimeout: fuori da React — al termine chiama onViolationRef.current() (sempre aggiornato)
        setKickAt(null);
        onViolationRef.current();
      }, graceMs);
      setKickAt(Date.now() + graceMs); // setState: causa re-render di FullscreenGate per mostrare il countdown
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
