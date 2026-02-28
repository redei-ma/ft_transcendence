export const theme = {
  colors: {
    // Base
    bg:             '#091720',
    bgDark:         '#060e14',
    bgPanel:        '#0d1a25',

    // Gold palette — unico colore per tutto
    gold:           '#e8d5a3',
    goldDark:       '#3e341a',
    goldBright:     '#f0e0b0',
    goldDim:        'rgba(200, 170, 100, 0.6)',
    goldMuted:      'rgba(200, 170, 100, 0.4)',
    goldSubtle:     'rgba(200, 170, 100, 0.2)',
    goldGlow:       'rgba(200, 170, 100, 0.3)',

    // Borders
    border:         'rgba(200, 170, 100, 0.15)',
    borderHover:    'rgba(200, 170, 100, 0.5)',

    // HP bar
    hpHigh:         '#a8c66c',
    hpMid:          '#e8a838',
    hpLow:          '#d44',

    // Status
    dead:           '#d44',
    afk:            '#e8a838',

    // Legacy — manteniamo per i componenti 3D (aure, proiettili)
    zeus:           '#4a9eff',
    zeusGlow:       'rgba(74, 158, 255, 0.3)',
    ade:            '#ff4a3a',
    adeGlow:        'rgba(255, 74, 58, 0.3)',

    textPrimary:    '#e8d5a3',
    textSecondary:  'rgba(200, 170, 100, 0.6)',
    textMuted:      'rgba(200, 170, 100, 0.35)',
  },
  fonts: {
    heading: '"Cinzel", "Palatino", serif',
    mono: '"JetBrains Mono", "Fira Code", monospace',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },
};