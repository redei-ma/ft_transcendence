import { Inject, Injectable } from '@nestjs/common'; // definizione della classe servizio, colui che elabora i dati
import { JoinQueueDto } from './dto/join-queue.dto'; // struttura del dato che ricevo
import Redis from 'ioredis'; // client Redis per interagire col database
import { InjectRedis } from '@nestjs-modules/ioredis'; // modulo per iniettare il client Redis
import { ClientProxy } from '@nestjs/microservices';

@Injectable() // decoratore della classe, permette di "iniettare" il servizio in altri file
export class MatchmakingService { // definizione del service
    // configuriamo il collegaento tra il codice e il container di redis, creiamo una variabile interna al servizio, readonly, usabile ovunque con this.
  constructor(
    @InjectRedis() private readonly redis: Redis, // serve per poter leggere e scrivere su redis
    @Inject('RENATO_SERVICE') private readonly client: ClientProxy, // client che permette di parlare con renna via redis
  ) {}

/* ---------------------------------------------------------------------------------------------------------------- */

  // metodo per processare la coda di matchmaking, ovviamente asincrono se no rischiamo di bloccare tutto nel attesa dei dati
  async processQueue(player: JoinQueueDto) {
    const QUEUE_KEY = 'matchmaking_queue'; // tutti i valori della coda verranno messi sotto questo nome
    const RANK_TOLERANCE = 100; // tolleranza rank per trovare un avversario equilibrato

    // controlliamo che le persone in coda non siano già in partita
    const USER_STATUS_KEY = `status:${player.userId}`;
    const currentStatusRaw = await this.redis.get(USER_STATUS_KEY);
    
    // analizzo il JSON per vedere se è effettivamente in game
    if (currentStatusRaw !== null) {
      const statusData = JSON.parse(currentStatusRaw);
      if (statusData.state === 'ingame') {
          console.log(`[Logic] Utente con ID ${player.userId} è già in partita.`);
          return { status: 'ERROR_ALREADY_IN_GAME' };
      }

      if (statusData.state === 'searching') {
          // controlliamo se c'è già qualcuno per lui senza riaggiungerlo
          console.log(`[Logic] Utente ${player.userId} è già in coda, controllo avversari...`);
      }
    }
    else {
      const timestamp = Date.now();
      const timeScore = player.rank + (timestamp / 10000000000000);

      // aggiungiamo il player alla coda su Redis
      // zadd permette di aggiungere un elemento ad una sorted set, il primo parametro è il nome della coda, il secondo è il punteggio (rank) e il terzo è l'elemento (userId)
      // se il player esiste già nella coda, verifichaimo se il nuovo rank è migliore, in caso lo aggiorniamo
      await this.redis.zadd(QUEUE_KEY, timeScore, player.userId);

      // Settiamo lo stato come "searching" includendo i nuovi dati richiesti dal compagno
      const searchingStatus = JSON.stringify({ 
        state: 'searching', 
        rank: player.rank,
        characterName: player.characterName,
        isAiPlayer: player.isAiPlayer,
        socketId: player.socketId || undefined
      });
      await this.redis.set(USER_STATUS_KEY, searchingStatus, 'EX', 600); // 10 minuti di timeout per la coda
    }
    
    // settiamo quanto vale un rank minimo e un rank massimo per ogni player
    const minRank = player.rank - RANK_TOLERANCE;
    const maxRank = player.rank + RANK_TOLERANCE;

    // cerchiamo nella coda tutti i player che hanno un rank compreso tra minRank e maxRank
    const potentialOpponents = await this.redis.zrangebyscore(QUEUE_KEY, minRank, maxRank);

    // rimuoviamo il player stesso dalla lista degli avversari che si possono sfidare
    const opponents = potentialOpponents.filter(id => id !== player.userId);

    // se troviamo almeno un avversario, creiamo la partita
    if (opponents.length >= 1) {
      const opponentId = opponents[0];
      
      // andiamo a creare dei json su redis in modo tale da tenere traccia dello stato dei player
      // Recuperiamo i dati completi dell'avversario PRIMA di rimuoverlo dalla coda
      const opponentStatusRaw = await this.redis.get(`status:${opponentId}`);
      if (!opponentStatusRaw) {
        return { status: 'ERROR_OPPONENT_DATA_NOT_FOUND' };
      }
      const opponentData = JSON.parse(opponentStatusRaw);

      // rimuoviamo entrambi i player dalla coda di matchmaking
      await this.redis.zrem(QUEUE_KEY, player.userId, opponentId);

      // Prepariamo gli oggetti MatchPartecipantData per il compagno
      const participant1 = {
        socketId: player.socketId,
        characterName: player.characterName,
        userDbId: player.userId,
        isAiPlayer: player.isAiPlayer,
        playerIndex: 0,
        matchMode: player.matchMode,
        matchType: player.matchType
      };

      const participant2 = {
        socketId: opponentData.socketId,
        characterName: opponentData.characterName,
        userDbId: opponentId,
        isAiPlayer: opponentData.isAiPlayer,
        playerIndex: 1,
        matchMode: opponentData.matchMode,
        matchType: opponentData.matchType
      };

      // creiamo i dati di stato per entrambi i player (usiamo 'lobby' come stato intermedio)
      const playerStatus = JSON.stringify({ state: 'ingame', ...participant1, opponentId: opponentId });
      const opponentStatus = JSON.stringify({ state: 'ingame', ...participant2, opponentId: player.userId });

      // una volta trovato il match, etichettiamo i player come "in lobby" nel database Redis
      // da notare che se qualcuno crasha durante la partita e giovanni non se ne accorge, i dati rimarranno su redis per 7 minuti (420 secondi) e poi verranno eliminati automaticamente
      await this.redis.set(`status:${player.userId}`, playerStatus, 'EX', 420);
      await this.redis.set(`status:${opponentId}`, opponentStatus, 'EX', 420);

      // andiamo a creare un id univoco da assegnare alla partita
      const matchId = `match_${Math.random().toString(36).substring(7)}`;

      // creiamo un array contente i due player che saranno dentro la partita
      const playersData = [participant1, participant2];
      // Inviamo i due oggetti MatchPartecipantData richiesti
      this.client.emit('create_match', playersData);

      console.log(`[RankedMatch] Match tra: ${player.userId} vs ${opponentId}`);

      // restituzione del match creato con id players e ID del match
      return { 
        status: 'MATCH_FOUND', 
        matchId, 
        players: [participant1, participant2] 
      };
    }
    // se nessuno è è un player adatto, restituiamo lo stato di ricerca in corso
    return { status: 'SEARCHING_EQUILIBRATED_MATCH' };
}

/* ---------------------------------------------------------------------------------------------------------------- */

async leaveQueue(player: JoinQueueDto) {
    // abbiamo la coda di matchmaking e la chiave per lo stato dell'utente
    const QUEUE_KEY = 'matchmaking_queue';
    const USER_STATUS_KEY = `status:${player.userId}`;

    // ZREM rimuove l'elemento dal Sorted Set usando l'ID
    const result = await this.redis.zrem(QUEUE_KEY, player.userId);

    // Prepariamo lo stato lobby mantenendo i dati che l'utente aveva nel DTO
    // In questo modo, tornando nella Home, il sistema si ricorda ancora chi è e che personaggio ha
    const lobbyStatus = JSON.stringify({ 
      state: 'lobby', 
      rank: player.rank,
      characterName: player.characterName,
      isAiPlayer: player.isAiPlayer,
      updatedAt: Date.now() 
    });

    // lo setto in qualsiasi caso nello stato di lobby, evitando problemi di player incastrati
    // Usiamo una scadenza di 1 ora (3600 secondi)
    await this.redis.set(USER_STATUS_KEY, lobbyStatus, 'EX', 3600);

    // result è 1 se l'ID è stato trovato e rimosso, 0 se non c'era
    if (result === 1) {
      console.log(`[Logic] Utente ${player.userId} rimosso dalla coda correttamente e riportato in lobby.`);
      return { status: 'LEFT_QUEUE_SUCCESS', userId: player.userId };
    } else {
      console.log(`[Logic] Tentativo di rimozione: ${player.userId} non era in coda, ma lo stato è stato resettato a lobby.`);
      return { status: 'NOT_IN_QUEUE', userId: player.userId };
    }
  }

/* ---------------------------------------------------------------------------------------------------------------- */

async updateRanks(winnerId: string, loserId: string) {
    // chiediamo a Redis i rank attuali dei due giocatori
    const winnerDataRaw = await this.redis.get(`status:${winnerId}`);
    const loserDataRaw = await this.redis.get(`status:${loserId}`);

    // controlliamo di avere tutto, in caso contrario logghiamo l'errore e usciamo
    if (winnerDataRaw === null || loserDataRaw === null) {
      console.log(`[Error] Impossibile recuperare i rank per ${winnerId} o ${loserId}`);
      return { status: 'ERROR_RETRIEVING_RANKS' };
    }

    // estraiamo i rank dai dati JSON (ora contengono anche characterName, isAiPlayer, ecc.)
    const winnerData = JSON.parse(winnerDataRaw);
    const loserData = JSON.parse(loserDataRaw);

    // Prepariamo lo stato Lobby per il dopo-partita mantenendo i dati del DTO
    // Questo serve a Francesco (Frontend) per sapere che l'utente è tornato nel menu principale
    const lobbyStatusWinner = JSON.stringify({ 
        state: 'lobby', 
        rank: winnerData.rank, 
        characterName: winnerData.characterName,
        isAiPlayer: winnerData.isAiPlayer,
        updatedAt: Date.now() 
    });

    const lobbyStatusLoser = JSON.stringify({ 
        state: 'lobby', 
        rank: loserData.rank,
        characterName: loserData.characterName,
        isAiPlayer: loserData.isAiPlayer,
        updatedAt: Date.now() 
    });

    // ovviamente se un match è privato non aggiorniamo i rank, ma li riportiamo comunque in lobby
    if (winnerData.type === 'private' || loserData.type === 'private') {
       await this.redis.set(`status:${winnerId}`, lobbyStatusWinner, 'EX', 3600);
       await this.redis.set(`status:${loserId}`, lobbyStatusLoser, 'EX', 3600);
       return { status: 'PRIVATE_MATCH_FINISHED_NO_RANK_UPDATE' };
    }
    
    // settiamo a quanto sono i rank dei player (calcolo ELO professionale)
    const Ra = Number(winnerData.rank);
    const Rb = Number(loserData.rank);

    // Ea rappresenta la probabilità che il vincitore avesse di vincere
    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400));

    // il fattore K indica il massimo dei punti che si possono vincere o perdere in un match, solitamente viene messo a 32
    const K = 40;

    // Formula: NuovoRank = VecchioRank + K * (Risultato - Aspettativa)
    // Il risultato per il vincitore è sempre 1.
    const pointsToAdd = Math.round(K * (1 - Ea));

    // per chi perde facciamo in modo che perda una quantità di punti leggermente inferiore a quelli che l'altro guadagna
    const pointsToRemove = Math.round(pointsToAdd * 0.8); // Esempio: perde l'80% di quelli che l'altro guadagna

    // Assicuriamoci un minimo di punti (es. almeno 5)
    const finalWinnerPoints = Math.max(pointsToAdd, 5);
    const finalLoserPoints = Math.max(pointsToRemove, 2);

    // aggiornamento dei rank del database di renna
    this.client.emit('update_user_db', {
      userId: winnerId,
      points: finalWinnerPoints,
      action: 'INCREMENT'
    }); // tutta questa parte serve per mandare un messaggio a renna e dirgli che deve aggiornare i rank come gli sto dicendo io, ovvero aggiungendo/sottraendo punti ai rank dei player

    this.client.emit('update_user_db', {
      userId: loserId,
      points: finalLoserPoints, // il perdente perde metà dei punti guadagnati dal vincitore
      action: 'DECREMENT'
    });

    // ripuliamo il server di redis e evitiamo di avere chiavi inutili o player fantasma
    // Invece di del(...), riportiamo i player nello stato 'lobby' con scadenza di 1 ora
    await this.redis.set(`status:${winnerId}`, lobbyStatusWinner, 'EX', 3600);
    await this.redis.set(`status:${loserId}`, lobbyStatusLoser, 'EX', 3600);

    console.log(`[RankSystem] Match concluso. Winner: +${finalWinnerPoints}, Loser: -${finalLoserPoints}. Player riportati in lobby.`);

    return { status: 'RANK_UPDATED' };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async createChallenge(challengerId: string, opponentId: string) { // funzione asincrona, ricevo gli id dei due player
    // chiave della sfida composta dagli id dell'avversario e del challenger, in questo modo è univoca e non ci sono problemi di sovrascrittura
    const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${challengerId}`;
    // variabile che conterrà il risultato della verifica dell'esistenza della chiave su redis
    const exists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);
    if (exists) {
      return { status: 'ERROR_CHALLENGE_EXISTS', message: 'Una sfida tra questi due utenti è già in corso'}; // messaggio di ritorno in caso la sfida esista già
    }
    // creiamo una chiave su redis che rappresenta la sfida, con scadenza di 30 secondi
    await this.redis.set(UNIQUE_CHALLENGE_KEY, 'pending', 'EX', 30);
    console.log(`[Logic] Sfida inviata da ${challengerId} a ${opponentId}.`);
    // ritorniamo il fatto che la sfida è stata inviata
    return { status: 'CHALLENGE_SENT', challengerId, opponentId };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

  async acceptChallenge(challengerId: string, opponentId: string) {
    const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${challengerId}`; // ricostruzione chiave sfida
    const QUEUE_KEY = 'matchmaking_queue';
    // controllo per vedere se la sfida esiste ancora su redis
    const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);
    if (!challengeExists) return { status: 'ERROR_EXPIRED' };
    // controlliamo che nessuno dei due player sia già dentro al database di redis, segnato come in game
    const statusA = await this.redis.get(`status:${challengerId}`);
    const statusB = await this.redis.get(`status:${opponentId}`);
    // funzione di supporto per verificare se un player è in game
    const isInGame = (raw: string | null) => raw && JSON.parse(raw).state === 'ingame';
    // se uno dei due è in game, ritorniamo errore
    if (isInGame(statusA) || isInGame(statusB)) {
      return { status: 'ERROR_PLAYER_ALREADY_IN_MATCH' };
    }
    // rimuoviamo entrambi i player dalla coda di matchmaking, se per caso erano entrati in coda
    await this.redis.zrem(QUEUE_KEY, challengerId, opponentId);
    // creiamo l'id univoco della partita privata
    const matchId = `private_${Math.random().toString(36).substring(7)}`;
    // settiamo lo stato di entrambi i player come "in partita" su redis, con scadenza di 7 minuti per evitare problemi di player fantasma in caso di crash o disconnessione improvvisa
    const status = JSON.stringify({ state: 'ingame', type: 'private' });
    
    await this.redis.set(`status:${challengerId}`, status, 'EX', 420);
    await this.redis.set(`status:${opponentId}`, status, 'EX', 420);
    await this.redis.del(UNIQUE_CHALLENGE_KEY);

    return { status: 'MATCH_FOUND', matchId, players: [challengerId, opponentId] };
  }

/* ---------------------------------------------------------------------------------------------------------------- */

async rejectChallenge(challengerId: string, opponentId: string) {
  // Ricostruiamo la chiave unica che avevamo creato in createChallenge
  const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${challengerId}`;

  // verifico se la sfida esiste ancora su Redis, se no vuol dire che è già scaduta o non esiste più, quindi ritorniamo un messaggio di errore
  const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);

  if (!challengeExists) {
    return { status: 'ERROR_CHALLENGE_NOT_FOUND', message: 'La sfida è già scaduta o non esiste più.' };
  }

  // se è ancora presente su redis, la eliminiamo per indicare che è stata rifiutata e non è più valida
  await this.redis.del(UNIQUE_CHALLENGE_KEY);

  console.log(`[Logic] L'utente ${opponentId} ha rifiutato la sfida di ${challengerId}.`);

  // ritorno lo stato di sfida rifiutata, con gli id dei player coinvolti
  return { status: 'CHALLENGE_REJECTED', challengerId, opponentId };
}

/* ---------------------------------------------------------------------------------------------------------------- */

async cancelChallenge(challengerId: string, opponentId: string) {
  // Ricostruiamo la chiave unica che avevamo creato in createChallenge
  const UNIQUE_CHALLENGE_KEY = `challenge:${opponentId}:${challengerId}`;

  // verifico se la sfida esiste ancora su Redis, se no vuol dire che è già scaduta o non esiste più, quindi ritorniamo un messaggio di errore
  const challengeExists = await this.redis.exists(UNIQUE_CHALLENGE_KEY);

  if (!challengeExists) {
    return { status: 'ERROR_CHALLENGE_NOT_FOUND', message: 'La sfida è già scaduta o non esiste più.' };
  }

  // se è ancora presente su redis, la eliminiamo per indicare che è stata rifiutata e non è più valida
  await this.redis.del(UNIQUE_CHALLENGE_KEY);

  console.log(`[Logic] L'utente ${challengerId} ha annullato la sfida di ${opponentId}.`);

  // ritorno lo stato di sfida annullata, con gli id dei player coinvolti
  return { status: 'CHALLENGE_CANCELLED', challengerId, opponentId };
}

/* ---------------------------------------------------------------------------------------------------------------- */

  async getQueueCount() {
    const QUEUE_KEY = 'matchmaking_queue';
    const count = await this.redis.zcard(QUEUE_KEY); // zcard restituisce il numero di elementi in una sorted set
    return { queueCount: count };
  }
}