import { MapEmitPayload } from '../../types/game.types';
import { theme } from '../../configs/theme';
import HPBar from './components/HPBar';
import { CharacterName } from '@transcendence/types';
import { useGameStore } from '../../storage/gameStore';

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
  // Abbonamento chirurgico: ri-renderizza solo quando HP o stato death/disconnect cambia
  const playerHpData = useGameStore((state) =>
    state.gameState?.players.map(p => ({
      id: p.id,
      characterName: p.characterName,
      hp: p.hp,
      isDead: p.isDead,
      isDisconnected: p.isDisconnected,
      disconnectionTimer: p.disconnectionTimer,
      respawnTimer: p.respawnTimer,
      position: p.position,
    })) || []
  );

  const playersCount = playerHpData.length;

  return (
    <>
      {playerHpData.map((player) => (
        <HPBar
          key={player.id}
          characterName={player.characterName}
          currentHP={player.hp}
          maxHP={100}
          isDisconnected={player.isDisconnected}
          disconnectionTimer={player.disconnectionTimer}
          playerPosition={player.position}
        />
      ))}

      {playerHpData.map((player) => {
        if (!player.isDead) return null;
        return (
          <div
            key={`death-${player.id}`}
            style={{
              position: 'absolute',
              top: player.characterName === CharacterName.ZEUS ? '60px' : 'auto',
              bottom: player.characterName === CharacterName.ADE ? '60px' : 'auto',
              left: '20px',
              pointerEvents: 'none',
              zIndex: 1001,
              fontFamily: theme.fonts.mono,
            }}
          >
            <div style={{
              color: theme.colors.dead, fontSize: '20px', fontWeight: 'bold',
              textShadow: '2px 2px 6px rgba(0,0,0,1)',
              animation: 'pulse 1s infinite', marginBottom: '4px',
            }}>
              {player.characterName} DEAD
            </div>
            <div style={{
              color: theme.colors.afk, fontSize: '14px', fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,1)', textAlign: 'center',
            }}>
              Respawn in: {Math.ceil(5 - player.respawnTimer)}s
            </div>
          </div>
        );
      })}

      <div style={{
        position: 'absolute', top: 20, left: 20,
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