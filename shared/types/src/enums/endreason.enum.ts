// AUTO-GENERATED — do not edit manually
// Source: shared/prisma/schema.prisma

export const EndReason = {
	TIMEOUT: 'TIMEOUT',
	RESIGNATION: 'RESIGNATION',
	KILLOUT: 'KILLOUT',
} as const;

export type EndReason = typeof EndReason[keyof typeof EndReason];
