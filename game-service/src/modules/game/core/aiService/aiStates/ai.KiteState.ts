import { IAiStates } from "../aiInterfaces/IAiStates";
import { Logger } from "@nestjs/common";
import { Player, Vector, GameConfig } from '@transcendence/types'
import { executePathMovement, tacticsHelper } from "../ai.tactics.helper";
import { CHARACTER_DATA } from "src/modules/game/factories";
import { SpellAttackState } from "./ai.SpellAttackState";
import { World } from "../../game.world";
import { PathFinder } from "../pathFinder/ai.PathFinder";

export class KiteState implements IAiStates{
    logger: Logger = new Logger(KiteState.name);
    name: string = 'KiteState';
    private murderer: Player;
    private moveInput: Vector = new Vector(0, 0);
    private recicleVector: Vector = new Vector(0, 0);
    private path: Vector[] = [];
    private pathTimer: number = 0.0;

    constructor(murdererPlayer: Player){
        this.murderer = murdererPlayer;
    }

    onEnter(bot: Player): void {
    }

    update(bot: Player, gameWorld: World, allPlayers: Readonly<Map<string, Player>>, dt: number): IAiStates | undefined {
        const recommendedState: IAiStates = tacticsHelper(bot, this.murderer);
        if (recommendedState.name !== this.name){
            this.pathTimer = 0;
            return recommendedState;
        }

        const dx: number = bot.position.x - this.murderer.position.x;
        const dz: number = bot.position.z - this.murderer.position.z;
        const distanceSq: number = (dx * dx) + (dz * dz);
        const spellDistanceSq = (GameConfig.COMBAT.BULLET_LIFE * bot.spellAttackspeed) * (GameConfig.COMBAT.BULLET_LIFE * bot.spellAttackspeed);

        const stats = CHARACTER_DATA[bot.characterName];

        if (bot.spellAttackCooldown >= stats.COOLDOWN_SPELL_ATTACK && distanceSq <= spellDistanceSq){
            this.pathTimer = 0;
            return (new SpellAttackState(this.murderer));
        }

        this.pathTimer += dt;
        if (this.pathTimer >= GameConfig.BOT.MAX_PATH_TIME || this.path.length === 0){
            this.findEscapePosition(bot, gameWorld);
            this.pathTimer = 0;
        }
        executePathMovement(bot, this.path, gameWorld);
        
        return (undefined);
    }

    private findEscapePosition(bot: Player, gameWorld: World): void{
        const dx: number = bot.position.x - this.murderer.position.x;
        const dz: number = bot.position.z - this.murderer.position.z;
        
        this.recicleVector.set(dx, dz);
        this.recicleVector.normalize();

        const targetX: number = bot.position.x + this.recicleVector.x * GameConfig.BOT.SECURITY_RANGE;
        const targetZ: number = bot.position.z + this.recicleVector.z * GameConfig.BOT.SECURITY_RANGE;

        const gridX: number = Math.floor(targetX / GameConfig.MAP.CELL_SIZE);
        const gridZ: number = Math.floor(targetZ / GameConfig.MAP.CELL_SIZE);
        if (this.isInGrid(gridX, gridZ, gameWorld)){
            const index = gridX + (gridZ * gameWorld.gridWidth);
            if (gameWorld.grid[index] === 0){
                this.recicleVector.set(targetX, targetZ);
                this.path = PathFinder.findPath(bot.position, this.recicleVector, gameWorld);
                return ;
            }
        }
        
        this.recicleVector.set(dx, dz);
        this.recicleVector.normalize();
        this.findAlternativeEscapePosition(bot, gameWorld)
    }

    private findAlternativeEscapePosition(bot: Player, gameWorld: World): void{
        const rightDirX: number = bot.position.x + -this.recicleVector.z * GameConfig.BOT.SECURITY_RANGE;
        const rightDirZ: number = bot.position.z + this.recicleVector.x * GameConfig.BOT.SECURITY_RANGE;

        const leftDirX: number = bot.position.x + this.recicleVector.z * GameConfig.BOT.SECURITY_RANGE;
        const leftDirZ: number = bot.position.z + -this.recicleVector.x * GameConfig.BOT.SECURITY_RANGE;

        const righGridX: number = Math.floor(rightDirX / GameConfig.MAP.CELL_SIZE);
        const righGridZ: number = Math.floor(rightDirZ / GameConfig.MAP.CELL_SIZE);
        const rightIndex: number = righGridX + (righGridZ * gameWorld.gridWidth);

        const leftGridX: number = Math.floor(leftDirX / GameConfig.MAP.CELL_SIZE);
        const leftGridZ: number = Math.floor(leftDirZ / GameConfig.MAP.CELL_SIZE);
        const leftIndex: number = leftGridX + (leftGridZ * gameWorld.gridWidth);
        
        const isRightGridPositionValid: boolean = this.isInGrid(righGridX, righGridZ, gameWorld);
        const isLeftGridPositionValid: boolean = this.isInGrid(leftGridX, leftGridZ, gameWorld);

        let isRightDirValid: boolean = this.isAValidDirection(isRightGridPositionValid, rightIndex, gameWorld);
        let isLeftDirValid: boolean = this.isAValidDirection(isLeftGridPositionValid, leftIndex, gameWorld);

        if (this.chooseDirection(isRightDirValid, isLeftDirValid, rightDirX, rightDirZ, leftDirX, leftDirZ)){
            this.path = PathFinder.findPath(bot.position, this.recicleVector, gameWorld);
        }
        else{
            this.path.length = 0;
        }
    }

    private chooseDirection(isRightDirValid: boolean, isLeftDirValid: boolean,
        rightDirX: number, rightDirZ: number, leftDirX: number, leftDirZ: number){
        if (isRightDirValid && isLeftDirValid){
            const result = Math.random();
            if (result > 0.5){
                this.recicleVector.set(rightDirX, rightDirZ);
            }
            else{
                this.recicleVector.set(leftDirX, leftDirZ);
            } 
        }
        else if (isRightDirValid){
            this.recicleVector.set(rightDirX, rightDirZ);
        }
        else if (isLeftDirValid){
            this.recicleVector.set(leftDirX, leftDirZ);    
        }
        else{
            return false;
        }
        return true;
    }

    private isAValidDirection(isGridValid: boolean, index: number, gameWorld: World): boolean{
        if(isGridValid){
            if (gameWorld.grid[index] === 0)
                return true;
        }
        return false;
    }

    private isInGrid(gridX: number, gridZ: number, gameWorld: World): boolean{
        return (gridX >= 0 && gridX < gameWorld.gridWidth && gridZ >= 0 && gridZ < gameWorld.gridDepth)
    }

    onExit(bot: Player): void {
    }
    
}