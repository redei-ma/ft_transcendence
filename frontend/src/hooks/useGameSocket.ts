import { useEffect, useState } from 'react';
import { socketService } from '../services/socketServices';
import { GameEvents } from '../game/game.events';
import { PlayerSnapshot, BulletSnapshot, GameStatePayload, GameOverPayload, MapEmitPayload } from '../types/game.types';
import { log } from '../configs/logger';

interface UseGameSocketReturn {
  isConnected: boolean;
  world: MapEmitPayload | null;
  gameState: GameStatePayload | null;
  gameOver: GameOverPayload | null;
}

export function useGameSocket(): UseGameSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [world, setWorld] = useState<MapEmitPayload | null>(null);
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) {
      log.error('Socket not initialized');
      return;
    }

    log.net('Setting up socket listeners, socket id:', socket.id);

    const handleConnect = () => {
      log.net('Connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      log.net('Disconnected');
      setIsConnected(false);
    };

    const handleMapEmit = (data: any) => {
      log.game('Map received:', data);
      // Backend manda: { map: GameWorld, config: { playerRadius, playerSpeed } }
      setWorld(data);
    };

    const handleGameState = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;

      let players: PlayerSnapshot[] = [];
      let bullets: BulletSnapshot[] = [];

      if (payload.entities) {
        players = payload.entities.players || [];
        bullets = payload.entities.bullets || [];
      } else if (payload.data) {
        players = payload.data.players || [];
        bullets = payload.data.bullets || [];
      } else if (payload.players) {
        players = payload.players || [];
        bullets = payload.bullets || [];
      }
    
      // Normalizza characterName: array → stringa
      players = players.map(p => ({
        ...p,
        characterName: Array.isArray(p.characterName) ? p.characterName[0] : p.characterName,
      }));
    
      bullets = bullets.map(b => ({
        ...b,
        characterName: Array.isArray(b.characterName) ? b.characterName[0] : b.characterName,
      }));
    
      setGameState({ players, bullets, time: payload.time || 0 });
    };

    const handleGameOver = (payload: any) => {
      log.game('Game over:', payload);

      // Backend (PlayState) manda:
      // { entities: WinnerData, time: number }
      // dove WinnerData = { winnerTeam: number | null, winnerPlayersIds: string[] }
      const winnerData = payload.entities || payload.winnerData || undefined;

      setGameOver({
        winnerData,
        time: payload.time || 0,
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

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

  return { isConnected, world, gameState, gameOver };
}