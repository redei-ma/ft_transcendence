# Security Audit — ft_transcendence
*Audit iniziale: 2026-05-20 — Ultimo aggiornamento: 2026-06-04*

---

## Stato attuale

| Servizio | Critical | High (runtime) | Moderate (runtime) | Note |
|---|---|---|---|---|
| frontend | 0 | 0 | 0 | Tutti i pacchetti aggiornati |
| matchmaking-service | 0 | 0 | 0 | Tutti i pacchetti aggiornati |
| game-service | 0* | 8 | 1 | `npm audit fix` non eseguito — accettato (vedi sotto) |
| user-service | 0* | 8 | 1 | `npm audit fix` non eseguito — accettato (vedi sotto) |

\* `handlebars` CRITICAL è devDependency del build toolchain NestJS CLI: non entra nel container finale.

---

## Azioni completate

### Rimosso axios (frontend + matchmaking-service)

- **frontend**: rimosso `axios` da `package.json` (non era mai usato nel codice)
- **matchmaking-service**: sostituito `@nestjs/axios` + `HttpService` con `fetch` nativo di Node 20

CVE risolte:
- GHSA-3p68-rc4w-qgx5 — SSRF via NO_PROXY hostname bypass
- GHSA-w9j2-pvgh-6h63 — Authentication bypass via prototype pollution in `validateStatus`
- GHSA-xf7r-hgr6-v32p — Incomplete fix loopback subnet bypass

---

### Bump Prisma → 6.19.3 (game-service + user-service)

```
"prisma": "6.19.2"       → "6.19.3"
"@prisma/client": "6.19.2" → "@prisma/client": "6.19.3"
```

Risolve: `effect` (AsyncLocalStorage contamination), `defu` (prototype pollution), `@prisma/config`.

---

### npm audit fix — frontend

| Package | Prima | Dopo | Vulnerabilità |
|---|---|---|---|
| `vite` | 7.0–7.3.1 | **7.3.3** | Path traversal dev server (build-only) |
| `socket.io-parser` | 4.0–4.2.5 | **4.2.6** | Unbounded binary attachments |
| `picomatch` | ≤2.3.1 | **2.3.2** | Method injection + ReDoS (build-only) |
| `postcss` | <8.5.10 | **8.5.15** | XSS via CSS stringify (build-only) |
| `ws` | 8.0–8.20 | **8.20.1** | Uninitialized memory disclosure |

---

### npm audit fix — matchmaking-service

| Package | Prima | Dopo | Vulnerabilità |
|---|---|---|---|
| `@nestjs/core` | ≤11.1.17 | **11.1.21** | Injection via path-to-regexp |
| `@nestjs/microservices` | ≤11.1.18 | **11.1.21** | DoS via recursive JsonSocket TCP |
| `path-to-regexp` | 8.0–8.3 | **8.4.2** | ReDoS sulle route |
| `multer` | ≤2.1.0 | **2.1.1** | DoS upload |
| `socket.io-parser` | 4.0–4.2.5 | **4.2.6** | Unbounded binary attachments |
| `ws` | 8.0–8.20 | **8.20.1** | Uninitialized memory disclosure |
| `lodash` | ≤4.17.23 | **4.18.1** | Code injection + prototype pollution |
| `flatted` | ≤3.4.1 | **3.4.2** | DoS + prototype pollution |
| `fast-uri` | ≤3.1.1 | **3.1.2** | Path traversal + host confusion |

---

## Vulnerabilità residue — game-service / user-service

`npm audit fix` non è stato eseguito su questi due servizi. Le versioni risolte nei lock file sono identiche allo stato dell'audit iniziale.

**Motivazione dell'accettazione:** il progetto non è esposto su internet; viene avviato e abbattuto on-demand in ambiente locale. Le CVE runtime più critiche (ReDoS su route, DoS upload, prototype pollution) richiedono traffico malevolo esterno per essere sfruttate.

| Package | Versione attuale | Versione sicura | Severity | Vulnerabilità |
|---|---|---|---|---|
| `@nestjs/core` | 11.1.14 | 11.1.21 | HIGH | Injection via path-to-regexp (GHSA-36xv-jgw5-4q75) |
| `@nestjs/microservices` | 11.1.13 | 11.1.21 | HIGH | DoS via recursive JsonSocket TCP (GHSA-hpwf-8g29-85qm) |
| `@nestjs/platform-express` | 11.1.12 | — | HIGH | Dipende da multer + path-to-regexp |
| `path-to-regexp` | 8.3.0 | 8.4.2 | HIGH | ReDoS sulle route (GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7) |
| `multer` | 2.0.2 | 2.1.1 | HIGH | DoS upload — 3 CVE |
| `socket.io-parser` | 4.2.5 | 4.2.6 | HIGH | Unbounded binary attachments (GHSA-677m-j7p3-52f9) |
| `lodash` | 4.17.23 | 4.18.1 | HIGH | Code injection + prototype pollution |
| `flatted` | 3.3.3 | 3.4.2 | HIGH | DoS + prototype pollution nel parser |
| `fast-uri` | 3.1.0 | 3.1.2 | HIGH | Path traversal + host confusion (2 CVE) |
| `ws` | 8.18.3 | 8.20.1 | MODERATE | Uninitialized memory disclosure (GHSA-58qx-3vcg-4xpx) |

---

## Vulnerabilità accettate (tutti i servizi)

Presenti solo nello stage di build o come devDependencies — non entrano nel container finale:

| Package | Severity | Motivo accettazione |
|---|---|---|
| `handlebars` | CRITICAL | devDep di `@nestjs/cli`, non nel bundle runtime |
| `serialize-javascript` | HIGH | via `terser-webpack-plugin`, solo build stage |
| `vite` | HIGH | dev server locale, non gira in produzione |
| `picomatch` | HIGH | bundler toolchain, solo build stage |
| `ajv` | MODERATE | via `schematics` devDep |
| `brace-expansion` | MODERATE | devDep del toolchain |

---

## Separazione runtime vs build-only

**Impatto reale in produzione** (girano nel container finale):
`socket.io-parser`, `path-to-regexp`, `@nestjs/core`, `@nestjs/microservices`, `multer`, `@nestjs/platform-express`, `ws`, `lodash`, `fast-uri`, `flatted`, `file-type`

**Solo build stage o devDependencies** (non presenti nell'immagine finale):
`handlebars`, `serialize-javascript`, `terser-webpack-plugin`, `ajv`, `brace-expansion`, `picomatch`, `vite`, `postcss`
