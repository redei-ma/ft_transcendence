// AUTO-GENERATED — non modificare a mano
// Sorgente: shared/prisma/schema.prisma

export const NotificationType = {
  FRIEND_REQ: 'FRIEND_REQ',
  FRIEND_ACCEPTED: 'FRIEND_ACCEPTED',
  GAME_INVITE: 'GAME_INVITE',
  ACHV_UNLOCKED: 'ACHV_UNLOCKED'
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];
