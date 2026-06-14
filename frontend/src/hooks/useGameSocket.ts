import { useEffect } from 'react';
import { socketService } from '../services/socketServices';
import { PlayerSnapshot, BulletSnapshot, FinalData, GameEvents } from '@transcendence/types';
import { MapEmitPayload } from '../types/game.types';
import { logger } from '../configs/logger';
import { useGameStore } from '../storage/gameStore';

interface RawGameStatePayload {
  players?: PlayerSnapshot[];
  bullets?: BulletSnapshot[];
  entities?: { players?: PlayerSnapshot[]; bullets?: BulletSnapshot[] };
  data?: { players?: PlayerSnapshot[]; bullets?: BulletSnapshot[] };
  time?: number;
}

interface RawGameOverPayload {
  entities?: FinalData;
  finalData?: FinalData;
  time?: number;
}

// Hook montato una sola volta in Game.tsx: registra i listener socket e li collega allo store Zustand.
// Tutti gli aggiornamenti avvengono tramite useGameStore.getState() — senza passare per setState React.
export function useGameSocket() {
  useEffect(() => { // dipendenze []: eseguito una sola volta al mount; la funzione di return è il cleanup al dismount
    const socket = socketService.getSocket();
    if (!socket) {
      logger.error('GameSocket', 'Socket not initialized');
      return;
    }

    logger.debug('GameSocket', 'Setting up socket listeners, socket id:', socket.id);

    // Aggiorna isConnected nello store senza triggerare re-render React
    const handleConnect = () => useGameStore.getState().setIsConnected(true);
    const handleDisconnect = () => useGameStore.getState().setIsConnected(false);

    const handleMapEmit = (data: MapEmitPayload) => {
      logger.debug('GameSocket', 'Map received:', data);
      useGameStore.getState().setWorld(data);
    };

    const handleGameState = (payload: RawGameStatePayload) => {
      if (!payload || typeof payload !== 'object') return;

      // Supporta diverse shape del payload mandate dal backend (robustezza)
      let players: PlayerSnapshot[] = payload.entities?.players || payload.data?.players || payload.players || [];
      let bullets: BulletSnapshot[] = payload.entities?.bullets || payload.data?.bullets || payload.bullets || [];

      // Normalizza characterName: il backend può mandarlo come array mono-elemento
      players = players.map(p => ({ ...p, characterName: Array.isArray(p.characterName) ? p.characterName[0] : p.characterName }));
      bullets = bullets.map(b => ({ ...b, characterName: Array.isArray(b.characterName) ? b.characterName[0] : b.characterName }));

      // Snapshot di gioco: i componenti con useFrame leggono da getState() ogni frame
      useGameStore.getState().setGameState({ players, bullets, time: payload.time || 0 });
    };

    const handleGameOver = (payload: RawGameOverPayload) => {
      logger.debug('GameSocket', 'Game over payload:', JSON.stringify(payload));
      // Disabilita la reconnection: la partita è terminata, non vogliamo riconnetterci
      const sock = socketService.getSocket();
      if (sock) sock.io.opts.reconnection = false;
      const finalData = payload.entities || payload.finalData || undefined;
      useGameStore.getState().setGameOver({ finalData, time: payload.time || 0 });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) handleConnect();

    socketService.on(GameEvents.MAP_EMIT, handleMapEmit);
    socketService.on(GameEvents.GAME_STATE, handleGameState);
    socketService.on(GameEvents.GAME_OVER, handleGameOver);

    return () => { // cleanup useEffect: chiamato al dismount — rimuove tutti i listener per evitare memory leak
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socketService.off(GameEvents.MAP_EMIT, handleMapEmit);
      socketService.off(GameEvents.GAME_STATE, handleGameState);
      socketService.off(GameEvents.GAME_OVER, handleGameOver);
    };
  }, []);
}