import { Injectable } from '@nestjs/common';
import { GameWorld } from '../../game-interfaces';
import { Player } from '@transcendence/types'
import { Logger } from "@nestjs/common";
import { IAiStates } from './aiInterfaces/IAiStates';
import { WanderState } from './aiStates';

@Injectable()
export class AiService{
    private logger: Logger = new Logger(AiService.name);
    private botToState: Map<string, IAiStates> = new Map();
    constructor(){}

    public updateInput(bot: Player, gameWorld: GameWorld, allPlayers: Readonly<Map<string, Player>>, dt: number){

        if (!this.botToState.has(bot.entityId)){
            const initialState: IAiStates = new WanderState();
            initialState.onEnter(bot);
            this.botToState.set(bot.entityId, initialState);
        }

        const currentState: IAiStates | undefined = this.botToState.get(bot.entityId)
        if (currentState){
            const newState = currentState.update(bot, gameWorld, allPlayers, dt);
            if (newState){
                this.transitionTo(bot, currentState, newState);
            }
        }
    }

    private transitionTo(bot: Player, currentState: IAiStates, newState: IAiStates){
        currentState.onExit(bot);
        newState.onEnter(bot);
        this.botToState.set(bot.entityId, newState);
    }

    removeBot(botId: string){
        if (this.botToState.has(botId)){
            this.botToState.delete(botId);
        }
    }
}