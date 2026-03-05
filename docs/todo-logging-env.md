# TODO: Logging & ENV Validation

## Logging

### Standard da seguire

| Metodo | Quando usarlo | Visibile in prod? |
|---|---|---|
| `logger.error()` | Errori critici | Sempre |
| `logger.warn()` | Situazioni anomale non bloccanti | Sempre |
| `logger.log()` | Eventi operativi importanti (startup, connessioni, cron) | Sempre |
| `logger.debug()` | Dettagli utili solo in sviluppo | Solo in dev |
| `logger.verbose()` | Dettagli molto granulari | Solo in dev |

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
