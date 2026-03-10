import { World } from "../core";
import { CharacherStats, Player, MatchType, CharacterName } from "@transcendence/types";
export declare const CHARACTER_DATA: Record<CharacterName, CharacherStats>;
export declare function getNewPlayer(world: World, socketId: string | undefined, spawnIndex: number, characterName: CharacterName, userDbId: string | null, entityId: string, isBot: boolean, playerIndex: number | undefined, matchType: MatchType): Player;
//# sourceMappingURL=player.factory.d.ts.map