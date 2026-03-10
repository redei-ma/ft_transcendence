import { Player } from "@transcendence/types";
export declare class GameRules {
    checkWinner(players: Player[], overTime: boolean): number | null;
    checkRemaningTeam(players: Iterable<Player>): number | null;
    shouldGameStart(players: Map<string, Player>, maxPlayers: any): boolean;
    getSpawnPoint(players: Map<string, Player>, maxPlayers: number): number;
}
//# sourceMappingURL=game.rules.d.ts.map