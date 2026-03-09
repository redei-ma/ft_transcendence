import { Inject, Injectable, Logger } from "@nestjs/common"; // Importato Logger per il debugging professionale
import { JoinQueueDto } from "./dto/join-queue.dto"; // struttura del dato che ricevo
import Redis from "ioredis"; // client Redis per interagire col database
import { InjectRedis } from "@nestjs-modules/ioredis"; // modulo per iniettare il client Redis
import { ClientProxy } from "@nestjs/microservices";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MatchMode, MatchType } from "@transcendence/types";

@Injectable()
export class MatchmakingService {
	private readonly logger = new Logger(MatchmakingService.name); // Inizializzazione del logger NestJS
	client: any;

	constructor(
		@InjectRedis() private readonly redis: Redis,
		private readonly eventEmitter: EventEmitter2, // Nest la inietta qui
		private readonly httpService: HttpService, // Nest la inietta qui
	) {}

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

	// metodo per processare la coda di matchmaking, ovviamente asincrono se no rischiamo di bloccare tutto nel attesa dei dati
	async processQueue(player: JoinQueueDto) {
		const QUEUE_KEY = "matchmaking_queue"; // tutti i valori della coda verranno messi sotto questo nome
		const RANK_TOLERANCE = player.rankRange; // tolleranza rank per trovare un avversario equilibrato

		// controlliamo che le persone in coda non siano già in partita
		const USER_STATUS_KEY = `status:${player.userDbId}`;

		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		const statusData = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;
		const rank = await this.fetchPlayerElo(player.userDbId);
		if (rank === null) {
			return { status: "ERROR_FETCHING_RANK" };
		}
		// analizzo il JSON per vedere se è effettivamente in game
		if (
			statusData &&
			(statusData.state === "ingame" || statusData.state === "searching")
		) {
			this.logger.log(
				`Player già esistente con stato ${currentStatusRaw}, verifico se è in partita...`,
			);

			if (statusData.state === "ingame") {
				// troviamo che colui che ha cercato di fare il matchmaking, teoricamente sarebbe già in partita
				// proviamo a riaggiungerlo alla stessa partita reinviando il socket
				// andiamo a recuperare l'avversario
				const opponentStatusRaw = await this.redis.get(
					`status:${statusData.opponentId}`,
				);
				// se non troviamo l'avversario, vuol dire che la partita è scaduta o è finita
				if (!opponentStatusRaw) {
					this.logger.warn(
						`[Logic] Partita scaduta o avversario non trovato...`,
					);
					await this.redis.set(
						USER_STATUS_KEY,
						JSON.stringify({
							state: "lobby",
							rank: rank,
							characterName: player.characterName,
							isAiPlayer: player.isAiPlayer,
							socketId: player.socketId,
							updatedAt: Date.now(),
						}),
						"EX",
						3600,
					);
					return { status: "MATCH_EXPIRED_BACK_TO_LOBBY" };
				}
				// se troviamo l'avversario, controlliamo che sia ancora in partita, se no vuol dire che la partita è finita
				const opponentData = JSON.parse(opponentStatusRaw);
				if (opponentData.state !== "ingame") {
					this.logger.log(
						`[Logic] L'avversario è già in ${opponentData.state}. Partita conclusa.`,
					);
					await this.redis.set(
						USER_STATUS_KEY,
						JSON.stringify({
							...statusData,
							state: "lobby",
							updatedAt: Date.now(),
						}),
						"EX",
						3600,
					);
					return { status: "MATCH_ALREADY_FINISHED" };
				}
				// prendiamo le vecchie informazioni che avevamo salvato su redis e aggiorniamo solo il socketId e il timestamp
				const updatedStatus = {
					...statusData,
					socketId: player.socketId,
					updatedAt: Date.now(),
				};
				// classico salvataggio su redis
				await this.redis.set(
					USER_STATUS_KEY,
					JSON.stringify(updatedStatus),
					"EX",
					420,
				);
				// prendiamo la stringa ricevuta e vediamo se è valida, in caso ad esempio fosse vuota o corrotta si restituisce una stringa vuota
				const payload = {
					playersData: [
						{
							characterName: updatedStatus.characterName,
							userDbId: player.userDbId,
							isAiPlayer: !!updatedStatus.isAiPlayer,
						},
						{
							characterName: opponentData.characterName,
							userDbId: statusData.opponentId,
							isAiPlayer: !!opponentData.isAiPlayer,
						},
					],
					matchType: statusData.matchType,
					matchMode: statusData.matchMode,
				};
				try {
					const url =
						"http://game-service:3000/matchmaking/create-match";
					await firstValueFrom(this.httpService.post(url, payload));
				} catch (e) {
					this.logger.error("Errore riconnessione HTTP");
				}

				return {
					status: "RECONNECTED_TO_GAME",
					matchId: statusData.matchId,
				};
			}

			if (statusData.state === "searching") {
				// controlliamo se c'è già qualcuno per lui senza riaggiungerlo
				this.logger.log(
					`[Logic] Aggiornamento ricerca per ${player.userDbId} con tolleranza ${RANK_TOLERANCE}`,
				);
				const updatedSearching = JSON.stringify({
					...statusData,
					socketId: player.socketId,
					updatedAt: Date.now(),
				});
				await this.redis.set(
					USER_STATUS_KEY,
					updatedSearching,
					"EX",
					600,
				);
			}
		} else {
			this.logger.log(
				`Nuovo player ${player.userDbId} aggiunto alla coda correttamente, in cerca di match. Rank: ${rank}, Tolleranza: ${RANK_TOLERANCE}`,
			);
			const timestamp = Date.now();
			const timeScore = rank + timestamp / 10000000000000;

			// aggiungiamo il player alla coda su Redis
			// zadd permette di aggiungere un elemento ad una sorted set, il primo parametro è il nome della coda, il secondo è il punteggio (rank) e il terzo è l'elemento (userDbId)
			// se il player esiste già nella coda, verifichaimo se il nuovo rank è migliore, in caso lo aggiorniamo
			await this.redis.zadd(QUEUE_KEY, timeScore, player.userDbId);

			// Settiamo lo stato come "searching"
			const searchingStatus = JSON.stringify({
				state: "searching",
				rank: rank,
				characterName: player.characterName,
				isAiPlayer: player.isAiPlayer,
				socketId: player.socketId || undefined,
				updatedAt: Date.now(),
			});
			await this.redis.set(USER_STATUS_KEY, searchingStatus, "EX", 600); // 10 minuti di timeout per la coda
		}

		// settiamo quanto vale un rank minimo e un rank massimo per ogni player
		const minRank = Number(rank) - RANK_TOLERANCE;
		const maxRank = Number(rank) + RANK_TOLERANCE;

		// cerchiamo nella coda tutti i player che hanno un rank compreso tra minRank e maxRank
		const potentialOpponents = await this.redis.zrangebyscore(
			QUEUE_KEY,
			minRank,
			maxRank,
		);

		// rimuoviamo il player stesso dalla lista degli avversari che si possono sfidare
		const opponents = potentialOpponents.filter(
			(id) => id !== String(player.userDbId),
		);
		this.logger.log(
			`[Logic] Player ${player.userDbId} in cerca di match. Trovati ${opponents.length} potenziali avversari nella tolleranza (${minRank} - ${maxRank}).`,
		);
		// se troviamo almeno un avversario, creiamo la partita
		if (opponents.length >= 1) {
			const opponentId = opponents[0];

			// andiamo a creare dei json su redis in modo tale da tenere traccia dello stato dei player
			// Recuperiamo i dati completi dell'avversario PRIMA di rimuoverlo dalla coda
			const opponentStatusRaw = await this.redis.get(
				`status:${opponentId}`,
			);
			if (!opponentStatusRaw) {
				// Se l'avversario è sparito proprio ora, resettiamo il player attuale
				// così può riprovare subito senza aspettare il timeout
				await this.redis.set(
					USER_STATUS_KEY,
					JSON.stringify({
						state: "lobby",
						rank: rank,
						characterName: player.characterName,
						isAiPlayer: player.isAiPlayer,
						socketId: player.socketId,
						updatedAt: Date.now(),
					}),
					"EX",
					3600,
				);
				await this.redis.zrem(QUEUE_KEY, player.userDbId); // lo togliamo anche dalla coda
				return { status: "ERROR_OPPONENT_VANISHED_RETRYING" };
			}
			const opponentData = JSON.parse(opponentStatusRaw);

			// rimuoviamo entrambi i player dalla coda di matchmaking
			await this.redis.zrem(QUEUE_KEY, player.userDbId, opponentId);
			// andiamo a creare un id univoco da assegnare alla partita
			const matchId = `match_${Math.random().toString(36).substring(7)}`;

			const playerChar = Array.isArray(player.characterName)
				? player.characterName[0]
				: player.characterName;
			const opponentChar = Array.isArray(opponentData.characterName)
				? opponentData.characterName[0]
				: opponentData.characterName;

			const participant1 = {
				characterName: playerChar,
				userDbId: String(player.userDbId),
				isAiPlayer: !!player.isAiPlayer,
				rank: rank,
				socketId: player.socketId,
				playerIndex: 0,
			};

			const participant2 = {
				characterName: opponentChar,
				userDbId: String(opponentId),
				isAiPlayer: !!opponentData.isAiPlayer,
				rank: opponentData.rank,
				socketId: opponentData.socketId,
				playerIndex: 1,
			};

			// creiamo i dati di stato per entrambi i player (Uniformato con matchMode e updatedAt)
			const playerStatus = JSON.stringify({
				state: "ingame",
				...participant1,
				opponentId: opponentId,
				matchId,
				matchMode: player.matchMode,
				matchType: player.matchType,
				updatedAt: Date.now(),
			});
			const opponentStatus = JSON.stringify({
				state: "ingame",
				...participant2,
				opponentId: player.userDbId,
				matchId,
				matchMode: player.matchMode,
				matchType: player.matchType,
				updatedAt: Date.now(),
			});

			// una volta trovato il match, etichettiamo i player come "in lobby" nel database Redis
			// da notare che se qualcuno crasha durante la partita e giovanni non se ne accorge, i dati rimarranno su redis per 7 minuti (420 secondi) e poi verranno eliminati automaticamente
			await this.redis.set(
				`status:${player.userDbId}`,
				playerStatus,
				"EX",
				420,
			);
			await this.redis.set(
				`status:${opponentId}`,
				opponentStatus,
				"EX",
				420,
			);
			await this.redis.set(
				`match_players:${matchId}`,
				`${player.userDbId},${opponentId}`,
				"EX",
				3600,
			);
			this.logger.log(
				`[Logic] Match trovato! ${player.userDbId} vs ${opponentId} (Rank: ${rank} vs ${opponentData.rank}) - MatchID: ${matchId}`,
			);
			// creiamo un array contente i due player che saranno dentro la partita

			const payload = {
				gameId: String(matchId),
				playersData: [participant1, participant2].map(
					({ characterName, userDbId, isAiPlayer }) => ({
						characterName,
						userDbId,
						isAiPlayer,
					}),
				),
				matchType: player.matchType, // Prendi il tipo dal primo giocatore
				matchMode: player.matchMode, // Prendi il mode dal primo giocatore
			};

			// Inviamo i due oggetti MatchPartecipantData richiesti
			try {
				const url = "http://game-service:3000/matchmaking/create-match"; // L'indirizzo del suo container
				await firstValueFrom(this.httpService.post(url, payload));
				this.logger.log(
					"Richiesta di creazione match inviata con successo via HTTP",
				);
			} catch (error) {
				this.logger.error(
					"Errore nella creazione del match su Game Server:",
					error.response?.data,
				);
			}

			this.logger.log(
				`[RankedMatch] Match tra: ${player.userDbId} vs ${opponentId}`,
			);

			// restituzione del match creato con id players e ID del match
			// const matchFoundData = { status: 'MATCH_FOUND', matchId, players: [participant1, participant2] };
			const matchFoundData = { status: "MATCH_FOUND", matchId: matchId };

			if (opponentData.socketId) {
				this.eventEmitter.emit("match.found.internal", {
					socketId: opponentData.socketId,
					data: matchFoundData,
				});
			}
			if (player.socketId) {
				this.eventEmitter.emit("match.found.internal", {
					socketId: player.socketId,
					data: matchFoundData,
				});
			}
			return matchFoundData;
		}
		// se nessuno è è un player adatto, restituiamo lo stato di ricerca in corso
		return { status: "SEARCHING_EQUILIBRATED_MATCH" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async processUnrankedQueue(player: JoinQueueDto) {
		const QUEUE_KEY = "matchmaking_queue_unranked";
		const USER_STATUS_KEY = `status:${player.userDbId}`;

		const playerChar = Array.isArray(player.characterName)
			? player.characterName[0]
			: player.characterName;

		const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
		const statusData = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;

		const rank = await this.fetchPlayerElo(player.userDbId);
		if (rank === null) {
			return { status: "ERROR_FETCHING_RANK" };
		}

		if (
			statusData &&
			(statusData.state === "ingame" || statusData.state === "searching")
		) {
			if (statusData.state === "ingame") {
				const opponentStatusRaw = await this.redis.get(
					`status:${statusData.opponentId}`,
				);
				if (!opponentStatusRaw) {
					await this.redis.set(
						USER_STATUS_KEY,
						JSON.stringify({
							state: "lobby",
							rank: rank,
							characterName: playerChar,
							isAiPlayer: player.isAiPlayer,
							socketId: player.socketId,
							updatedAt: Date.now(),
						}),
						"EX",
						3600,
					);
					return { status: "MATCH_EXPIRED_BACK_TO_LOBBY" };
				}

				const opponentData = JSON.parse(opponentStatusRaw);
				const opponentChar = Array.isArray(opponentData.characterName)
					? opponentData.characterName[0]
					: opponentData.characterName;

				const updatedStatus = {
					...statusData,
					characterName: playerChar,
					socketId: player.socketId,
					updatedAt: Date.now(),
				};
				await this.redis.set(
					USER_STATUS_KEY,
					JSON.stringify(updatedStatus),
					"EX",
					420,
				);

				const payload = {
					gameId: statusData.matchId,
					playersData: [
						{
							characterName: playerChar,
							userDbId: String(player.userDbId),
							isAiPlayer: false,
						},
						{
							characterName: opponentChar,
							userDbId: String(statusData.opponentId),
							isAiPlayer: !!opponentData.isAiPlayer,
						},
					],
					matchType: MatchType.FFA,
					matchMode: statusData.matchMode,
				};
				try {
					await firstValueFrom(
						this.httpService.post(
							"http://game-service:3000/matchmaking/create-match",
							payload,
						),
					);
				} catch (e) {
					this.logger.error("Errore riconnessione HTTP Unranked");
				}

				return {
					status: "RECONNECTED_TO_GAME",
					matchId: statusData.matchId,
				};
			}

			if (statusData.state === "searching") {
				const updatedSearching = JSON.stringify({
					...statusData,
					characterName: playerChar,
					socketId: player.socketId,
					updatedAt: Date.now(),
				});
				await this.redis.set(
					USER_STATUS_KEY,
					updatedSearching,
					"EX",
					600,
				);
			}
		} else {
			const timestamp = Date.now();
			await this.redis.zadd(QUEUE_KEY, timestamp, player.userDbId);

			const searchingStatus = JSON.stringify({
				state: "searching",
				rank: rank,
				characterName: playerChar,
				isAiPlayer: player.isAiPlayer,
				socketId: player.socketId,
				updatedAt: Date.now(),
			});
			await this.redis.set(USER_STATUS_KEY, searchingStatus, "EX", 600);
		}

		// 3. Ricerca Avversario
		const potentialOpponents = await this.redis.zrange(QUEUE_KEY, 0, 1);
		const opponents = potentialOpponents.filter(
			(id) => id !== String(player.userDbId),
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

			await this.redis.zrem(QUEUE_KEY, player.userDbId, opponentId);
			const matchId = `match_unranked_${Math.random().toString(36).substring(7)}`;

			const participant1 = {
				characterName: playerChar,
				userDbId: String(player.userDbId),
				isAiPlayer: false,
				rank: rank,
				socketId: player.socketId,
				playerIndex: 0,
			};

			const participant2 = {
				characterName: opponentChar,
				userDbId: String(opponentId),
				isAiPlayer: !!opponentData.isAiPlayer,
				rank: opponentData.rank,
				socketId: opponentData.socketId,
				playerIndex: 1,
			};

			const playerStatus = JSON.stringify({
				state: "ingame",
				...participant1,
				opponentId,
				matchId,
				matchMode: player.matchMode,
				matchType: MatchType.FFA,
				updatedAt: Date.now(),
			});
			const opponentStatus = JSON.stringify({
				state: "ingame",
				...participant2,
				opponentId: player.userDbId,
				matchId,
				matchMode: player.matchMode,
				matchType: MatchType.FFA,
				updatedAt: Date.now(),
			});

			await this.redis.set(
				`status:${player.userDbId}`,
				playerStatus,
				"EX",
				420,
			);
			await this.redis.set(
				`status:${opponentId}`,
				opponentStatus,
				"EX",
				420,
			);
			await this.redis.set(
				`match_players:${matchId}`,
				`${player.userDbId},${opponentId}`,
				"EX",
				3600,
			);

			const payload = {
				gameId: matchId,
				playersData: [participant1, participant2].map(
					({ characterName, userDbId, isAiPlayer }) => ({
						characterName,
						userDbId,
						isAiPlayer,
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
			} catch (error) {
				this.logger.error(
					"Errore creazione match Unranked:",
					error.response?.data,
				);
			}

			const matchFoundData = { status: "MATCH_FOUND", matchId };

			if (opponentData.socketId) {
				this.eventEmitter.emit("match.found.internal", {
					socketId: opponentData.socketId,
					data: matchFoundData,
				});
			}
			if (player.socketId) {
				this.eventEmitter.emit("match.found.internal", {
					socketId: player.socketId,
					data: matchFoundData,
				});
			}
			return matchFoundData;
		}

		return { status: "SEARCHING_UNRANKED_MATCH" };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async leaveQueue(player: JoinQueueDto) {
		// abbiamo la coda di matchmaking e la chiave per lo stato dell'utente
		const QUEUE_KEY = "matchmaking_queue";
		const USER_STATUS_KEY = `status:${player.userDbId}`;

		// ZREM rimuove l'elemento dal Sorted Set usando l'ID
		const result = await this.redis.zrem(QUEUE_KEY, player.userDbId);

		const rank = await this.fetchPlayerElo(player.userDbId);
		if (rank === null) {
			return { status: "ERROR_FETCHING_RANK" };
		}

		// Prepariamo lo stato lobby mantenendo i dati che l'utente aveva nel DTO
		// In questo modo, tornando nella Home, il sistema si ricorda ancora chi è e che personaggio ha
		const lobbyStatus = JSON.stringify({
			state: "lobby",
			rank: rank,
			characterName: player.characterName,
			isAiPlayer: player.isAiPlayer,
			socketId: player.socketId || undefined,
			updatedAt: Date.now(),
		});

		// lo setto in qualsiasi caso nello stato di lobby, evitando problemi di player incastrati
		// Usiamo una scadenza di 1 ora
		await this.redis.set(USER_STATUS_KEY, lobbyStatus, "EX", 3600);

		// result è 1 se l'ID è stato trovato e rimosso, 0 se non c'era
		if (result === 1) {
			this.logger.log(
				`[Logic] Utente ${player.userDbId} rimosso dalla coda correttamente e riportato in lobby.`,
			);
			return { status: "LEFT_QUEUE_SUCCESS", userDbId: player.userDbId };
		} else {
			this.logger.log(
				`[Logic] Tentativo di rimozione: ${player.userDbId} non era in coda, ma lo stato è stato resettato a lobby.`,
			);
			return { status: "NOT_IN_QUEUE", userDbId: player.userDbId };
		}
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async finalizeMatch(matchId: string) {
		// recuperiamo gli ID associati al match
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

		// ottengo la lista degli ID
		const playerIds = playersRaw.split(",");

		for (const userId of playerIds) {
			// Se l'ID contiene "ai_bot" o "guest_", salto il ripristino in lobby, non sono utenti reali
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

				// creo stato lobby
				const lobbyStatus = JSON.stringify({
					state: "lobby",
					userDbId: String(userId),
					characterName: userData.characterName,
					isAiPlayer: false,
					rank: userData.rank,
					socketId: userData.socketId || undefined,
					updatedAt: Date.now(),
				});

				// risettiamo lo stato lobby peer 1 ora
				await this.redis.set(USER_STATUS_KEY, lobbyStatus, "EX", 3600);
				this.logger.log(
					`[Cleanup] Utente ${userId} riportato in lobby.`,
				);
			}
		}

		// eilimino il match dalla lista dei match attivi
		await this.redis.del(`match_players:${matchId}`);

		this.logger.log(`[Cleanup] Match ${matchId} rimosso con successo.`);
		return { status: "MATCH_FINALIZED", matchId };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async createChallenge(player: JoinQueueDto, opponentId: string) {
		const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${player.userDbId}`;
		const exists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);
		// controlliamo se esiste già una sfida tra questi due utenti, se sì ritorniamo un messaggio di errore
		if (exists) {
			return {
				status: "ERROR_CHALLENGE_EXISTS",
				message: "Una sfida tra questi due utenti è già in corso",
			};
		}

		// recuperiamo lo stato attuale del player che lancia la sfida
		const currentStatusRaw = await this.redis.get(
			`status:${player.userDbId}`,
		);
		const currentStatus = currentStatusRaw
			? JSON.parse(currentStatusRaw)
			: null;

		// Se l'utente è già 'ingame', non può sfidare nessuno
		if (currentStatus && currentStatus.state === "ingame") {
			return { status: "ERROR_ALREADY_IN_GAME" };
		}

		// salvo i dati del DTO su Redis senza forzare lo stato a 'searching'
		// se l'utente era già in 'lobby', lo lasciamo in 'lobby' o creiamo un oggetto di supporto
		const challengeData = {
			...player,
			state: currentStatus?.state || "lobby", // Manteniamo lo stato precedente
			lastChallengeSent: opponentId,
			updatedAt: Date.now(),
		};

		await this.redis.set(
			`status:${player.userDbId}`,
			JSON.stringify(challengeData),
			"EX",
			600,
		);

		// La sfida vera e propria rimane una chiave a parte
		await this.redis.set(UNIQUE_CHALLENGE_KEY, "pending", "EX", 30);

		return {
			status: "CHALLENGE_SENT",
			challengerId: player.userDbId,
			opponentId,
		};
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async acceptChallenge(challengerId: string, opponent: JoinQueueDto) {
		const UNIQUE_CHALLENGE_KEY = `challenge:${opponent.userDbId}:${challengerId}`; // ricostruzione chiave sfida
		const QUEUE_KEY = "matchmaking_queue"; // chiave della coda globale

		// controllo per vedere se la sfida esiste ancora su redis
		const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);
		if (!challengeExists) return { status: "ERROR_EXPIRED" };

		// Recuperiamo lo stato del challenger per assicurarci che non sia entrato in un altro game nel frattempo
		const statusA = await this.redis.get(`status:${challengerId}`);

		// Funzione di supporto per verificare se un player è già in partita
		const isInGame = (raw: string | null) =>
			raw && JSON.parse(raw).state === "ingame";

		// Se il challenger è già impegnato, la sfida non può partire
		if (isInGame(statusA)) {
			return { status: "ERROR_CHALLENGER_ALREADY_IN_MATCH" };
		}

		// Estraiamo i dati del challenger (che avevamo salvato nel createChallenge)
		const challengerData = statusA ? JSON.parse(statusA) : {};

		// rimuovo entrambi dalla coda di matchmaking globale
		// Se erano in 'searching', questa operazione li "dirotta" ufficialmente verso la sfida privata
		await this.redis.zrem(QUEUE_KEY, challengerId, opponent.userDbId);

		// creiamo l'id univoco della partita privata
		const matchId = `private_${Math.random().toString(36).substring(7)}`;

		const rank = await this.fetchPlayerElo(challengerId);
		if (rank === null) {
			return { status: "ERROR_FETCHING_RANK" };
		}

		// prepariamo gli oggetti partecipante usando il DTO per l'opponent e i dati Redis per il challenger
		const participant1 = {
			characterName: challengerData.characterName,
			userDbId: String(challengerId),
			isAiPlayer: Boolean(challengerData.isAiPlayer || false),
			rank: challengerData.rank || 0,
			socketId: challengerData.socketId || undefined,
			playerIndex: 0,
		};

		const participant2 = {
			characterName: opponent.characterName,
			userDbId: String(opponent.userDbId),
			isAiPlayer: Boolean(opponent.isAiPlayer || false),
			rank: rank || 0,
			socketId: opponent.socketId || undefined,
			playerIndex: 1,
		};

		// Settiamo lo stato ingame per entrambi
		const playerStatus = JSON.stringify({
			state: "ingame",
			...participant1,
			opponentId: opponent.userDbId,
			matchId,
			matchType: challengerData.matchType,
			matchMode: challengerData.matchMode,
			updatedAt: Date.now(),
		});
		const opponentStatus = JSON.stringify({
			state: "ingame",
			...participant2,
			opponentId: challengerId,
			matchId,
			matchType: challengerData.matchType,
			matchMode: challengerData.matchMode,
			updatedAt: Date.now(),
		});

		await this.redis.set(`status:${challengerId}`, playerStatus, "EX", 420);
		await this.redis.set(
			`status:${opponent.userDbId}`,
			opponentStatus,
			"EX",
			420,
		);

		// sfida privata vince sulle altre partite
		const payload = {
			gameId: String(matchId),
			playersData: [participant1, participant2].map(
				({ characterName, userDbId, isAiPlayer }) => ({
					characterName,
					userDbId,
					isAiPlayer,
				}),
			),
			matchType: challengerData.matchType,
			matchMode: challengerData.matchMode,
		};
		try {
			const url = "http://game-service:3000/matchmaking/create-match";
			await firstValueFrom(this.httpService.post(url, payload));
			this.logger.log(
				`[HTTP] Match privato creato con successo sul Game Server: ${matchId}`,
			);
		} catch (error) {
			this.logger.error(
				"Errore creazione match privato su Game Server:",
				error.response?.data || error.message,
			);
		}

		// pulizia della chiave della sfida
		await this.redis.del(UNIQUE_CHALLENGE_KEY);

		this.logger.log(
			`[Logic] Sfida accettata: ${challengerId} e ${opponent.userDbId} dirottati dalla coda al match privato ${matchId}`,
		);

		return {
			status: "MATCH_FOUND",
			matchId,
			players: [participant1, participant2],
		};
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async rejectChallenge(challengerId: string, opponent: JoinQueueDto) {
		// Ricostruiamo la chiave unica che avevamo creato in createChallenge
		const UNIQUE_CHALLENGE_KEY = `challenge:${opponent.userDbId}:${challengerId}`;

		// verifico se la sfida esiste ancora su Redis, se no vuol dire che è già scaduta o non esiste più, quindi ritorniamo un messaggio di errore
		const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);

		const rank = await this.fetchPlayerElo(opponent.userDbId);
		if (rank === null) {
			return { status: "ERROR_FETCHING_RANK" };
		}

		if (!challengeExists) {
			return {
				status: "ERROR_CHALLENGE_NOT_FOUND",
				message: "La sfida è già scaduta o non esiste più.",
			};
		}

		// se è ancora presente su redis, la eliminiamo per indicare che è stata rifiutata e non è più valida
		await this.redis.del(UNIQUE_CHALLENGE_KEY);

		this.logger.log(
			`[Logic] L'utente ${opponent.userDbId} (Rank: ${rank}) ha rifiutato la sfida di ${challengerId}.`,
		);

		// ritorno lo stato di sfida rifiutata, con gli id dei player coinvolti
		return {
			status: "CHALLENGE_REJECTED",
			challengerId,
			opponentId: opponent.userDbId,
		};
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async cancelChallenge(player: JoinQueueDto, opponentId: string) {
		// Ricostruiamo la chiave unica usando il DTO del challenger
		const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${player.userDbId}`;

		const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);

		const rank = await this.fetchPlayerElo(player.userDbId);
		if (rank === null) {
			return { status: "ERROR_FETCHING_RANK" };
		}

		if (!challengeExists) {
			return {
				status: "ERROR_CHALLENGE_NOT_FOUND",
				message: "La sfida è già scaduta o non esiste più.",
			};
		}

		// Eliminiamo la sfida
		await this.redis.del(UNIQUE_CHALLENGE_KEY);

		// Logghiamo l'azione usando il DTO per avere più contesto se serve
		this.logger.log(
			`[Logic] L'utente ${player.userDbId} (Rank: ${rank}) ha annullato la sfida verso ${opponentId}.`,
		);

		return {
			status: "CHALLENGE_CANCELLED",
			challengerId: player.userDbId,
			opponentId,
		};
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async startLocalMatch(data: any) {
		// Cambiamo la firma per accettare l'oggetto unico
		const USER_STATUS_KEY_1 = `status:${data.userDbId}`;

		await this.redis.zrem("matchmaking_queue", data.userDbId);
		const matchId = `local_${Math.random().toString(36).substring(7)}`;

		// Estraiamo i nomi dei personaggi dall'array inviato dal frontend
		const charP1 = Array.isArray(data.characterName)
			? data.characterName[0]
			: data.characterName;
		const charP2 = Array.isArray(data.characterName)
			? data.characterName[1]
			: "default";

		const participant1 = {
			characterName: charP1,
			userDbId: String(data.userDbId),
			isAiPlayer: false,
			rank: data.rank,
			socketId: data.socketId,
			playerIndex: 0,
		};

		const participant2 = {
			characterName: charP2,
			userDbId: String(data.userDbId),
			isAiPlayer: false,
			rank: data.rank,
			socketId: data.socketId,
			playerIndex: 1,
		};

		const playerStatus = JSON.stringify({
			state: "ingame",
			matchMode: MatchMode.LOCAL,
			matchType: MatchType.FFA,
			matchId: matchId,
			opponentId: "LOCAL_GUEST",
			...participant1,
			updatedAt: Date.now(),
		});

		await this.redis.set(USER_STATUS_KEY_1, playerStatus, "EX", 3600);

		const payload = {
			gameId: matchId,
			playersData: [participant1, participant2].map(
				({ characterName, userDbId, isAiPlayer }) => ({
					characterName,
					userDbId,
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
				`[LocalMatch] Sessione locale inviata al Game Server per ${data.userDbId}`,
			);
		} catch (error) {
			this.logger.error(
				"Errore invio match locale al Game Server:",
				error.response?.data || error.message,
			);
		}

		await this.redis.set(
			`match_players:${matchId}`,
			`${data.userDbId}, guest_${data.userDbId}`,
			"EX",
			3600,
		);

		if (data.socketId) {
			this.eventEmitter.emit("match.found.internal", {
				socketId: data.socketId,
				data: { status: "MATCH_FOUND", matchId: matchId },
			});
		}

		return { status: "LOCAL_MATCH_STARTED", userDbId: data.userDbId };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async startAiMatch(data: any) {
		this.logger.log(
			`[Logic] inizio procedura match vs AI per ${data.userDbId} con rank ${data.rank} e personaggio ${data.characterName}`,
		);
		const USER_STATUS_KEY = `status:${data.userDbId}`;

		// 1. Pulizia: rimuoviamo l'utente da eventuali code attive
		await this.redis.zrem("matchmaking_queue", data.userDbId);
		await this.redis.zrem("matchmaking_queue_unranked", data.userDbId);

		const matchId = `ai_${Math.random().toString(36).substring(7)}`;

		// Estraiamo i nomi dei personaggi dall'array (stessa logica di local)
		const charP1 = Array.isArray(data.characterName)
			? data.characterName[0]
			: data.characterName;
		// Se il frontend non passa un nome per il bot nell'array, usiamo 'CPU_Bot'
		const charP2 =
			Array.isArray(data.characterName) && data.characterName[1]
				? data.characterName[1]
				: "CPU_Bot";

		// Il giocatore reale
		const participant1 = {
			characterName: charP1,
			userDbId: String(data.userDbId),
			isAiPlayer: false,
			rank: data.rank,
			socketId: data.socketId,
			playerIndex: 0,
		};

		// Il Bot
		const participant2 = {
			characterName: charP2,
			userDbId: `ai_bot_${matchId}`, // ID virtuale per il cleanup
			isAiPlayer: true, // Attiva la logica AI nel Game Server
			rank: data.rank,
			socketId: null,
			playerIndex: 1,
		};

		// Salviamo lo stato su Redis (stato 'ingame', modalità 'ai')
		const playerStatus = JSON.stringify({
			state: "ingame",
			matchMode: MatchMode.AI,
			matchType: MatchType.FFA,
			matchId: matchId,
			opponentId: "CPU_BOT",
			...participant1,
			updatedAt: Date.now(),
		});

		// Settiamo lo status dell'utente
		await this.redis.set(USER_STATUS_KEY, playerStatus, "EX", 3600);

		// Prepariamo il payload per il Game Server
		const payload = {
			gameId: matchId,
			playersData: [participant1, participant2].map(
				({ characterName, userDbId, isAiPlayer }) => ({
					characterName,
					userDbId,
					isAiPlayer,
				}),
			),
			matchType: MatchType.FFA,
			matchMode: MatchMode.AI,
		};

		try {
			const url = "http://game-service:3000/matchmaking/create-match";
			await firstValueFrom(this.httpService.post(url, payload));
			this.logger.log(
				`[AiMatch] Match vs AI inviato al Game Server per ${data.userDbId}`,
			);
		} catch (error) {
			this.logger.error(
				"Errore invio match AI al Game Server:",
				error.response?.data || error.message,
			);
		}

		// Settiamo la chiave per il cleanup globale (User Reale + Bot ID)
		await this.redis.set(
			`match_players:${matchId}`,
			`${data.userDbId},ai_bot_${matchId}`,
			"EX",
			3600,
		);

		// Notifica al frontend tramite Socket
		const matchFoundData = { status: "MATCH_FOUND", matchId: matchId };
		if (data.socketId) {
			this.eventEmitter.emit("match.found.internal", {
				socketId: data.socketId,
				data: matchFoundData,
			});
		}

		this.logger.log(
			`[AiMatch] Utente ${data.userDbId} vs AI avviato. GameId: ${matchId}`,
		);
		return { status: "AI_MATCH_STARTED", matchId };
	}

	/* ---------------------------------------------------------------------------------------------------------------- */

	async getQueueCount() {
		const QUEUE_KEY = "matchmaking_queue";
		const count = await this.redis.zcard(QUEUE_KEY); // zcard restituisce il numero di elementi in una sorted set
		return { queueCount: count };
	}
}
