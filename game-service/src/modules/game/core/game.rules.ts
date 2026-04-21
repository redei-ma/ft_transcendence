import { GameConfig, Player } from "@transcendence/types";

function updateTeamKills(teamToKills: Map<number, number>, player: Player){
	let kills = teamToKills.get(player.teamId) || 0;
	let result = kills + player.kill;
	teamToKills.set(player.teamId, result);
	return (teamToKills);
}

export class GameRules{

	checkWinner(players: Player[], overTime: boolean): number | null{
		let teamToKills: Map<number, number> = players.reduce(updateTeamKills, new Map());

		if (overTime){
			let winnerTeam: number | null = null;
			let killRecord: number = -1;
			for (const [team, kill] of teamToKills){
				if (killRecord < kill){
					winnerTeam = team;
					killRecord = kill;
				}
			}
			return winnerTeam;
		}
		else{
			for (const [team, kill] of teamToKills){
				if (kill >= GameConfig.SERVER.MAX_GAME_KILLS){
					return team;
				}
			}
		}
		return (null);
	}

	checkRemaningTeam(players: Iterable<Player>): number | null{
		let activeTeams: Set<number> = new Set();

		for (const player of players){
			activeTeams.add(player.teamId);
		}

		if (activeTeams.size === 1){
			return activeTeams.values().next().value;
		}

		return null;
	}

	shouldGameStart(players: Map<string, Player>, maxPlayers): boolean{
		return (players.size === maxPlayers);
	}

	getSpawnPoint(players: Map<string, Player>, maxPlayers: number): number{
		if (players.size === 0) return 0;

		let isTaken: boolean = false;

		for(let i: number = 0; i < maxPlayers; i++){
			isTaken = false;
			for (const player of players.values()){
				if (i == player.spawnIndex){
					isTaken = true;
					break ;
				}
			}
			if (!isTaken)
				return i;
		}
		return -1;
	}
}