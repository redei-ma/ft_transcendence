"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Engine = void 0;
const snapshot_factory_1 = require("../factories/snapshot.factory");
const types_1 = require("@transcendence/types");
class Engine {
    constructor(players, gameWorld, gameRules, playerManager, bulletManager, matchType, matchMode) {
        this.players = players;
        this.gameWorld = gameWorld;
        this.gameRules = gameRules;
        this.playerManager = playerManager;
        this.bulletManager = bulletManager;
        this.matchType = matchType;
        this.matchMode = matchMode;
        this.gameTimer = 0;
        this.playerEvents = [];
        this.bulletEvents = [];
        this.endEvents = [];
        this.stateEvents = [];
        this.endGameData = {
            mode: types_1.MatchMode.RANKED,
            type: types_1.MatchType.FFA,
            endReason: types_1.EndReason.KILLOUT,
            durationSeconds: 0.0,
            winningTeamId: -1,
            players: [],
        };
        this.endGameData.type = matchType;
        this.endGameData.mode = matchMode;
    }
    updateEvents(dt) {
        this.playerEvents.length = 0;
        this.bulletEvents.length = 0;
        this.stateEvents.length = 0;
        this.endEvents.length = 0;
        this.gameTimer += dt;
        if (this.gameTimer >= types_1.GameConfig.SERVER.MAX_GAME_DURATION) {
            this.handleGameOver(true);
            return [...this.stateEvents, ...this.endEvents];
        }
        this.playerManager.updateAllPlayers(this.players, this.gameWorld, dt);
        /* updating bullet logic */
        this.bulletManager.updateBullets(dt, this.gameWorld, this.players);
        /* creating snapshot for the bullets */
        this.gameWorld.bullets.forEach((bullet => {
            if (bullet.isActive)
                this.bulletEvents.push(snapshot_factory_1.Snapshot.toBulletSnapshot(bullet));
        }));
        /* creating snapshot for the players */
        this.players.forEach((player => {
            this.playerEvents.push(snapshot_factory_1.Snapshot.toPlayerSnapshot(player));
        }));
        this.pushGameEvents();
        this.handleGameOver(false);
        return [...this.stateEvents, ...this.endEvents];
    }
    /* Game Over handling */
    handleGameOver(overTime) {
        /* if there is a winner team, the game is over */
        let winnerTeam = null;
        winnerTeam = this.gameRules.checkWinner(Array.from(this.players.values()), overTime);
        if (winnerTeam !== null) {
            this.pushEndGameEvent(winnerTeam, overTime ? types_1.EndReason.TIMEOUT : types_1.EndReason.KILLOUT);
        }
        if (winnerTeam === null && overTime) {
            this.pushEndGameEvent(-1, overTime ? types_1.EndReason.TIMEOUT : types_1.EndReason.KILLOUT);
        }
        winnerTeam = this.gameRules.checkRemaningTeam(this.players.values());
        if (winnerTeam !== null) {
            this.pushEndGameEvent(winnerTeam, types_1.EndReason.RESIGNATION);
            return;
        }
    }
    /* Pushing methods */
    pushGameEvents() {
        this.stateEvents.push({
            eventName: 'game-state',
            data: {
                players: this.playerEvents,
                bullets: this.bulletEvents
            },
            time: this.gameTimer,
        });
    }
    pushEndGameEvent(winnerTeamId, reason) {
        let winnerPlayersIds = [];
        if (winnerTeamId !== -1)
            winnerPlayersIds = this.getPlayersByTeam(winnerTeamId).map(p => p.entityId);
        this.endEvents.push({
            eventName: 'game-over',
            winnerData: { winnerTeam: winnerTeamId, winnerPlayersIds: winnerPlayersIds },
            time: this.gameTimer,
        });
        this.fillEndGameData(winnerTeamId, reason);
    }
    fillEndGameData(winnerTeamId, reason) {
        this.endGameData.durationSeconds = this.gameTimer;
        this.endGameData.endReason = reason;
        for (const player of this.players.values()) {
            if (player.userDbId) {
                let userIdNumber = parseInt(player.userDbId);
                if (isNaN(userIdNumber)) {
                    continue;
                }
                this.endGameData.players.push({
                    userId: userIdNumber,
                    teamId: player.teamId,
                    characterName: player.characterName,
                    kills: player.kill,
                    deaths: player.deads,
                    clutchMasterUnlook: player.clutchMasterUnlook,
                });
            }
        }
        if (winnerTeamId === -1)
            winnerTeamId = null;
        this.endGameData.winningTeamId = winnerTeamId;
    }
    /* Getters */
    getPlayersByTeam(team) {
        return (Array.from(this.players.values()).filter(player => player.teamId === team));
    }
}
exports.Engine = Engine;
