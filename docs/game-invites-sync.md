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

| | Soluzione A | Soluzione B |
|---|---|---|
| File toccati | 3 | 2 |
| Entità delle modifiche | Sostanziale | Minima |
| Stato duplicato | No | Sì |
| Coerente col pattern del progetto | No | Sì |
| Rischio regressioni | Medio | Basso |
