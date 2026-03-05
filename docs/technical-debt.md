## Logging

### Standard da seguire

| Metodo             | Quando usarlo                                            | Visibile in prod? |
| ------------------ | -------------------------------------------------------- | ----------------- |
| `logger.error()`   | Errori critici                                           | Sempre            |
| `logger.warn()`    | Situazioni anomale non bloccanti                         | Sempre            |
| `logger.log()`     | Eventi operativi importanti (startup, connessioni, cron) | Sempre            |
| `logger.debug()`   | Dettagli utili solo in sviluppo                          | Solo in dev       |
| `logger.verbose()` | Dettagli molto granulari                                 | Solo in dev       |

La config dei livelli è in `main.ts` di ogni servizio tramite `NODE_ENV`.

### Fix da applicare

#### auth-service

- `auth/auth.service.ts` righe 56, 58, 194 — `console.error` → `logger.error`
- `auth/jwt/jwt-refresh.strategy.ts` riga 20 — `console.log('cookies'...)` → rimuovere (debug temporaneo)

#### game-service

- `modules/game/core/game.rules.ts` riga 45 — `console.log('winner team reached')` → `logger.debug`
    - Nota: `GameRules` non ha Logger iniettato, va aggiunto come proprietà

#### game-service (logger.log → logger.debug, troppo verbosi per prod)

- `modules/game/core/game.session.ts` riga 143 — loga ogni messaggio chat
- `modules/game/game.service.ts` riga 180 — dettaglio interno cleanup
- `modules/game/game.service.ts` riga 184 — dump dati interni

#### matchmaking-service (conversione massiva)

- `main.ts` righe 16, 44 — `console.log` → `Logger` statico
- `matchmaking.controller.ts` ~5 righe — `console.log` → `logger.log` / `logger.debug`
- `matchmaking.gateway.ts` ~6 righe — `console.log/warn` → `logger.log` / `logger.warn`
- `matchmaking.service.ts` ~30 righe — `console.log/error` → livello appropriato

---

## TypeScript `any`

### Standard da seguire

- Vietato usare `any` in tutto il progetto (regola CLAUDE.md)
- Usare tipi espliciti, interfacce o generics al posto di `any`
- Per oggetti NestJS/Socket.io usare i tipi forniti dal framework (es. `Socket` da `socket.io`)

### Fix da fare

**Check globale da eseguire:**
```bash
grep -rn ": any\|<any>\|as any" --include="*.ts" \
  auth-service/src user-service/src game-service/src matchmaking-service/src \
  | grep -v node_modules | grep -v ".spec.ts"
```

Eseguire il comando e tipizzare ogni occorrenza trovata.

**Casi già noti:**

#### matchmaking-service

- `matchmaking.gateway.ts` riga 30 — `handleConnection(client: any)` → `(client: Socket)`
- `matchmaking.gateway.ts` riga 49 — `data: any` nel payload `match.found.internal` → creare interfaccia
- `matchmaking.gateway.ts` righe 80, 91 — `data: any` nei handler `join_ai` e `join_local` → creare DTO
- `matchmaking.service.ts` riga 12 — `client: any` (campo inutilizzato) → rimuovere
- `matchmaking.service.ts` riga 641 — `startLocalMatch(data: any)` → creare `LocalMatchDto`
- `matchmaking.service.ts` riga 704 — `startAiMatch(data: any)` → creare `AiMatchDto`

---

## ENV & Validation

### Standard da seguire

- Ogni servizio ha `src/env.validation.ts` con schema Joi
- `app.module.ts` usa `validationSchema: envValidationSchema` nel `ConfigModule`
- `main.ts` legge `PORT` e variabili critiche via `ConfigService` (non `process.env`)
- `PORT` sta nel `.env` specifico del servizio (non in `.env.shared`)
- `FRONTEND_URL` sta in `.env.shared` (condivisa)
- `NODE_ENV` è settato in `docker-compose.yml` (production) e `docker-compose.override.yml` (development)
- Usare `??` invece di `||` per i fallback (evita falsy su `0` e `""`)

### Fix urgenti

#### 1. MATCHMAKING_SECRET mancante (BLOCCA IL GAME-SERVICE)

- Va aggiunto in `.env.shared` (è condiviso tra game e matchmaking)
- Va aggiunto in `.env.shared.example`
- Generare con: `openssl rand -base64 32`

#### 2. auth-service — PORT mancante

- Aggiungere `PORT=3002` in `auth-service/.env`
- Aggiungere `PORT: Joi.number().default(3002)` in `auth-service/src/env.validation.ts`

#### 3. user-service/env.validation.ts — variabili mancanti

Queste variabili vengono da `.env.shared` ma non sono validate da Joi:

- `REDIS_HOST`, `REDIS_PORT` (se usati)
- `INTERNAL_SERVICE_SECRET`
- `FRONTEND_URL`

#### 4. auth-service/env.validation.ts — Google OAuth non validato

- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` presenti in `.env` ma non in Joi schema
- Aggiungere come `Joi.string().required()` (o `.optional()` se OAuth è opzionale)

#### 5. user-service — PORT in .env personale

- Creare `user-service/.env` con `PORT=3001`

---

## Porte e URL inter-servizio

### Standard da seguire

- Le porte di **ascolto** (`PORT`) stanno nel `.env` personale del servizio
- Le porte di **infrastruttura condivisa** (`REDIS_PORT`, `POSTGRES_PORT`) stanno in `.env.shared`
- Gli URL inter-servizio andrebbero letti da variabili env (es. `USER_SERVICE_URL`) per evitare disallineamenti
- Usare `ConfigService` per leggere queste variabili, non `process.env`

### Fix critici

#### 1. ALTA — Redis port hardcodata in game-service

- `game-service/src/modules/game/game.module.ts` riga 23: `port: 6379` hardcodato
- Non legge `REDIS_PORT` dall'env → se Redis cambia porta il game-service non si aggiorna
- Fix: sostituire con `parseInt(process.env.REDIS_PORT ?? '6379')` o usare `ConfigService`

#### 2. MEDIA — URL inter-servizio con porta hardcodata

Gli URL di comunicazione tra servizi hanno la porta scritta nel codice:

| File                                                                 | Occorrenze | URL hardcodata                 |
| -------------------------------------------------------------------- | ---------- | ------------------------------ |
| `auth-service/src/user/user.client.ts`                               | 10         | `http://user-service:3001/...` |
| `matchmaking-service/src/modules/matchmaking/matchmaking.service.ts` | 7          | `http://game-service:3000/...` |

Se la porta cambia in `.env`, il codice non si aggiorna automaticamente.
Fix ideale: aggiungere in `.env.shared`:

```
USER_SERVICE_URL=http://user-service:3001
GAME_SERVICE_URL=http://game-service:3000
```

E leggere via `ConfigService` nei rispettivi client.

#### 3. BASSA — `process.env.FRONTEND_URL` in game.gateway.ts

- `game-service/src/modules/game/game.gateway.ts` riga 34 bypassa `ConfigService`
- Fix: iniettare `ConfigService` nel gateway e usare `configService.get('FRONTEND_URL')`
