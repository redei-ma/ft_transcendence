export const AURA_CONFIG = {
  zeus: {
    characterName: 'Zeus' as const,

    // Archi elettrici
    lightning: {
      boltCount: 7,           // Quanti fulmini attivi
      segmentsPerBolt: 8,     // Punti per fulmine
      radius: 3,            // Distanza dal corpo
      jitter: 0.4,            // Quanto si deformano ogni frame
      refreshRate: 0.05,      // Secondi tra un aggiornamento e l'altro
    },

    // Particelle scintilla
    sparks: {
      count: 100,
      size: 0.03,
      speed: 3.0,
      spread: 2.0,
    },

    sphere: {
      baseRadius: 3,
      attackRadius: 5,
    },

    colors: {
      core: 0x00bfff,
      highlight: 0xffffff,
      bolt: 0x88ddff,
    },

    rotation: {
      idle: 1.8,
      attack: 5.0,
    },
  },

  ade: {
    characterName: 'Ade' as const,

    // Fiamme
    flames: {
      count: 150,
      size: 0.15,
      riseSpeed: 2.5,        // Velocità salita
      spread: 3,           // Raggio di spawn
      maxHeight: 3.0,        // Altezza massima prima di dissolversi
    },

    // Braci (particelle piccole che volano via)
    embers: {
      count: 40,
      size: 0.04,
      speed: 2.5,
      spread: 2.2,
    },

    sphere: {
      baseRadius: 3,
      attackRadius: 5,
    },

    colors: {
      core: 0xff4500,
      mid: 0xff8c00,
      tip: 0xffd700,
      ember: 0xff2200,
    },

    rotation: {
      idle: 0.8,
      attack: 3.0,
    },
  },

  spell: {
    convergenceTime: 0.2,
    projectileSpeed: 15,
    beamRadius: 0.3,
    projectileRadius: 0.6,
  },
} as const;

export type ZeusAuraConfig = typeof AURA_CONFIG.zeus;
export type AdeAuraConfig = typeof AURA_CONFIG.ade;