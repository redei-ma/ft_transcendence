// AUTO-GENERATED — do not edit manually
  // Source: shared/prisma/schema.prisma

  export const UserStatus = {
    ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  IN_GAME: 'IN_GAME'
  } as const;

  export type UserStatus = typeof UserStatus[keyof typeof UserStatus];
  