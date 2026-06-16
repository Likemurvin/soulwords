# SoulWords — Telegram Mini App

Word duel game (explain / guess) running as a Telegram Mini App.
React + Vite client, Express + MongoDB backend, Telegram identity & Stars payments.

---

## Architecture

```
Telegram client ──initData──▶ Express API ──▶ MongoDB
   (React/Vite)                (auth, queue,      (users, rooms,
        │                       rooms, stars)      queue, payments)
        │
        └────── Socket.IO ──────▶ live match relay (server-authoritative
                (human duels)      round/role/word; in-memory, not in Mongo)
```

- **Live human matches**: when two players pair, the server creates an
  in-memory match and both clients open a Socket.IO connection to the room
  `match:<id>`. The server owns round number, who explains, and the shared word
  sequence; explanations/guesses/skips relay between the two players in real
  time. **Bot (P2E) matches stay fully client-side** and never use sockets.
- **Dev proxy**: the Vite dev server proxies both `/api` and `/socket.io`
  (WebSocket upgrade) to the API, so one ngrok tunnel on the dev server covers
  everything. If you serve a built client with a separate API origin, set
  `VITE_API_URL` — the socket connects there directly (server CORS is open).

- **Identity**: no login screen. The client reads Telegram `initData`, the
  server validates its HMAC signature against the bot token, and the user is
  keyed by Telegram ID. Outside Telegram a stable dev id is generated so you can
  develop in a normal browser.
- **Offline fallback**: if the API is unreachable the client keeps working off
  `localStorage`, so the game is never blank.

---

## Quick start (local dev)

You need: Node 20+, and either Docker (for Mongo) or a local `mongod`.

### 1. Start MongoDB + API with Docker

```bash
cp .env.example .env          # fill BOT_TOKEN later for prod
docker compose up --build     # starts mongo:27017 and api:3001
```

(Or run Mongo yourself and `cd server && npm install && npm run dev`.)

### 2. Start the client

```bash
npm install
npm run dev                   # http://localhost:5173, proxies /api -> :3001
```

Open `http://localhost:5173`. In a plain browser you get a dev identity and the
Black Market credits souls instantly (no real Stars).

---

## Exposing to Telegram (ngrok)

The Mini App must be served over HTTPS. Expose the **Vite dev server** (it
proxies `/api` to the backend, so one tunnel covers both):

```bash
ngrok http 5173
```

Then:

1. **@BotFather** -> your bot -> Bot Settings -> Menu Button (or Configure Mini
   App) -> set the URL to your `https://<id>.ngrok-free.app`.
2. Put the same bot token in `.env` as `BOT_TOKEN` and restart the API so
   `initData` validation and Stars invoices work.
3. For Stars payments, register the webhook so the server is told when a payment
   succeeds:

   ```bash
   curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<id>.ngrok-free.app/api/telegram/webhook"
   ```

> The webhook must reach the **API**. If you tunnel the client (5173) it proxies
> `/api/*` to 3001, so the same ngrok URL works. Alternatively tunnel 3001
> separately and point the webhook there.

### Invite deep links

The Invite button creates a private room and shares
`https://t.me/<bot>?startapp=room_<KEY>`. The bot `@username` is resolved
**automatically** from your `BOT_TOKEN` (the server calls `getMe` and the client
reads it from `/api/config`), so you don't need to set it by hand.

Only set these if you run the client without the API, or if you registered a
**named** Mini App in BotFather (`t.me/<bot>/<app>`):

```
# server/.env
MINI_APP_NAME=                 # named Mini App slug; leave empty to use the Menu Button
# client (optional fallbacks only)
VITE_BOT_USERNAME=
VITE_APP_NAME=
```

When a friend opens that link, the server reads `start_param`, adds them to the
room, and counts the referral.

---

## Environment variables

| Var | Where | Purpose |
| --- | --- | --- |
| `MONGO_URL` | server | Mongo connection string |
| `PORT` | server | API port (default 3001) |
| `BOT_TOKEN` | server | validates initData, creates Stars invoices. Required in prod. |
| `ALLOW_DEV_AUTH` | server | `1` lets the client authenticate via `X-Dev-Tg-Id` without initData (local only) |
| `VITE_API_URL` | client | API base; empty = same origin (use the dev proxy) |
| `VITE_BOT_USERNAME` | client | bot username for invite links |
| `VITE_APP_NAME` | client | Mini App short name for invite links |

---

## API surface

```
GET  /api/config              public client config (bot username, app name)
POST /api/auth/login          upsert user from initData; handles room_/ref_ start_param
GET  /api/users/me            current user
PATCH/api/users/me            sync whitelisted fields (souls, stamina, inventory...)
GET  /api/leaderboard         top players (TOPs tab)
GET  /api/leaderboard/me      my rank
POST /api/queue/join          enter matchmaking queue for a theme
GET  /api/queue/poll          check pairing (heartbeat)
POST /api/queue/leave         exit queue
GET  /api/queue/status        waiting counts per theme + online count
POST /api/rooms               create/reuse my private room (Invite)
GET  /api/rooms/mine          rooms I host or joined
POST /api/rooms/:key/close    close a room
GET  /api/stars/packs         black-market souls packs
POST /api/stars/invoice       create a Stars invoice (or dev-credit)
POST /api/telegram/webhook    Telegram updates (pre_checkout, successful_payment)
```

---

## Project layout

```
src/                 React client
  screens/           one file per screen
  store/             zustand stores (user, game, cosm, medal)
  data/botBrain.js   P2E opponent: scripted words + guessing engine
  utils/api.js       API client (sends initData, offline fallback)
  utils/telegram.js  Telegram identity, invites, Stars
server/src/          Express API + Mongoose models
docker-compose.yml   Mongo + API
```

---

## Adding assets

Image/video assets are referenced through `src/assets.js`. Drop files into
`public/assets/...` matching the documented filename conventions and they render
automatically (dice videos, portraits, achievement icons, theme images).
Medallion icons are currently SVG placeholders — swap them in `HubScreen.jsx` /
`MatchOverScreen.jsx` when you have the artwork.
