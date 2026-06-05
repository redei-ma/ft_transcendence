import { MapEmitPayload } from '../../types/game.types';
import { theme } from '../../configs/theme';
import { CharacterName } from '@transcendence/types';
import { useGameStore } from '../../storage/gameStore';
import { GameConfig } from '@transcendence/types';

interface GameUIProps {
  character: string;
  isConnected: boolean;
  mapData: MapEmitPayload | null;
  maxPlayers: number;
  gameOver: any;
}

export default function GameUI({
  character,
  isConnected,
  mapData,
  maxPlayers,
  gameOver,
}: GameUIProps) {
  
  const players = useGameStore((state) => state.gameState?.players) || [];
  const playersCount = players.length;
  const gameTime = useGameStore((state) => state.gameState?.time) || 0;
  const remaining = Math.max(0, gameTime);
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return (
    <>
      {/* Timer */}
      <div style={{
        position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
        fontFamily: theme.fonts.heading, fontSize: '28px', fontWeight: 700,
        color: remaining <= 10 ? theme.colors.dead : theme.colors.gold,
        letterSpacing: '4px', zIndex: 100,
        textShadow: '0 0 10px rgba(0,0,0,0.8)',
        transition: 'color 0.3s',
      }}>
        {mins}:{secs.toString().padStart(2, '0')}
      </div>

      {/* riquadro di info sulla connessione */}
      <div style={{
        position: 'absolute', top: 20, right: 20, 
        color: theme.colors.textPrimary, fontFamily: theme.fonts.mono,
        fontSize: '13px', backgroundColor: theme.colors.bgPanel,
        padding: '14px', borderRadius: '8px',
        border: `1px solid ${theme.colors.border}`,
        minWidth: '220px', zIndex: 100,
      }}>
        <div style={{
          fontSize: '16px', fontWeight: 'bold',
          fontFamily: theme.fonts.heading, marginBottom: '10px',
          color: theme.colors.textPrimary,
        }}>CLASH OF OLYMPUS</div>
        <div style={{ color: isConnected ? theme.colors.hpHigh : theme.colors.afk, marginBottom: '4px' }}>
          Connection: {isConnected ? 'Connected' : 'Connecting...'}
        </div>
        <div style={{ color: mapData ? theme.colors.hpHigh : theme.colors.afk, marginBottom: '4px' }}>
          Map: {mapData ? 'Loaded' : 'Waiting...'}
        </div>
        <div style={{ marginBottom: '4px' }}>Players: {playersCount}/{maxPlayers}</div>
        {gameOver && (
          <div style={{ marginTop: '8px', color: theme.colors.dead, fontWeight: 'bold' }}>GAME OVER</div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}