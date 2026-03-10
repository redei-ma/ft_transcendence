"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRules = void 0;
const types_1 = require("@transcendence/types");
function updateTeamKills(teamToKills, player) {
    let kills = teamToKills.get(player.teamId) || 0;
    let result = kills + player.kill;
    teamToKills.set(player.teamId, result);
    return (teamToKills);
}
class GameRules {
    checkWinner(players, overTime) {
        let teamToKills = players.reduce(updateTeamKills, new Map());
        if (overTime) {
            let winnerTeam = null;
            let killRecord = -1;
            for (const [team, kill] of teamToKills) {
                if (killRecord < kill) {
                    winnerTeam = team;
                    killRecord = kill;
                }
            }
            return winnerTeam;
        }
        else {
            for (const [team, kill] of teamToKills) {
                if (kill >= types_1.GameConfig.SERVER.MAX_GAME_KILLS) {
                    return team;
                }
            }
        }
        return (null);
    }
    checkRemaningTeam(players) {
        let activeTeams = new Set();
        for (const player of players) {
            activeTeams.add(player.teamId);
        }
        if (activeTeams.size === 1) {
            console.log('winner team reached');
            return activeTeams.values().next().value;
        }
        return null;
    }
    shouldGameStart(players, maxPlayers) {
        return (players.size === maxPlayers);
    }
    getSpawnPoint(players, maxPlayers) {
        if (players.size === 0)
            return 0;
        let isTaken = false;
        for (let i = 0; i < maxPlayers; i++) {
            isTaken = false;
            for (const player of players.values()) {
                if (i == player.spawnIndex) {
                    isTaken = true;
                    break;
                }
            }
            if (!isTaken)
                return i;
        }
        return -1;
    }
}
exports.GameRules = GameRules;
