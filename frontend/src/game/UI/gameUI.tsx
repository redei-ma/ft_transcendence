
// GameUI: UI di debug/status.


import React from 'react';
import { MapData } from '../../types/game.types';

interface GameUIProps {
  character: string;
  isConnected: boolean;
  mapData: MapData | null;
  playersCount: number;
  maxPlayers: number;
  gameOver: { winnerId: string; winnerKills: number; loserKills: number } | null;
}

export default function GameUI({
  character,
  isConnected,
  mapData,
  playersCount,
  maxPlayers,
  gameOver,
}: GameUIProps) {
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        🎮 CLASH OF OLYMPUS
      </div>

      {/* Connection Status */}
      <div style={styles.row}>
        🔗 Connection: {isConnected ? (
          <span style={styles.success}>✅ Connected</span>
        ) : (
          <span style={styles.warning}>⏳ Connecting...</span>
        )}
      </div>

      {/* Map Status */}
      <div style={styles.row}>
        🗺️ Map: {mapData ? (
          <span style={styles.success}>✅ {mapData.meta.name}</span>
        ) : (
          <span style={styles.warning}>⏳ Waiting for 2nd player...</span>
        )}
      </div>

      {/* Players Count */}
      <div style={styles.row}>
        👥 Players: {playersCount}/{maxPlayers}
      </div>

      {/* Game Over */}
      {gameOver && (
        <div style={styles.gameOver}>
          <div style={styles.gameOverTitle}>
            🏆 GAME OVER
          </div>
          <div style={styles.gameOverText}>
            Winner: {gameOver.winnerId}
          </div>
          <div style={styles.gameOverText}>
            Score: {gameOver.winnerKills} - {gameOver.loserKills}
          </div>
        </div>
      )}
    </div>
  );
}

// Styles (inline per semplicità, puoi spostare in CSS)
const styles = {
  container: {
    position: 'absolute' as const,
    top: 10,
    left: 10,
    background: 'rgba(0, 0, 0, 0.85)',
    color: 'white',
    padding: '16px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.8',
    minWidth: '250px',
  },
  header: {
    marginBottom: '12px',
    fontWeight: 'bold',
    fontSize: '16px',
    borderBottom: '1px solid #444',
    paddingBottom: '8px',
  },
  row: {
    marginBottom: '6px',
  },
  success: {
    color: '#0f0',
  },
  warning: {
    color: '#f80',
  },
  gameOver: {
    marginTop: '12px',
    padding: '12px',
    background: '#00ff0022',
    border: '2px solid #0f0',
    borderRadius: '4px',
  },
  gameOverTitle: {
    color: '#0f0',
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '4px',
  },
  gameOverText: {
    fontSize: '12px',
  },
};