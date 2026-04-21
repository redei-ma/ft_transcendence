import { Injectable } from '@nestjs/common';
import { Player, Bullet } from '@transcendence/types'
import { Logger } from "@nestjs/common";
import { IAiStates } from './aiInterfaces/IAiStates';
import { DefendState, WanderState } from './aiStates';
import { threatDetector } from './ai.tactics.helper';
import { World } from '../game.world';

@Injectable()
export class AiService{
    private logger: Logger = new Logger(AiService.name);
    private botToState: Map<string, IAiStates> = new Map();
    constructor(){}

    public updateInput(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number){

        if (!this.botToState.has(bot.entityId)){
            const initialState: IAiStates = new WanderState();
            initialState.onEnter(bot);
            this.botToState.set(bot.entityId, initialState);
        }

        const currentState: IAiStates | undefined = this.botToState.get(bot.entityId);
        const threat: Player | Bullet | undefined = threatDetector(bot, allPlayers, gameWorld);
        if (threat && currentState?.name !== 'DefendState'){
            this.transitionTo(bot, currentState, new DefendState(threat), gameWorld);
            return ;
        }

        if (currentState){
            const newState = currentState.update(bot, gameWorld, allPlayers, dt);
            if (newState){
                this.transitionTo(bot, currentState, newState, gameWorld);
            }
        }
    }

    private transitionTo(bot: Player, currentState: IAiStates | undefined, newState: IAiStates, gameWorld: World){
        if (currentState)
            currentState.onExit(bot);
        newState.onEnter(bot, gameWorld);
        this.botToState.set(bot.entityId, newState);
    }

    removeBot(botId: string){
        if (this.botToState.has(botId)){
            this.botToState.delete(botId);
        }
    }
}