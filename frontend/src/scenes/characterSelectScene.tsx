import { socketService } from '../services/socketServices';
import { GameEvents } from '../game/game.events';

interface CharacterSelectSceneProps {
  onCharacterSelect: (character: 'Zeus' | 'Ade') => void;
}

export default function CharacterSelectScene({ onCharacterSelect }: CharacterSelectSceneProps) {
  
  const handleSelect = (character: 'Zeus' | 'Ade') => {
    console.log('🎮 Selected:', character);
    socketService.emit(GameEvents.JOIN_LOBBY, { characterName: character });
    onCharacterSelect(character);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
    }}>
      {/* ZEUS - Metà Sinistra */}
      <div
        onClick={() => handleSelect('Zeus')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundImage: 'url(/zeus-bg.jpg)', // ⭐ Tua immagine Zeus
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s',
          borderRight: '2px solid rgba(255,255,255,0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        <h1 style={{
          fontSize: '80px',
          color: 'gold',
          textShadow: '0 0 20px gold, 0 5px 10px black',
          fontFamily: 'serif',
        }}>
          ⚡ ZEUS
        </h1>
      </div>

      {/* ADE - Metà Destra */}
      <div
        onClick={() => handleSelect('Ade')}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundImage: 'url(/ade-bg.jpg)', // ⭐ Tua immagine Ade
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        <h1 style={{
          fontSize: '80px',
          color: '#ff4444',
          textShadow: '0 0 20px #ff4444, 0 5px 10px black',
          fontFamily: 'serif',
        }}>
          🔥 ADE
        </h1>
      </div>
    </div>
  );
}