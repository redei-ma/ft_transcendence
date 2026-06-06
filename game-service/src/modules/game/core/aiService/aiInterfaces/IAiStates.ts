import { Player } from '@transcendence/types'
import { World } from '../../game.world';

export interface IAiStates{
    name: string;

    onEnter(bot: Player, gameWorld?: World): void;

    update(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined;

    onExit(bot: Player): void;
}