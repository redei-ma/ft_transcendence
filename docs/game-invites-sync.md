# Sync game invites tra `GameInviteToast` e `FriendsSidebar`

## Problema

`GameInviteToast` e `FriendsSidebar` mantengono entrambi il proprio stato separato degli inviti.
Entrambi fanno `api.getGameInvites()` al mount e ascoltano `game-invite-received` per aggiunte in tempo reale.

Quando uno dei due risponde a un invito (accept o decline), solo quel componente aggiorna il proprio stato.
L'altro continua a mostrare l'invito finché non scade o si ricarica la pagina.

**Nessuna modifica backend necessaria** — il problema è puramente di stato UI.

---

## Soluzione A — Lift state up in `App.tsx`

Lo stato degli inviti vive in `App.tsx` e viene passato via props ai due componenti figli.

### File da modificare

**`App.tsx`**

- Aggiungere `useState<GameInvite[]>` per gli inviti
- Aggiungere `useCallback` per `fetchInvites` e `handleInviteResponded`
- Spostare qui il listener `game-invite-received` (oggi duplicato nei due figli)
- Passare `gameInvites`, `onAcceptInvite`, `onRejectInvite` come props a entrambi i figli

**`FriendsSidebar.tsx`**

- Rimuovere `gameInvites` state e `fetchInvites`
- Rimuovere il `useEffect` che ascolta `game-invite-received`
- Aggiungere alle props: `gameInvites`, `onAcceptInvite`, `onRejectInvite`
- `handleAcceptInvite` e `handleRejectInvite` chiamano le props invece di gestire lo stato

**`GameInviteToast.tsx`**

- Rimuovere `invites` state e la fetch iniziale
- Rimuovere il `useEffect` che ascolta `game-invite-received`
- Aggiungere alle props: `invites`, `onAccepted`, `onReject`

---

## Soluzione B — CustomEvent `game-invite-responded`

Ogni componente mantiene il proprio stato, ma quando uno risponde a un invito dispatcha un evento che l'altro ascolta.

### File da modificare

**`GameInviteToast.tsx`**

- In `handleAccept` dopo il successo: aggiungere `window.dispatchEvent(new CustomEvent('game-invite-responded', { detail: { inviteId: invite.id } }))`
- In `handleReject` dopo il successo: stessa riga
- Aggiungere `useEffect` che ascolta `game-invite-responded` e filtra l'invito dallo state

**`FriendsSidebar.tsx`**

- In `handleAcceptInvite` dopo il successo: aggiungere il dispatch di `game-invite-responded`
- In `handleRejectInvite` dopo il successo: stessa riga
- Aggiungere `useEffect` che ascolta `game-invite-responded` e filtra l'invito dallo state

---

## Confronto

|                                   | Soluzione A | Soluzione B |
| --------------------------------- | ----------- | ----------- |
| File toccati                      | 3           | 2           |
| Entità delle modifiche            | Sostanziale | Minima      |
| Stato duplicato                   | No          | Sì          |
| Coerente col pattern del progetto | No          | Sì          |
| Rischio regressioni               | Medio       | Basso       |

## Soluzione A

⏺ Update(frontend/src/App.tsx)
⎿  Added 2 lines, removed 2 lines
1 -import { useState, useEffect } from 'react';  
 1 +import { useState, useEffect, useCallback } from 'react';  
 2 import './site/styles/site.css';
3 import LoginPage from './site/pages/LoginPage';
4 import DashboardPage from './site/pages/DashboardPage';
...
7 import GameFlow from './site/pages/GameFlow';
8 import Navbar from './site/components/Navbar';
9 import { logout, refreshToken } from './site/services/authService';
10 -import { getMyProfile, UserProfile } from './site/services/apiService';  
 10 +import { getMyProfile, UserProfile, getGameInvites, GameInvite, respondGameInvite } from './site/services/apiService';  
 11 import { theme } from './configs/theme';
12 import DesktopOnlyGuard from './site/components/desktopOnlyGuard';
13 import FriendsSidebar from './site/components/FriendSidebar';

⏺ Update(frontend/src/App.tsx)
⎿  Added 1 line
20 const [currentPage, setCurrentPage] = useState('dashboard');
21 const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
22 const [pendingInviterId, setPendingInviterId] = useState<number | null>(null);
23 + const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);  
 24  
 25 useEffect(() => {
26 const initAuth = async () => {

⏺ Now add the invite fetch + SSE listener after the initAuth useEffect:

⏺ Update(frontend/src/App.tsx)
⎿  Added 36 lines
43 initAuth();
44 }, []);
45  
 46 + const fetchGameInvites = useCallback(async () => {  
 47 + const data = await getGameInvites();  
 48 + if (data) setGameInvites(data.invites);  
 49 + }, []);  
 50 +  
 51 + useEffect(() => {  
 52 + if (!isLoggedIn) return;  
 53 + fetchGameInvites();  
 54 + const handler = (e: Event) => {  
 55 + const invite = (e as CustomEvent<GameInvite>).detail;  
 56 + setGameInvites(prev => {  
 57 + if (prev.some(i => i.id === invite.id)) return prev;  
 58 + return [invite, ...prev];  
 59 + });  
 60 + };  
 61 + window.addEventListener('game-invite-received', handler);  
 62 + return () => window.removeEventListener('game-invite-received', handler);  
 63 + }, [isLoggedIn, fetchGameInvites]);  
 64 +  
 65 + const handleAcceptInvite = useCallback(async (invite: GameInvite) => {  
 66 + const result = await respondGameInvite(invite.id, 'ACCEPTED');  
 67 + if (result.ok && result.sessionId) {  
 68 + setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 69 + setPendingSessionId(result.sessionId);  
 70 + setPendingInviterId(invite.sender.id);  
 71 + setCurrentPage('play');  
 72 + }  
 73 + }, []);  
 74 +  
 75 + const handleDeclineInvite = useCallback(async (invite: GameInvite) => {  
 76 + const result = await respondGameInvite(invite.id, 'REJECTED');  
 77 + if (result.ok) {  
 78 + setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 79 + }  
 80 + }, []);  
 81 +  
 82 const handleLogin = async () => {
83 const profile = await getMyProfile();
84 if (profile) {

⏺ Now remove the old handleGameInviteAccepted and update the JSX to pass props:

⏺ Update(frontend/src/App.tsx)
⎿  Removed 6 lines
99 setCurrentPage('dashboard');
100 };
101  
 102 - const handleGameInviteAccepted = (sessionId: string, inviterId?: number) => {  
 103 - setPendingSessionId(sessionId);  
 104 - if (inviterId) setPendingInviterId(inviterId);  
 105 - setCurrentPage('play');  
 106 - };  
 107 -  
 102 const renderPage = () => {
103 switch (currentPage) {
104 case 'dashboard':

⏺ Now update the FriendsSidebar and GameInviteToast usages in JSX:

⏺ Update(frontend/src/App.tsx)
⎿  Added 22 lines, removed 4 lines
138 inviterId={pendingInviterId}
139 />
140 </DesktopOnlyGuard>
141 - <FriendsSidebar onGameInviteAccepted={handleGameInviteAccepted} />  
 142 - <GameInviteToast onAccepted={handleGameInviteAccepted} />  
 141 + <FriendsSidebar  
 142 + onGameInviteAccepted={(sessionId) => { setPendingSessionId(sessionId); setCurrentPage('play'); }}  
 143 + gameInvites={gameInvites}  
 144 + onAcceptInvite={handleAcceptInvite}  
 145 + onDeclineInvite={handleDeclineInvite}  
 146 + />  
 147 + <GameInviteToast  
 148 + invites={gameInvites}  
 149 + onAccept={handleAcceptInvite}  
 150 + onDecline={handleDeclineInvite}  
 151 + />  
 152 </>
153 );
154 }
...
163 avatarUrl={user?.avatarUrl || ''}
164 />
165 {renderPage()}
157 - <FriendsSidebar onGameInviteAccepted={handleGameInviteAccepted} />  
 158 - <GameInviteToast onAccepted={handleGameInviteAccepted} />  
 166 + <FriendsSidebar  
 167 + onGameInviteAccepted={(sessionId) => { setPendingSessionId(sessionId); setCurrentPage('play'); }}  
 168 + gameInvites={gameInvites}  
 169 + onAcceptInvite={handleAcceptInvite}  
 170 + onDeclineInvite={handleDeclineInvite}  
 171 + />  
 172 + <GameInviteToast  
 173 + invites={gameInvites}  
 174 + onAccept={handleAcceptInvite}  
 175 + onDecline={handleDeclineInvite}  
 176 + />  
 177 </div>
178 );
179 }

⏺ Now update FriendSidebar.tsx — update props interface, remove local gameInvites state, remove fetchInvites, remove game-invite-received listener, update
handlers:

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)  
 ⎿  Added 4 lines, removed 3 lines  
 24  
 25 interface FriendsSidebarProps {  
 26 onGameInviteAccepted: (sessionId: string, inviterId?: number) => void;
27 + gameInvites: api.GameInvite[];  
 28 + onAcceptInvite: (invite: api.GameInvite) => void;  
 29 + onDeclineInvite: (invite: api.GameInvite) => void;  
 30 }  
 31  
 29 -export default function FriendsSidebar({ onGameInviteAccepted }: FriendsSidebarProps) {  
 32 +export default function FriendsSidebar({ onGameInviteAccepted, gameInvites, onAcceptInvite, onDeclineInvite }: FriendsSidebarProps) {  
 33 const [isOpen, setIsOpen] = useState(false);
34 const [tab, setTab] = useState<Tab>('friends');
35 const [friends, setFriends] = useState<api.FriendEntry[]>([]);  
 36 const [requests, setRequests] = useState<api.FriendRequestsResponse | null>(null);  
 37 const [loading, setLoading] = useState(true);
38  
 36 - // Game invites  
 37 - const [gameInvites, setGameInvites] = useState<api.GameInvite[]>([]);  
 39 const [now, setNow] = useState(Date.now());
40  
 41 // Add friend

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 1 line, removed 7 lines  
 56 setLoading(false);  
 57 }, []);  
 58  
 59 - const fetchInvites = useCallback(async () => {  
 60 - const data = await api.getGameInvites();  
 61 - if (data) setGameInvites(data.invites);  
 62 - }, []);  
 63 -  
 59 // Caricamento iniziale  
 60 useEffect(() => {  
 61 fetchFriends();  
 67 - fetchInvites();  
 68 - }, [fetchFriends, fetchInvites]);  
 62 + }, [fetchFriends]);  
 63  
 64 // Aggiornamento lista amici via SSE quando cambia una friendship  
 65 useEffect(() => {

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 1 line, removed 14 lines  
 68 return () => window.removeEventListener('friend-list-changed', handler);  
 69 }, [fetchFriends]);  
 70  
 71 - // Ricezione live degli invite via SSE (propagato dalla Navbar tramite CustomEvent)  
 72 - useEffect(() => {  
 73 - const handler = (e: Event) => {  
 74 - const invite = (e as CustomEvent<api.GameInvite>).detail;  
 75 - setGameInvites(prev => {  
 76 - if (prev.some(i => i.id === invite.id)) return prev;  
 77 - return [invite, ...prev];  
 78 - });  
 79 - };  
 80 - window.addEventListener('game-invite-received', handler);  
 81 - return () => window.removeEventListener('game-invite-received', handler);  
 82 - }, []);  
 83 -  
 84 - // 5. Ricezione live degli status amici via SSE (propagato dalla Navbar tramite CustomEvent)  
 71 + // Ricezione live degli status amici via SSE (propagato dalla Navbar tramite CustomEvent)  
 72 // Aggiorna lo status dell'amico nella lista locale senza rifare il fetch.  
 73 useEffect(() => {  
 74 const handler = (e: Event) => {

⏺ Now update the accept/reject handlers to use props instead of local state + API call:

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 2 lines, removed 14 lines  
 172 }, 3000);  
 173 };  
 174  
 175 -const handleAcceptInvite = async (invite: api.GameInvite) => {  
 176 - const result = await api.respondGameInvite(invite.id, 'ACCEPTED');  
 177 - if (result.ok && result.sessionId) {  
 178 - setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 179 - onGameInviteAccepted(result.sessionId, invite.sender.id);  
 180 - }  
 181 -};  
 182 -  
 183 - const handleRejectInvite = async (invite: api.GameInvite) => {  
 184 - const result = await api.respondGameInvite(invite.id, 'REJECTED');  
 185 - if (result.ok) {  
 186 - setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 187 - }  
 188 - };  
 175 +const handleAcceptInvite = (invite: api.GameInvite) => onAcceptInvite(invite);  
 176 +const handleRejectInvite = (invite: api.GameInvite) => onDeclineInvite(invite);  
 177  
 178 useEffect(() => {  
 179 const handleDirectSession = (data: any) => {

⏺ Now also remove the game-invite-declined handler's setGameInvites call since state lives in App:

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 2 lines, removed 3 lines  
 81 return () => window.removeEventListener('friend-status-update', handler);  
 82 }, []);  
 83  
 84 - // 6. Il nostro invite è stato rifiutato — aggiorna il messaggio e rimuovi l'invite  
 84 + // Il nostro invite è stato rifiutato — aggiorna il messaggio  
 85 useEffect(() => {  
 86 const handler = (e: Event) => {  
 87 - const { inviteId, receiverId } = (e as CustomEvent).detail;  
 88 - setGameInvites(prev => prev.filter(i => i.id !== inviteId));  
 87 + const { receiverId } = (e as CustomEvent).detail;  
 88 setInviteMsg(prev => ({ ...prev, [receiverId]: 'Declined' }));
89 setTimeout(() => {  
 90 setInviteMsg(prev => { const n = { ...prev }; delete n[receiverId]; return n; });

⏺ Now update GameInviteToast.tsx — replace with props-driven version:

⏺ Update(frontend/src/site/components/GameInviteToast.tsx)

───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Edit file  
 frontend/src/site/components/GameInviteToast.tsx  
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
2 import _ as api from '../services/apiService';  
 3 import _ as Icons from './Icons';  
 4 import { theme } from '../../configs/theme';  
 5 -import { matchmakingSocket } from '../../services/matchmakingSocket';  
 6 -import { GameEvents } from '@transcendence/types';  
 5  
 6 interface GameInviteToastProps {
9 - onAccepted: (sessionId: string, inviterId?: number) => void;  
 7 + invites: api.GameInvite[];  
 8 + onAccept: (invite: api.GameInvite) => void;  
 9 + onDecline: (invite: api.GameInvite) => void;  
 10 }
11  
 12 -export default function GameInviteToast({ onAccepted }: GameInviteToastProps) {  
 13 - const [invites, setInvites] = useState<api.GameInvite[]>([]);  
 12 +export default function GameInviteToast({ invites, onAccept, onDecline }: GameInviteToastProps) {  
 13 const [dismissed, setDismissed] = useState<Set<number>>(new Set());
14 const [now, setNow] = useState(Date.now());
15  
 17 - // Carica inviti pendenti all'avvio (in caso SSE non fosse connessa al momento dell'invite)  
 18 - useEffect(() => {  
 19 - api.getGameInvites().then(data => {  
 20 - if (data) setInvites(data.invites);  
 21 - });  
 22 - }, []);  
 23 -  
 24 - // Ricezione live degli invite via SSE (propagato dalla Navbar tramite CustomEvent)  
 25 - useEffect(() => {  
 26 - const handler = (e: Event) => {  
 27 - const invite = (e as CustomEvent<api.GameInvite>).detail;  
 28 - setInvites(prev => {  
 29 - if (prev.some(i => i.id === invite.id)) return prev;  
 30 - return [invite, ...prev];  
 31 - });  
 32 - };  
 33 - window.addEventListener('game-invite-received', handler);  
 34 - return () => window.removeEventListener('game-invite-received', handler);  
 35 - }, []);  
 36 -  
 16 // Countdown timer — aggiorna ogni secondo
17 useEffect(() => {
18 const timer = setInterval(() => setNow(Date.now()), 1000);
19 return () => clearInterval(timer);
20 }, []);
21  
 43 - const handleAccept = async (invite: api.GameInvite) => {  
 44 - const result = await api.respondGameInvite(invite.id, 'ACCEPTED');  
 45 - if (result.ok && result.sessionId) {  
 46 - setInvites(prev => prev.filter(i => i.id !== invite.id));  
 47 - onAccepted(result.sessionId, invite.sender.id);  
 48 - }  
 49 - };  
 22 + const handleAccept = (invite: api.GameInvite) => onAccept(invite);  
 23 + const handleReject = (invite: api.GameInvite) => onDecline(invite);  
 24  
 51 - const handleReject = async (invite: api.GameInvite) => {  
 52 - const result = await api.respondGameInvite(invite.id, 'REJECTED');  
 53 - if (result.ok) {  
 54 - setInvites(prev => prev.filter(i => i.id !== invite.id));  
 55 - }  
 56 - };  
 57 -  
 25 const handleDismiss = (inviteId: number) => {
26 setDismissed(prev => new Set(prev).add(inviteId));
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
Do you want to make this edit to GameInviteToast.tsx?
❯ 1. Yes 2. Yes, allow all edits during this session (shift+tab) 3. No

Esc to cancel · Tab to amend

╭─── Claude Code v2.1.113 ───────────────────────────────────────────────────────────────────────────────────────────────╮
│ │ Tips for getting started │
│ Welcome back Renato! │ Run /init to create a CLAUDE.md file with instructions for Claude │
│ │ ───────────────────────────────────────────────────────────────── │
│ ▗ ▗ ▖ ▖ │ Recent activity │
│ │ No recent activity │
│ ▘▘ ▝▝ │ │
│ Sonnet 4.6 · Claude Pro · │ │
│ deimarinirenato.app@gmail.com's Organization │ │
│ ~/Desktop/ft_transcendence │ │
╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯

✻ Conversation compacted (ctrl+o for history)

⎿  Read frontend/src/game/input/inputManager.ts (151 lines)
⎿  Read frontend/src/services/socketServices.ts (160 lines)
⎿  Read frontend/src/game/Game.tsx (323 lines)
⎿  Read frontend/src/App.tsx (131 lines)
⎿  Read frontend/src/site/services/authService.ts (174 lines)

Read 2 files (ctrl+o to expand)

⏺ Let me implement Solution A directly across all three files.

⏺ Update(frontend/src/App.tsx)
⎿  User rejected update to frontend/src/App.tsx
1 -import { useState, useEffect } from 'react';  
 1 +import { useState, useEffect, useCallback } from 'react';  
 2 import './site/styles/site.css';
3 import LoginPage from './site/pages/LoginPage';
4 import DashboardPage from './site/pages/DashboardPage';
...
7 import GameFlow from './site/pages/GameFlow';
8 import Navbar from './site/components/Navbar';
9 import { logout, refreshToken } from './site/services/authService';
10 -import { getMyProfile, UserProfile } from './site/services/apiService';  
 10 +import { getMyProfile, UserProfile, getGameInvites, GameInvite, respondGameInvite } from './site/services/apiService';  
 11 import { theme } from './configs/theme';
12 import DesktopOnlyGuard from './site/components/desktopOnlyGuard';
13 import FriendsSidebar from './site/components/FriendSidebar';

❯ ok fai le modifiche per il punto a

⏺ Update(frontend/src/App.tsx)
⎿  Added 2 lines, removed 2 lines
1 -import { useState, useEffect } from 'react';  
 1 +import { useState, useEffect, useCallback } from 'react';  
 2 import './site/styles/site.css';
3 import LoginPage from './site/pages/LoginPage';
4 import DashboardPage from './site/pages/DashboardPage';
...
7 import GameFlow from './site/pages/GameFlow';
8 import Navbar from './site/components/Navbar';
9 import { logout, refreshToken } from './site/services/authService';
10 -import { getMyProfile, UserProfile } from './site/services/apiService';  
 10 +import { getMyProfile, UserProfile, getGameInvites, GameInvite, respondGameInvite } from './site/services/apiService';  
 11 import { theme } from './configs/theme';
12 import DesktopOnlyGuard from './site/components/desktopOnlyGuard';
13 import FriendsSidebar from './site/components/FriendSidebar';

⏺ Update(frontend/src/App.tsx)
⎿  Added 1 line
20 const [currentPage, setCurrentPage] = useState('dashboard');
21 const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
22 const [pendingInviterId, setPendingInviterId] = useState<number | null>(null);
23 + const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);  
 24  
 25 useEffect(() => {
26 const initAuth = async () => {

⏺ Now add the invite fetch + SSE listener after the initAuth useEffect:

⏺ Update(frontend/src/App.tsx)
⎿  Added 36 lines
43 initAuth();
44 }, []);
45  
 46 + const fetchGameInvites = useCallback(async () => {  
 47 + const data = await getGameInvites();  
 48 + if (data) setGameInvites(data.invites);  
 49 + }, []);  
 50 +  
 51 + useEffect(() => {  
 52 + if (!isLoggedIn) return;  
 53 + fetchGameInvites();  
 54 + const handler = (e: Event) => {  
 55 + const invite = (e as CustomEvent<GameInvite>).detail;  
 56 + setGameInvites(prev => {  
 57 + if (prev.some(i => i.id === invite.id)) return prev;  
 58 + return [invite, ...prev];  
 59 + });  
 60 + };  
 61 + window.addEventListener('game-invite-received', handler);  
 62 + return () => window.removeEventListener('game-invite-received', handler);  
 63 + }, [isLoggedIn, fetchGameInvites]);  
 64 +  
 65 + const handleAcceptInvite = useCallback(async (invite: GameInvite) => {  
 66 + const result = await respondGameInvite(invite.id, 'ACCEPTED');  
 67 + if (result.ok && result.sessionId) {  
 68 + setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 69 + setPendingSessionId(result.sessionId);  
 70 + setPendingInviterId(invite.sender.id);  
 71 + setCurrentPage('play');  
 72 + }  
 73 + }, []);  
 74 +  
 75 + const handleDeclineInvite = useCallback(async (invite: GameInvite) => {  
 76 + const result = await respondGameInvite(invite.id, 'REJECTED');  
 77 + if (result.ok) {  
 78 + setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 79 + }  
 80 + }, []);  
 81 +  
 82 const handleLogin = async () => {
83 const profile = await getMyProfile();
84 if (profile) {

⏺ Now remove the old handleGameInviteAccepted and update the JSX to pass props:

⏺ Update(frontend/src/App.tsx)
⎿  Removed 6 lines
99 setCurrentPage('dashboard');
100 };
101  
 102 - const handleGameInviteAccepted = (sessionId: string, inviterId?: number) => {  
 103 - setPendingSessionId(sessionId);  
 104 - if (inviterId) setPendingInviterId(inviterId);  
 105 - setCurrentPage('play');  
 106 - };  
 107 -  
 102 const renderPage = () => {
103 switch (currentPage) {
104 case 'dashboard':

⏺ Now update the FriendsSidebar and GameInviteToast usages in JSX:

⏺ Update(frontend/src/App.tsx)
⎿  Added 22 lines, removed 4 lines
138 inviterId={pendingInviterId}
139 />
140 </DesktopOnlyGuard>
141 - <FriendsSidebar onGameInviteAccepted={handleGameInviteAccepted} />  
 142 - <GameInviteToast onAccepted={handleGameInviteAccepted} />  
 141 + <FriendsSidebar  
 142 + onGameInviteAccepted={(sessionId) => { setPendingSessionId(sessionId); setCurrentPage('play'); }}  
 143 + gameInvites={gameInvites}  
 144 + onAcceptInvite={handleAcceptInvite}  
 145 + onDeclineInvite={handleDeclineInvite}  
 146 + />  
 147 + <GameInviteToast  
 148 + invites={gameInvites}  
 149 + onAccept={handleAcceptInvite}  
 150 + onDecline={handleDeclineInvite}  
 151 + />  
 152 </>
153 );
154 }
...
163 avatarUrl={user?.avatarUrl || ''}
164 />
165 {renderPage()}
157 - <FriendsSidebar onGameInviteAccepted={handleGameInviteAccepted} />  
 158 - <GameInviteToast onAccepted={handleGameInviteAccepted} />  
 166 + <FriendsSidebar  
 167 + onGameInviteAccepted={(sessionId) => { setPendingSessionId(sessionId); setCurrentPage('play'); }}  
 168 + gameInvites={gameInvites}  
 169 + onAcceptInvite={handleAcceptInvite}  
 170 + onDeclineInvite={handleDeclineInvite}  
 171 + />  
 172 + <GameInviteToast  
 173 + invites={gameInvites}  
 174 + onAccept={handleAcceptInvite}  
 175 + onDecline={handleDeclineInvite}  
 176 + />  
 177 </div>
178 );
179 }

⏺ Now update FriendSidebar.tsx — update props interface, remove local gameInvites state, remove fetchInvites, remove game-invite-received listener, update
handlers:

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 4 lines, removed 3 lines
24  
 25 interface FriendsSidebarProps {
26 onGameInviteAccepted: (sessionId: string, inviterId?: number) => void;
27 + gameInvites: api.GameInvite[];  
 28 + onAcceptInvite: (invite: api.GameInvite) => void;  
 29 + onDeclineInvite: (invite: api.GameInvite) => void;  
 30 }
31  
 29 -export default function FriendsSidebar({ onGameInviteAccepted }: FriendsSidebarProps) {  
 32 +export default function FriendsSidebar({ onGameInviteAccepted, gameInvites, onAcceptInvite, onDeclineInvite }: FriendsSidebarProps) {  
 33 const [isOpen, setIsOpen] = useState(false);
34 const [tab, setTab] = useState<Tab>('friends');
35 const [friends, setFriends] = useState<api.FriendEntry[]>([]);
36 const [requests, setRequests] = useState<api.FriendRequestsResponse | null>(null);
37 const [loading, setLoading] = useState(true);
38  
 36 - // Game invites  
 37 - const [gameInvites, setGameInvites] = useState<api.GameInvite[]>([]);  
 39 const [now, setNow] = useState(Date.now());
40  
 41 // Add friend

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 1 line, removed 7 lines
56 setLoading(false);
57 }, []);
58  
 59 - const fetchInvites = useCallback(async () => {  
 60 - const data = await api.getGameInvites();  
 61 - if (data) setGameInvites(data.invites);  
 62 - }, []);  
 63 -  
 59 // Caricamento iniziale
60 useEffect(() => {
61 fetchFriends();
67 - fetchInvites();  
 68 - }, [fetchFriends, fetchInvites]);  
 62 + }, [fetchFriends]);  
 63  
 64 // Aggiornamento lista amici via SSE quando cambia una friendship
65 useEffect(() => {

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 1 line, removed 14 lines
68 return () => window.removeEventListener('friend-list-changed', handler);
69 }, [fetchFriends]);
70  
 71 - // Ricezione live degli invite via SSE (propagato dalla Navbar tramite CustomEvent)  
 72 - useEffect(() => {  
 73 - const handler = (e: Event) => {  
 74 - const invite = (e as CustomEvent<api.GameInvite>).detail;  
 75 - setGameInvites(prev => {  
 76 - if (prev.some(i => i.id === invite.id)) return prev;  
 77 - return [invite, ...prev];  
 78 - });  
 79 - };  
 80 - window.addEventListener('game-invite-received', handler);  
 81 - return () => window.removeEventListener('game-invite-received', handler);  
 82 - }, []);  
 83 -  
 84 - // 5. Ricezione live degli status amici via SSE (propagato dalla Navbar tramite CustomEvent)  
 71 + // Ricezione live degli status amici via SSE (propagato dalla Navbar tramite CustomEvent)  
 72 // Aggiorna lo status dell'amico nella lista locale senza rifare il fetch.
73 useEffect(() => {
74 const handler = (e: Event) => {

⏺ Now update the accept/reject handlers to use props instead of local state + API call:

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 2 lines, removed 14 lines
172 }, 3000);
173 };
174  
 175 -const handleAcceptInvite = async (invite: api.GameInvite) => {  
 176 - const result = await api.respondGameInvite(invite.id, 'ACCEPTED');  
 177 - if (result.ok && result.sessionId) {  
 178 - setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 179 - onGameInviteAccepted(result.sessionId, invite.sender.id);  
 180 - }  
 181 -};  
 182 -  
 183 - const handleRejectInvite = async (invite: api.GameInvite) => {  
 184 - const result = await api.respondGameInvite(invite.id, 'REJECTED');  
 185 - if (result.ok) {  
 186 - setGameInvites(prev => prev.filter(i => i.id !== invite.id));  
 187 - }  
 188 - };  
 175 +const handleAcceptInvite = (invite: api.GameInvite) => onAcceptInvite(invite);  
 176 +const handleRejectInvite = (invite: api.GameInvite) => onDeclineInvite(invite);  
 177  
 178 useEffect(() => {
179 const handleDirectSession = (data: any) => {

⏺ Now also remove the game-invite-declined handler's setGameInvites call since state lives in App:

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)
⎿  Added 2 lines, removed 3 lines
81 return () => window.removeEventListener('friend-status-update', handler);
82 }, []);
83  
 84 - // 6. Il nostro invite è stato rifiutato — aggiorna il messaggio e rimuovi l'invite  
 84 + // Il nostro invite è stato rifiutato — aggiorna il messaggio  
 85 useEffect(() => {
86 const handler = (e: Event) => {
87 - const { inviteId, receiverId } = (e as CustomEvent).detail;  
 88 - setGameInvites(prev => prev.filter(i => i.id !== inviteId));  
 87 + const { receiverId } = (e as CustomEvent).detail;  
 88 setInviteMsg(prev => ({ ...prev, [receiverId]: 'Declined' }));
89 setTimeout(() => {
90 setInviteMsg(prev => { const n = { ...prev }; delete n[receiverId]; return n; });

⏺ Now update GameInviteToast.tsx — replace with props-driven version:

⏺ Update(frontend/src/site/components/GameInviteToast.tsx)
⎿  Added 6 lines, removed 39 lines
2 import _ as api from '../services/apiService';
3 import _ as Icons from './Icons';  
 4 import { theme } from '../../configs/theme';
5 -import { matchmakingSocket } from '../../services/matchmakingSocket';  
 6 -import { GameEvents } from '@transcendence/types';  
 5  
 6 interface GameInviteToastProps {  
 9 - onAccepted: (sessionId: string, inviterId?: number) => void;  
 7 + invites: api.GameInvite[];  
 8 + onAccept: (invite: api.GameInvite) => void;  
 9 + onDecline: (invite: api.GameInvite) => void;  
 10 }
11  
 12 -export default function GameInviteToast({ onAccepted }: GameInviteToastProps) {  
 13 - const [invites, setInvites] = useState<api.GameInvite[]>([]);  
 12 +export default function GameInviteToast({ invites, onAccept, onDecline }: GameInviteToastProps) {  
 13 const [dismissed, setDismissed] = useState<Set<number>>(new Set());
14 const [now, setNow] = useState(Date.now());
15  
 17 - // Carica inviti pendenti all'avvio (in caso SSE non fosse connessa al momento dell'invite)  
 18 - useEffect(() => {  
 19 - api.getGameInvites().then(data => {  
 20 - if (data) setInvites(data.invites);  
 21 - });  
 22 - }, []);  
 23 -  
 24 - // Ricezione live degli invite via SSE (propagato dalla Navbar tramite CustomEvent)  
 25 - useEffect(() => {  
 26 - const handler = (e: Event) => {  
 27 - const invite = (e as CustomEvent<api.GameInvite>).detail;  
 28 - setInvites(prev => {  
 29 - if (prev.some(i => i.id === invite.id)) return prev;  
 30 - return [invite, ...prev];  
 31 - });  
 32 - };  
 33 - window.addEventListener('game-invite-received', handler);  
 34 - return () => window.removeEventListener('game-invite-received', handler);  
 35 - }, []);  
 36 -  
 16 // Countdown timer — aggiorna ogni secondo
17 useEffect(() => {
18 const timer = setInterval(() => setNow(Date.now()), 1000);
19 return () => clearInterval(timer);
20 }, []);
21  
 43 - const handleAccept = async (invite: api.GameInvite) => {  
 44 - const result = await api.respondGameInvite(invite.id, 'ACCEPTED');  
 45 - if (result.ok && result.sessionId) {  
 46 - setInvites(prev => prev.filter(i => i.id !== invite.id));  
 47 - onAccepted(result.sessionId, invite.sender.id);  
 48 - }  
 49 - };  
 22 + const handleAccept = (invite: api.GameInvite) => onAccept(invite);  
 23 + const handleReject = (invite: api.GameInvite) => onDecline(invite);  
 24  
 51 - const handleReject = async (invite: api.GameInvite) => {  
 52 - const result = await api.respondGameInvite(invite.id, 'REJECTED');  
 53 - if (result.ok) {  
 54 - setInvites(prev => prev.filter(i => i.id !== invite.id));  
 55 - }  
 56 - };  
 57 -  
 25 const handleDismiss = (inviteId: number) => {
26 setDismissed(prev => new Set(prev).add(inviteId));
27 };

⏺ Now check if GameEvents import is still needed in FriendSidebar (it was imported but I need to verify usage):

Searched for 2 patterns (ctrl+o to expand)

⏺ GameEvents is imported but no longer used. Remove it:

⏺ Update(frontend/src/site/components/FriendSidebar.tsx)  
 ⎿  Removed 1 line  
 3 import \* as Icons from './Icons';  
 4 import { theme } from '../../configs/theme';  
 5 import { matchmakingSocket } from '../../services/matchmakingSocket';  
 6 -import { GameEvents } from '@transcendence/types';  
 6  
 7  
 8 const SIDEBAR_WIDTH = 300;

⏺ Now check if getGameInvites and respondGameInvite are still used in FriendSidebar (they should no longer be):

Searched for 1 pattern (ctrl+o to expand)

⏺ Good. Let me also verify the useCallback import is still needed in FriendSidebar (it is, for fetchFriends):

Searched for 1 pattern (ctrl+o to expand)

⏺ Good. Let me do a quick check on the final state of App.tsx to make sure everything looks right:

Read 1 file (ctrl+o to expand)

⏺ Also need to verify GameInvite and respondGameInvite are exported from apiService:

Searched for 1 pattern (ctrl+o to expand)

⏺ All exports exist. Done — here's what changed:

- App.tsx: owns gameInvites state, fetches on login, listens to game-invite-received SSE event, handles accept/decline (API call + state update + navigation).  
  Passes gameInvites, onAcceptInvite, onDeclineInvite to both children.
- FriendSidebar.tsx: removed local gameInvites state, fetchInvites, and game-invite-received listener. Now receives invites as props and delegates accept/decline
  to parent.
- GameInviteToast.tsx: removed local invites state, initial fetch, and game-invite-received listener. Now purely display-driven by props.  


Accept in either component now removes the invite from the shared list, so both stay in sync automatically.
