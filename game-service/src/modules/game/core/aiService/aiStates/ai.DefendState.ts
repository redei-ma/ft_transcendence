import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { GameWorld } from '../../../game-interfaces';
import { Player } from '@transcendence/types'

export class DefendState implements IAiStates{
    logger: Logger;
    name: string;
    onEnter(bot: Player): void {
        throw new Error("Method not implemented.");
    }
    update(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {
        throw new Error("Method not implemented.");
    }
    onExit(bot: Player): void {
        throw new Error("Method not implemented.");
    }

}