import { create } from 'zustand';
import { GameStatePayload, GameOverPayload, MapEmitPayload } from '../types/game.types';

interface GameStore {
  isConnected: boolean;
  world: MapEmitPayload | null;
  gameState: GameStatePayload | null;
  gameOver: GameOverPayload | null;

  setIsConnected: (status: boolean) => void;
  setWorld: (world: MapEmitPayload) => void;
  setGameState: (newState: GameStatePayload) => void;
  setGameOver: (payload: GameOverPayload) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  isConnected: false,
  world: null,
  gameState: null,
  gameOver: null,

  setIsConnected: (status) => set({ isConnected: status }),
  setWorld: (world) => set({ world }),
  setGameState: (newState) => set({ gameState: newState }),
  setGameOver: (gameOver) => set({ gameOver }),
  resetGame: () => set({ world: null, gameState: null, gameOver: null }),
}));