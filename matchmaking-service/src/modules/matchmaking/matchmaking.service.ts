import { Inject, Injectable, Logger } from "@nestjs/common"; // Importato Logger per il debugging professionale
import { JoinQueueDto } from "./dto/join-queue.dto"; // struttura del dato che ricevo
import Redis from "ioredis"; // client Redis per interagire col database
import { InjectRedis } from "@nestjs-modules/ioredis"; // modulo per iniettare il client Redis
import { ClientProxy } from "@nestjs/microservices";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";
import { CharacterName, MatchType, MatchMode } from "@transcendence/types";
import { UserStatus } from "@transcendence/types";
import { GameEvents } from "@transcendence/types";

const INGAME = "ingame";
const INQUEUE = "searching";
const LOBBY = "lobby";

const MATCHMAKING_LUA = `
  local queue_key = KEYS[1]
  local user_id = ARGV[1]
  local min_rank = tonumber(ARGV[2])
  local max_rank = tonumber(ARGV[3])

  -- 1. Cerchiamo potenziali avversari nel range (prendiamo i primi 10 per sicurezza)
  local potential_opponents = redis.call('ZRANGEBYSCORE', queue_key, min_rank, max_rank, 'LIMIT', 0, 10)
  local opponent_id = nil

  for i, id in ipairs(potential_opponents) do
      -- Dobbiamo assicurarci che l'ID non sia quello dell'utente attuale
      if tostring(id) ~= tostring(user_id) then
          opponent_id = id
          break
      end
  end

  -- 2. Se trovato, li rimuoviamo entrambi ATOMICAMENTE dalla Sorted Set
  if opponent_id then
      redis.call('ZREM', queue_key, user_id)
      redis.call('ZREM', queue_key, opponent_id)
      return tostring(opponent_id)
  end

  return nil
  `;

// Interfaccia di supporto per uniformare il salvataggio su Redis
interface RedisUserStatus {
	state: string;
	userDbId?: number;
	rank?: number | null;
	characterName?: any;
	isAiPlayer?: boolean;
	socketId?: string;
	matchMode?: MatchMode;
	matchType?: MatchType;
	matchId?: string;
	opponentId?: number;
	searchStartedAt?: number;
	lastChallengeSent?: string;
	updatedAt?: number;
	playerIndex?: number;
	[key: string]: any; // supporto in previsone di eventuali nuovi campi dinamici
}

@Injectable()
export class MatchmakingService {
	private readonly logger = new Logger(MatchmakingService.name);
	client: any;

	constructor(
		@InjectRedis() private readonly redis: Redis,
		private readonly eventEmitter: EventEmitter2,
		private readonly httpService: HttpService,
	) {}

	/* ---------------------------------------------------------------------------------------------------------------- */

	/**
	 * Helper per uniformare il salvataggio dello stato utente su Redis 
	 * e sincronizzarlo con il database persistente.
	 */
	private async setUserStatus(
		userId: string | number,
		statusData: Partial<RedisUserStatus> & { state: string },
		ttlSeconds: number
	): Promise<void> {
		const payload = {
			...statusData,
			updatedAt: Date.now(), 
		};
		await this.redis.set(`status:${userId}`, JSON.stringify(payload), "EX", ttlSeconds);

		/*try {
			if (String(userId).includes("ai_bot") || String(userId).includes("guest_")) {
				return;
			}
			let dbStatus: UserStatus;
			
			if (statusData.state === INGAME) {
				dbStatus = UserStatus.IN_GAME;
			} else if (statusData.state === INQUEUE) {
				dbStatus = UserStatus.IN_QUEUE;
			} else {
				dbStatus = UserStatus.ONLINE; 
			}

			const url = `http://user-service:3001/internal/users/${userId}/status`; 
			
			await firstValueFrom(
				this.httpService.patch(url, { status: dbStatus })
			);
			
		} catch (error) {
			this.logger.error(
				`[Sync DB] Impossibile aggiornare lo stato DB per l'utente ${userId}: ${error.message}`
			);
		}*/
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	private async fetchPlayerElo(
		userId: string | number,
	): Promise<number | null> {
		try {
			const url = `http://user-service:3001/internal/users/${userId}/elo`;
			const response = await firstValueFrom(
				this.httpService.get<{ eloCurrent: number }>(url),
			);
			this.logger.log(
				`ELO fetched for player ${userId}: ${response.data.eloCurrent}`,
			);
			return response.data.eloCurrent;
		} catch (error) {
			this.logger.error(
				`Error fetching ELO for player ${userId}:`,
				error.response?.data,
			);
			return null;
		}
	}

	/* ---------------------------------------------------------------------------------------------------------------- */
	
	async processQueue(userId : number, player: JoinQueueDto) {
		const QUEUE_KEY = "matchmaking_queue";
		const USER_STATUS_KEY = `status:${userId}`;

		this.logger.log(
			`[ProcessQueue] Ricevuta richiesta per utente: ${userId}`,
		);

		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		const statusData = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;
		const rank = await this.fetchPlayerElo(userId);

		if (rank === null) {
			this.logger.error(
				`[ProcessQueue] Impossibile recuperare ELO per: ${userId}`,
			);
			return { status: "ERROR_FETCHING_RANK" };
		}

		if (statusData && statusData.state === INGAME) {
			if (statusData.matchMode !== player.matchMode) {
				return {
					status: "ERROR_ALREADY_IN_ANOTHER_GAME",
					message: `Sei già in una partita ${statusData.matchMode}. Finiscila prima di cercarne una Ranked.`,
				};
			}
			this.logger.log(
				`[ProcessQueue] Utente ${userId} già in game. Invio istruzioni di riconnessione...`,
			);

			const opponentStatusRaw = await this.redis.get(
				`status:${statusData.opponentId}`,
			);

			if (!opponentStatusRaw) {
				this.logger.warn(
					`[ProcessQueue] Opponent ${statusData.opponentId} non trovato. Match scaduto.`,
				);
				await this.setUserStatus(userId, {
					state: LOBBY,
					rank,
					characterName: player.characterName,
					isAiPlayer: player.isAiPlayer,
					socketId: player.socketId,
				}, 3600);
				return { status: "MATCH_EXPIRED_BACK_TO_LOBBY" };
			}

			const opponentData = JSON.parse(opponentStatusRaw);

			// Aggiornamento stato con riconnessione
			await this.setUserStatus(userId, {
				...statusData,
				socketId: player.socketId,
			}, 420);

			const matchId = statusData.matchId;
			const matchFoundData = { status: "MATCH_FOUND", matchId: matchId };

			if (player.socketId) {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: player.socketId,
					data: matchFoundData,
				});
				this.logger.log(
					`[ProcessQueue] Notifica RECONNECTED inviata al socket ${player.socketId}`,
				);
			}

			if (opponentData.socketId) {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: opponentData.socketId,
					data: matchFoundData,
				});
			}

			return { status: "RECONNECTED_TO_GAME", matchId: matchId };
		}

		this.logger.log(
			`[ProcessQueue] Aggiunta utente ${userId} alla coda (Rank: ${rank})`,
		);

		await this.redis.zadd(QUEUE_KEY, rank, String(userId));

		await this.setUserStatus(userId, {
			state: INQUEUE,
			userDbId: userId,
			rank: rank,
			characterName: player.characterName,
			isAiPlayer: !!player.isAiPlayer,
			socketId: player.socketId || undefined,
			matchMode: player.matchMode,
			matchType: player.matchType,
			searchStartedAt: Date.now(),
		}, 600);

		return { status: "SEARCHING_QUEUED" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	@Cron("*/5 * * * * *")
	async handleMatchmakingWorker() {
		const QUEUE_KEY = "matchmaking_queue";

		const playersInQueue = await this.redis.zrange(QUEUE_KEY, 0, -1);
		if (playersInQueue.length < 2) return;

		this.logger.log(
			`[Worker] --- Inizio Ciclo Scansione --- (${playersInQueue.length} in coda)`,
		);

		for (const userId of playersInQueue) {
			const userStatusRaw = await this.redis.get(`status:${userId}`);

			if (!userStatusRaw) {
				await this.redis.zrem(QUEUE_KEY, userId);
				continue;
			}

			const player = JSON.parse(userStatusRaw);

			if (player.state !== INQUEUE) {
				await this.redis.zrem(QUEUE_KEY, userId);
				continue;
			}

			const secondsWaiting = Math.floor(
				(Date.now() - (player.searchStartedAt || Date.now())) / 1000,
			);
			const dynamicTolerance = 100 + secondsWaiting * 10;

			const minR = Number(player.rank) - dynamicTolerance;
			const maxR = Number(player.rank) + dynamicTolerance;

			try {
				// Esecuzione atomica dello script Lua
				const opponentId = await this.redis.eval(
					MATCHMAKING_LUA,
					1,
					QUEUE_KEY,
					String(userId),
					String(minR),
					String(maxR),
				);

				if (opponentId) {
					this.logger.log(
						`[Worker] Match trovato via Lua: ${userId} VS ${opponentId}`,
					);
					const opponentStatusRaw = await this.redis.get(
						`status:${opponentId}`,
					);

					if (opponentStatusRaw) {
						const opponentData = JSON.parse(opponentStatusRaw);
						await this.executeMatchCreation(player, opponentData);
					}
				}
			} catch (luaError) {
				this.logger.error(
					`[Worker] Errore script Lua: ${luaError.message}`,
				);
			}
		}
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	private async executeMatchCreation(p1: any, p2: any) {
		const matchId = `match_${Math.random().toString(36).substring(7)}`;

		// Recupero ID sicuro (cercando sia userDbId che id nell'oggetto)
		const id1 = (p1.userDbId || p1.id);
		const id2 = (p2.userDbId || p2.id);

		this.logger.log(
			`[ExecuteMatch] Creazione match ${matchId} tra ${id1} e ${id2}`,
		);

		const p1Char = String(
			Array.isArray(p1.characterName)
				? p1.characterName[0]
				: p1.characterName,
		);
		const p2Char = String(
			Array.isArray(p2.characterName)
				? p2.characterName[0]
				: p2.characterName,
		);

		const part1 = {
			characterName: p1Char,
			userDbId: Number(id1),
			isAiPlayer: !!p1.isAiPlayer,
			rank: p1.rank,
			socketId: p1.socketId,
			playerIndex: 0,
		};

		const part2 = {
			characterName: p2Char,
			userDbId:  Number(id2),
			isAiPlayer: !!p2.isAiPlayer,
			rank: p2.rank,
			socketId: p2.socketId,
			playerIndex: 1,
		};

		// Aggiornamento stati INGAME su Redis
		const commonData = {
			state: INGAME,
			matchId,
			matchMode: p1.matchMode,
			matchType: p1.matchType,
		};

		await this.setUserStatus(id1, { ...commonData, ...part1, opponentId: id2 }, 420);
		await this.setUserStatus(id2, { ...commonData, ...part2, opponentId: id1 }, 420);
		
		await this.redis.set(
			`match_players:${matchId}`,
			`${id1},${id2}`,
			"EX",
			3600,
		);

		// Payload filtrato per il Game Server
		const payload = {
			gameId: String(matchId),
			playersData: [
				{
					characterName: part1.characterName,
					userDbId: String(part1.userDbId),
					isAiPlayer: part1.isAiPlayer,
				},
				{
					characterName: part2.characterName,
					userDbId: String(part2.userDbId),
					isAiPlayer: part2.isAiPlayer,
				},
			],
			matchType: p1.matchType,
			matchMode: p1.matchMode,
		};

		try {
			this.logger.log(
				`[ExecuteMatch] Invio payload: ${JSON.stringify(payload)}`,
			);
			await firstValueFrom(
				this.httpService.post(
					"http://game-service:3000/matchmaking/create-match",
					payload,
				),
			);
		} catch (error) {
			this.logger.error(
				`[ExecuteMatch] Errore Game Server: ${error.message}`,
			);
		}

		// Notifica Socket
		const matchFoundData = { status: "MATCH_FOUND", matchId };
		if (part1.socketId)
			this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
				socketId: part1.socketId,
				data: matchFoundData,
			});
		if (part2.socketId)
			this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
				socketId: part2.socketId,
				data: matchFoundData,
			});
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async processUnrankedQueue(userId: number, player: JoinQueueDto) {
		const QUEUE_KEY = "matchmaking_queue_unranked";
		const USER_STATUS_KEY = `status:${userId}`;

		const playerChar = Array.isArray(player.characterName)
			? player.characterName[0]
			: player.characterName;

		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		const statusData = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;

		const rank = await this.fetchPlayerElo(userId);
		if (rank === null) {
			return { status: "ERROR_FETCHING_RANK" };
		}

		if (statusData && statusData.state === INGAME) {
			if (statusData.matchMode !== player.matchMode) {
				return {
					status: "ERROR_ALREADY_IN_ANOTHER_GAME",
					message: `Sei già in una partita ${statusData.matchMode}.`,
				};
			}
			this.logger.log(
				`[Unranked] Utente ${userId} già in game. Invio istruzioni riconnessione.`,
			);

			const opponentStatusRaw = await this.redis.get(
				`status:${statusData.opponentId}`,
			);
			if (!opponentStatusRaw) {
				this.logger.warn(
					`[Unranked] Match scaduto per ${userId}. Torno in lobby.`,
				);
				await this.setUserStatus(userId, {
					state: LOBBY,
					rank: rank,
					characterName: playerChar,
					isAiPlayer: player.isAiPlayer,
					socketId: player.socketId,
				}, 3600);
				return { status: "MATCH_EXPIRED_BACK_TO_LOBBY" };
			}

			await this.setUserStatus(userId, {
				...statusData,
				characterName: playerChar,
				socketId: player.socketId,
			}, 420);

			const matchFoundData = {
				status: "MATCH_FOUND",
				matchId: statusData.matchId,
			};
			if (player.socketId) {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: player.socketId,
					data: matchFoundData,
				});
			}

			return {
				status: "RECONNECTED_TO_GAME",
				matchId: statusData.matchId,
			};
		}

		if (statusData && statusData.state === INQUEUE) {
			await this.setUserStatus(userId, {
				...statusData,
				characterName: playerChar,
				socketId: player.socketId,
			}, 600);
		} else {
			const timestamp = Date.now();
			await this.redis.zadd(QUEUE_KEY, timestamp, String(userId));

			await this.setUserStatus(userId, {
				state: INQUEUE,
				userDbId: userId,
				rank: rank,
				characterName: playerChar,
				isAiPlayer: player.isAiPlayer,
				socketId: player.socketId,
			}, 600);
		}

		const potentialOpponents = await this.redis.zrange(QUEUE_KEY, 0, 1);
		const opponents = potentialOpponents.filter(
			(id) => id !== String(userId),
		);

		if (opponents.length >= 1) {
			const opponentId = opponents[0];
			const opponentStatusRaw = await this.redis.get(
				`status:${opponentId}`,
			);

			if (!opponentStatusRaw) {
				await this.redis.zrem(QUEUE_KEY, opponentId);
				return { status: "SEARCHING_UNRANKED_MATCH" };
			}

			const opponentData = JSON.parse(opponentStatusRaw);
			const opponentChar = Array.isArray(opponentData.characterName)
				? opponentData.characterName[0]
				: opponentData.characterName;

			await this.redis.zrem(QUEUE_KEY, String(userId), String(opponentId));
			const matchId = `match_unranked_${Math.random().toString(36).substring(7)}`;

			const participant1 = {
				characterName: playerChar,
				userDbId: Number(userId),
				isAiPlayer: false,
				rank: rank,
				socketId: player.socketId,
				playerIndex: 0,
			};

			const participant2 = {
				characterName: opponentChar,
				userDbId: Number(opponentId),
				isAiPlayer: !!opponentData.isAiPlayer,
				rank: opponentData.rank,
				socketId: opponentData.socketId,
				playerIndex: 1,
			};

			await this.setUserStatus(userId, {
				state: INGAME,
				...participant1,
				opponentId: Number(opponentId),
				matchId,
				matchMode: player.matchMode,
				matchType: player.matchType,
			}, 420);

			await this.setUserStatus(opponentId, {
				state: INGAME,
				...participant2,
				opponentId: userId,
				matchId,
				matchMode: player.matchMode,
				matchType: player.matchType,
			}, 420);

			await this.redis.set(
				`match_players:${matchId}`,
				`${userId},${opponentId}`,
				"EX",
				3600,
			);

			const payload = {
				gameId: matchId,
				playersData: [participant1, participant2].map(
					({ characterName, userDbId, isAiPlayer }) => ({
						characterName: String(characterName),
						userDbId: String(userDbId),
						isAiPlayer: !!isAiPlayer,
					}),
				),
				matchType: player.matchType,
				matchMode: player.matchMode,
			};

			try {
				await firstValueFrom(
					this.httpService.post(
						"http://game-service:3000/matchmaking/create-match",
						payload,
					),
				);
				this.logger.log(
					`[Unranked] Match creato con successo: ${matchId}`,
				);
			} catch (error) {
				this.logger.error(
					"Errore creazione match Unranked:",
					error.response?.data || error.message,
				);
			}

			const matchFoundData = { status: "MATCH_FOUND", matchId };

			if (opponentData.socketId) {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: opponentData.socketId,
					data: matchFoundData,
				});
			}
			if (player.socketId) {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: player.socketId,
					data: matchFoundData,
				});
			}
			return matchFoundData;
		}

		return { status: "SEARCHING_UNRANKED_MATCH" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async startLocalMatch(userId: number, data: any) {
		const USER_STATUS_KEY_1 = `status:${userId}`;

		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY_1);
		const statusData = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;

		if (
			statusData &&
			statusData.state === INGAME &&
			statusData.matchMode === MatchMode.LOCAL
		) {
			if (statusData.matchMode !== MatchMode.LOCAL) {
				return {
					status: "ERROR_ALREADY_IN_ANOTHER_GAME",
					message: `Sei già in una partita ${statusData.matchMode}. Finiscila prima di avviarne una Locale.`,
				};
			}
			this.logger.log(
				`[LocalMatch] Utente ${userId} già in sessione locale. Riconnessione al match: ${statusData.matchId}`,
			);

			await this.setUserStatus(userId, {
				...statusData,
				socketId: data.socketId,
			}, 3600);

			if (data.socketId) {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: data.socketId,
					data: {
						status: "MATCH_FOUND",
						matchId: statusData.matchId,
					},
				});
			}
			return {
				status: "RECONNECTED_TO_LOCAL_MATCH",
				matchId: statusData.matchId,
			};
		}

		await this.redis.zrem("matchmaking_queue", String(userId));
		const matchId = `local_${Math.random().toString(36).substring(7)}`;

		const charP1 = Array.isArray(data.characterName)
			? data.characterName[0]
			: data.characterName;
		const charP2 = Array.isArray(data.characterName)
			? data.characterName[1]
			: "default";

		const participant1 = {
			characterName: charP1,
			userDbId: userId,
			isAiPlayer: false,
			rank: data.rank,
			socketId: data.socketId,
			playerIndex: 0,
		};

		const participant2 = {
			characterName: charP2,
			userDbId: userId,
			isAiPlayer: false,
			rank: data.rank,
			socketId: data.socketId,
			playerIndex: 1,
		};

		await this.setUserStatus(userId, {
			state: INGAME,
			matchMode: MatchMode.LOCAL,
			matchType: MatchType.FFA,
			matchId: matchId,
			opponentId: -1,
			...participant1,
		}, 3600);

		const payload = {
			gameId: matchId,
			playersData: [participant1, participant2].map(
				({ characterName, userDbId, isAiPlayer }) => ({
					characterName,
					userDbId: String(userDbId),
					isAiPlayer,
				}),
			),
			matchType: MatchType.FFA,
			matchMode: MatchMode.LOCAL,
		};

		try {
			const url = "http://game-service:3000/matchmaking/create-match";
			await firstValueFrom(this.httpService.post(url, payload));
			this.logger.log(
				`[LocalMatch] Sessione locale inviata al Game Server per ${userId}`,
			);
		} catch (error) {
			this.logger.error(
				"Errore invio match locale al Game Server:",
				error.response?.data || error.message,
			);
		}

		await this.redis.set(
			`match_players:${matchId}`,
			`${userId}, guest_${userId}`,
			"EX",
			3600,
		);

		if (data.socketId) {
			this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
				socketId: data.socketId,
				data: { status: "MATCH_FOUND", matchId: matchId },
			});
		}

		return { status: "LOCAL_MATCH_STARTED", userDbId: userId };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async startAiMatch(userId: number, data: any) {
		this.logger.log(
			`[Logic] inizio procedura match vs AI per ${userId} con rank ${data.rank} e personaggio ${data.characterName}`,
		);
		const USER_STATUS_KEY = `status:${userId}`;

		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		const statusData = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;
		this.logger.log(`[Logic] Matchmode attuale: ${statusData?.matchMode}`);
		if (
			statusData &&
			statusData.state === INGAME &&
			statusData.matchMode === MatchMode.AI
		) {
			this.logger.log(
				`[AiMatch] Utente ${userId} già in sessione AI. Riconnessione al match: ${statusData.matchId}`,
			);

			await this.setUserStatus(userId, {
				...statusData,
				socketId: data.socketId,
			}, 3600);

			const matchFoundData = {
				status: "MATCH_FOUND",
				matchId: statusData.matchId,
			};
			if (data.socketId) {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: data.socketId,
					data: matchFoundData,
				});
			}
			return {
				status: "RECONNECTED_TO_AI_MATCH",
				matchId: statusData.matchId,
			};
		} else if (statusData && statusData.state === INGAME) {
			this.logger.log(
				`[AiMatch] Utente ${userId} già in partita ${statusData.matchMode}. Non posso avviare un match AI.`,
			);
			return {
				status: "ERROR_ALREADY_IN_ANOTHER_GAME",
				message: `Sei già in una partita ${statusData.matchMode}. Finiscila prima di avviarne una contro l'AI.`,
			};
		}

		await this.redis.zrem("matchmaking_queue", String(userId));
		await this.redis.zrem("matchmaking_queue_unranked", String(userId));

		const matchId = `ai_${Math.random().toString(36).substring(7)}`;

		const charP1 = Array.isArray(data.characterName)
			? data.characterName[0]
			: data.characterName;
		const charP2 =
			Array.isArray(data.characterName) && data.characterName[1]
				? data.characterName[1]
				: "CPU_Bot";

		const participant1 = {
			characterName: charP1,
			userDbId: userId,
			isAiPlayer: false,
			rank: data.rank,
			socketId: data.socketId,
			playerIndex: 0,
		};

		const participant2 = {
			characterName: charP2,
			userDbId: `ai_bot_${matchId}`, 
			isAiPlayer: true, 
			rank: data.rank,
			socketId: null,
			playerIndex: 1,
		};

		await this.setUserStatus(userId, {
			state: INGAME,
			matchMode: MatchMode.AI,
			matchType: MatchType.FFA,
			matchId: matchId,
			opponentId: -1,
			...participant1,
		}, 3600);

		const payload = {
			gameId: matchId,
			playersData: [participant1, participant2].map(
				({ characterName, userDbId, isAiPlayer }) => ({
					characterName: String(characterName),
					userDbId: String(userDbId),
					isAiPlayer: !!isAiPlayer,
				}),
			),
			matchType: MatchType.FFA,
			matchMode: MatchMode.AI,
		};

		try {
			const url = "http://game-service:3000/matchmaking/create-match";
			await firstValueFrom(this.httpService.post(url, payload));
			this.logger.log(
				`[AiMatch] Match vs AI inviato al Game Server per ${userId}`,
			);
		} catch (error) {
			this.logger.error(
				"Errore invio match AI al Game Server:",
				error.response?.data || error.message,
			);
		}

		await this.redis.set(
			`match_players:${matchId}`,
			`${userId},ai_bot_${matchId}`,
			"EX",
			3600,
		);

		const matchFoundData = { status: "MATCH_FOUND", matchId: matchId };
		if (data.socketId) {
			this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
				socketId: data.socketId,
				data: matchFoundData,
			});
		}

		this.logger.log(
			`[AiMatch] Utente ${userId} vs AI avviato. GameId: ${matchId}`,
		);
		return { status: "AI_MATCH_STARTED", matchId };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async getQueueCount() {
		const QUEUE_KEY = "matchmaking_queue";
		const count = await this.redis.zcard(QUEUE_KEY); 
		return { queueCount: count };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async leaveQueue(userId: number, player: JoinQueueDto) {

    const resultRanked = await this.redis.zrem("matchmaking_queue", String(userId));
    const resultUnranked = await this.redis.zrem("matchmaking_queue_unranked", String(userId));

    const wasInQueue = resultRanked === 1 || resultUnranked === 1;

    const rank = await this.fetchPlayerElo(userId);
    if (rank === null) {
        return { status: "ERROR_FETCHING_RANK" };
    }

    await this.setUserStatus(userId, {
        state: LOBBY,
        rank: rank,
        characterName: player.characterName,
        isAiPlayer: player.isAiPlayer,
        socketId: player.socketId || undefined,
    }, 3600);

    if (wasInQueue) {
        this.logger.log(`[Logic] Utente ${userId} rimosso dalla coda (Ranked o Unranked) e riportato in lobby.`);
        return { status: "LEFT_QUEUE_SUCCESS", userDbId: userId };
    } else {
        this.logger.log(`[Logic] Tentativo di rimozione: ${userId} non era in nessuna coda, ma lo stato è stato resettato a lobby.`);
        return { status: "NOT_IN_QUEUE", userDbId: userId };
    }
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async finalizeMatch(matchId: string) {
		const playersRaw = await this.redis.get(`match_players:${matchId}`);
		this.logger.log(
			`[Cleanup] Avvio finalizzazione globale per MatchID: ${matchId}`,
		);

		if (!playersRaw) {
			this.logger.log(
				`[Cleanup] Match ${matchId} non trovato o già rimosso.`,
			);
			return { status: "MATCH_ALREADY_CLEANED" };
		}

		const playerIds = playersRaw.split(",");

		for (const userId of playerIds) {
			if (userId.includes("ai_bot") || userId.includes("guest_")) {
				this.logger.log(
					`[Cleanup] Skippato ripristino per entità non-user: ${userId}`,
				);
				continue;
			}

			const USER_STATUS_KEY = `status:${userId}`;
			const dataRaw = await this.redis.get(USER_STATUS_KEY);

			if (dataRaw) {
				const userData = JSON.parse(dataRaw);

				await this.setUserStatus(String(userId), {
					state: LOBBY,
					userDbId: Number(userId),
					characterName: userData.characterName,
					isAiPlayer: false,
					rank: userData.rank,
					socketId: userData.socketId || undefined,
				}, 3600);

				this.logger.log(
					`[Cleanup] Utente ${userId} riportato in lobby.`,
				);
			}
		}

		await this.redis.del(`match_players:${matchId}`);

		this.logger.log(`[Cleanup] Match ${matchId} rimosso con successo.`);
		return { status: "MATCH_FINALIZED", matchId };
	}
}