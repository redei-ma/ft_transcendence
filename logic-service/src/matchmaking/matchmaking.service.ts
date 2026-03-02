import { Inject, Injectable } from '@nestjs/common'; // definizione della classe servizio, colui che elabora i dati
import { JoinQueueDto } from './dto/join-queue.dto'; // struttura del dato che ricevo
import Redis from 'ioredis'; // client Redis per interagire col database
import { InjectRedis } from '@nestjs-modules/ioredis'; // modulo per iniettare il client Redis
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MatchmakingService {
  client: any;
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2, // Nest la inietta qui
    private readonly httpService: HttpService,     // Nest la inietta qui
  ) {}

/* ---------------------------------------------------------------------------------------------------------------- */

  // metodo per processare la coda di matchmaking, ovviamente asincrono se no rischiamo di bloccare tutto nel attesa dei dati
  async processQueue(player: JoinQueueDto) {
    const QUEUE_KEY = 'matchmaking_queue'; // tutti i valori della coda verranno messi sotto questo nome
    const RANK_TOLERANCE = player.rankRange; // tolleranza rank per trovare un avversario equilibrato

    // controlliamo che le persone in coda non siano già in partita
    const USER_STATUS_KEY = `status:${player.userDbId}`;

    const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
    const statusData = currentStatusRaw ? JSON.parse(currentStatusRaw) : null;

    // analizzo il JSON per vedere se è effettivamente in game
    if (statusData && (statusData.state === 'ingame' || statusData.state === 'searching')) {
      console.log(`Player già esistente con stato ${currentStatusRaw}, verifico se è in partita...`);

      if (statusData.state === 'ingame') {
        // troviamo che colui che ha cercato di fare il matchmaking, teoricamente sarebbe già in partita
        // proviamo a riaggiungerlo alla stessa partita reinviando il socket
        // andiamo a recuperare l'avversario
        const opponentStatusRaw = await this.redis.get(`status:${statusData.opponentId}`);
        // se non troviamo l'avversario, vuol dire che la partita è scaduta o è finita
        if (!opponentStatusRaw) {
          console.log(`[Logic] Partita scaduta o avversario non trovato...`);
          await this.redis.set(USER_STATUS_KEY, JSON.stringify({ 
            state: 'lobby', 
            rank: player.rank,
            characterName: player.characterName,
            isAiPlayer: player.isAiPlayer,
            socketId: player.socketId,
            updatedAt: Date.now()
          }), 'EX', 3600);
          return { status: 'MATCH_EXPIRED_BACK_TO_LOBBY' };
        }
        // se troviamo l'avversario, controlliamo che sia ancora in partita, se no vuol dire che la partita è finita
        const opponentData = JSON.parse(opponentStatusRaw);
        if (opponentData.state !== 'ingame') {
          console.log(`[Logic] L'avversario è già in ${opponentData.state}. Partita conclusa.`);
          await this.redis.set(USER_STATUS_KEY, JSON.stringify({ 
            ...statusData, 
            state: 'lobby',
            updatedAt: Date.now()
          }), 'EX', 3600);
          return { status: 'MATCH_ALREADY_FINISHED' };
        }
        // prendiamo le vecchie informazioni che avevamo salvato su redis e aggiorniamo solo il socketId e il timestamp
        const updatedStatus = { ...statusData, socketId: player.socketId, updatedAt: Date.now() };
        // classico salvataggio su redis
        await this.redis.set(USER_STATUS_KEY, JSON.stringify(updatedStatus), 'EX', 420);
        // prendiamo la stringa ricevuta e vediamo se è valida, in caso ad esempio fosse vuota o corrotta si restituisce una stringa vuota
        const payload = {
            playersData: [
                { ...updatedStatus, userDbId: player.userDbId, playerIndex: statusData.playerIndex || 0 },
                { ...opponentData, userDbId: statusData.opponentId, playerIndex: opponentData.playerIndex || 1 }
            ],
            matchType: statusData.matchType || 'ranked',
            matchMode: statusData.matchMode || 'standard'
        };
        try {
            const url = 'http://backend:3000/matchmaking/create-match';
            await firstValueFrom(this.httpService.post(url, payload));
        } catch (e) { console.error("Errore riconnessione HTTP"); }

        return { status: 'RECONNECTED_TO_GAME', matchId: statusData.matchId };
      }

      if (statusData.state === 'searching') {
        // controlliamo se c'è già qualcuno per lui senza riaggiungerlo
        console.log(`[Logic] Aggiornamento ricerca per ${player.userDbId} con tolleranza ${RANK_TOLERANCE}`);
        const updatedSearching = JSON.stringify({ 
          ...statusData, 
          socketId: player.socketId,
          updatedAt: Date.now() 
        });
        await this.redis.set(USER_STATUS_KEY, updatedSearching, 'EX', 600);
      }
    }
    else {
      console.log(`Nuovo player ${player.userDbId} aggiunto alla coda correttamente, in cerca di match. Rank: ${player.rank}, Tolleranza: ${RANK_TOLERANCE}`);
      const timestamp = Date.now();
      const timeScore = player.rank + (timestamp / 10000000000000);

      // aggiungiamo il player alla coda su Redis
      // zadd permette di aggiungere un elemento ad una sorted set, il primo parametro è il nome della coda, il secondo è il punteggio (rank) e il terzo è l'elemento (userDbId)
      // se il player esiste già nella coda, verifichaimo se il nuovo rank è migliore, in caso lo aggiorniamo
      await this.redis.zadd(QUEUE_KEY, timeScore, player.userDbId);

      // Settiamo lo stato come "searching"
      const searchingStatus = JSON.stringify({ 
        state: 'searching', 
        rank: player.rank,
        characterName: player.characterName,
        isAiPlayer: player.isAiPlayer,
        socketId: player.socketId || undefined,
        updatedAt: Date.now()
      });
      await this.redis.set(USER_STATUS_KEY, searchingStatus, 'EX', 600); // 10 minuti di timeout per la coda
    }
    
    // settiamo quanto vale un rank minimo e un rank massimo per ogni player
    const minRank = player.rank - RANK_TOLERANCE;
    const maxRank = player.rank + RANK_TOLERANCE;

    // cerchiamo nella coda tutti i player che hanno un rank compreso tra minRank e maxRank
    const potentialOpponents = await this.redis.zrangebyscore(QUEUE_KEY, minRank, maxRank);

    // rimuoviamo il player stesso dalla lista degli avversari che si possono sfidare
    const opponents = potentialOpponents.filter(id => id !== player.userDbId);
    console.log(`[Logic] Player ${player.userDbId} in cerca di match. Trovati ${opponents.length} potenziali avversari nella tolleranza (${minRank} - ${maxRank}).`);
    // se troviamo almeno un avversario, creiamo la partita
    if (opponents.length >= 1) {
      const opponentId = opponents[0];
      
      // andiamo a creare dei json su redis in modo tale da tenere traccia dello stato dei player
      // Recuperiamo i dati completi dell'avversario PRIMA di rimuoverlo dalla coda
      const opponentStatusRaw = await this.redis.get(`status:${opponentId}`);
      if (!opponentStatusRaw) {
        // Se l'avversario è sparito proprio ora, resettiamo il player attuale 
        // così può riprovare subito senza aspettare il timeout
        await this.redis.set(USER_STATUS_KEY, JSON.stringify({ 
          state: 'lobby', 
          rank: player.rank,
          characterName: player.characterName,
          isAiPlayer: player.isAiPlayer,
          socketId: player.socketId,
          updatedAt: Date.now()
        }), 'EX', 3600);
        await this.redis.zrem(QUEUE_KEY, player.userDbId); // lo togliamo anche dalla coda
        return { status: 'ERROR_OPPONENT_VANISHED_RETRYING' };
      }
      const opponentData = JSON.parse(opponentStatusRaw);

      // rimuoviamo entrambi i player dalla coda di matchmaking
      await this.redis.zrem(QUEUE_KEY, player.userDbId, opponentId);
      // andiamo a creare un id univoco da assegnare alla partita
      const matchId = `match_${Math.random().toString(36).substring(7)}`;

      // Prepariamo gli oggetti MatchPartecipantData per il compagno
      const participant1 = {
        characterName: player.characterName,
        userDbId: String(player.userDbId),
        isAiPlayer: player.isAiPlayer,
        rank: player.rank,
        socketId: player.socketId,
        playerIndex: 0,
      };

      const participant2 = {
        characterName: opponentData.characterName,
        userDbId: String(opponentId),
        isAiPlayer: opponentData.isAiPlayer,
        rank: opponentData.rank,
        socketId: opponentData.socketId,
        playerIndex: 1,
      };

      // creiamo i dati di stato per entrambi i player (Uniformato con matchMode e updatedAt)
      const playerStatus = JSON.stringify({ 
        state: 'ingame', 
        ...participant1, 
        opponentId: opponentId, 
        matchId, 
        matchMode: player.matchMode || 'standard',
        matchType: player.matchType || 'ranked',
        updatedAt: Date.now()
      });
      const opponentStatus = JSON.stringify({ 
        state: 'ingame', 
        ...participant2, 
        opponentId: player.userDbId, 
        matchId, 
        matchMode: player.matchMode || 'standard',
        matchType: player.matchType || 'ranked',
        updatedAt: Date.now()
      });

      // una volta trovato il match, etichettiamo i player come "in lobby" nel database Redis
      // da notare che se qualcuno crasha durante la partita e giovanni non se ne accorge, i dati rimarranno su redis per 7 minuti (420 secondi) e poi verranno eliminati automaticamente
      await this.redis.set(`status:${player.userDbId}`, playerStatus, 'EX', 420);
      await this.redis.set(`status:${opponentId}`, opponentStatus, 'EX', 420);
      await this.redis.set(`match_players:${matchId}`, `${player.userDbId},${opponentId}`, 'EX', 3600);
      console.log(`[Logic] Match trovato! ${player.userDbId} vs ${opponentId} (Rank: ${player.rank} vs ${opponentData.rank}) - MatchID: ${matchId}`);
      // creiamo un array contente i due player che saranno dentro la partita

      const payload = {
          gameId: String(matchId),
          playersData: [participant1, participant2],
          matchType: player.matchType, // Prendi il tipo dal primo giocatore
          matchMode: player.matchMode  // Prendi il mode dal primo giocatore
      };

      // Inviamo i due oggetti MatchPartecipantData richiesti
      try {
          const url = 'http://backend:3000/matchmaking/create-match'; // L'indirizzo del suo container
          await firstValueFrom(this.httpService.post(url, payload));
          console.log("Richiesta di creazione match inviata con successo via HTTP");
      } catch (error) {
          console.error("Errore nella creazione del match su Game Server:", error.response?.data);
      }

      console.log(`[RankedMatch] Match tra: ${player.userDbId} vs ${opponentId}`);

      // restituzione del match creato con id players e ID del match
      // const matchFoundData = { status: 'MATCH_FOUND', matchId, players: [participant1, participant2] };
      const matchFoundData = { status: 'MATCH_FOUND', matchId: matchId };

      if (opponentData.socketId) {
          this.eventEmitter.emit('match.found.internal', {
              socketId: opponentData.socketId,
              data: matchFoundData
          });
      }
      if (player.socketId) {
          this.eventEmitter.emit('match.found.internal', {
              socketId: player.socketId,
              data: matchFoundData
          });
      }
      return matchFoundData;
    }
    // se nessuno è è un player adatto, restituiamo lo stato di ricerca in corso
    return { status: 'SEARCHING_EQUILIBRATED_MATCH' };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async processUnrankedQueue(player: JoinQueueDto) {
    const QUEUE_KEY = 'matchmaking_queue_unranked'; // Usiamo una coda separata per unranked
    const USER_STATUS_KEY = `status:${player.userDbId}`;

    // 1. Controllo Stato Attuale (Riconnessione o Già in ricerca)
    const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
    const statusData = currentStatusRaw ? JSON.parse(currentStatusRaw) : null;

    if (statusData && (statusData.state === 'ingame' || statusData.state === 'searching')) {
        if (statusData.state === 'ingame') {
            // Logica Riconnessione (identica alla ranked)
            const opponentStatusRaw = await this.redis.get(`status:${statusData.opponentId}`);
            if (!opponentStatusRaw) {
                await this.redis.set(USER_STATUS_KEY, JSON.stringify({ 
                    state: 'lobby', rank: player.rank, characterName: player.characterName,
                    isAiPlayer: player.isAiPlayer, socketId: player.socketId, updatedAt: Date.now()
                }), 'EX', 3600);
                return { status: 'MATCH_EXPIRED_BACK_TO_LOBBY' };
            }
            
            const opponentData = JSON.parse(opponentStatusRaw);
            const updatedStatus = { ...statusData, socketId: player.socketId, updatedAt: Date.now() };
            await this.redis.set(USER_STATUS_KEY, JSON.stringify(updatedStatus), 'EX', 420);

            const payload = {
                gameId: statusData.matchId,
                playersData: [
                    { ...updatedStatus, userDbId: player.userDbId, playerIndex: statusData.playerIndex || 0 },
                    { ...opponentData, userDbId: statusData.opponentId, playerIndex: opponentData.playerIndex || 1 }
                ],
                matchType: 'unranked',
                matchMode: statusData.matchMode || 'standard'
            };
            try {
                await firstValueFrom(this.httpService.post('http://backend:3000/matchmaking/create-match', payload));
            } catch (e) { console.error("Errore riconnessione HTTP Unranked"); }

            return { status: 'RECONNECTED_TO_GAME', matchId: statusData.matchId };
        }

        if (statusData.state === 'searching') {
            const updatedSearching = JSON.stringify({ ...statusData, socketId: player.socketId, updatedAt: Date.now() });
            await this.redis.set(USER_STATUS_KEY, updatedSearching, 'EX', 600);
        }
    } else {
        // 2. Aggiunta in Coda (Punteggio basato solo sul tempo per Unranked)
        const timestamp = Date.now();
        await this.redis.zadd(QUEUE_KEY, timestamp, player.userDbId);

        const searchingStatus = JSON.stringify({ 
            state: 'searching', rank: player.rank, characterName: player.characterName,
            isAiPlayer: player.isAiPlayer, socketId: player.socketId, updatedAt: Date.now()
        });
        await this.redis.set(USER_STATUS_KEY, searchingStatus, 'EX', 600);
    }

    // 3. Ricerca Avversario (Senza limiti di Rank)
    // Prendiamo i primi 2 elementi della coda
    const potentialOpponents = await this.redis.zrange(QUEUE_KEY, 0, 1);

    // Filtriamo noi stessi
    const opponents = potentialOpponents.filter(id => id !== String(player.userDbId));

    if (opponents.length >= 1) {
        const opponentId = opponents[0];
        const opponentStatusRaw = await this.redis.get(`status:${opponentId}`);
        
        if (!opponentStatusRaw) {
            await this.redis.zrem(QUEUE_KEY, opponentId); // Pulizia se l'avversario è sparito
            return { status: 'SEARCHING_UNRANKED_MATCH' };
        }

        const opponentData = JSON.parse(opponentStatusRaw);

        // Rimuoviamo entrambi dalla coda
        await this.redis.zrem(QUEUE_KEY, player.userDbId, opponentId);
        
        const matchId = `match_unranked_${Math.random().toString(36).substring(7)}`;

        const participant1 = {
            characterName: player.characterName,
            userDbId: String(player.userDbId),
            isAiPlayer: player.isAiPlayer,
            rank: player.rank, // Lo inviamo comunque per i log/display
            socketId: player.socketId,
            playerIndex: 0,
        };

        const participant2 = {
            characterName: opponentData.characterName,
            userDbId: String(opponentId),
            isAiPlayer: opponentData.isAiPlayer,
            rank: opponentData.rank,
            socketId: opponentData.socketId,
            playerIndex: 1,
        };

        const playerStatus = JSON.stringify({ 
            state: 'ingame', ...participant1, opponentId, matchId, 
            matchMode: player.matchMode || 'standard', matchType: 'unranked', updatedAt: Date.now()
        });
        const opponentStatus = JSON.stringify({ 
            state: 'ingame', ...participant2, opponentId: player.userDbId, matchId, 
            matchMode: player.matchMode || 'standard', matchType: 'unranked', updatedAt: Date.now()
        });

        await this.redis.set(`status:${player.userDbId}`, playerStatus, 'EX', 420);
        await this.redis.set(`status:${opponentId}`, opponentStatus, 'EX', 420);
        
        // Salvataggio per la tua nuova funzione finalizeMatch globale
        await this.redis.set(`match_players:${matchId}`, `${player.userDbId},${opponentId}`, 'EX', 3600);

        const payload = {
            gameId: matchId,
            playersData: [participant1, participant2],
            matchType: 'unranked',
            matchMode: player.matchMode
        };

        try {
            await firstValueFrom(this.httpService.post('http://backend:3000/matchmaking/create-match', payload));
        } catch (error) {
            console.error("Errore creazione match Unranked:", error.response?.data);
        }

        const matchFoundData = { status: 'MATCH_FOUND', matchId };

        if (opponentData.socketId) {
            this.eventEmitter.emit('match.found.internal', { socketId: opponentData.socketId, data: matchFoundData });
        }
        if (player.socketId) {
            this.eventEmitter.emit('match.found.internal', { socketId: player.socketId, data: matchFoundData });
        }

        return matchFoundData;
    }

    return { status: 'SEARCHING_UNRANKED_MATCH' };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async leaveQueue(player: JoinQueueDto) {
    // abbiamo la coda di matchmaking e la chiave per lo stato dell'utente
    const QUEUE_KEY = 'matchmaking_queue';
    const USER_STATUS_KEY = `status:${player.userDbId}`;

    // ZREM rimuove l'elemento dal Sorted Set usando l'ID
    const result = await this.redis.zrem(QUEUE_KEY, player.userDbId);

    // Prepariamo lo stato lobby mantenendo i dati che l'utente aveva nel DTO
    // In questo modo, tornando nella Home, il sistema si ricorda ancora chi è e che personaggio ha
    const lobbyStatus = JSON.stringify({ 
      state: 'lobby', 
      rank: player.rank,
      characterName: player.characterName,
      isAiPlayer: player.isAiPlayer,
      socketId: player.socketId || undefined,
      updatedAt: Date.now() 
    });

    // lo setto in qualsiasi caso nello stato di lobby, evitando problemi di player incastrati
    // Usiamo una scadenza di 1 ora (3600 secondi)
    await this.redis.set(USER_STATUS_KEY, lobbyStatus, 'EX', 3600);

    // result è 1 se l'ID è stato trovato e rimosso, 0 se non c'era
    if (result === 1) {
      console.log(`[Logic] Utente ${player.userDbId} rimosso dalla coda correttamente e riportato in lobby.`);
      return { status: 'LEFT_QUEUE_SUCCESS', userDbId: player.userDbId };
    } else {
      console.log(`[Logic] Tentativo di rimozione: ${player.userDbId} non era in coda, ma lo stato è stato resettato a lobby.`);
      return { status: 'NOT_IN_QUEUE', userDbId: player.userDbId };
    }
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async finalizeMatch(matchId: string) {
    // 1. Recuperiamo gli ID associati al match (es: "123" oppure "123,456")
    const playersRaw = await this.redis.get(`match_players:${matchId}`);
    console.log(`[Cleanup] Avvio finalizzazione globale per MatchID: ${matchId}`);

    if (!playersRaw) {
        console.log(`[Cleanup] Match ${matchId} non trovato o già rimosso.`);
        return { status: 'MATCH_ALREADY_CLEANED' };
    }

    // 2. Otteniamo la lista degli ID
    const playerIds = playersRaw.split(',');

    for (const userId of playerIds) {
        // SALTO IL BOT O IL GUEST:
        // Se l'ID contiene "ai_bot" o "guest", non dobbiamo ripristinare uno stato lobby
        // perché non sono utenti reali nel database.
        if (userId.includes('ai_bot') || userId.includes('guest')) {
            console.log(`[Cleanup] Skippato ripristino per entità non-user: ${userId}`);
            continue;
        }

        const USER_STATUS_KEY = `status:${userId}`;
        const dataRaw = await this.redis.get(USER_STATUS_KEY);

        if (dataRaw) {
            const userData = JSON.parse(dataRaw);
            
            // Creiamo lo stato lobby (Uniformato)
            const lobbyStatus = JSON.stringify({ 
                state: 'lobby', 
                userDbId: String(userId),
                characterName: userData.characterName,
                // In lobby l'utente reale non è mai un AI player
                isAiPlayer: false, 
                rank: userData.rank,
                socketId: userData.socketId || undefined,
                updatedAt: Date.now() 
            });

            // Riportiamo l'utente in lobby per 1 ora
            await this.redis.set(USER_STATUS_KEY, lobbyStatus, 'EX', 3600);
            console.log(`[Cleanup] Utente ${userId} riportato in lobby.`);
        }
    }

    // 3. Eliminiamo l'indice del match per liberare memoria
    await this.redis.del(`match_players:${matchId}`);

    console.log(`[Cleanup] Match ${matchId} rimosso con successo.`);
    return { status: 'MATCH_FINALIZED', matchId };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async createChallenge(player: JoinQueueDto, opponentId: string) {
    const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${player.userDbId}`;
    const exists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);
    // controlliamo se esiste già una sfida tra questi due utenti, se sì ritorniamo un messaggio di errore
    if (exists) {
      return { status: 'ERROR_CHALLENGE_EXISTS', message: 'Una sfida tra questi due utenti è già in corso'};
    }

    // recuperiamo lo stato attuale del player che lancia la sfida
    const currentStatusRaw = await this.redis.get(`status:${player.userDbId}`);
    const currentStatus = currentStatusRaw ? JSON.parse(currentStatusRaw) : null;

    // Se l'utente è già 'ingame', non può sfidare nessuno
    if (currentStatus && currentStatus.state === 'ingame') {
        return { status: 'ERROR_ALREADY_IN_GAME' };
    }

    // Salviamo i dati del DTO su Redis senza forzare lo stato a 'searching' 
    // se l'utente era già in 'lobby', lo lasciamo in 'lobby' o creiamo un oggetto di supporto
    const challengeData = { 
      ...player, 
      state: currentStatus?.state || 'lobby', // Manteniamo lo stato precedente
      lastChallengeSent: opponentId,
      updatedAt: Date.now()
    };
    
    await this.redis.set(`status:${player.userDbId}`, JSON.stringify(challengeData), 'EX', 600);
    
    // La sfida vera e propria rimane una chiave a parte
    await this.redis.set(UNIQUE_CHALLENGE_KEY, 'pending', 'EX', 30);
    
    return { status: 'CHALLENGE_SENT', challengerId: player.userDbId, opponentId };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async acceptChallenge(challengerId: string, opponent: JoinQueueDto) {
    const UNIQUE_CHALLENGE_KEY = `challenge:${opponent.userDbId}:${challengerId}`; // ricostruzione chiave sfida
    const QUEUE_KEY = 'matchmaking_queue'; // chiave della coda globale
    
    // controllo per vedere se la sfida esiste ancora su redis
    const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);
    if (!challengeExists) return { status: 'ERROR_EXPIRED' };
    
    // Recuperiamo lo stato del challenger per assicurarci che non sia entrato in un altro game nel frattempo
    const statusA = await this.redis.get(`status:${challengerId}`);
    
    // Funzione di supporto per verificare se un player è già in partita
    const isInGame = (raw: string | null) => raw && JSON.parse(raw).state === 'ingame';
    
    // Se il challenger è già impegnato, la sfida non può partire
    if (isInGame(statusA)) {
      return { status: 'ERROR_CHALLENGER_ALREADY_IN_MATCH' };
    }

    // Estraiamo i dati del challenger (che avevamo salvato nel createChallenge)
    const challengerData = statusA ? JSON.parse(statusA) : {};

    // Rimuoviamo ENTRAMBI dalla coda di matchmaking globale
    // Se erano in 'searching', questa operazione li "dirotta" ufficialmente verso la sfida privata
    await this.redis.zrem(QUEUE_KEY, challengerId, opponent.userDbId);
    
    // creiamo l'id univoco della partita privata
    const matchId = `private_${Math.random().toString(36).substring(7)}`;
    
    // Prepariamo gli oggetti partecipante usando il DTO per l'opponent e i dati Redis per il challenger
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
        rank: opponent.rank || 0,
        socketId: opponent.socketId || undefined,
        playerIndex: 1,
    };

    // Settiamo lo stato "ingame" per entrambi (Uniformato)
    const playerStatus = JSON.stringify({ 
      state: 'ingame', 
      ...participant1, 
      opponentId: opponent.userDbId, 
      matchId,
      matchType: challengerData.matchType || 'unranked',
      matchMode: challengerData.matchMode || 'standard',
      updatedAt: Date.now()
    });
    const opponentStatus = JSON.stringify({ 
      state: 'ingame', 
      ...participant2, 
      opponentId: challengerId, 
      matchId,
      matchType: challengerData.matchType || 'unranked',
      matchMode: challengerData.matchMode || 'standard',
      updatedAt: Date.now()
    });
    
    await this.redis.set(`status:${challengerId}`, playerStatus, 'EX', 420);
    await this.redis.set(`status:${opponent.userDbId}`, opponentStatus, 'EX', 420);
    
    // Notifichiamo Piro. Se erano in coda, la sfida privata vince e crea il game
    const payload = {
        gameId: String(matchId),
        playersData: [participant1, participant2],
        matchType: challengerData.matchType || 'unranked', // Forziamo unranked se non specificato
        matchMode: challengerData.matchMode || 'standard' 
    };
    try {
          const url = 'http://backend:3000/matchmaking/create-match';
          // Utilizziamo firstValueFrom per gestire l'Observable di httpService
          await firstValueFrom(this.httpService.post(url, payload));
          console.log(`[HTTP] Match privato creato con successo sul Game Server: ${matchId}`);
      } catch (error) {
          console.error("Errore creazione match privato su Game Server:", error.response?.data || error.message);
          // Opzionale: gestire qui il rollback dello stato redis se la creazione fallisce
      }

    // Pulizia della chiave sfida
    await this.redis.del(UNIQUE_CHALLENGE_KEY);

    console.log(`[Logic] Sfida accettata: ${challengerId} e ${opponent.userDbId} dirottati dalla coda al match privato ${matchId}`);

    return { status: 'MATCH_FOUND', matchId, players: [participant1, participant2] };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async rejectChallenge(challengerId: string, opponent: JoinQueueDto) {
    // Ricostruiamo la chiave unica che avevamo creato in createChallenge
    const UNIQUE_CHALLENGE_KEY = `challenge:${opponent.userDbId}:${challengerId}`;

    // verifico se la sfida esiste ancora su Redis, se no vuol dire che è già scaduta o non esiste più, quindi ritorniamo un messaggio di errore
    const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);

    if (!challengeExists) {
      return { status: 'ERROR_CHALLENGE_NOT_FOUND', message: 'La sfida è già scaduta o non esiste più.' };
    }

    // se è ancora presente su redis, la eliminiamo per indicare che è stata rifiutata e non è più valida
    await this.redis.del(UNIQUE_CHALLENGE_KEY);

    console.log(`[Logic] L'utente ${opponent.userDbId} (Rank: ${opponent.rank}) ha rifiutato la sfida di ${challengerId}.`);

    // ritorno lo stato di sfida rifiutata, con gli id dei player coinvolti
    return { status: 'CHALLENGE_REJECTED', challengerId, opponentId: opponent.userDbId };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async cancelChallenge(player: JoinQueueDto, opponentId: string) {
    // Ricostruiamo la chiave unica usando il DTO del challenger
    const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${player.userDbId}`;

    const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);

    if (!challengeExists) {
      return { status: 'ERROR_CHALLENGE_NOT_FOUND', message: 'La sfida è già scaduta o non esiste più.' };
    }

    // Eliminiamo la sfida
    await this.redis.del(UNIQUE_CHALLENGE_KEY);

    // Logghiamo l'azione usando il DTO per avere più contesto se serve
    console.log(`[Logic] L'utente ${player.userDbId} (Rank: ${player.rank}) ha annullato la sfida verso ${opponentId}.`);

    return { status: 'CHALLENGE_CANCELLED', challengerId: player.userDbId, opponentId };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async startLocalMatch(data: any) { // Cambiamo la firma per accettare l'oggetto unico
    const USER_STATUS_KEY_1 = `status:${data.userDbId}`;
    
    await this.redis.zrem('matchmaking_queue', data.userDbId);
    const matchId = `local_${Math.random().toString(36).substring(7)}`;

    // Estraiamo i nomi dei personaggi dall'array inviato dal frontend
    const charP1 = Array.isArray(data.characterName) ? data.characterName[0] : data.characterName;
    const charP2 = Array.isArray(data.characterName) ? data.characterName[1] : 'Guest';

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
        userDbId: `guest_${data.userDbId}`,
        isAiPlayer: false,
        rank: data.rank,
        socketId: data.socketId,
        playerIndex: 1,
    };

    const playerStatus = JSON.stringify({ 
        state: 'ingame', 
        matchMode: 'local',
        matchType: 'unranked',
        matchId: matchId,
        opponentId: 'LOCAL_GUEST',
        ...participant1,
        updatedAt: Date.now()
    });

    await this.redis.set(USER_STATUS_KEY_1, playerStatus, 'EX', 3600);

    const payload = {
        gameId: matchId,
        playersData: [participant1, participant2],
        matchType: 'unranked',
        matchMode: 'local'
    };
    
    try {
        const url = 'http://backend:3000/matchmaking/create-match';
        await firstValueFrom(this.httpService.post(url, payload));
        console.log(`[LocalMatch] Sessione locale inviata al Game Server per ${charP1.userDbId}`);
    } catch (error) {
        console.error("Errore invio match locale al Game Server:", error.response?.data || error.message);
    }

    await this.redis.set(`match_players:${matchId}`, `${data.userDbId},guest_${data.userDbId}`, 'EX', 3600);
    
    if (data.socketId) {
        this.eventEmitter.emit('match.found.internal', {
            socketId: data.socketId,
            data: { status: 'MATCH_FOUND', matchId: matchId }
        });
    }

    return { status: 'LOCAL_MATCH_STARTED', userDbId: data.userDbId };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async startAiMatch(data: any) {
    const USER_STATUS_KEY = `status:${data.userDbId}`;
    
    // 1. Pulizia: rimuoviamo l'utente da eventuali code attive
    await this.redis.zrem('matchmaking_queue', data.userDbId);
    await this.redis.zrem('matchmaking_queue_unranked', data.userDbId);

    const matchId = `ai_${Math.random().toString(36).substring(7)}`;

    // Estraiamo i nomi dei personaggi dall'array (stessa logica di local)
    const charP1 = Array.isArray(data.characterName) ? data.characterName[0] : data.characterName;
    // Se il frontend non passa un nome per il bot nell'array, usiamo 'CPU_Bot'
    const charP2 = Array.isArray(data.characterName) && data.characterName[1] ? data.characterName[1] : 'CPU_Bot';

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
        state: 'ingame', 
        matchMode: 'ai', 
        matchType: 'unranked',
        matchId: matchId,
        opponentId: 'CPU_BOT',
        ...participant1,
        updatedAt: Date.now()
    });

    // Settiamo lo status dell'utente
    await this.redis.set(USER_STATUS_KEY, playerStatus, 'EX', 3600);

    // Prepariamo il payload per il Game Server
    const payload = {
        gameId: matchId,
        playersData: [participant1, participant2],
        matchType: 'unranked',
        matchMode: 'ai'
    };
    
    try {
        const url = 'http://backend:3000/matchmaking/create-match';
        await firstValueFrom(this.httpService.post(url, payload));
        console.log(`[AiMatch] Match vs AI inviato al Game Server per ${data.userDbId}`);
    } catch (error) {
        console.error("Errore invio match AI al Game Server:", error.response?.data || error.message);
    }

    // Settiamo la chiave per il cleanup globale (User Reale + Bot ID)
    await this.redis.set(`match_players:${matchId}`, `${data.userDbId},ai_bot_${matchId}`, 'EX', 3600);

    // Notifica al frontend tramite Socket
    const matchFoundData = { status: 'MATCH_FOUND', matchId: matchId };
    if (data.socketId) {
        this.eventEmitter.emit('match.found.internal', {
            socketId: data.socketId,
            data: matchFoundData
        });
    }

    console.log(`[AiMatch] Utente ${data.userDbId} vs AI avviato. GameId: ${matchId}`);
    return { status: 'AI_MATCH_STARTED', matchId };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async getQueueCount() {
    const QUEUE_KEY = 'matchmaking_queue';
    const count = await this.redis.zcard(QUEUE_KEY); // zcard restituisce il numero di elementi in una sorted set
    return { queueCount: count };
  }
}