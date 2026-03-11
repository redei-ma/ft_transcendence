_This project has been created as part of the 42 curriculum by redei-ma, gpirozzi, fzuccaro, ade-ross, lacerbi._

# ft_transcendence - Clash of Olympus

> A real-time multiplayer isometric brawler built with Microservices, WebSockets, and 3D WebGL graphics.

---

## Description

**Clash of Olympus** is a web-based multiplayer arena game where two players fight as mythological Greek characters — Zeus and Ade — in a 3D isometric arena. The project is built as a full-stack web application with a microservices architecture, real-time WebSocket communication, and an immersive Three.js-powered frontend.

**Key features:**

- Real-time 1v1 multiplayer matches (online, local, and vs AI)
- Two playable characters: Zeus (lightning) and Ade (fire), each with unique abilities
- ELO-based ranked matchmaking system
- User profiles with avatar upload, friend system, and online status
- 12 achievements across 4 tiers (Bronze, Silver, Gold, Platinum)
- Match history and detailed statistics per character
- In-game chat during matches
- Notification system (friend requests, game invites, achievement unlocks)
- Google OAuth 2.0 and TOTP-based Two-Factor Authentication
- AI opponent with human-like behavior
- Full Docker containerization with HTTPS via Nginx reverse proxy

---

## Team Information

| Member        | 42 Login   | Role                | Service                        | Focus Area                                                  |
| :------------ | :--------- | :------------------ | :----------------------------- | :---------------------------------------------------------- |
| **Renato**    | `redei-ma` | **Project Manager** | `user-service` + Prisma + DB   | DB Schema, API, Friends, Stats, Achievements, Notifications |
| **Giovanni**  | `gpirozzi` | **Tech Lead**       | `game-service` + `matchmaking` | Game engine, Physics, WebSocket, ELO, Match results         |
| **Francesco** | `fzuccaro` | **Product Owner**   | `frontend`                     | React, Three.js, UI/UX, Visual Effects, Game scenes         |
| **Ale**       | `ade-ross` | **Architect**       | `auth-service` + `nginx`       | JWT, OAuth, 2FA, Docker orchestration, SSL, Reverse proxy   |
| **Leonardo**  | `lacerbi`  | **Developer**       | `matchmaking-service`          | AI bot algorithms, Matchmaking queue logic                  |

---

## Project Management

### Organization

- **Early phase (planning):** Weekly meetings to define architecture, assign modules, and agree on the shared database schema.
- **Development phase:** Sub-teams worked in parallel on their services. Groups of interest (e.g., game-service + matchmaking, user-service + auth-service) coordinated daily.
- **Integration phase:** Daily meetings to merge services, resolve conflicts, and test end-to-end flows.

### Tools

- **Task tracking:** GitHub Issues for tracking bugs and feature requests. Informal task assignment during meetings.
- **Communication:** Discord for voice calls and screen-sharing during development sessions. WhatsApp for daily messages, quick updates, and coordination.
- **Version control:** Git with feature branches (`feature/auth-oauth`, `feature/user-friends`, etc.) merged into `develop` via pull requests.

### Work distribution

Each team member owns one or more microservices. The database schema (Prisma) is shared and maintained by Renato, with input from the whole team when new models are needed.

---

## Screenshots

> **TODO:** Add screenshots of the game arena, character select, dashboard, and profile pages once the project is finalized.

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

| Technology                       | Version | Why                                                                 |
| -------------------------------- | ------- | ------------------------------------------------------------------- |
| **React**                        | 19      | Component-based UI, large ecosystem, team familiarity               |
| **Vite**                         | 7       | Fast HMR for development, optimized production builds               |
| **Three.js** + React Three Fiber | 0.182   | 3D isometric rendering in the browser with declarative React syntax |
| **Tailwind CSS**                 | 3.4     | Utility-first styling, fast prototyping, consistent design system   |
| **Zustand**                      | 5       | Lightweight state management without boilerplate                    |
| **Socket.io-client**             | 4.8     | Real-time bidirectional communication with the game server          |
| **Axios**                        | 1.13    | HTTP client for REST API calls with interceptor support             |

### Backend

| Technology    | Version    | Why                                                                                                                               |
| ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **NestJS**    | 11         | Modular, TypeScript-native framework with built-in dependency injection, guards, pipes, and interceptors. Ideal for microservices |
| **Socket.io** | 4.8        | Real-time game state broadcasting at 60fps with automatic reconnection and room management                                        |
| **Prisma**    | 6.19       | Type-safe ORM with auto-generated client, migration system, and excellent PostgreSQL support                                      |
| **Redis**     | 7 (Alpine) | In-memory store for matchmaking queues, player status tracking, and WebSocket adapter state                                       |
| **Sharp**     | 0.34       | Server-side image processing for avatar uploads (resize, compress, format conversion)                                             |
| **Passport**  | -          | Authentication middleware for JWT and Google OAuth strategies                                                                     |
| **Speakeasy** | 2.0        | TOTP generation and verification for Two-Factor Authentication                                                                    |

### Database

| Technology     | Version     | Why                                                                                                                                   |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL** | 17 (Alpine) | ACID transactions for atomic ELO updates, relational model fits the domain (users, matches, friendships), seamless Prisma integration |

### Infrastructure

| Technology                  | Why                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Docker + Docker Compose** | Single-command deployment, isolated services, reproducible environments                              |
| **Nginx**                   | HTTPS termination (SSL), reverse proxy routing, rate limiting, security headers, static file serving |
| **ngrok**                   | Tunnel for OAuth callbacks during local development (Google requires public redirect URIs)           |

---

## Database Schema

### Models

| Model                | Key Fields                                                                                                        | Purpose                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **User**             | id, email, username, avatarUrl, status, is2faEnabled, tokenVersion                                                | Core user identity              |
| **Account**          | provider (LOCAL/GOOGLE), passwordHash, oauthId                                                                    | Authentication methods per user |
| **UserStats**        | eloCurrent, eloPeak, totalWins, totalLosses, totalDraws, totalKills, totalDeaths, currentWinStreak, bestWinStreak | Aggregate game statistics       |
| **CharacterStats**   | characterName (ADE/ZEUS), wins, losses, draws, kills, deaths                                                      | Per-character performance       |
| **Match**            | mode (RANKED/UNRANKED/LOCAL/AI), type (FFA/TEAM), durationSeconds, endReason, winningTeamId                       | Game record                     |
| **MatchParticipant** | matchId, userId, teamId, characterName, kills, deaths                                                             | Player performance in a match   |
| **Achievement**      | name, description, tier (BRONZE/SILVER/GOLD/PLATINUM), iconPath                                                   | Achievement catalog (12 total)  |
| **UserAchievement**  | userId, achievementId, unlockedAt                                                                                 | Achievement unlocks             |
| **Friendship**       | senderId, receiverId, status (PENDING/ACCEPTED/REJECTED)                                                          | Friend relationships            |
| **GameInvite**       | senderId, receiverId, status, expiresAt                                                                           | Game challenge invitations      |
| **Notification**     | userId, type, message, isRead                                                                                     | In-app notifications            |

---

## Features List

| Feature                   | Description                                                                 | Implemented by                                        |
| ------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| User registration & login | Email + password with bcrypt hashing, email verification                    | Ale (auth-service), Renato (user-service)             |
| Google OAuth 2.0          | Login and account linking via Google                                        | Ale (auth-service)                                    |
| Two-Factor Authentication | TOTP setup with QR code, enable/disable flow                                | Ale (auth-service)                                    |
| JWT authentication        | Stateless access tokens (15min) + refresh tokens (7d) in HTTP-only cookies  | Ale (auth-service)                                    |
| User profiles             | View/edit username, email, avatar. Public profile pages                     | Renato (user-service), Francesco (frontend)           |
| Avatar upload             | Image processing with Sharp (512x512 JPEG), DiceBear default avatars        | Renato (user-service)                                 |
| Friend system             | Send/accept/reject/remove friend requests, friends list with online status  | Renato (user-service), Francesco (frontend)           |
| Game invites              | Challenge friends to a match with expiration timer                          | Renato (user-service)                                 |
| Notification system       | Persistent notifications for friend requests, game invites, achievements    | Renato (user-service)                                 |
| ELO ranking & leaderboard | Chess.com-style ELO calculation (K=32), paginated leaderboard               | Giovanni (game-service), Renato (user-service)        |
| Match history             | Paginated match records with mode filter, per-player stats                  | Renato (user-service), Giovanni (game-service)        |
| Achievement system        | 12 achievements across 4 tiers, automatic unlock check after each match     | Giovanni (game-service), Renato (user-service)        |
| Real-time game engine     | Server-authoritative game loop at 60fps with physics simulation             | Giovanni (game-service)                               |
| 3D isometric arena        | Three.js rendering with React Three Fiber, character auras, impact effects  | Francesco (frontend)                                  |
| WebSocket multiplayer     | Socket.io with msgpack serialization for low-latency game state sync        | Giovanni (game-service), Francesco (frontend)         |
| In-game chat              | Real-time message exchange between players during a match                   | Giovanni (game-service), Francesco (frontend)         |
| AI opponent               | Bot with human-like behavior for single-player mode                         | Leonardo, Giovanni                                    |
| Ranked matchmaking        | ELO-based queue with progressive tolerance range                            | Giovanni, Leonardo (matchmaking-service)              |
| Unranked & local modes    | Quick play without ELO impact, same-device local mode                       | Giovanni, Leonardo (matchmaking-service)              |
| Private challenges        | Invite a specific player to a match                                         | Leonardo (matchmaking-service), Renato (user-service) |
| Docker infrastructure     | Multi-stage Dockerfiles, docker-compose orchestration, Makefile automation  | Ale                                                   |
| HTTPS & security          | Nginx reverse proxy with SSL, rate limiting, security headers               | Ale                                                   |
| Health checks             | Every service exposes /health, Docker healthchecks with dependency ordering | Renato, Ale                                           |
| Swagger API docs          | Auto-generated API documentation at /api/docs                               | Renato (user-service)                                 |

---

## Modules

### Chosen Modules

| #   | Module                              | Category  | Type  | Points | Implemented by      | How it was implemented                                                                                     |
| --- | ----------------------------------- | --------- | ----- | ------ | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **Frontend + Backend Framework**    | Web       | Major | 2      | Francesco, All      | React 19 (frontend) + NestJS 11 (backend). Each microservice is a standalone NestJS app                    |
| 2   | **Real-time (WebSockets)**          | Web       | Major | 2      | Giovanni, Francesco | Socket.io for game state at 60fps and matchmaking queue. Msgpack parser for efficient serialization        |
| 3   | **User Interaction**                | Web       | Major | 2      | Renato, Francesco   | Friend system (add/remove/accept/reject), user profiles, in-game chat via WebSocket                        |
| 4   | **ORM**                             | Web       | Minor | 1      | Renato              | Prisma ORM with shared schema, typed queries, migration system                                             |
| 5   | **Notification System**             | Web       | Minor | 1      | Renato              | Persistent notifications (DB) for friend requests, game invites, achievement unlocks. CRUD with pagination |
| 6   | **Standard User Management**        | User Mgmt | Major | 2      | Renato, Francesco   | Profile editing, avatar upload (Sharp), friends with online status, profile pages                          |
| 7   | **Game Statistics & Match History** | User Mgmt | Minor | 1      | Renato, Giovanni    | ELO tracking, win/loss/draw, K/D ratio, per-character stats, paginated match history, leaderboard          |
| 8   | **OAuth 2.0**                       | User Mgmt | Minor | 1      | Ale                 | Google OAuth via Passport with account linking/unlinking                                                   |
| 9   | **2FA**                             | User Mgmt | Minor | 1      | Ale                 | TOTP via Speakeasy, QR code generation, setup/enable/disable flow                                          |
| 10  | **AI Opponent**                     | AI        | Major | 2      | Leonardo, Giovanni  | Bot AI integrated into game engine, simulates human-like play                                              |
| 11  | **Web-based Game**                  | Gaming    | Major | 2      | Giovanni, Francesco | 1v1 arena brawler with combat mechanics (melee, spell, defense), win/loss conditions                       |
| 12  | **Remote Players**                  | Gaming    | Major | 2      | Giovanni, Francesco | Two players on separate computers via WebSocket, reconnection handling, lag compensation                   |
| 13  | **Advanced 3D Graphics**            | Gaming    | Major | 2      | Francesco           | Three.js + React Three Fiber isometric arena, character auras, particle effects, post-processing           |
| 14  | **Gamification**                    | Gaming    | Minor | 1      | Giovanni, Renato    | 12 achievements (4 tiers), ELO leaderboard, character-specific progression                                 |

---

## Individual Contributions

### Francesco (Product Owner - Frontend)

- Designed and implemented the entire frontend application with React 19 and Vite
- Built the 3D game rendering using Three.js and React Three Fiber (isometric camera, arena, player entities, bullet entities, aura effects, impact effects)
- Created all site pages: Login, Dashboard, Profile, Leaderboard, Game flow (mode select, character select, queue, match)
- Implemented the in-game HUD (HP bars, game chat, game-over overlay)
- Built WebSocket client integration for game state and matchmaking
- Styled the application with Tailwind CSS (dark Greek-mythology theme)

### Renato (Project Manager - User Service & Database)

- Designed the complete Prisma database schema (11 models, all enums, relations, indexes)
- Built the entire `user-service` microservice: user CRUD, profile management, avatar upload with Sharp, friend system, notifications, achievements, match history, leaderboard
- Implemented internal API endpoints for service-to-service communication (protected by API key)
- Set up the migration system (db-migration one-shot container)
- Coordinated team meetings, tracked progress, managed task distribution
- Contributed to Docker infrastructure and Makefile automation

### Giovanni (Tech Lead - Game Service)

- Designed and implemented the real-time game engine (60fps server-authoritative loop)
- Built the physics system (grid-based collision, movement, projectiles)
- Implemented the combat system (melee attacks, spell attacks, defense stance, cooldowns, respawn)
- Created the WebSocket gateway for game communication with msgpack optimization
- Implemented match result processing: save match records, update ELO, update stats, check achievements in a single Prisma transaction
- Contributed to matchmaking service (ranked queue, ELO matching algorithm)

### Ale (Architect - Auth Service & Infrastructure)

- Built the `auth-service`: local login (bcrypt), Google OAuth (Passport), JWT tokens (access + refresh), email verification, password reset, 2FA (Speakeasy TOTP)
- Configured the complete Docker infrastructure: docker-compose with all services, multi-stage Dockerfiles, network isolation, volume persistence, health checks, dependency ordering
- Set up Nginx as reverse proxy with SSL termination, rate limiting per endpoint, security headers, WebSocket upgrade
- Managed TLS certificate generation and ngrok tunnel for OAuth development

### Leonardo (Developer - AI & Matchmaking)

- Implemented the AI bot logic for single-player mode (decision-making, pathfinding, human-like behavior)
- Contributed to the matchmaking service: queue management, challenge system, AI match creation
- Worked on game state management and player status tracking

---

## Instructions

### Prerequisites

- **Docker** and **Docker Compose** (v2) installed
- **Make** (optional, for convenience commands)
- A modern browser (latest stable Google Chrome)

### Step-by-step setup

1. **Clone the repository:**

```bash
git clone https://github.com/redei-ma/ft_transcendence.git
cd ft_transcendence
```

2. **Create environment files:**

```bash
cp .env.shared.example .env.shared
```

Edit `.env.shared` and set your own values for:

- `POSTGRES_PASSWORD` - Database password
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` - Random 32+ character strings
- `INTERNAL_SERVICE_SECRET` - Random string for service-to-service auth
- Google OAuth credentials (if using OAuth): set in `auth-service/.env`

3. **Generate TLS certificates (for HTTPS):**

```bash
make certs
```

4. **Build shared packages:**

```bash
make generate
```

5. **Start the application:**

```bash
make up
```

This single command builds all Docker images and starts every service.

6. **Access the application:**

- **Frontend:** `https://localhost:2443`
- **API Docs (Swagger):** `https://localhost:2443/api/docs`

### Useful commands

```bash
make up          # Build and start all services
make down        # Stop all services
make logs        # Stream all logs
make re          # Full reset (wipe DB + rebuild)
make ps          # Show container status
make shell-user  # Shell into user-service container
```

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

AI (Claude, ChatGPT) was used throughout the project as a study and development companion:

- **Learning and study:** Understanding new technologies and frameworks (NestJS, Prisma, Three.js, Socket.io) that were new to the team. AI helped explain concepts, patterns, and best practices.
- **Architecture decisions:** Discussing trade-offs (e.g., single database vs. separate databases for microservices, saga pattern vs. local transactions, ELO formula variants).
- **Code assistance:** Helping write and debug code across all services. AI was used as a pair-programming partner to speed up development and catch errors.
- **Schema design:** Reviewing the database schema for correctness, relations, and index optimization.
- **Docker & DevOps:** Configuring multi-stage Dockerfiles, Nginx SSL setup, and docker-compose orchestration.

All code was reviewed, understood, and adapted by the team members. AI was a tool for learning and productivity, not a replacement for understanding.

---

_ft_transcendence - 42 School Project - 2026_
