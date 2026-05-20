# Security Audit — ft_transcendence
*Data: 2026-05-20*

## Stato attuale

| Servizio | Critical | High | Moderate |
|---|---|---|---|
| frontend | 0 | 3 | 3 |
| game-service | 1 | 18 | 12 |
| matchmaking-service | 0 | 12 | 13 |
| user-service | 0 | 17 | 12 |

---

## Vulnerabilità per servizio

### Frontend

| Package | Severity | Vulnerabilità | Solo build? |
|---|---|---|---|
| `vite` 7.0.0–7.3.1 | HIGH | Path traversal dev server (GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583) | Sì — dev server only |
| `socket.io-parser` 4.0–4.2.5 | HIGH | Unbounded binary attachments → crash server (GHSA-677m-j7p3-52f9) | No |
| `picomatch` ≤2.3.1 / 4.0–4.0.3 | HIGH | Method injection + ReDoS (GHSA-3v7f-55p6-f55p, GHSA-c2c7-rcm5-vvqj) | Sì — bundler |
| `postcss` <8.5.10 | MODERATE | XSS via CSS stringify (GHSA-qx2v-qp2m-jg93) | Sì — build only |
| `ws` 8.0–8.20 | MODERATE | Uninitialized memory disclosure (GHSA-58qx-3vcg-4xpx) | No |

### Game-service

| Package | Severity | Vulnerabilità | Solo build? |
|---|---|---|---|
| `handlebars` 4.0–4.7.8 | **CRITICAL** | JS injection via template (7 CVE) | Sì — @nestjs/cli devDep |
| `@nestjs/core` ≤11.1.17 | HIGH | Injection via path-to-regexp (GHSA-36xv-jgw5-4q75) | No |
| `@nestjs/microservices` ≤11.1.18 | HIGH | DoS via recursive JsonSocket TCP (GHSA-hpwf-8g29-85qm) | No |
| `@nestjs/platform-express` ≤11.1.17 | HIGH | Dipende da multer + path-to-regexp | No |
| `path-to-regexp` 8.0–8.3 | HIGH | ReDoS sulle route (GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7) | No |
| `multer` ≤2.1.0 | HIGH | DoS upload — 3 CVE | No |
| `socket.io-parser` 4.0–4.2.5 | HIGH | Unbounded binary attachments (GHSA-677m-j7p3-52f9) | No |
| `lodash` ≤4.17.23 | HIGH | Code injection + prototype pollution | No |
| `flatted` ≤3.4.1 | HIGH | DoS + prototype pollution nel parser | No |
| `fast-uri` ≤3.1.1 | HIGH | Path traversal + host confusion (2 CVE) | No |
| `effect` <3.20.0 | HIGH | AsyncLocalStorage contamination (via Prisma 6.19.2) | No |
| `defu` ≤6.1.4 | HIGH | Prototype pollution (via Prisma) | No |
| `serialize-javascript` ≤7.0.4 | HIGH | RCE via RegExp (via terser-webpack-plugin) | Sì — webpack devDep |
| `picomatch` | HIGH | Method injection + ReDoS | Sì — bundler |
| `ws` 8.0–8.20 | MODERATE | Memory disclosure | No |
| `file-type` 13–21.3.1 | MODERATE | DoS via ASF/ZIP malformati (via @nestjs/common) | No |
| `ajv` 7–8.17.1 | MODERATE | ReDoS con opzione $data | Sì — schematics devDep |
| `brace-expansion` | MODERATE | DoS via zero-step sequence | Sì — devDep |

### Matchmaking-service

Stesso set di game-service ad eccezione di Prisma/handlebars/serialize-javascript, più:

| Package | Severity | Vulnerabilità |
|---|---|---|
| `@nestjs-modules/ioredis` | HIGH | Dipende da `@nestjs/core` vulnerabile |

### User-service

Stesso set di game-service. Le vulnerabilità compaiono anche in `shared/auth` (stesse librerie NestJS).

---

## Separazione runtime vs build-only

**Impatto reale in produzione** (girano nel container finale):
`socket.io-parser`, `path-to-regexp`, `@nestjs/core`, `@nestjs/microservices`, `multer`, `@nestjs/platform-express`, `ws`, `lodash`, `fast-uri`, `flatted`, `file-type`, `effect`/Prisma, `defu`

**Solo build stage o devDependencies** (non presenti nell'immagine finale):
`handlebars`, `serialize-javascript`, `terser-webpack-plugin`, `ajv`, `brace-expansion`, `picomatch`, `vite`, `postcss`

---

## Azioni da eseguire

### 1. Bump Prisma (manuale — richiede modifica package.json)
Nei file `game-service/package.json` e `user-service/package.json`:
```
"prisma": "6.19.2"      → "6.19.3"
"@prisma/client": "6.19.2" → "@prisma/client": "6.19.3"
```
Risolve: `effect`, `defu`, `@prisma/config`

### 2. Aggiornare i lock file (tutti i servizi)
```bash
cd frontend          && npm audit fix --package-lock-only
cd game-service      && npm audit fix --package-lock-only
cd matchmaking-service && npm audit fix --package-lock-only
cd user-service      && npm audit fix --package-lock-only
```
Risolve: tutte le restanti vulnerabilità fixabili senza breaking changes.

### 3. Vulnerabilità accettate (no azione)
- `handlebars`, `serialize-javascript` — devDependencies del build toolchain NestJS CLI, non entrano nel container
- `vite` — dev server locale, non gira in produzione
- `picomatch`, `ajv`, `brace-expansion` — toolchain build only

---

## Axios (già risolto)

- **frontend**: rimosso `axios` da `package.json` (non era mai usato nel codice)
- **matchmaking-service**: sostituito `@nestjs/axios` + `HttpService` con `fetch` nativo di Node 20

CVE risolte:
- GHSA-3p68-rc4w-qgx5 — SSRF via NO_PROXY hostname bypass
- GHSA-w9j2-pvgh-6h63 — Authentication bypass via prototype pollution in validateStatus
- GHSA-xf7r-hgr6-v32p — Incomplete fix loopback subnet bypass
