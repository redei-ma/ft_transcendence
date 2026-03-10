import { MatchMode, MatchType, CharacterName, EndReason } from "@transcendence/types";
export interface MatchResult {
    mode: MatchMode;
    type: MatchType;
    durationSeconds: number;
    endReason: EndReason;
    winningTeamId: number | null;
    players: PlayerResult[];
}
export interface PlayerResult {
    userId: number | null;
    teamId: number;
    characterName: CharacterName;
    kills: number;
    deaths: number;
    clutchMasterUnlook: boolean;
}
//# sourceMappingURL=match-result.interface.d.ts.map