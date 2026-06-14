_This project has been created as part of the 42 curriculum by redei-ma, gpirozzi, fzuccaro, ade-ross, lacerbi._

# ft_transcendence - Clash of Olympus

> A real-time multiplayer isometric brawler built with Microservices, WebSockets, and 3D WebGL graphics.

---

## Description

**Clash of Olympus** is a web-based multiplayer arena game where two players fight as mythological Greek characters — Zeus and Ade — in a 3D isometric arena. The project is built as a full-stack web application with a microservices architecture, real-time WebSocket communication, and an immersive Three.js-powered frontend.

**Key features:**

- Real-time 1v1 multiplayer matches (online, local, and vs AI)
- Two playable characters: Zeus (lightning) and Ade (fire)
- ELO-based ranked matchmaking system
- User profiles with avatar upload, friend system, and online status
- 13 achievements across 4 tiers (Bronze, Silver, Gold, Platinum)
- Match history and detailed statistics per character
- In-game chat during matches
- Notification system (friend requests, game invites, achievement unlocks)
- Google OAuth 2.0 and TOTP-based Two-Factor Authentication
- AI opponent with human-like behavior
- Full Docker containerization with HTTPS via Nginx reverse proxy

---

## Team Information

| Member         | 42 Login   | Role                | Service               | Focus Area                                                  |
| :------------- | :--------- | :------------------ | :-------------------- | :---------------------------------------------------------- |
| **Francesco**  | `fzuccaro` | **Product Owner**   | `frontend`            | React, Three.js, UI/UX, Visual Effects, Game scenes         |
| **Renato**     | `redei-ma` | **Project Manager** | `user-service`        | API, Friends, Stats, Achievements, Docker, Nginx            |
| **Giovanni**   | `gpirozzi` | **Tech Lead**       | `game-service`        | Game engine, Physics, WebSocket, ELO, Match results, AI bot |
| **Alessandro** | `ade-ross` | **Developer**       | `auth-service`        | JWT, OAuth, 2FA, Email, Auth flow & external integrations   |
| **Leonardo**   | `lacerbi`  | **Developer**       | `matchmaking-service` | Matchmaking queue, WebSocket                                |

---

## Project Management

### Organization

- **Early phase (planning):** Weekly meetings to define architecture, assign modules, and agree on the shared database schema.
- **Development phase:** Sub-teams worked in parallel on their services. Groups of interest (e.g., game-service + matchmaking, user-service + auth-service) coordinated daily.
- **Integration phase:** Daily meetings to merge services, resolve conflicts, and test end-to-end flows.

### Tools

- **Task tracking:** Tasks and priorities defined during team meetings. Progress and bugs discussed directly between members during daily check-ins.
- **Communication:** Discord for voice calls and screen-sharing during development sessions. WhatsApp for daily messages, quick updates, and coordination.
- **Version control:** Git with feature branches (`feature/auth-oauth`, `feature/user-friends`, etc.) merged into `develop` via pull requests.

### Work distribution

Each team member owns one or more microservices. The database schema (Prisma) is shared and maintained by Renato, with input from the whole team when new models are needed.

---

## Architecture

### System Overview

```
                              ┌────────────────┐
                              │    Browser     │
                              │  (React +      │
                              │   Three.js)    │
                              └───────┬────────┘
                                      │ HTTPS / WSS
                                      ▼
                              ┌────────────────┐
                              │     Nginx      │
                              │  (SSL +        │
                              │   Reverse      │
                              │   Proxy)       │
                              └───────┬────────┘
                                      │
                 ┌────────────────────┼─────────────────────┐
                 │                    │                     │
                 ▼                    ▼                     ▼
          ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
          │  auth-      │     │  user-       │     │  game-          │
          │  service    │     │  service     │     │  service        │
          │             │     │              │     │                 │
          │  JWT,       │     │  Profiles,   │     │  Engine, WS,    │
          │  OAuth, 2FA │     │  Friends,    │     │  Physics, Chat  │
          └──────┬──────┘     │  Stats       │     └────────┬────────┘
                 │            └──────┬───────┘              │
                 │                   │              ┌───────┴─────────┐
                 │                   │              │  matchmaking-   │
                 │                   │              │  service        │
                 │                   │              │                 │
                 │                   │              │  Queue, AI,     │
                 │                   │              │  ELO match      │
                 │                   │              └───────┬─────────┘
                 │                   │                      │
                 ▼                   ▼                      ▼
          ┌──────────────────────────────────────────────────────┐
          │                 PostgreSQL (Prisma)                  │
          └──────────────────────────┬───────────────────────────┘
                                     │
                            ┌────────┴─────────┐
                            │      Redis       │
                            │   (Queues,       │
                            │   match state)   │
                            └──────────────────┘
```

### Data Access Rules

#### PostgreSQL — User Data Ownership

User data lives under `user-service`, which is the only service with full read/write access. Other services have restricted access:

| Service                 | Read | Write                                  |
| ----------------------- | ---- | -------------------------------------- |
| **user-service**        | Full | Full                                   |
| **game-service**        | No   | Limited (completed match results only) |
| **auth-service**        | No   | No                                     |
| **matchmaking-service** | No   | No                                     |

> `game-service` has limited write access: it can only persist finished match results directly to the database (e.g. save match records, update user stats, recalculate ELO).

#### Redis — Usage

Redis is **not** a shared datastore across all services. Only `game-service` and `matchmaking-service` interact with it:

| Service                 | Usage                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **matchmaking-service** | Manages matchmaking queues, player status in queue, ELO-based matching logic                       |
| **game-service**        | Communicates match state to `matchmaking-service` (e.g. match started, match finished, disconnect) |
| **auth-service**        | No                                                                                                 |
| **user-service**        | No                                                                                                 |

---

## Technical Stack

### Frontend

| Technology                       | Version | Why                                                                                  |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------ |
| **React**                        | 19      | Component-based UI, large ecosystem, team familiarity                                |
| **Vite**                         | 7       | Fast HMR for development, optimized production builds                                |
| **Three.js** + React Three Fiber | 0.182   | 3D isometric rendering in the browser with declarative React syntax                  |
| **@react-three/drei**            | 10      | Three.js helper components for loading 3D models (GLTF/OBJ) and scene utilities      |
| **Tailwind CSS**                 | 3.4     | Utility-first styling, fast prototyping, consistent design system                    |
| **Zustand**                      | 5       | Lightweight state management without boilerplate                                     |
| **Socket.io-client**             | 4.8     | Real-time bidirectional communication with the game server                           |
| **socket.io-msgpack-parser**     | 3.0     | Binary msgpack serialization on both client and server for reduced payload size      |
| **@react-three/postprocessing**  | 3.0     | Post-processing effects (Bloom/glow) applied to the 3D game scene via EffectComposer |

### Backend

| Technology     | Version | Why                                                                                                                               |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **NestJS**     | 11      | Modular, TypeScript-native framework with built-in dependency injection, guards, pipes, and interceptors. Ideal for microservices |
| **Socket.io**  | 4.8     | Real-time game state broadcasting at 60fps with automatic reconnection and room management                                        |
| **Prisma**     | 6.19    | Type-safe ORM with auto-generated client, migration system, and excellent PostgreSQL support                                      |
| **ioredis**    | 5.9     | Redis client for matchmaking queues, player status tracking, and game/matchmaking inter-service communication                     |
| **Sharp**      | 0.34    | Server-side image processing for avatar uploads (resize, compress, format conversion)                                             |
| **Passport**   | 0.7     | Authentication middleware for JWT and Google OAuth strategies                                                                     |
| **bcryptjs**   | 3.0     | Password hashing with salt rounds for secure local authentication                                                                 |
| **Nodemailer** | 8.0     | Transactional email sending for account verification and password reset                                                           |
| **Speakeasy**  | 2.0     | TOTP generation and verification for Two-Factor Authentication                                                                    |
| **qrcode**     | 1.5     | QR code generation for 2FA setup in the authenticator app flow                                                                    |

### Database

| Technology     | Version     | Why                                                                                                                                   |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL** | 17 (Alpine) | ACID transactions for atomic ELO updates, relational model fits the domain (users, matches, friendships), seamless Prisma integration |
| **Redis**      | 7 (Alpine)  | In-memory store for matchmaking queues, player status tracking, and game/matchmaking inter-service communication                      |

### Infrastructure

| Technology                  | Why                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Docker + Docker Compose** | Single-command deployment, isolated services, reproducible environments                              |
| **Nginx**                   | HTTPS termination (SSL), reverse proxy routing, rate limiting, security headers, static file serving |
| **ngrok**                   | Tunnel for OAuth callbacks during local development (Google requires public redirect URIs)           |

---

## Database Schema

The database uses PostgreSQL with Prisma ORM. All 11 models share a single schema.

### Key Relationships

```
User ──< Account          (1 user → N login methods: LOCAL, GOOGLE)
User ──  UserStats        (1 user → 1 stats row)
User ──< CharacterStats   (1 user → 1 row per character: ZEUS, ADE)
User ──< MatchParticipant >── Match   (many-to-many via join table)
User ──< Friendship       (sender + receiver, status: PENDING/ACCEPTED/REJECTED)
User ──< GameInvite       (sender + receiver, with expiry timestamp)
User ──< UserAchievement >── Achievement   (many-to-many, unlocked per user)
User ──< Notification     (persistent, typed: FRIEND_REQ / GAME_INVITE / ACHV_UNLOCKED)
```

### Models Summary

| Model                | Key Fields                                                     | Purpose                         |
| -------------------- | -------------------------------------------------------------- | ------------------------------- |
| **User**             | email, username, avatarUrl, status, is2faEnabled, tokenVersion | Core user identity              |
| **Account**          | provider (LOCAL/GOOGLE), passwordHash, oauthId                 | Authentication methods per user |
| **UserStats**        | eloCurrent, eloPeak, totalWins, totalLosses, currentWinStreak  | Aggregate game statistics       |
| **CharacterStats**   | characterName (ADE/ZEUS), wins, losses, kills, deaths          | Per-character performance       |
| **Match**            | mode (RANKED/UNRANKED/LOCAL/AI), endReason, winningTeamId      | Game record                     |
| **MatchParticipant** | matchId, userId, teamId, characterName, kills, deaths          | Player performance in a match   |
| **Achievement**      | name, description, tier (BRONZE/SILVER/GOLD/PLATINUM)          | Achievement catalog (13 total)  |
| **UserAchievement**  | userId, achievementId, unlockedAt                              | Achievement unlocks             |
| **Friendship**       | senderId, receiverId, status                                   | Friend relationships            |
| **GameInvite**       | senderId, receiverId, status, expiresAt                        | Game challenge invitations      |
| **Notification**     | userId, type, message, isRead                                  | In-app notifications            |

> Full ERD with all field types and relations: [docs/database-schema.md](docs/database-schema.md)

---

## Features List

| Feature                           | Description                                                                                       | Implemented by                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Frontend UI                       | All pages, components, and visual design — Login, Dashboard, Profile, Leaderboard, Game flow, HUD | Francesco (frontend)                                  |
| User registration & login         | Email + password with bcrypt hashing, email verification                                          | Alessandro (auth-service), Renato (user-service)      |
| Google OAuth 2.0                  | Login and account linking via Google                                                              | Alessandro (auth-service)                             |
| Two-Factor Authentication         | TOTP setup with QR code, enable/disable flow                                                      | Alessandro (auth-service)                             |
| JWT authentication                | Stateless access tokens (15min) + refresh tokens (7d) in HTTP-only cookies                        | Alessandro (auth-service)                             |
| User profiles                     | Edit username, email, avatar. Public profile pages                                                | Renato (user-service)                                 |
| Avatar upload                     | Image processing with Sharp (512x512 JPEG), DiceBear default avatars                              | Renato (user-service)                                 |
| Friend system                     | Send/accept/reject/remove friend requests, friends list with online status                        | Renato (user-service)                                 |
| Game invites                      | Challenge friends to a match with expiration timer                                                | Renato (user-service)                                 |
| Notification system               | Persistent DB notifications via SSE + toast feedback on all CRUD actions                          | Renato (user-service), Francesco (frontend)           |
| ELO ranking & leaderboard         | Chess.com-style ELO calculation (K=32), paginated leaderboard                                     | Renato (user-service)                                 |
| Match history                     | Paginated match records with mode filter, per-player stats                                        | Renato (user-service)                                 |
| Achievement system                | 13 achievements across 4 tiers, automatic unlock check after each match                           | Renato (user-service)                                 |
| Real-time game engine             | Server-authoritative game loop at 60fps with physics simulation                                   | Giovanni (game-service)                               |
| 3D isometric arena                | Three.js rendering with React Three Fiber, GLB models, character auras, particle effects          | Francesco (frontend)                                  |
| WebSocket multiplayer             | Socket.io with msgpack serialization for low-latency game state sync                              | Giovanni (game-service), Francesco (frontend)         |
| In-game chat                      | Real-time message exchange between players during a match                                         | Giovanni (game-service), Francesco (frontend)         |
| AI opponent                       | Bot with human-like behavior for single-player mode                                               | Giovanni (game-service)                               |
| Ranked matchmaking                | ELO-based queue with progressive tolerance range                                                  | Leonardo (matchmaking-service)                        |
| Unranked & local modes            | Quick play without ELO impact, same-device local multiplayer                                      | Leonardo (matchmaking-service)                        |
| Private challenges                | Invite a specific player to a match with expiration timer                                         | Leonardo (matchmaking-service), Renato (user-service) |
| Docker infrastructure             | Multi-stage Dockerfiles, docker-compose orchestration, Makefile automation                        | Renato, Alessandro                                    |
| HTTPS & security                  | Nginx reverse proxy with SSL, rate limiting, security headers                                     | Renato, Alessandro                                    |
| Health checks                     | Every service exposes /health, Docker healthchecks with dependency ordering                       | Renato                                                |
| Swagger API docs                  | Auto-generated API documentation at /api/docs                                                     | Renato (user-service)                                 |
| Privacy Policy & Terms of Service | Legal pages with explicit user acceptance on first login, accessible from the dashboard footer    | Alessandro (auth-service), Francesco (frontend)       |

---

## Modules

### Chosen Modules

| #   | Module                              | Category  | Type  | Points | Implemented by                | How it was implemented                                                                                                                                   |
| --- | ----------------------------------- | --------- | ----- | ------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Frontend + Backend Framework**    | Web       | Major | 2      | Francesco, All                | React (frontend) + NestJS (backend). Each microservice is a standalone NestJS app                                                                        |
| 2   | **Real-time (WebSockets)**          | Web       | Major | 2      | Giovanni, Leonardo, Francesco | Socket.io for game state (Giovanni), matchmaking queue (Leonardo), frontend client (Francesco). Msgpack serialization                                    |
| 3   | **User Interaction**                | Web       | Major | 2      | Renato, Giovanni              | Friend system (add/remove/accept/reject), user profiles, in-game chat via WebSocket                                                                      |
| 4   | **ORM**                             | Web       | Minor | 1      | Renato                        | Prisma ORM with shared schema, typed queries, migration system                                                                                           |
| 5   | **Notification System**             | Web       | Minor | 1      | Renato, Francesco             | Persistent DB notifications (friend requests, game invites, achievements) via SSE + visual toast feedback on all CRUD actions                            |
| 6   | **Standard User Management**        | User Mgmt | Major | 2      | Renato                        | Profile editing, avatar upload (Sharp), friends with online status, profile pages                                                                        |
| 7   | **Game Statistics & Match History** | User Mgmt | Minor | 1      | Renato                        | ELO tracking, win/loss/draw, K/D ratio, per-character stats, paginated match history, leaderboard                                                        |
| 8   | **OAuth 2.0**                       | User Mgmt | Minor | 1      | Alessandro                    | Google OAuth via Passport with account linking/unlinking                                                                                                 |
| 9   | **2FA**                             | User Mgmt | Minor | 1      | Alessandro                    | TOTP via Speakeasy, QR code generation, setup/enable/disable flow                                                                                        |
| 10  | **AI Opponent**                     | AI        | Major | 2      | Giovanni                      | Bot AI integrated into game engine, simulates human-like play                                                                                            |
| 11  | **Web-based Game**                  | Gaming    | Major | 2      | Giovanni                      | 1v1 arena brawler with combat mechanics (melee, spell, defense), win/loss conditions                                                                     |
| 12  | **Remote Players**                  | Gaming    | Major | 2      | Giovanni, Francesco           | Two players on separate computers via WebSocket, reconnection handling, delta-time compensation and client-side interpolation for smooth remote gameplay |
| 13  | **Advanced 3D Graphics**            | Gaming    | Major | 2      | Francesco                     | Three.js + React Three Fiber isometric arena, character auras, particle effects, post-processing                                                         |
| 14  | **Gamification**                    | Gaming    | Minor | 1      | Renato                        | 13 achievements (4 tiers), ELO leaderboard, win streak tracking                                                                                          |
| 15  | **Microservices**                   | DevOps    | Major | 2      | Renato, Alessandro            | 4 independent NestJS services (auth, user, game, matchmaking), each with single responsibility, communicating via REST and Redis pub/sub                 |

**Total: 24 points** — 9 Major × 2pts + 6 Minor × 1pt

### Not included: Public API (IV.1 Major)

> The project exposes REST APIs documented via Swagger (`/api/docs`), with rate limiting and JWT authentication. However, the module requires a **static API key** for public external access, which is not currently implemented. To fully claim this module (+2pts), a public API key system would need to be added.

---

## Individual Contributions

### Francesco (Product Owner - Frontend)

- Designed and implemented the entire frontend application with React 19 and Vite
- Built the 3D game rendering using Three.js and React Three Fiber (isometric camera, arena, player entities, bullet entities, aura effects, impact effects)
- Created all site pages: Login, Dashboard, Profile, Leaderboard, Game flow (mode select, character select, queue, match)
- Implemented the in-game HUD (HP bars, game chat, game-over overlay)
- Built WebSocket client integration for game state and matchmaking
- Styled the application with Tailwind CSS (dark Greek-mythology theme)

**Challenge: HUD Architecture — DOM Overlay vs. In-Canvas Rendering**

The game world renders at 60fps inside a single WebGL canvas through Three.js and React Three Fiber. The HUD — HP bars, skill slots with live cooldown sweeps, kill/death counters — has to update in perfect sync with that loop, yet it is fundamentally a UI layer, not a 3D one. The core decision was where this UI should live, because the wrong choice would either cripple iteration speed or wreck performance.

I evaluated two approaches against our requirements:

- In-canvas (WebGL) HUD: Build every HUD element as Three.js sprites and geometry inside the same canvas. This guarantees frame-perfect sync and a single render pipeline, but text rendering in WebGL is painful, styling is rigid, and every visual tweak becomes a 3D-engineering task — coupling fast-changing UI work to the slowest part of the stack.
- DOM overlay (HTML/CSS) HUD: Position HTML/CSS layers absolutely over the canvas, driven by the Zustand store that consumes the snapshot stream. This unlocks real typography, instant restyling, and rapid iteration. The trade-off is twofold: the overlay must never trigger React re-renders at 60fps, and it must not intercept the pointer events meant for the game underneath.

#### **The Resolution**

I chose the DOM overlay and engineered around its two risks. The decorative chrome is a static PNG frame per character (AdeUI.png, ZeusUI.png), and the dynamic layers — HP, cooldown sweeps, slots — are absolutely-positioned HTML whose coordinates I extracted programmatically from the PNGs, so they align pixel-perfect with the art instead of being hand-tuned. To protect performance, the game loop stays inside R3F's useFrame, outside React's reconciliation entirely; cooldown sweeps interpolate through a dedicated requestAnimationFrame loop that writes to the DOM directly, so React only re-renders the HUD on discrete state changes (a skill fired, an HP threshold crossed) rather than every frame. Finally, the overlay is pointer-events: none, letting every click fall through to the game. The result is a HUD that iterates at the speed of CSS while costing the render loop almost nothing.

### Renato (Project Manager - User Service & Database)

- Designed the complete Prisma database schema (11 models, all enums, relations, indexes)
- Built the entire `user-service` microservice: user CRUD, profile management, avatar upload with Sharp, friend system, notifications, achievements, match history, leaderboard
- Implemented internal API endpoints for service-to-service communication (protected by API key)
- Set up the migration system (db-migration one-shot container)
- Coordinated team meetings, tracked progress, managed task distribution
- Led Docker infrastructure: multi-stage Dockerfiles for all services, docker-compose orchestration, Makefile automation

**Challenge: Future-Proof Schema Design**

As owner of the database schema, the hardest decision I faced was how much to model for today versus how much to anticipate future growth. The schema is the foundation that four microservices share, so every wrong assumption baked into it would ripple out as a multi-service migration and a real risk to live data integrity.

To make an informed choice, I evaluated both approaches based on our project requirements:

- **Schema mirroring the current product:** Fast to model and quick to query, with every existing feature wired directly into columns and enums. The trade-off is that every product evolution — a new OAuth provider, a new achievement, a different team composition — becomes a schema migration touching multiple services, with non-trivial risk on a live database.
- **Normalized, extension-friendly schema:** The dimensions of variation become rows in dedicated tables rather than columns or hardcoded keys, and any write that spans multiple tables is wrapped in an atomic transaction so a partial failure cannot corrupt user stats or rankings. The cost is more JOINs and a steeper initial design effort.

##### **The Resolution**

I chose the normalized model and invested significant upfront time on it. Authentication identities and achievements live as rows keyed by foreign keys, so adding a new provider or a new achievement is data — not a migration. The same shape absorbed AI matches and team modes without any schema change.

To keep this flexibility safe across services without introducing the latency of an event-driven system, the multi-table write at match end — where match record, participants, ELO, per-character stats, and achievement unlocks are all updated together — runs inside a single Prisma transaction. Either everything is committed or nothing is, and the database is never left in an inconsistent state between services. The result is a schema that absorbs new product ideas as data and protects its invariants under concurrent writes.

### Giovanni (Tech Lead - Game Service)

- Designed and implemented the real-time game engine (60fps server-authoritative loop)
- Built the physics system (grid-based collision, movement, projectiles)
- Implemented the combat system (melee attacks, spell attacks, defense stance, cooldowns, respawn)
- Created the WebSocket gateway for game communication with msgpack optimization
- Implemented match result processing: save match records, update ELO, update stats, check achievements in a single Prisma transaction
- Built the AI bot for single-player mode (decision-making, pathfinding, human-like behavior)
- Contributed to matchmaking service (ranked queue, ELO matching algorithm)

**Challenge:** Escaping "Spaghetti Code" with State Machines

As the lead developer of the real-time Game Service, the biggest architectural threat I faced was managing complexity. A multiplayer game loop, physics collision, and dynamic AI decision-making can quickly deteriorate into a tangled web of nested if/else statements and boolean flags (isLobby, isPlaying, isAttacking, isDefending, isFleeing).

If I had hardcoded the game flow and the AI logic into giant, centralized controller functions, the codebase would have become extremely fragile. Adding a single new game phase or a new bot behavior would have required modifying hundreds of lines of interconnected logic, making it a nightmare to test and extend. I needed an architecture that allowed behaviors to be isolated, independent, and easily interchangeable.

##### **The Resolution**

To keep the engine clean, modular, and future-proof, I heavily leveraged the State Design Pattern throughout the entire Game Service. Instead of letting a single monolithic class juggle all the rules, I encapsulated distinct behaviors into self-contained state classes sharing a common interface (IGameState, IAiStates, IPlayerState).

   - **Game Flow Management:** The lifecycle of a match smoothly transitions between LobbyState, PlayState, and EndState. The main GameSession doesn't need to know the specific rules of each phase; it simply delegates the update() and processInput() calls to the currently active state. This means the LobbyState handles player connections without worrying about physics, while the PlayState manages the 60fps loop without caring about matchmaking.

   - **AI Decision-Making:** To create challenging bots without massive decision trees, the AI evaluates threats and swaps between states like WanderState, ChaseState, KiteState, DefendState, and specific attack states. Each class contains only the logic relevant to that behavior—for instance, ChaseState runs the A* PathFinder, while DefendState focuses on blocking projectiles. If we want to introduce a new "Patrol" behavior tomorrow, we simply write a new class without touching the existing AI core.

   - **Player Combat:** I applied this same principle of encapsulation to the player's action loop. Actions that take time—like casting a spell or holding a shield—are managed by SpellAttackState, MeleeAttackState, and DefenceAttackState. This gracefully prevents players from performing conflicting actions simultaneously and keeps the PlayerManager incredibly clean.

By committing to this pattern, I transformed what could have been a chaotic, hard-to-debug monolith into a decoupled, highly scalable architecture. Each component has a single responsibility, making the game engine not only robust under concurrent loads but also incredibly easy to maintain and expand.

### Alessandro (Developer - Auth Service & Infrastructure)

- Built the `auth-service`: local login (bcrypt), Google OAuth (Passport), JWT tokens (access + refresh), email verification, password reset, 2FA (Speakeasy TOTP)
- Set up Nginx as reverse proxy with SSL termination, rate limiting per endpoint, security headers, WebSocket upgrade
- Managed TLS certificate generation and ngrok tunnel for OAuth development
- Contributed to Docker infrastructure setup alongside Renato

**Challenge: Authentication Architecture Decision**

One of the key architectural decisions I faced was choosing the right authentication strategy for our platform: **Session-based authentication** vs. **Token-based authentication (JWT)**.

To make an informed choice, I evaluated both approaches based on our project requirements:

- **Session-Based Authentication:** Offers high security and immediate token revocation capabilities, but requires the server to maintain state, increasing database overhead and limiting horizontal scalability.
- **Token-Based Authentication (JWT):** Provides a completely stateless architecture, drastically reducing server overhead—ideal for a real-time browser game. The trade-off is a minor delay in immediate revocation, as valid access tokens must be short-lived to minimize abuse.

##### **The Resolution**

Given that our project is a lightweight, browser-based game, the scalability and performance benefits of a stateless architecture far outweighed the need for heavy, server-side session tracking. Therefore, I implemented a robust **Token-Based Auth System** using short-lived access tokens, refresh tokens, and 2FA, proving that we could achieve high scalability without compromising on the security standards required for our gaming platform.

### Leonardo (Developer - Matchmaking)

- Implemented the `matchmaking-service`: ELO-based queue management, progressive tolerance range for fair pairing
- Built the ranked and unranked queue flows with Redis-backed player status tracking
- Implemented the private challenge system (invite a specific player to a match with expiration)
- Coordinated with Giovanni on game-service integration (match start/end signaling via Redis pub/sub)

**Challenge: Real-Time State Consistency & Scalable ELO Matching**

One of the key technical hurdles in the matchmaking-service was designing a fast, race-condition-free queue that could dynamically expand ELO tolerance without locking up the server or mismatching players.

To achieve a seamless real-time experience, I had to evaluate how to store and query the active matchmaking queue:

* **Relational Database Polling:** Simple to query for specific ELO ranges, but highly inefficient for real-time queue management. Continuous polling would lead to high latency, database bottlenecks, and noticeable delays for the players.
* **In-Memory Redis Architecture:** Extremely fast and supports atomic operations, making it ideal for concurrent queue management and real-time player status tracking. The trade-off is the added complexity of managing distributed states and handling unexpected disconnects to avoid "ghost" players in the queue.

##### **The Resolution**

Since Transcendence requires split-second match pairing, I chose the Redis-based architecture. I utilized Redis Sorted Sets (ZSETs) to map players to their ELO scores, which allowed me to run highly efficient, progressive range queries as the matchmaking tolerance window expanded over time.
To prevent race conditions—such as a player being pulled into a ranked match and a private challenge simultaneously—I implemented atomic Redis operations. Once a valid pair was found, the system atomically removed them from the queue and utilized Redis Pub/Sub to instantly broadcast the match data to the game-service. This ensured a perfectly synchronized, state-consistent transition from the waiting room directly into the game arena.

---

# Instructions

## Prerequisites

- **Docker** and **Docker Compose** (v2)
- **Git LFS** — required for 3D model assets (GLB files)
- **Make**
- A modern desktop browser (latest stable Google Chrome recommended)

> **Note:** The game requires a desktop browser with keyboard and mouse input — mobile and tablet devices are not supported.

---

### Step-by-step setup

#### 1. Install Git LFS (once per machine)

```bash
# macOS
brew install git-lfs

# Ubuntu / Debian
sudo apt install git-lfs

# activate it for your git user
git lfs install
```

---

#### 2. Clone the repository and pull LFS assets

```bash
git clone https://github.com/redei-ma/ft_transcendence.git
cd ft_transcendence
git lfs pull
```

---

#### 3. Create environment files

```bash
cp .env.shared.example .env.shared
cp auth-service/.env.example auth-service/.env
```

---

#### 4. Configure environment variables

##### Shared configuration (`.env.shared`)

Edit `.env.shared` and configure:

```env
POSTGRES_PASSWORD=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
INTERNAL_SERVICE_SECRET=

EMAIL_USER=
EMAIL_PASS=

NGROK_AUTHTOKEN=
NGROK_DOMAIN=
```

###### Generate secure secrets

You can generate secure random secrets with:

```bash
openssl rand -base64 32
```

Use different values for each secret.

---

##### Configure email credentials

The application uses Gmail SMTP for:

- email verification
- password reset emails

###### Enable 2FA on your Google account

Before generating an App Password, you must enable 2-Factor Authentication:

1. Go to:
   https://myaccount.google.com/security

2. Enable:
   - "2-Step Verification"

---

###### Create a Gmail App Password

After enabling 2FA:

1. Open:
   https://myaccount.google.com/apppasswords

2. Create a new App Password

3. Select:
   - App → "Mail"
   - Device → "Other"

4. Copy the generated password

Use:

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=generated_app_password
```

> Do NOT use your normal Gmail password.
>
> The `EMAIL_USER` address is also used as the application's public support/contact email in the Terms of Service and Privacy Policy.
> For privacy and professionalism, using a dedicated Google account is recommended.

---

##### Configure ngrok (required for public callbacks and email links)

The application requires a public HTTPS URL for:

- Google OAuth callbacks
- email verification links
- password reset links
- other external/public redirects

###### Create an ngrok account

1. Sign up:
   https://dashboard.ngrok.com/signup

2. Get your auth token:
   https://dashboard.ngrok.com/get-started/your-authtoken

3. Reserve a static domain:
   https://dashboard.ngrok.com/domains

Example:

```txt
my-transcendence.ngrok-free.app
```

---

###### Configure ngrok environment variables

Set the following values inside `.env.shared`:

```env
NGROK_AUTHTOKEN=your_ngrok_auth_token
NGROK_DOMAIN=my-transcendence.ngrok-free.app
```

> The project automatically starts an ngrok container through Docker Compose.
> No manual ngrok command is required.

---

##### Auth service configuration (`auth-service/.env`)

Edit `auth-service/.env` and configure:

```env
JWT_EMAIL_SECRET=
JWT_PASSWORD_RESET_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Must match your ngrok domain (or public URL) for OAuth callbacks and email links
# Example: https://your-domain.ngrok-free.app
PUBLIC_URL=https://${NGROK_DOMAIN}
```

---

#### 5. Configure Google OAuth credentials (optional)

Google login is optional but supported.

##### Create Google OAuth credentials

1. Open Google Cloud Console:
   https://console.cloud.google.com/

2. Create a project

3. Enable:
   - "Google Identity Services"
   - "OAuth consent screen"

4. Create OAuth credentials:
   - APIs & Services → Credentials
   - Create Credentials → OAuth Client ID

5. Select:
   - Application Type → Web Application

---

##### Add Authorized JavaScript origins

Add:

```txt
https://localhost:2443
https://YOUR_NGROK_DOMAIN.ngrok-free.app
```

Example:

```txt
https://my-transcendence.ngrok-free.app
```

---

##### Add Authorized redirect URIs

Add:

```txt
https://YOUR_NGROK_DOMAIN.ngrok-free.app/api/auth/google/callback
```

Example:

```txt
https://my-transcendence.ngrok-free.app/api/auth/google/callback
```

---

##### Copy credentials

Set:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

inside `auth-service/.env`.

---

#### 6. Start the application

```bash
make up
```

> TLS certificates are generated automatically on first run.
> Your browser will show a certificate warning because the project uses self-signed certificates locally — accept it to continue.

---

#### 7. Access the application

Frontend:

```txt
https://localhost:2443
```

API documentation:

```txt
https://localhost:2443/api/docs
```

### Makefile reference

| Command               | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `make up`             | Build and start all services in **dev mode** (hot reload)                          |
| `make up-prod`        | Build and start in **production mode** (no hot reload)                             |
| `make down`           | Stop all containers (data preserved)                                               |
| `make restart`        | Stop + start in **dev mode**                                                       |
| `make rebuild`        | Force rebuild without cache in **dev mode** (data preserved)                       |
| `make re`             | **Full wipe** — destroys DB and rebuilds from scratch in **dev mode**              |
| `make clean`          | Stop containers only (volumes and images preserved)                                |
| `make clean-data`     | Stop + remove DB/Redis volumes (images preserved)                                  |
| `make fclean`         | Remove containers, volumes, and project images                                     |
| `make prune`          | Wipe entire Docker system (affects all projects)                                   |
| `make logs`           | Stream all service logs                                                            |
| `make logs-auth`      | Logs for a specific service (auth / user / game / matchmaking / frontend / ...)    |
| `make ps`             | Show container status                                                              |
| `make shell-user`     | Shell into a container (auth / user / game / matchmaking / postgres / redis / ...) |
| `make generate`       | Rebuild shared packages (run after modifying `shared/`)                            |
| `make migrate NAME=x` | Create a new Prisma migration                                                      |
| `make certs`          | (Re)generate self-signed TLS certificates                                          |
| `make help`           | Show all available commands with descriptions                                      |

> **Warning:** `make prune` deletes ALL Docker images, volumes, and cache system-wide — not just this project.

---

## Resources

### References

- [NestJS Documentation](https://docs.nestjs.com/) - Backend framework
- [Prisma Documentation](https://www.prisma.io/docs) - ORM and database toolkit
- [Three.js Documentation](https://threejs.org/docs/) - 3D graphics library
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/) - React renderer for Three.js
- [Socket.io Documentation](https://socket.io/docs/) - Real-time communication
- [ELO Rating System](https://en.wikipedia.org/wiki/Elo_rating_system) - Ranking algorithm reference
- [Docker Documentation](https://docs.docker.com/) - Containerization
- [Nginx Documentation](https://nginx.org/en/docs/) - Reverse proxy and SSL

### AI Usage

AI (Claude, ChatGPT, Gemini) was used throughout the project as a study and development companion:

- **Learning and study:** Understanding new technologies and frameworks (NestJS, Prisma, Three.js, Socket.io) that were new to the team. AI helped explain concepts, patterns, and best practices.
- **Architecture decisions:** Discussing trade-offs (e.g., single database vs. separate databases for microservices, saga pattern vs. local transactions, ELO formula variants).
- **Code assistance:** Helping write and debug code across all services. AI was used as a pair-programming partner to speed up development and catch errors.
- **Schema design:** Reviewing the database schema for correctness, relations, and index optimization.
- **Docker & DevOps:** Configuring multi-stage Dockerfiles, Nginx SSL setup, and docker-compose orchestration.

All code was reviewed, understood, and adapted by the team members. AI was a tool for learning and productivity, not a replacement for understanding.

---

_ft_transcendence - 42 School Project - 2026_
