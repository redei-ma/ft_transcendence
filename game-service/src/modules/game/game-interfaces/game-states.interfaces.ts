import { PlayerSnapshot, BulletSnapshot, WinnerData } from '@transcendence/types'

export interface GameStateEvents {
	eventName: "game-state";
	data: {
		players: PlayerSnapshot[] | undefined;
		bullets: BulletSnapshot[] | undefined;
	};
	time: number;
}

export interface GameEndEvents {
	eventName: "game-over";
	winnerData: WinnerData | undefined;
	time: number;
}
