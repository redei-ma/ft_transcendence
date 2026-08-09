import { EloPreview } from '../../../types/game.types';
import { theme } from '../../../configs/theme';

interface EloWidgetProps {
  preview: EloPreview;
  myDbId: number;
  showOutcome: boolean;
}

export function EloWidget({ preview, myDbId, showOutcome }: EloWidgetProps) {
  const isPlayer1 = preview.player1.id === myDbId;
  const me = isPlayer1 ? preview.player1 : preview.player2;
  const opponent = isPlayer1 ? preview.player2 : preview.player1;
  const myOutcome = isPlayer1 ? preview.preview.player1 : preview.preview.player2;

  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 500,
      backgroundColor: 'rgba(10, 15, 25, 0.85)',
      border: `1px solid ${theme.colors.goldSubtle}`,
      borderRadius: '4px',
      padding: '10px 16px',
      backdropFilter: 'blur(4px)',
      fontFamily: theme.fonts.mono,
      minWidth: '240px',
      pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ color: '#66B2FF', fontSize: '10px', letterSpacing: '1px', marginBottom: '2px' }}>
            {me.username}
          </div>
          <div style={{ color: theme.colors.goldBright, fontSize: '18px', fontWeight: 'bold', fontFamily: theme.fonts.heading }}>
            {me.eloCurrent}
          </div>
        </div>
        <div style={{ color: theme.colors.textMuted, fontSize: '10px', letterSpacing: '3px', paddingTop: '6px' }}>
          VS
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#FF6666', fontSize: '10px', letterSpacing: '1px', marginBottom: '2px' }}>
            {opponent.username}
          </div>
          <div style={{ color: theme.colors.goldBright, fontSize: '18px', fontWeight: 'bold', fontFamily: theme.fonts.heading }}>
            {opponent.eloCurrent}
          </div>
        </div>
      </div>

      {showOutcome && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: '6px',
          fontSize: '10px',
          letterSpacing: '1px',
        }}>
          <span style={{ color: theme.colors.zeus }}>{fmt(myOutcome.win)} WIN</span>
          <span style={{ color: theme.colors.textMuted }}>{fmt(myOutcome.draw)} DRAW</span>
          <span style={{ color: theme.colors.dead }}>{fmt(myOutcome.loss)} LOSS</span>
        </div>
      )}
    </div>
  );
}
