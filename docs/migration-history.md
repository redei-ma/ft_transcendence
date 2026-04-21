# Migration History — ft_transcendence Database

This document traces the evolution of the database schema from initial prototype to production-ready design. Each migration reflects a deliberate architectural decision made during development.

---

## 01 — `init_users_and_auth`

Bootstrap the project with a minimal `users` table. Authentication fields (`password_hash`, `oauth_id`) live directly on the user row — simple and sufficient to start building the login flow.

**Tables:** `users`

---

## 02 — `add_match_system`

Introduce the core gameplay layer. Matches use a **naive 1v1 design** with `player1_id`, `player2_id`, and `winner_id` columns directly on the `matches` table. Player stats (`wins`, `losses`, `kills`, `deaths`) are tracked on the `users` table for simplicity.

This works for basic duels but won't scale to team modes or free-for-all.

**Tables:** `matches` (with fixed player columns)
**Enums:** `CharacterName`, `MatchMode` (RANKED, UNRANKED), `EndReason`

---

## 03 — `refactor_match_participants` _(scalability refactor)_

**Problem:** The fixed `player1`/`player2` columns on `matches` can only represent 1v1. Our game supports 2v2, 3v3, and FFA — we need N participants per match.

**Solution:** Extract participants into a dedicated `match_participants` join table with a `team_id` column. Each row represents one player in one match, with their character choice and K/D stats. The `winner_team_id` on `matches` replaces `winner_id`.

This design supports any number of players and any team configuration.

**Tables:** `match_participants` (new), `matches` (refactored)
**Enums:** `MatchType` (FFA, TEAM)

---

## 04 — `refactor_user_stats` _(scalability refactor)_

**Problem:** Stats columns (`wins`, `losses`, `kills`, `deaths`) on the `users` table pollute the user model. As we add more statistics (ELO, streaks), the users table grows unboundedly.

**Solution:** Move all stats into a dedicated `user_stats` table with a 1:1 relationship. The user model stays clean, and stats can be extended independently.

**Tables:** `user_stats` (new), `users` (columns removed)

---

## 05 — `add_character_stats`

Per-character performance tracking. Each `(user, character)` pair gets its own win/loss/kill/death counters. Useful for balancing analysis and player profiles.

**Tables:** `character_stats`

---

## 06 — `add_friendships`

Social layer — friend requests with a `PENDING → ACCEPTED/REJECTED` flow. Uses a sender/receiver pattern with indexes on both columns for efficient lookups.

**Tables:** `friendships`
**Enums:** `FriendshipStatus`

---

## 06b — `fix_friendship_unique_constraint`

Realized during testing that nothing prevented a user from sending duplicate friend requests to the same person. Added the missing unique constraint on `(sender_id, receiver_id)`.

**Altered:** `friendships` (unique index added)

---

## 07 — `add_achievements`

Gamification system with tiered achievements (BRONZE → PLATINUM). The `user_achievements` join table tracks when each player unlocked each achievement.

**Tables:** `achievements`, `user_achievements`
**Enums:** `AchievementType`

---

## 08 — `refactor_auth_providers` _(scalability refactor)_

**Problem:** `password_hash` and `oauth_id` on the `users` table assume at most one auth method. Adding a new provider (e.g., GitHub, Discord) would mean adding more nullable columns — this doesn't scale.

**Solution:** Extract authentication into an `accounts` table with a `Provider` enum. Each user can have N accounts (one per provider). The unique constraint `(provider, provider_id)` prevents duplicate OAuth links, while `(user_id, provider)` ensures one account per provider per user.

**Tables:** `accounts` (new), `users` (auth columns removed)
**Enums:** `Provider` (LOCAL, GOOGLE)

---

## 09 — `add_game_invites_and_notifications`

Real-time social features. Game invites have an expiration mechanism (`expires_at`) and a status flow (`PENDING → ACCEPTED/REJECTED/EXPIRED`). Notifications are generic and cover friend requests, game invites, and achievement unlocks.

**Tables:** `game_invites`, `notifications`
**Enums:** `InviteStatus`, `NotificationType`

---

## 10 — `add_elo_and_streaks`

Competitive ranking system. Adds ELO rating (`elo_current`, `elo_peak`) and streak tracking to `user_stats`. Also expands `MatchMode` with `LOCAL` and `AI` modes for offline/practice play.

**Altered:** `user_stats` (new columns), `MatchMode` (new values)

---

## 10b — `fix_elo_leaderboard_index`

The leaderboard page was doing a full table scan on `user_stats` to sort by ELO. Added a descending index on `elo_current` to make the query instant.

**Altered:** `user_stats` (DESC index on `elo_current`)

---

## 11 — `add_2fa_and_security`

Security hardening as the final migration. Adds two-factor authentication (`two_factor_secret`, `is_2fa_enabled`), email verification, token versioning for session invalidation, and an online status indicator.

**Altered:** `users` (new security columns)
**Enums:** `UserStatus` (ONLINE, OFFLINE, IN_GAME, IN_QUEUE)

---

## Schema Evolution Summary

| Migration | Type         | Key Decision                                         |
| --------- | ------------ | ---------------------------------------------------- |
| 01        | Init         | Auth fields on users — start simple                  |
| 02        | Feature      | 1v1 match design — get gameplay working              |
| 03        | **Refactor** | Fixed players → participant table (N players, teams) |
| 04        | **Refactor** | Stats on users → dedicated table (clean separation)  |
| 05        | Feature      | Per-character stat tracking                          |
| 06        | Feature      | Friendship system with request flow                  |
| 06b       | **Fix**      | Missing unique constraint on friendships             |
| 07        | Feature      | Tiered achievement system                            |
| 08        | **Refactor** | Auth on users → accounts table (N providers)         |
| 09        | Feature      | Game invites and notification system                 |
| 10        | Enhancement  | ELO rating and competitive streaks                   |
| 10b       | **Fix**      | Leaderboard index for ELO sorting                    |
| 11        | Enhancement  | 2FA, token versioning, email verification            |
