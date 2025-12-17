# 🏛️ ft_transcendence - Clash of Olympus

> A real-time multiplayer isometric brawler built with Microservices, WebSockets, and 3D WebGL graphics.

![Project Status](https://img.shields.io/badge/Status-In%20Development-orange)
![42 Project](https://img.shields.io/badge/School-42-black)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 👥 The Team

| Member | Role | Focus Area | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Giovanni** 🧜🏿‍♂️ | **Game Server** | Backend & Physics | WebSocket Gateway, Physics Engine, Lag Compensation, Game Logic. |
| **Francesco** 😈 | **Game Client** | Frontend & 3D | React Three Fiber, Shaders, UI/UX, Visual Effects. |
| **Leonardo** 🍤 | **Logic Master** | AI & Stats | AI Algorithms, Matchmaking Logic, Game State Management. |
| **Renato** 💆‍♂️ | **Data Architect** | Data & API | DB Schema, Public API, Friend System, Notifications. |
| **Ale** 💤 | **SysAdmin** | Auth & DevOps | Docker Orchestration, Auth (JWT/OAuth), Gateway Config. |

---

## 🛠️ Tech Stack

* **Frontend:** ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) ![Three.js](https://img.shields.io/badge/-Three.js-black?logo=three.js&logoColor=white) ![Tailwind](https://img.shields.io/badge/-Tailwind-06B6D4?logo=tailwindcss&logoColor=white)
* **Backend:** ![NestJS](https://img.shields.io/badge/-NestJS-E0234E?logo=nestjs&logoColor=white) ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white) ![Socket.io](https://img.shields.io/badge/-Socket.io-010101?logo=socket.io&logoColor=white)
* **Database:** ![PostgreSQL](https://img.shields.io/badge/-PostgreSQL-336791?logo=postgresql&logoColor=white) ![Prisma](https://img.shields.io/badge/-Prisma-2D3748?logo=prisma&logoColor=white)
* **DevOps:** ![Docker](https://img.shields.io/badge/-Docker-2496ED?logo=docker&logoColor=white) ![Nginx](https://img.shields.io/badge/-Nginx-009639?logo=nginx&logoColor=white)

---

## 🎮 Game Design: "Clash of Olympus"

An **Isometric Low-Poly Brawler** where players control mythological avatars.

* **View:** Fixed Isometric Camera (Top-Down).
* **Characters:**
    * ⚡ **Zeus:** Uses lightning-based AoE attacks.
    * 🔥 **Ade:** Uses fire-based AoE attacks.
* **Mechanics:**
    * **Movement:** Vector-based movement on a 2D plane.
    * **Attack:** Area of Effect (AoE) burst (Spacebar).
    * **Defense:** Damage reduction stance (Shift).
* **Modes:** 1v1 Local, 1v1 Online, 1v1 vs AI.

---

## 📋 Project Modules & Assignments

### IV.1 Web
| Feature | Description | Assignee |
| :--- | :--- | :--- |
| **Real-time** | WebSockets for live game updates (60fps) & graceful disconnect handling. | 🧜🏿‍♂️ **Giovanni** |
| **Public API** | REST API with Swagger docs, API Key security, and Rate Limiting. | 💆‍♂️ **Renato** (Dev) + 💤 **Ale** (Sec) |
| **Frameworks** | React (Frontend) & NestJS (Backend). | 😈 **Francesco** + 💤 **Ale** |
| **ORM** | Use of an ORM (Prisma/TypeORM) for database interactions. | 💆‍♂️ **Renato** |
| **Notifications** | Complete system for creation, update, and deletion actions. | 💆‍♂️ **Renato** |

### IV.3 User Management
| Feature | Description | Assignee |
| :--- | :--- | :--- |
| **Auth** | JWT Authentication, Login, Register. | 💤 **Ale** |
| **User Data** | DB Schema, Friend System, Status (Online/Offline), Profile API. | 💆‍♂️ **Renato** |
| **Profile UI** | Avatar upload, Stats view, Character selection. | 😈 **Francesco** |
| **Remote Auth** | OAuth 2.0 (42 Intra, Google). | 💤 **Ale** |
| **Stats** | Match history logging & Win/Loss visualization. | 🍤 **Leonardo** (Back) + 😈 **Francesco** (Front) |

### IV.4 Artificial Intelligence
| Feature | Description | Assignee |
| :--- | :--- | :--- |
| **AI Opponent** | Server-side bot simulating human behavior (chase & attack). | 🍤 **Leonardo** (forse) |

### IV.6 Gaming & UX
| Feature | Description | Assignee |
| :--- | :--- | :--- |
| **Game Logic** | Physics & Collisions (Giovanni) + Game State/Rules (Leonardo). | 🧜🏿‍♂️ **Giovanni** + 🍤 **Leonardo** |
| **Netcode** | Lag compensation, interpolation, and reconnection logic. | 🧜🏿‍♂️ **Giovanni** |
| **Graphics** | Advanced 3D Scene (Three.js), Isometric setup, VFX, Lighting. | 😈 **Francesco** |

### IV.7 DevOps
| Feature | Description | Assignee |
| :--- | :--- | :--- |
| **Microservices** | Docker Compose orchestration, Nginx Gateway, Service isolation. | 💤 **Ale** (Arch) + **All** |

---

## 🚀 How to Run

### Prerequisites
* Docker & Docker Compose installed.
* Node.js (for local development).

### Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-org/ft_transcendence.git](https://github.com/your-org/ft_transcendence.git)
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
    * Frontend: `http://localhost:3000`
    * API Docs (Swagger): `http://localhost:3000/api/docs`

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