# ft_transcendence
**Team Assignments & Module Breakdown**

## 🏆 Team Roles Overview

| Member | Emoji | Role | Primary Focus | Key Responsibilities |
| :--- | :---: | :--- | :--- | :--- |
| **Giovanni** | 🧜🏿‍♂️ | **The Game Server** | Game Backend (Microservice) | WebSocket Gateway, Server-side Physics, 1v1 Logic, Lag Compensation. |
| **Francesco** | 😈 | **The Game Client** | Game Frontend & UI | React Three Fiber, Shaders, Avatar Visuals, Customization UI, Stats Graphs. |
| **Leonardo** | 🍤 | **The Logic Master** | Tournament & AI (Microservice) | AI Algorithms, Tournament Backend Logic, Match History (DB). |
| **Renato** | 💆‍♂️ | **The Data & Chain** | Blockchain & Data (Microservice) | Smart Contracts, Blockchain Integration, GDPR, User DB Schema. |
| **Ale** | 💤 | **SysAdmin & Security** | Auth & Infrastructure (Microservice) | Login, OAuth, 2FA, WAF (ModSecurity), Vault, Docker Orchestration. |

---

## 📋 Detailed Module Requirements

### IV.1 Web

#### 🔴 Major Modules
* **Real-time Features** 🧜🏿‍♂️
    * Implement real-time features using WebSockets or similar technology.
    * Real-time updates across clients.
    * Handle connection/disconnection gracefully.
    * Efficient message broadcasting.

#### 🟢 Minor Modules
* **Frontend Framework** 😈 🍤 💤
    * Use a frontend framework (React, Vue, Angular, Svelte, etc.).
* **Backend Framework** 🧜🏿‍♂️ 💆‍♂️ 💤
    * Use a backend framework (Express, Fastify, NestJS, Django, etc.).

---

### IV.3 User Management

#### 🔴 Major Modules
* **Standard User Management and Authentication** (Split Task)
    * **Backend Auth (JWT):** 💤
    * **Database Schema (Users Table):** 💆‍♂️
    * **Frontend Profile & Avatar UI:** 😈
    * *Requirements:* Users can update profile info, upload avatars (default if none), manage friends, and view online status.

#### 🟢 Minor Modules
* **Remote Authentication** 💤
    * Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.).
* **2FA (Two-Factor Authentication)** 💤
    * Implement a complete 2FA system for the users.
* **Game Statistics and Match History** (Split Task)
    * **Backend Logic/Storage:** 🍤
    * **Frontend Visualization:** 😈
    * *Requirements:* Track wins/losses/ranking, display match history (1v1), show achievements, leaderboard integration.

---

### IV.4 Artificial Intelligence

#### 🔴 Major Modules
* **AI Opponent** 🍤
    * The AI must be challenging and able to win occasionally.
    * The AI should simulate human-like behavior (not perfect play).
    * If game customization is implemented, the AI must use it.
    * Explain implementation during evaluation.

---

### IV.5 Cybersecurity

#### 🔴 Major Modules
* **WAF/ModSecurity & HashiCorp Vault** 💤
    * Configure strict ModSecurity/WAF (Hardened).
    * Manage secrets in Vault (API keys, credentials, env vars), encrypted and isolated.

---

### IV.6 Gaming and User Experience

#### 🔴 Major Modules
* **Complete Web-based Game** 🧜🏿‍♂️
    * Real-time multiplayer (e.g., Isometric Brawler/Pong).
    * Live matches with clear win/loss conditions.
* **Remote Players (1v1)** 🧜🏿‍♂️
    * Enable two players on separate computers in real-time.
    * Handle network latency and disconnections gracefully.
    * Reconnection logic.
* **Advanced 3D Graphics** 😈
    * Use Three.js / React Three Fiber.
    * Immersive 3D environment with advanced rendering.
    * Smooth performance.

#### 🟢 Minor Modules
* **Game Customization Options** 😈
    * Power-ups, attacks, special abilities, or maps.
    * Customizable game settings (with defaults).
* **Tournament System** 🍤
    * Clear matchup order and bracket system.
    * Matchmaking system.
    * Tournament registration and management.

---

### IV.7 DevOps

#### 🔴 Major Modules
* **Backend as Microservices** 🧜🏿‍♂️ 😈 🍤 💆‍♂️ 💤
    * *Architect:* 💤 (Initial Docker Compose setup).
    * *Implementation:* All members implement their specific microservices.
    * Design loosely-coupled services with clear interfaces.
    * Use REST APIs or message queues (Redis) for communication.

---

### IV.8 Data and Analytics

#### 🟢 Minor Modules
* **GDPR Compliance** 💆‍♂️
    * Allow users to request their data.
    * Data deletion with confirmation.
    * Export user data in a readable format.
    * Confirmation emails for data operations.

---

### IV.9 Blockchain

#### 🔴 Major Modules
* **Blockchain Integration** 💆‍♂️
    * Store tournament scores on the Blockchain (Avalanche/Solidity).
    * Ensure data integrity and immutability.