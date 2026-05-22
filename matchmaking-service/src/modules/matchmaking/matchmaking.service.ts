import { Injectable, Logger } from "@nestjs/common";
import { JoinQueueDto } from "./dto/join-queue.dto";
import Redis from "ioredis";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";
import { CharacterName, MatchType, MatchMode, GameEvents, UserStatus } from "@transcendence/types";

const INGAME = "ingame";
const INQUEUE = "searching";
const LOBBY = "lobby";

const MATCHMAKING_LUA = `
  local queue_key = KEYS[1]
  local user_id = ARGV[1]
  local min_rank = tonumber(ARGV[2])
  local max_rank = tonumber(ARGV[3])

  local potential_opponents = redis.call('ZRANGEBYSCORE', queue_key, min_rank, max_rank, 'LIMIT', 0, 10)
  local opponent_id = nil

  for i, id in ipairs(potential_opponents) do
      -- Dobbiamo assicurarci che l'ID non sia quello dell'utente attuale
      if tostring(id) ~= tostring(user_id) then
          opponent_id = id
          break
      end
  end

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

	constructor(
		@InjectRedis() private readonly redis: Redis,
		private readonly eventEmitter: EventEmitter2,
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

		try {
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

			await fetch(url, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: dbStatus }),
			});
		} catch (error) {
			this.logger.error(
				`[Sync DB] Impossibile aggiornare lo stato DB per l'utente ${userId}: ${error.message}`
			);
		}
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	private async fetchPlayerElo(
		userId: string | number,
	): Promise<number | null> {
		try {
			const url = `http://user-service:3001/internal/users/${userId}/elo`;
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const data = await response.json() as { eloCurrent: number };
			this.logger.log(`ELO fetched for player ${userId}: ${data.eloCurrent}`);
			return data.eloCurrent;
		} catch (error) {
			this.logger.error(`Error fetching ELO for player ${userId}:`, error.message);
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
					message: `Sei già in una partita (modalità: ${statusData.matchMode}). Termina la partita in corso prima di avviarne un'altra.`,
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

		await this.redis.zrem("matchmaking_queue_unranked", String(userId));
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
					} else {
						this.logger.warn(
							`[Worker] Avversario ${opponentId} sparito (stato non trovato). Rimetto ${userId} in coda.`
						);
						await this.redis.zadd(QUEUE_KEY, player.rank, String(userId));
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

		await this.setUserStatus(id1, { ...commonData, ...part1, opponentId: Number(id2) }, 420);
		await this.setUserStatus(id2, { ...commonData, ...part2, opponentId: Number(id1) }, 420);
		
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
					userDbId: part1.userDbId,
					isAiPlayer: part1.isAiPlayer,
				},
				{
					characterName: part2.characterName,
					userDbId: part2.userDbId,
					isAiPlayer: part2.isAiPlayer,
				},
			],
			matchType: p1.matchType,
			matchMode: p1.matchMode,
		};

		try {
			this.logger.log(`[ExecuteMatch] Invio payload: ${JSON.stringify(payload)}`);
			const res = await fetch("http://game-service:3000/matchmaking/create-match", {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
		} catch (error) {
			this.logger.error(`[ExecuteMatch] Errore Game Server: ${error.message}`);
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

		const playerChar = player.characterName;

		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		const statusData = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;

		if (statusData && statusData.state === INGAME) {
			if (statusData.matchMode !== player.matchMode) {
				return {
					status: "ERROR_ALREADY_IN_ANOTHER_GAME",
					message: `Sei già in una partita (modalità: ${statusData.matchMode}). Termina la partita in corso prima di avviarne un'altra.`,
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
					rank: null,
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

			await this.redis.zrem("matchmaking_queue", String(userId));
			await this.redis.zadd(QUEUE_KEY, timestamp, String(userId));

			await this.setUserStatus(userId, {
				state: INQUEUE,
				userDbId: userId,
				rank: null,
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

			const participant1 = {
				characterName: playerChar,
				userDbId: Number(userId),
				isAiPlayer: false,
				rank: null,
				socketId: player.socketId,
				matchMode: player.matchMode,
				matchType: player.matchType,
			};

			const participant2 = {
				characterName: opponentChar,
				userDbId: Number(opponentId),
				isAiPlayer: !!opponentData.isAiPlayer,
				rank: opponentData.rank,
				socketId: opponentData.socketId,
				matchMode: player.matchMode,
				matchType: player.matchType,
			};

			this.logger.log(`[Unranked] Avversario trovato! Delego la creazione del match a executeMatchCreation per ${userId} vs ${opponentId}`);
			
			await this.executeMatchCreation(participant1, participant2);

			return { status: "MATCH_STARTING" };
		}

		return { status: "SEARCHING_UNRANKED_MATCH" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async startLocalMatch(userId: number, data: JoinQueueDto) {
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
		} else if (statusData && statusData.state === INGAME) {

			this.logger.log(
				`[LocalMatch] Utente ${userId} già in partita ${statusData.matchMode}. Non posso avviare un match locale.`,
			);
			return {
				status: "ERROR_ALREADY_IN_ANOTHER_GAME",
				message: `Sei già in una partita (modalità: ${statusData.matchMode}). Termina la partita in corso prima di avviarne un'altra.`,
			};
		}

		await this.redis.zrem("matchmaking_queue", String(userId));
		await this.redis.zrem("matchmaking_queue_unranked", String(userId));

		const matchId = `local_${Math.random().toString(36).substring(7)}`;

		const names = (data.characterName as unknown as CharacterName | CharacterName[]);
		const charP1 = Array.isArray(names) ? names[0] : names;
		const charP2 = Array.isArray(names) && names[1] ? names[1] : CharacterName.ADE;

		const participant1 = {
			characterName: charP1,
			userDbId: userId,
			isAiPlayer: false,
			rank: 0,
			socketId: data.socketId,
			playerIndex: 0,
		};

		const participant2 = {
			characterName: charP2,
			userDbId: userId,
			isAiPlayer: false,
			rank: 0,
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
					userDbId: userDbId,
					isAiPlayer,
				}),
			),
			matchType: MatchType.FFA,
			matchMode: MatchMode.LOCAL,
		};

		try {
			const res = await fetch("http://game-service:3000/matchmaking/create-match", {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			this.logger.log(
				`[LocalMatch] Sessione locale inviata al Game Server per ${userId}`,
			);
		} catch (error) {
			this.logger.error(
				"Errore invio match locale al Game Server:",
				error.message,
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

	async startAiMatch(userId: number, data: JoinQueueDto) {
		this.logger.log(
			`[Logic] inizio procedura match vs AI per ${userId} con personaggio ${data.characterName}`,
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
				message: `Sei già in una partita (modalità: ${statusData.matchMode}). Termina la partita in corso prima di avviarne un'altra.`,
			};
		}

		await this.redis.zrem("matchmaking_queue", String(userId));
		await this.redis.zrem("matchmaking_queue_unranked", String(userId));

		const matchId = `ai_${Math.random().toString(36).substring(7)}`;

		const names = (data.characterName as unknown as CharacterName | CharacterName[]);
		const charP1 = Array.isArray(names) ? names[0] : names;
		const charP2 = Array.isArray(names) && names[1]
			? names[1]
			: (charP1 === CharacterName.ZEUS ? CharacterName.ADE : CharacterName.ZEUS);

		const participant1 = {
			characterName: charP1,
			userDbId: userId,
			isAiPlayer: false,
			rank: 0,
			socketId: data.socketId,
			playerIndex: 0,
		};

		const participant2 = {
			characterName: charP2,
			userDbId: null, 
			isAiPlayer: true, 
			rank: 0,
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
					userDbId: userDbId,
					isAiPlayer: !!isAiPlayer,
				}),
			),
			matchType: MatchType.FFA,
			matchMode: MatchMode.AI,
		};

		try {
			const res = await fetch("http://game-service:3000/matchmaking/create-match", {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			this.logger.log(
				`[AiMatch] Match vs AI inviato al Game Server per ${userId}`,
			);
		} catch (error) {
			this.logger.error(
				"Errore invio match AI al Game Server:",
				error.message,
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

	async createDirectSession(inviterId: number, acceptorId: number) {
		const [rawP1, rawP2] = await Promise.all([
			this.redis.get(`status:${inviterId}`),
			this.redis.get(`status:${acceptorId}`)
		]);

		const statusP1 = rawP1 ? JSON.parse(rawP1) : null;
		const statusP2 = rawP2 ? JSON.parse(rawP2) : null;

		if (!statusP1 || !statusP2 || !statusP1.socketId || !statusP2.socketId) {
			this.logger.warn(`[DirectSession] Impossibile creare: uno dei player è offline.`);
			return { 
				status: "ERROR_PLAYERS_OFFLINE", 
				message: "Uno dei giocatori si è disconnesso." 
			};
		}

		if (statusP1.state === INGAME || statusP2.state === INGAME) {
			return { status: "ERROR_PLAYERS_BUSY", message: "Qualcuno è già in partita." };
		}

		const sessionId = `direct_${Math.random().toString(36).substring(7)}`;
		const sessionData = {
			sessionId,
			p1: { id: inviterId, ready: false, characterName: null, socketId: null },
			p2: { id: acceptorId, ready: false, characterName: null, socketId: null },
			createdAt: Date.now()
		};
		await this.redis.set(`direct_session:${sessionId}`, JSON.stringify(sessionData), "EX", 300);

		await this.setUserStatus(inviterId, {
			state: "character_selection",
			sessionId: sessionId,
			socketId: statusP1.socketId
		}, 300);

		await this.setUserStatus(acceptorId, {
			state: "character_selection",
			sessionId: sessionId,
			socketId: statusP2.socketId
		}, 300);

		this.eventEmitter.emit(GameEvents.INTERNAL_DIRECT_SESSION_READY, {
			socketId: statusP1.socketId,
			data: { status: "SESSION_CREATED", sessionId: sessionId }
		});

		this.eventEmitter.emit(GameEvents.INTERNAL_DIRECT_SESSION_READY, {
			socketId: statusP2.socketId,
			data: { status: "SESSION_CREATED", sessionId: sessionId }
		});

		this.logger.log(`[DirectSession] Notifiche inviate a ${inviterId} e ${acceptorId} per la sessione ${sessionId}`);

		return { sessionId, status: "SUCCESS" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	/**
	 * Chiamata dal WS quando un giocatore invia la scelta del personaggio e il sessionId.
	 */
	async joinDirectSession(userId: number, sessionId: string, characterName: string, socketId: string, matchMode: MatchMode = MatchMode.UNRANKED) {
		const sessionKey = `direct_session:${sessionId}`;
		const sessionRaw = await this.redis.get(sessionKey);

		if (!sessionRaw) {
			this.logger.warn(`[DirectSession] Sessione non trovata o scaduta: ${sessionId}`);
			return { status: "ERROR_SESSION_NOT_FOUND", message: "Sessione scaduta o inesistente." };
		}

		const session = JSON.parse(sessionRaw);

		const isP1 = session.p1.id === userId;
		const isP2 = session.p2.id === userId;

		if (!isP1 && !isP2) {
			return { status: "ERROR_UNAUTHORIZED", message: "Non fai parte di questa sessione privata." };
		}

		const USER_STATUS_KEY = `status:${userId}`;
		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		const statusData = currentStatusRaw ? JSON.parse(currentStatusRaw) : null;

		if (statusData && statusData.state === INGAME) {
			this.logger.log(`[DirectSession] Utente ${userId} già in partita ${statusData.matchMode}. Impossibile unirsi alla pre-lobby.`);
			return {
				status: "ERROR_ALREADY_IN_ANOTHER_GAME",
				message: `Sei già in una partita (modalità: ${statusData.matchMode}). Termina la partita in corso prima di avviarne un'altra.`,
			};
		}

		if (isP1) {
			session.p1.ready = true;
			session.p1.characterName = characterName;
			session.p1.socketId = socketId;
		} else {
			session.p2.ready = true;
			session.p2.characterName = characterName;
			session.p2.socketId = socketId;
		}

		await this.redis.zrem("matchmaking_queue", String(userId));
		await this.redis.zrem("matchmaking_queue_unranked", String(userId));
		
		await this.setUserStatus(userId, {
			state: "pre_match",
			userDbId: userId,
			characterName: characterName,
			socketId: socketId,
			sessionId: sessionId,
		}, 300);

		if (session.p1.ready && session.p2.ready) {
			this.logger.log(`[DirectSession] Entrambi i giocatori pronti. Avvio match per la sessione ${sessionId}`);

			await this.redis.del(sessionKey);

			const p1Data = {
				userDbId: session.p1.id,
				characterName: session.p1.characterName,
				isAiPlayer: false,
				rank: null,
				socketId: session.p1.socketId,
				matchMode: matchMode,
				matchType: MatchType.FFA
			};

			const p2Data = {
				userDbId: session.p2.id,
				characterName: session.p2.characterName,
				isAiPlayer: false,
				rank: null,
				socketId: session.p2.socketId,
				matchMode: matchMode,
				matchType: MatchType.FFA
			};

			await this.executeMatchCreation(p1Data, p2Data);

			return { status: "MATCH_STARTING" };
		}

		await this.redis.set(sessionKey, JSON.stringify(session), "EX", 300);
		this.logger.log(`[DirectSession] Utente ${userId} pronto. In attesa dell'avversario...`);

		return { status: "WAITING_FOR_OPPONENT" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async getQueueCount() {
		const QUEUE_KEY = "matchmaking_queue";
		const count = await this.redis.zcard(QUEUE_KEY); 
		return { queueCount: count };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async leaveQueue(userId: number, player: JoinQueueDto) {
		this.logger.log(`[LeaveQueue] Richiesta di uscita dalla coda per utente: ${userId}`);

		const USER_STATUS_KEY = `status:${userId}`;
		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);

		if (currentStatusRaw) {
			const statusData = JSON.parse(currentStatusRaw);

			// BLOCCO DI SICUREZZA: Evita di rompere un match appena creato
			if (statusData.state === INGAME) {
				this.logger.warn(
					`[LeaveQueue] L'utente ${userId} ha provato ad uscire dalla coda, ma la partita è già iniziata (INGAME).`
				);
				return { 
					status: "ERROR_ALREADY_IN_GAME", 
					message: "Partita già trovata, impossibile annullare la ricerca." 
				};
			}
		}

		// Procediamo con la rimozione sicura dalle code pubbliche
		const resultRanked = await this.redis.zrem("matchmaking_queue", String(userId));
		const resultUnranked = await this.redis.zrem("matchmaking_queue_unranked", String(userId));

		const wasInQueue = resultRanked === 1 || resultUnranked === 1;

		// Riportiamo l'utente in LOBBY in modo pulito
		await this.setUserStatus(userId, {
			state: LOBBY,
			characterName: player.characterName,
			isAiPlayer: player.isAiPlayer,
			socketId: player.socketId || undefined,
		}, 3600);

		if (wasInQueue) {
			this.logger.log(`[LeaveQueue] Utente ${userId} rimosso in sicurezza dalla coda (Ranked o Unranked) e riportato in lobby.`);
			return { status: "LEFT_QUEUE_SUCCESS", userId };
		} else {
			this.logger.log(`[LeaveQueue] Tentativo di rimozione: ${userId} non era in nessuna coda, ma lo stato è stato resettato a lobby.`);
			return { status: "NOT_IN_QUEUE", userId };
		}
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async handleUserDisconnect(userId: number) {
		const USER_STATUS_KEY = `status:${userId}`;
		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		
		if (currentStatusRaw) {
			const statusData = JSON.parse(currentStatusRaw);
			
			// Se si è disconnesso proprio mentre era nella pre-lobby
			if ((statusData.state === "pre_match" || statusData.state === "character_selection") && statusData.sessionId) {
				this.logger.log(`[Disconnect] L'utente ${userId} si è disconnesso durante il pre_match. Annullamento sessione ${statusData.sessionId}.`);
				
				await this.cancelDirectSession(
					userId, 
					statusData.sessionId, 
					"L'avversario si è disconnesso durante la selezione del personaggio."
				);
			}
			// (Opzionale) Qui in futuro potresti aggiungere logiche per toglierlo anche dalla coda pubblica
		}
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	/**
	 * Annulla esplicitamente una sessione diretta (es. l'utente preme "Back").
	 */
	async cancelDirectSession(userId: number, sessionId: string, reason: string = "L'avversario ha annullato la partita.") {
		const sessionKey = `direct_session:${sessionId}`;
		const sessionRaw = await this.redis.get(sessionKey);

		if (!sessionRaw) {
			// La sessione potrebbe essere già stata annullata o scaduta
			await this.setPlayerToLobby(userId);
			return { status: "ERROR_SESSION_NOT_FOUND", message: "Sessione già annullata o inesistente." };
		}

		const session = JSON.parse(sessionRaw);
		
		// Identifica l'avversario
		const opponentId = String(session.p1.id) === String(userId) ? session.p2.id : session.p1.id;

		// Elimina la sessione pendente da Redis
		await this.redis.del(sessionKey);

		// Riporta l'utente che ha annullato in LOBBY
		await this.setPlayerToLobby(userId);

		// Avvisa e riporta in LOBBY l'avversario (se è ancora online)
		const opponentStatusRaw = await this.redis.get(`status:${opponentId}`);
		if (opponentStatusRaw) {
			const opponentData = JSON.parse(opponentStatusRaw);
			
			if (opponentData.socketId) {
				// Utilizziamo l'evento esistente per recapitare il messaggio di annullamento
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: opponentData.socketId,
					data: { status: "MATCH_CANCELLED", message: reason }
				});
			}
			
			await this.setUserStatus(opponentId, { 
				state: LOBBY, 
				socketId: opponentData.socketId 
			}, 3600);
		}

		this.logger.log(`[DirectSession] Sessione ${sessionId} annullata da ${userId}`);
		return { status: "SESSION_CANCELLED" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	/**
	 * Controlla se un utente appena connesso era già in partita (INGAME).
	 * In caso affermativo, aggiorna il suo socketId su Redis e lo avvisa
	 * per forzare il frontend a ricollegarsi alla schermata di gioco.
	 */
	async checkAndReconnectUser(userId: number, socketId: string) {
    	const USER_STATUS_KEY = `status:${userId}`;
    	const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
    
    	// Salva sempre il socketId, anche se l'utente è in lobby o senza stato
    	if (!currentStatusRaw) {
    	    await this.setUserStatus(String(userId), { state: LOBBY, socketId }, 3600);
    	    return null;
    	}

    	const statusData = JSON.parse(currentStatusRaw);
    	// Se è in lobby, aggiorna il socketId
    	if (statusData.state === LOBBY) {
    	    await this.setUserStatus(String(userId), { ...statusData, socketId }, 3600);
    	    return null;
    	}
		if (statusData && (statusData.state === "pre_match" || statusData.state === "character_selection") && statusData.sessionId) {
			this.logger.log(`[Auto-Reconnect] Utente ${userId} disconnesso/ricaricato in pre_match. Annullamento sessione ${statusData.sessionId}.`);

			const sessionRaw = await this.redis.get(`direct_session:${statusData.sessionId}`);
			if (sessionRaw) {
				const session = JSON.parse(sessionRaw);
				const opponentId = String(session.p1.id) === String(userId) ? session.p2.id : session.p1.id;
				
				const opponentStatusRaw = await this.redis.get(`status:${opponentId}`);
				if (opponentStatusRaw) {
					const opponentData = JSON.parse(opponentStatusRaw);
					if (opponentData.socketId) {
						this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
							socketId: opponentData.socketId,
							data: { status: "MATCH_CANCELLED", message: "L'avversario si è disconnesso. Partita annullata." }
						});
					}
					await this.setUserStatus(opponentId, { 
						state: LOBBY, 
						socketId: opponentData.socketId 
					}, 3600);
				}
				await this.redis.del(`direct_session:${statusData.sessionId}`);
			}

			await this.setUserStatus(userId, { state: LOBBY, socketId: socketId }, 3600);
			
			setTimeout(() => {
				this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
					socketId: socketId,
					data: { status: "MATCH_CANCELLED", message: "Ti sei disconnesso durante la preparazione. Partita annullata." }
				});
			}, 1000);

			return null; 
		}

		if (statusData && statusData.state === INGAME && statusData.matchId) {
			const matchId = statusData.matchId;
			const matchFoundData = { status: "MATCH_FOUND", matchId };

			if (statusData.matchMode !== MatchMode.LOCAL && statusData.matchMode !== MatchMode.AI) {
				const opponentStatusRaw = await this.redis.get(`status:${statusData.opponentId}`);
				
				if (!opponentStatusRaw) {
					this.logger.warn(
						`[Auto-Reconnect] Opponent ${statusData.opponentId} non trovato. Match scaduto. Riporto utente ${userId} in lobby.`
					);
					await this.setUserStatus(userId, {
						state: LOBBY,
						characterName: statusData.characterName,
						isAiPlayer: statusData.isAiPlayer,
						socketId: socketId,
					}, 3600);
					
					return null; 
				}

				const opponentData = JSON.parse(opponentStatusRaw);
				if (opponentData.socketId) {
					this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
						socketId: opponentData.socketId,
						data: matchFoundData,
					});
				}
			}

			this.logger.log(
				`[Auto-Reconnect] Utente ${userId} si è ricollegato col socket ${socketId}. Riconnessione al match: ${statusData.matchId}`
			);

			const isLongMatch = statusData.matchMode === MatchMode.LOCAL || statusData.matchMode === MatchMode.AI;
			const ttl = isLongMatch ? 3600 : 420;

			await this.setUserStatus(userId, {
				...statusData,
				socketId: socketId,
			}, ttl);

			if (socketId) {
				setTimeout(() => {
					this.eventEmitter.emit(GameEvents.INTERNAL_MATCH_FOUND, {
						socketId: socketId,
						data: matchFoundData,
					});
					this.logger.log(`[Delayed Reconnect] Evento interno emesso per il match ${statusData.matchId}`);
				}, 1000);
			}
			
			return statusData;
		}
		
		return null;
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

	async setPlayerToLobby(userId: number) {
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
				`[Abbandono] Utente ${userId} sbloccato dal match e riportato in lobby.`,
			);
		}
	}
}