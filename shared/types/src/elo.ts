export const ELO_K = 32;

/**
 * Default ELO for new players.
 * Must match the default value of `UserStats.eloCurrent` in shared/prisma/schema.prisma.
 */
export const ELO_DEFAULT = 500;

/** Score values for each match result. */
const SCORE: Record<"win" | "draw" | "loss", number> = {
	win: 1,
	draw: 0.5,
	loss: 0,
};

/**
 * Expected score for a player against a single opponent.
 * E = 1 / (1 + 10^((opponentElo - playerElo) / 400))
 */
function expectedScore(playerElo: number, opponentElo: number): number {
	return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

/**
 * Calculates ELO delta for a player against a single opponent.
 * Used for 1v1 preview and as the base for multi-opponent calculations.
 *
 * @param playerElo - Current ELO of the player.
 * @param opponentElo - Current ELO of the opponent.
 * @param result - Match result from the player's perspective.
 * @param k - K-factor (default: ELO_K = 32).
 * @returns Rounded integer ELO delta (positive = gain, negative = loss).
 */
export function calculateEloDelta(
	playerElo: number,
	opponentElo: number,
	result: "win" | "draw" | "loss",
	k: number = ELO_K,
): number {
	const expected = expectedScore(playerElo, opponentElo);
	return Math.round(k * (SCORE[result] - expected));
}

/**
 * Calculates ELO delta for a player across multiple opponents (FFA / TEAM).
 * Each opponent contributes equally — the total delta is averaged.
 *
 * @param playerElo - Current ELO of the player.
 * @param opponents - List of opponents with their ELO and the player's result against them.
 * @param k - K-factor (default: ELO_K = 32).
 * @returns Rounded integer ELO delta.
 */
export function calculateEloMulti(
	playerElo: number,
	opponents: { elo: number; result: "win" | "draw" | "loss" }[],
	k: number = ELO_K,
): number {
	if (opponents.length === 0) return 0;

	const totalDelta = opponents.reduce((sum, { elo: oppElo, result }) => {
		const expected = expectedScore(playerElo, oppElo);
		return sum + k * (SCORE[result] - expected);
	}, 0);

	return Math.round(totalDelta / opponents.length);
}
