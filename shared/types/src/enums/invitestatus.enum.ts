// AUTO-GENERATED — non modificare a mano
// Sorgente: shared/prisma/schema.prisma

export const InviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
} as const;

export type InviteStatus = typeof InviteStatus[keyof typeof InviteStatus];
