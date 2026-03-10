import { GameRules } from "./game.rules";
import { World } from "./game.world";
import { PlayerManager } from "../managers/playerManager/player.manager";
import { BulletManager } from "../managers/bullet.manager";
import { MatchMode, MatchType, Player, GameEndEvents, GameStateEvents } from "@transcendence/types";
import { MatchResult } from "src/types/match-result.interface";
export declare class Engine {
    private readonly players;
    private readonly gameWorld;
    private readonly gameRules;
    private readonly playerManager;
    private readonly bulletManager;
    private readonly matchType;
    private readonly matchMode;
    private gameTimer;
    private playerEvents;
    private bulletEvents;
    private endEvents;
    private stateEvents;
    endGameData: MatchResult;
    constructor(players: Map<string, Player>, gameWorld: World, gameRules: GameRules, playerManager: PlayerManager, bulletManager: BulletManager, matchType: MatchType, matchMode: MatchMode);
    updateEvents(dt: number): (GameStateEvents | GameEndEvents)[];
    handleGameOver(overTime: boolean): void;
    private pushGameEvents;
    private pushEndGameEvent;
    private fillEndGameData;
    private getPlayersByTeam;
}
//# sourceMappingURL=game.engine.d.ts.map