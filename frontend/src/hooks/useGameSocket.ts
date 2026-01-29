/**
 * Hook React per gestire la connessione WebSocket al backend.
 * 
 * RESPONSABILITÀ:
 * - Connette al server quando il component monta
 * - Ascolta eventi dal server (MAP_EMIT, GAME_STATE, GAME_OVER)
 * - Salva i dati ricevuti in React state
 * - Disconnette quando il component viene smontato
 * 
 * RITORNA:
 * - isConnected: boolean (sei connesso al server?)
 * - mapData: MapData | null (mappa ricevuta dal server)
 * - gameState: array di PlayerSnapshot (stato corrente gioco)
 * - gameOver: dati fine partita (null se in corso)
 */

import { useEffect, useState } from 'react';
import { socketService } from '../services/socketServices';
import { GameEvents } from '../game/game.events';
import { MapData, PlayerSnapshot, BulletSnapshot } from '../types/game.types';

// -------------------- INTERFACCE --------------------


// Struttura dello stato di gioco ricevuto dal server.
// Giovanni manda un array misto di player e proiettili,
// Io lo separo per tipo.

export interface GameStatePayload {
  timestamp: number
  players: PlayerSnapshot[];
  bullets: BulletSnapshot[];
}


// Dati fine partita.

interface GameOverPayload {
  winnerId: string;        // ID del vincitore
  winnerKills: number;     // Kill del vincitore
  loserKills: number;      // Kill del perdente
}


//Cosa ritorna questo hook.

interface UseGameSocketReturn {
  isConnected: boolean;
  mapData: MapData | null;
  gameState: GameStatePayload | null;
  gameOver: GameOverPayload | null;
}

// ------------------------------ HOOK ------------------------------

export function useGameSocket(serverUrl: string): UseGameSocketReturn {
  
  // ------------------------------ STATE ------------------------------
  // Ogni useState crea una variabile + funzione per cambiarla.
  // Quando cambi il valore → React ri-renderizza il component.
  
  const [isConnected, setIsConnected] = useState(false);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);

  // -------------------- EFFECT: Setup WebSocket --------------------
  // Questo useEffect viene eseguito 1 volta quando il component monta.
  // Le dipendenze [serverUrl] dicono: "se serverUrl cambia, ri-esegui".
  
  useEffect(() => {
    console.log('🔌 Connecting to:', serverUrl);

    // Connetti al server
    const socket = socketService.connect(serverUrl);

    // -------------------- HANDLER FUNCTIONS --------------------
    // Queste funzioni vengono chiamate quando arrivano eventi dal server.
    
    
    //Chiamato quando la connessione WebSocket è stabilita.
    
    const handleConnect = () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
};

    
    //Chiamato quando perdi la connessione.
    
    const handleDisconnect = () => {
      console.log(' WebSocket disconnected');
      setIsConnected(false);
    };

    
    //Chiamato quando il server manda la mappa (1 volta, all'inizio).
    //Questo succede quando il 2° player entra e la partita inizia.
    
    const handleMapEmit = (data: MapData) => {
      console.log('  - MAP_EMIT received');
      console.log('  - Map name:', data.meta.name);
      console.log('  - Walls count:', data.walls.length);
      
      setMapData(data); // Salva mappa → trigger re-render → useEffect in Game.tsx
    };

    
     // Chiamato 60 volte al secondo con lo stato aggiornato del gioco.
     // Giovanni manda un array misto: [{type:'player',...}, {type:'player',...}]
    
    const handleGameState = (data: any) => {
      // Verifica che sia un array
      if (!Array.isArray(data)) {
        console.warn(' GAME_STATE non è un array:', data);
        return;
      }

      // Separa player e proiettili per tipo
      const players = data.filter((entity: any) => entity.type === 'player');
      const bullets = data.filter((entity: any) => entity.type === 'projectile');

      // Aggiorna state
      setGameState({
        timestamp: Date.now(),
        players,
        bullets,
      });
    };
    
    //Chiamato quando la partita finisce.
    
    const handleGameOver = (data: GameOverPayload) => {
      console.log('  - GAME_OVER!');
      console.log('  - Winner:', data.winnerId);
      console.log('  - Winner kills:', data.winnerKills);
      
      setGameOver(data);
    };

    // -------------------- REGISTRA LISTENER --------------------
    // Associa gli handler agli eventi.
    // NOTA: eventi built-in di Socket.io (connect, disconnect) vanno su 'socket'.
    // Eventi custom del gioco vanno su 'socketService'.
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    socketService.on(GameEvents.MAP_EMIT, handleMapEmit);
    socketService.on(GameEvents.GAME_STATE, handleGameState);
    socketService.on(GameEvents.GAME_OVER, handleGameOver);

    // ------------------------- CLEANUP -------------------------
    // Questa funzione viene chiamata quando:
    // 1. Il component viene rimosso (unmount)
    // 2. serverUrl cambia (prima di ri-eseguire l'effect)
    //
    // È FONDAMENTALE per evitare memory leak (listener duplicati).
    
    return () => {
      console.log('🧹 Cleaning up WebSocket listeners');
      
      // Rimuovi TUTTI i listener
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socketService.off(GameEvents.MAP_EMIT, handleMapEmit);
      socketService.off(GameEvents.GAME_STATE, handleGameState);
      socketService.off(GameEvents.GAME_OVER, handleGameOver);
      
      // Disconnetti
      socketService.disconnect();
    };
    
  }, [serverUrl]); // Dipendenze: ri-esegui se serverUrl cambia

  // Ritorna i dati al component che usa questo hook.
  return {
    isConnected,
    mapData,
    gameState,
    gameOver,
  };
}