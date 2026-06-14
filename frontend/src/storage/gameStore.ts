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

// Store Zustand globale: unica fonte di verità per lo stato di gioco.
// I socket (useGameSocket) scrivono qui tramite getState().setXxx() — senza passare per React.
// I componenti leggono con useGameStore() per i re-render o con useGameStore.getState() dentro useFrame
// per accessi per-frame ad alta frequenza che non devono triggerare re-render.
export const useGameStore = create<GameStore>((set) => ({ // create: factory Zustand — set notifica tutti i subscriber registrati con useGameStore()
  isConnected: false,
  world: null,
  gameState: null,
  gameOver: null,

  setIsConnected: (status) => set({ isConnected: status }), // set({...}): merge parziale, non sostituisce l'intero state
  setWorld: (world) => set({ world }),
  setGameState: (newState) => set({ gameState: newState }), // chiamato ~60fps dai socket — i componenti con selettore su gameState si ri-renderizzano
  setGameOver: (gameOver) => set({ gameOver }),
  // Chiamato a quit/play-again: azzera tutti i dati di partita
  resetGame: () => set({ world: null, gameState: null, gameOver: null }),
}));

declare global { interface Window { gameStore: typeof useGameStore; } }
// Esposto su window per ispezione da console in dev
if (typeof window !== 'undefined') window.gameStore = useGameStore;