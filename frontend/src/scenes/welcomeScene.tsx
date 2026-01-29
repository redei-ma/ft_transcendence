interface WelcomeSceneProps {
  onStart: () => void;
}

export default function WelcomeScene({ onStart }: WelcomeSceneProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundImage: 'url(/welcome-bg.jpg)', // ⭐ Tua immagine/GIF
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <button
        onClick={onStart}
        style={{
          padding: '30px 60px',
          fontSize: '32px',
          fontWeight: 'bold',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '4px solid white',
          color: 'white',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '3px',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 0 30px rgba(255,255,255,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Inizia a Giocare
      </button>
    </div>
  );
}