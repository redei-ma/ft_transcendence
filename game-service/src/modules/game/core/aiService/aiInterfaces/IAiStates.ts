import { Logger } from '@nestjs/common'
import { Player } from '@transcendence/types'
import { World } from '../../game.world';

export interface IAiStates{
    logger: Logger;
    
    name: string;

    onEnter(bot: Player): void;

    update(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined;

    onExit(bot: Player): void;
}