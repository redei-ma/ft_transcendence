// AUTO-GENERATED — non modificare a mano
// Sorgente: shared/prisma/schema.prisma

export const FriendshipStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
} as const;

export type FriendshipStatus = typeof FriendshipStatus[keyof typeof FriendshipStatus];
