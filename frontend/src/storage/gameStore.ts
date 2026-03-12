import {create} from 'zustand';
import {GameStatePayload} from '../types/game.types';

interface GameStore {
    gameState: GameStatePayload | null;
    setGameState: (newState: GameStatePayload) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  setGameState: (newState) => set({ gameState: newState }), 
}));