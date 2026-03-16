import { Injectable } from '@nestjs/common';
import { GameWorld } from '../../game-interfaces';
import { Player } from '@transcendence/types'
import { Logger } from "@nestjs/common";

@Injectable()
export class AiService{
    private logger: Logger = new Logger(AiService.name);
    constructor(){}

    public updateInput(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number){
    }
}