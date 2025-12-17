# ft_transcendence
**Initial Sprint Plan & Team Assignments**

## 🏆 Team Roles Overview

| Member | Emoji | Role | Primary Focus |
| :--- | :---: | :--- | :--- |
| **Giovanni** | 🧜🏿‍♂️ | **The Game Server** | Game Backend (Physics, Sockets, Logic) |
| **Francesco** | 😈 | **The Game Client** | Game Frontend (3D, UI, Visuals) |
| **Leonardo** | 🍤 | **The Logic Master** | AI, Tournament Logic, Stats Calculation |
| **Renato** | 💆‍♂️ | **The Data Architect** | Database Schema, Data Persistence, API |
| **Ale** | 💤 | **SysAdmin & Auth** | Docker Arch, Auth Service, Security |

---

## IV.1 Web

### 🔴 Major Modules
* **Real-time Features**
    * Implement real-time features using WebSockets or similar technology.
    * Real-time updates across clients.
    * Handle connection/disconnection gracefully.
    * Efficient message broadcasting.
> ➤ **Assigned to:** 🧜🏿‍♂️ **Giovanni** (Socket.io Gateway management, Game Rooms, and Synchronization).

* **A public API to interact with the database with a secured API key, rate**
    * limiting, documentation, and at least 5 endpoints:
    * GET /api/{something}
    * POST /api/{something}
    * PUT /api/{something}
    * DELETE /api/{something}
> ➤ **Assigned to:** 💆‍♂️ **Renato** (Implementazione Swagger/OpenAPI, Rate Limiting e creazione Endpoints REST per CRUD utenti).

### 🟢 Minor Modules
* **Frontend Framework**
    * Use a frontend framework (React, Vue, Angular, Svelte, etc.).
> ➤ **Assigned to:** 😈 **Francesco** (Vite/React Setup) + 🍤 **Leonardo** + 💤 **Ale** (Integration of respective modules).

* **Backend Framework**
    * Use a backend framework (Express, Fastify, NestJS, Django, etc.).
> ➤ **Assigned to:** 🧜🏿‍♂️ **Giovanni** (Game Svc) + 🍤 **Leonardo** (Logic Svc) + 💤 **Ale** (Auth Svc) + 💆‍♂️ **Renato** (Data Svc).

---

## IV.3 User Management

### 🔴 Major Modules
* **Standard User Management and Authentication**
    * Users can update their profile information.
    * Users can upload an avatar (with a default avatar if none provided).
    * Users can add other users as friends and see their online status.
    * Users have a profile page displaying their information.
> ➤ **Assigned to (Split Task):**
> * 💤 **Ale:** Backend Auth (Basic Login, JWT generation).
> * 💆‍♂️ **Renato:** Database Schema (Users Table, Friends Relations) & API.
> * 😈 **Francesco:** Frontend Page (Avatar Upload, Profile UI).

### 🟢 Minor Modules
* **Remote Authentication**
    * Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.).
> ➤ **Assigned to:** 💤 **Ale** (Passport.js strategy 42/Google).

* **2FA (Two-Factor Authentication)**
    * Implement a complete 2FA system for the users.
> ➤ **Assigned to:** 💤 **Ale** (QR Code generation and validation).

* **Game Statistics and Match History** (requires a game module)
    * Track user game statistics (wins, losses, ranking, level, etc.).
    * Display match history (1v1 games, dates, results, opponents).
    * Show achievements and progression.
    * Leaderboard integration.
> ➤ **Assigned to:**
> * 🍤 **Leonardo:** Backend Logic (Ranking Calculation, post-match DB update).
> * 😈 **Francesco:** Frontend Visualization (Graphs, History tables).

---

## IV.4 Artificial Intelligence

### 🔴 Major Modules
* **AI Opponent**
    * The AI must be challenging and able to win occasionally.
    * The AI should simulate human-like behavior (not perfect play).
    * If game customization is implemented, the AI must use it.
    * Explain implementation during evaluation.
> ➤ **Assigned to:** 🍤 **Leonardo** (AI Algorithm development and State Machine).

---

## IV.6 Gaming and User Experience

### 🔴 Major Modules
* **Complete Web-based Game**
    * Real-time multiplayer (e.g., Isometric Brawler/Pong).
    * Live matches with clear win/loss conditions.
> ➤ **Assigned to:** 🧜🏿‍♂️ **Giovanni** (Server-side Logic, Game Loop, Collisions).

* **Remote Players (1v1)**
    * Enable two players on separate computers in real-time.
    * Handle network latency and disconnections gracefully.
    * Reconnection logic.
> ➤ **Assigned to:** 🧜🏿‍♂️ **Giovanni** (Netcode, Interpolation, Lag Compensation).

* **Advanced 3D Graphics**
    * Use Three.js / React Three Fiber.
    * Immersive 3D environment with advanced rendering.
    * Smooth performance.
> ➤ **Assigned to:** 😈 **Francesco** (Scene Setup, 3D Models, Lights, Effects).

### 🟢 Minor Modules
* **Game Customization Options**
    * Power-ups, attacks, special abilities, or maps.
    * Customizable game settings (with defaults).
> ➤ **Assigned to:** 😈 **Francesco** (Selection UI) + 🧜🏿‍♂️ **Giovanni** (Power-up Backend Logic).

---

## IV.7 DevOps

### 🔴 Major Modules
* **Backend as Microservices**
    * Design loosely-coupled services with clear interfaces.
    * Use REST APIs or message queues (Redis) for communication.
    * Each service should have a single responsibility.
> ➤ **Assigned to:**
> * 💤 **Ale:** Architect (Initial Docker Compose, Nginx Gateway).
> * **ALL:** Implementation of their specific microservice.