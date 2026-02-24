// AUTO-GENERATED — non modificare a mano
// Sorgente: shared/prisma/schema.prisma

export const MatchMode = {
  RANKED: 'RANKED',
  UNRANKED: 'UNRANKED',
  LOCAL: 'LOCAL',
  AI: 'AI'
} as const;

export type MatchMode = typeof MatchMode[keyof typeof MatchMode];
