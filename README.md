# 🏛️ ft_transcendence - Clash of Olympus

> A real-time multiplayer isometric brawler built with Microservices, WebSockets, and 3D WebGL graphics.

![Project Status](https://img.shields.io/badge/Status-In%20Development-orange)
![42 Project](https://img.shields.io/badge/School-42-black)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 👥 The Team

| Member        | Role                | Focus Area        | Key Responsibilities                                             |
| :------------ | :------------------ | :---------------- | :--------------------------------------------------------------- |
| **Francesco** | **Product Owner**   | Frontend & 3D     | React Three Fiber, Shaders, UI/UX, Visual Effects.               |
| **Renato**    | **Project Manager** | Data & API        | DB Schema, API, Friend System, Notifications.                    |
| **Giovanni**  | **Tech Lead**       | Backend & Physics | WebSocket Gateway, Physics Engine, Lag Compensation, Game Logic. |
| **Ale**       | **Architect**       | Auth & DevOps     | Docker Orchestration, Auth (JWT/OAuth), Gateway Config.          |
| **Leonardo**  | **Developer**       | AI & Game Logic   | AI Algorithms, Matchmaking Logic, Game State Management.         |

---

## 🛠️ Tech Stack

- **Frontend:** ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) ![Three.js](https://img.shields.io/badge/-Three.js-black?logo=three.js&logoColor=white) ![Tailwind](https://img.shields.io/badge/-Tailwind-06B6D4?logo=tailwindcss&logoColor=white)
- **Backend:** ![NestJS](https://img.shields.io/badge/-NestJS-E0234E?logo=nestjs&logoColor=white) ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white) ![Socket.io](https://img.shields.io/badge/-Socket.io-010101?logo=socket.io&logoColor=white)
- **Database:** ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-336791?logo=postgresql&logoColor=white) ![Prisma](https://img.shields.io/badge/-Prisma-2D3748?logo=prisma&logoColor=white)
- **DevOps:** ![Docker](https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white) ![Nginx](https://img.shields.io/badge/-Nginx-009639?logo=nginx&logoColor=white)

---

## 🎮 Game Design: "Clash of Olympus"

An **Isometric Low-Poly Brawler** where players control mythological avatars.

- **View:** Fixed Isometric Camera (Top-Down).
- **Characters:**
    - ⚡ **Zeus:** Uses lightning-based AoE attacks.
    - 🔥 **Hades:** Uses fire-based AoE attacks.
- **Mechanics:**
    - **Movement:** Vector-based movement on a 2D plane.
    - **Attack:** Area of Effect (AoE) burst (Spacebar).
    - **Defense:** Damage reduction stance (Shift).
- **Modes:** 1v1 Local, 1v1 Online, 1v1 vs AI.

---

## 📋 Project Modules

### IV.1 Web

| Module               | Type               | Description                                                                                                                                                 |
| :------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frameworks**       | Major              | Use a framework for both frontend (React) and backend (NestJS).                                                                                             |
| **Real-time**        | Major              | WebSockets for live game updates, connection/disconnection handling, efficient broadcasting.                                                                |
| **User Interaction** | Major              | Allow users to interact: basic chat system (send/receive messages), profile system (view user info), friends system (add/remove friends, see friends list). |
| **ORM**              | Minor              | Use an ORM (Prisma) for database interactions.                                                                                                              |
| **Notifications**    | Minor _(Optional)_ | Complete notification system for all creation, update, and deletion actions.                                                                                |

### IV.3 User Management

| Module                 | Type               | Description                                                                              |
| :--------------------- | :----------------- | :--------------------------------------------------------------------------------------- |
| **Standard User Mgmt** | Major              | Users can update profile, upload avatars, add friends, see online status, view profiles. |
| **Game Statistics**    | Minor              | Track user stats (wins, losses, ranking), display match history, show achievements.      |
| **Remote Auth**        | Minor              | OAuth 2.0 authentication (Google, GitHub, 42, etc.).                                     |
| **2FA System**         | Minor _(Optional)_ | Two-Factor Authentication for enhanced user security.                                    |

### IV.4 Artificial Intelligence

| Module          | Type  | Description                                                                              |
| :-------------- | :---- | :--------------------------------------------------------------------------------------- |
| **AI Opponent** | Major | AI that simulates human behavior, can win occasionally, uses game customization options. |

### IV.6 Gaming and User Experience

| Module                   | Type               | Description                                                                                         |
| :----------------------- | :----------------- | :-------------------------------------------------------------------------------------------------- |
| **Web-based Game**       | Major              | Complete multiplayer game where users can play against each other in real-time.                     |
| **Remote Players**       | Major _(Optional)_ | Enable players on separate computers to play together with lag compensation and reconnection logic. |
| **Advanced 3D Graphics** | Major              | Advanced 3D environment using Three.js, immersive rendering, smooth performance.                    |
| **Gamification**         | Minor _(Optional)_ | Reward system with achievements, badges, leaderboards, XP system, or daily challenges.              |

### IV.7 DevOps

| Module            | Type  | Description                                                                   |
| :---------------- | :---- | :---------------------------------------------------------------------------- |
| **Microservices** | Major | Backend as loosely-coupled microservices with clear interfaces and REST APIs. |

---

## 📊 Module Points Summary

| Category                    | Confirmed Modules | Optional Modules |
| :-------------------------- | :---------------- | :--------------- |
| **Web**                     | 7 points          | 1 point          |
| **User Management**         | 4 points          | 1 point          |
| **Artificial Intelligence** | 2 points          | -                |
| **Gaming & UX**             | 4 points          | 3 points         |
| **DevOps**                  | 2 points          | -                |
| **Total**                   | **19 points**     | **5 points**     |

---

## 🚀 How to Run

### Prerequisites

- Docker & Docker Compose installed.
- Node.js (for local development).

### Installation

1.  **Clone the repository:**

```bash
    git clone https://github.com/your-org/ft_transcendence.git
    cd ft_transcendence
```

2.  **Environment Setup:**

```bash
    # Generate .env file from example
    cp .env.example .env
```

3.  **Launch via Docker:**

```bash
    docker-compose up --build
```

4.  **Access the App:**
    - Frontend: `http://localhost:3000`
    - API Docs (Swagger): `http://localhost:3000/api/docs`

---

## 📂 Project Structure

```bash
.
├── backend/            # NestJS Microservices
│   ├── auth-service/   # JWT, 42API, Google Auth
│   ├── game-service/   # Socket.io, Physics Engine
│   ├── user-service/   # DB, Friends, Profile API
│   └── logic-service/  # AI, Stats Calculation
├── frontend/           # React + Vite + Three.js
├── database/           # PostgreSQL Init scripts
├── nginx/              # Reverse Proxy Configuration
└── docker-compose.yml  # Orchestration
```

---

## 📂 Roles & Responsibilities

| Role                      | Member(s)                | Key Responsibilities                                                                                                                                              |
| :------------------------ | :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product Owner (PO)**    | **Francesco**            | • Defines product vision & priorities.<br>• Maintains the product backlog.<br>• Validates completed work (UI/UX).<br>• Communicates with stakeholders.            |
| **Project Manager (PM)**  | **Renato**               | • Facilitates team coordination.<br>• Organizes meetings & planning sessions.<br>• Tracks progress, deadlines, and blockers.<br>• Manages team communication.     |
| **Tech Lead / Architect** | **Giovanni**<br> **Ale** | • Oversees technical decisions & architecture.<br>• Defines the technology stack.<br>• Ensures code quality & best practices.<br>• Reviews critical code changes. |
| **Developers**            | **All Members**          | • Implement features and modules.<br>• Write code for assigned features.<br>• Participate in code reviews.<br>• Test implementations & Document work.             |
