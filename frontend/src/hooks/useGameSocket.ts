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

export function useGameSocket() {
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) {
      logger.error('GameSocket', 'Socket not initialized');
      return;
    }

    logger.debug('GameSocket', 'Setting up socket listeners, socket id:', socket.id);

    const handleConnect = () => useGameStore.getState().setIsConnected(true);
    const handleDisconnect = () => useGameStore.getState().setIsConnected(false);

    const handleMapEmit = (data: MapEmitPayload) => {
      logger.debug('GameSocket', 'Map received:', data);
      useGameStore.getState().setWorld(data);
    };

    const handleGameState = (payload: RawGameStatePayload) => {
      if (!payload || typeof payload !== 'object') return;

      let players: PlayerSnapshot[] = payload.entities?.players || payload.data?.players || payload.players || [];
      let bullets: BulletSnapshot[] = payload.entities?.bullets || payload.data?.bullets || payload.bullets || [];

      // Normalizza characterName
      players = players.map(p => ({ ...p, characterName: Array.isArray(p.characterName) ? p.characterName[0] : p.characterName }));
      bullets = bullets.map(b => ({ ...b, characterName: Array.isArray(b.characterName) ? b.characterName[0] : b.characterName }));

      useGameStore.getState().setGameState({ players, bullets, time: payload.time || 0 });
    };

    const handleGameOver = (payload: RawGameOverPayload) => {
      logger.debug('GameSocket', 'Game over payload:', JSON.stringify(payload));
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

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socketService.off(GameEvents.MAP_EMIT, handleMapEmit);
      socketService.off(GameEvents.GAME_STATE, handleGameState);
      socketService.off(GameEvents.GAME_OVER, handleGameOver);
    };
  }, []);
}