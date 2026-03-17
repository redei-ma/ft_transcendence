import { Logger } from '@nestjs/common'
import { GameWorld } from '../../../game-interfaces';
import { Player } from '@transcendence/types'

export interface IAiStates{
    logger: Logger;
    
    name: string;

    onEnter(bot: Player): void;

    update(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined;

    onExit(bot: Player): void;
}