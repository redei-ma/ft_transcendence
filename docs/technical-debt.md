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

### Fix da fare

#### 1. auth-service/env.validation.ts — Google OAuth non validato

- `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` usati in `google.strategy.ts` ma non in Joi schema
- Se mancano, il servizio parte ma Google OAuth crasha a runtime
- Fix: aggiungere come `Joi.string().required()` (o `.optional()` se OAuth è opzionale)

#### 2. auth-service — `process.env.EMAIL_USER` bypassa ConfigService

- `auth-service/src/modules/auth/mail/mail.service.ts` righe 26, 39
- Il servizio ha già `ConfigService` iniettato nel costruttore ma non lo usa qui
- Fix: sostituire `process.env.EMAIL_USER` con `this.config.get('EMAIL_USER')`

#### 3. game-service — `process.env` bypassano ConfigService

- `game-service/src/modules/game/game.gateway.ts` riga 21: `process.env.FRONTEND_URL`
- `game-service/src/modules/game/game.module.ts` riga 24: `process.env.REDIS_HOST`
- Nota: `@WebSocketGateway` è un decorator valutato a compile time — `process.env` è l'unico modo per il gateway. Per `game.module.ts` invece ConfigService è iniettabile via `useFactory`

---

## Porte e URL inter-servizio

### Standard da seguire

- Le porte di **ascolto** (`PORT`) stanno nel `.env` personale del servizio
- Le porte di **infrastruttura condivisa** (`REDIS_PORT`, `POSTGRES_PORT`) stanno in `.env.shared`
- Gli URL inter-servizio andrebbero letti da variabili env (es. `USER_SERVICE_URL`) per evitare disallineamenti
- Usare `ConfigService` per leggere queste variabili, non `process.env`

### Fix da fare

#### 1. ALTA — Redis port hardcodata in game-service

- `game-service/src/modules/game/game.module.ts` riga 24: `host: process.env.REDIS_HOST` e `port: 6379` hardcodato
- `REDIS_HOST` bypassa ConfigService; `REDIS_PORT` non viene letto affatto
- Fix: usare `useFactory` con `ConfigService` come fa `matchmaking-service/app.module.ts`

#### 2. MEDIA — URL inter-servizio ripetute

Hardcodare gli URL interni (`http://user-service:3001`) è un pattern accettato in
Docker Compose: le porte sono fisse per architettura e cambiarle richiederebbe comunque
di aggiornare `docker-compose.yml`. Il problema reale è la **ripetizione** dello stesso
URL nel codice:

| File                                                                 | Occorrenze | URL ripetuta               |
| -------------------------------------------------------------------- | ---------- | -------------------------- |
| `auth-service/src/modules/user/user.client.ts`                       | 11         | `http://user-service:3001` |
| `matchmaking-service/src/modules/matchmaking/matchmaking.service.ts` | 10         | `http://game-service:3000` |
| `matchmaking-service/src/modules/matchmaking/matchmaking.service.ts` | 1          | `http://user-service:3001` |

Fix: definire una costante privata nella classe per ogni base URL:

```ts
// user.client.ts
private readonly BASE_URL = 'http://user-service:3001';

// matchmaking.service.ts
private readonly GAME_SERVICE_URL = 'http://game-service:3000';
private readonly USER_SERVICE_URL = 'http://user-service:3001';
```
