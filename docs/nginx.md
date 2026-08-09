# Nginx Gateway — Configuration Reference

This document describes the Nginx configuration decisions made for the
ft_transcendence gateway, covering routing, security headers, rate limiting,
and resource limits.

---

## Overview

Nginx runs as the single entry point for all external traffic on port `2443`
(HTTPS). It is responsible for:

- TLS termination
- Routing requests to the correct upstream service
- Enforcing rate limits at the network level before requests reach Node.js
- Applying HTTP security headers to all responses
- Serving static files (frontend HTML/JS and user avatar uploads) directly,
  without involving any backend service

---

## Routing

### Location precedence

Nginx evaluates `location` blocks in the following priority order:

1. `=` — exact match (highest priority)
2. `~` / `~*` — regex match (evaluated top to bottom)
3. Longest prefix match (no leading `=` or `^~`)

This means a request to `/api/users/me/avatar` is handled by
`location = /api/users/me/avatar` before it can fall through to
`location /api/users/`.

### Upstream mapping

| Location                                                | Upstream                                    | Notes                                                                                    |
| ------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/assets/`                                              | `frontend:5173`                             | Vite-hashed assets, immutable cache 1 year                                               |
| `/`                                                     | `frontend:5173`                             | Vite SPA entry point, no-cache; HMR WebSocket upgrade in dev                             |
| `/uploads/`                                             | Static files (Docker volume `uploads_data`) | User avatar images, 30-day cache                                                         |
| `/internal/`                                            | `deny all`                                  | Blocked at gateway; internal routes are only reachable within the Docker backend network |
| `/api/docs`                                             | `user-service:3001`                         | Swagger UI                                                                               |
| `/api/auth/(login\|2fa/verify)`                         | `auth-service:3002`                         | Strict rate limit                                                                        |
| `/api/auth/(register\|forgot-password\|reset-password)` | `auth-service:3002`                         | Strict rate limit                                                                        |
| `/api/auth/resend-verification`                         | `auth-service:3002`                         | Very strict rate limit                                                                   |
| `/api/auth/`                                            | `auth-service:3002`                         | General auth traffic                                                                     |
| `/api/users/me/notifications/stream`                    | `user-service:3001`                         | SSE — buffering disabled, 1h read timeout                                                |
| `/api/users/me/avatar`                                  | `user-service:3001`                         | Strict rate limit                                                                        |
| `/api/users/`                                           | `user-service:3001`                         | General user traffic                                                                     |
| `/ws/game/socket.io/`                                   | `game-service:3000`                         | WebSocket upgrade, 24h read timeout                                                      |
| `/ws/matchmaking/socket.io/`                            | `matchmaking-service:3500`                  | WebSocket upgrade, 24h read timeout                                                      |

### Internal routes

`auth-service` communicates with `user-service` directly via the Docker
backend network (`http://user-service:3001/internal/users/...`), bypassing
Nginx entirely. The `location /internal/` block explicitly denies any external
client attempting to reach these routes through the gateway.

### Avatar static files

User-uploaded avatars are stored in the Docker volume `uploads_data`, mounted
at `/uploads/` in both `user-service` (write) and `gateway` (read). Nginx
serves them directly with a 30-day cache lifetime. The cache is safe to set
this long because every filename contains a UUID, so a new upload always
produces a new URL.

---

## Rate Limiting

Rate limiting is applied at the Nginx level using `limit_req_zone`, keyed by
the client IP address (`$binary_remote_addr`). This is the first line of
defence — requests are rejected before they reach Node.js, at zero cost to
the application.

### Zones

| Zone              | Rate        | Memory | Applied to                                                                    |
| ----------------- | ----------- | ------ | ----------------------------------------------------------------------------- |
| `auth_login`      | 10 req/min  | 10 MB  | `/api/auth/login`, `/api/auth/2fa/verify`                                     |
| `auth_write`      | 5 req/min   | 10 MB  | `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password` |
| `auth_resend`     | 3 req/min   | 10 MB  | `/api/auth/resend-verification`                                               |
| `avatar_upload`   | 5 req/min   | 10 MB  | `/api/users/me/avatar`                                                        |
| `api_general`     | 120 req/min | 10 MB  | All other `/api/auth/` and `/api/users/` traffic                              |
| `sse_stream`      | 20 req/min  | 10 MB  | `/api/users/me/notifications/stream` — persistent SSE, reconnects are rare    |
| `ws_game`         | 20 req/min  | 10 MB  | `/ws/game/socket.io/` — initial connect + auto-reconnect attempts             |
| `ws_matchmaking`  | 20 req/min  | 10 MB  | `/ws/matchmaking/socket.io/` — separate bucket from game socket               |

10 MB of zone memory holds approximately 160,000 IP entries, which is more
than sufficient for this project.

### Burst and nodelay

Every `limit_req` directive uses `nodelay`, meaning excess requests beyond
the `burst` allowance are rejected immediately with `429 Too Many Requests`
rather than being queued. This prevents slow-drip attacks from consuming
worker memory.

| Zone              | Burst |
| ----------------- | ----- |
| `auth_login`      | 3     |
| `auth_write`      | 2     |
| `auth_resend`     | 1     |
| `avatar_upload`   | 2     |
| `api_general`     | 60    |
| `sse_stream`      | 15    |
| `ws_game`         | 10    |
| `ws_matchmaking`  | 10    |

### Why Nginx and not only NestJS ThrottlerModule

`auth-service` uses `@nestjs/throttler` internally for per-endpoint limits.
Nginx rate limiting is complementary, not a replacement:

| Layer                  | Key                      | Protects                                                 |
| ---------------------- | ------------------------ | -------------------------------------------------------- |
| Nginx `limit_req`      | Client IP                | Infrastructure — blocks flood before Node.js is involved |
| NestJS ThrottlerModule | Client IP (auth-service) | Application — per-endpoint logic inside the service      |

A combined approach means that even if the application layer is misconfigured,
the infrastructure layer still provides a safety net.

---

## Security Headers

The following headers are added to every response from the HTTPS server block.

### `server_tokens off`

Removes the Nginx version string from the `Server` response header and from
error pages, reducing information available to attackers.

### `X-Content-Type-Options: nosniff`

Prevents browsers from MIME-sniffing a response away from the declared
`Content-Type`. Without this, a browser might execute a file served as
`image/jpeg` as a script if it detects JavaScript-like content.

### `X-Frame-Options: DENY`

Forbids the application from being embedded in an `<iframe>` on any origin.
This eliminates clickjacking attacks where a malicious page overlays a
transparent iframe on top of the application.

### `Referrer-Policy: strict-origin-when-cross-origin`

Sends only the origin (not the full URL path) in the `Referer` header when
navigating to a different origin. Prevents leaking sensitive path parameters
or tokens to third-party services.

### `Strict-Transport-Security: max-age=31536000; includeSubDomains`

Instructs browsers to connect exclusively over HTTPS for the next 12 months,
even if the user types `http://`. Prevents SSL stripping attacks on subsequent
visits.

### `Content-Security-Policy`

Restricts which resources the browser is allowed to load.

| Directive         | Value                                                                                  | Reason                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                                                               | All resource types default to same origin                                                           |
| `script-src`      | `'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com`                         | React + Vite require inline/eval; `gstatic.com` for Google OAuth widget                             |
| `style-src`       | `'self' 'unsafe-inline' https://fonts.googleapis.com`                                  | Tailwind injects runtime styles; Google Fonts stylesheet                                            |
| `img-src`         | `'self' data: blob: https://api.dicebear.com https://lh3.googleusercontent.com`        | DiceBear default avatars + Google OAuth profile pictures; `blob:` for Three.js textures             |
| `font-src`        | `'self' https://fonts.gstatic.com`                                                     | Google Fonts asset hosts                                                                            |
| `connect-src`     | `'self' blob: wss://$host:2443 https://www.gstatic.com`                                | Same-origin fetch + WebSocket upgrade on the HTTPS port; `gstatic.com` for OAuth                    |
| `worker-src`      | `blob: 'self'`                                                                         | Three.js loads GLB models off-thread via blob-URL Web Workers                                       |
| `frame-ancestors` | `'none'`                                                                               | Modern equivalent of `X-Frame-Options: DENY`                                                        |

> `'unsafe-inline'` and `'unsafe-eval'` are required by Vite's dev runtime and
> the Tailwind/CSS-in-JS pipeline; the project does not currently emit per-request
> CSP nonces. A production build with a static bundler would allow tightening this.

---

## Resource Limits

### `client_max_body_size 5m`

Rejects request bodies larger than 5 MB before they are read. Without this
limit, a client could send a multi-gigabyte body and exhaust server memory.
5 MB is chosen to comfortably accommodate avatar image uploads while blocking
oversized payloads.

### Connection timeouts

| Directive               | Value | Purpose                                                                                                          |
| ----------------------- | ----- | ---------------------------------------------------------------------------------------------------------------- |
| `client_body_timeout`   | 10s   | Maximum time to receive the request body. Terminates slow-upload attacks.                                        |
| `client_header_timeout` | 10s   | Maximum time to receive request headers. Terminates slow-header (Slowloris) attacks.                             |
| `keepalive_timeout`     | 30s   | How long an idle keep-alive connection is held open. Balances connection reuse against worker saturation.        |
| `send_timeout`          | 10s   | Maximum time between two successive writes to the client. Terminates connections where the client stops reading. |
