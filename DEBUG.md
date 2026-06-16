# Diagnosing "empty queue / empty leaderboard"

Data saves but the leaderboard and queue look empty. Work through these in order
— the new `/api/debug` endpoint makes it a 30-second check.

## 1. Look at the raw DB through the API

Open this in a browser (or curl it) against your **API origin** (the Docker
server, e.g. `http://localhost:3001` or your ngrok URL):

```
GET /api/debug
```

You'll get:

```json
{
  "mongoState": 1,                 // 1 = connected. Anything else = DB problem.
  "dbName": "soulwords",           // the database actually in use
  "collection": "users",
  "counts": { "users": 3, "queue": 0, "rooms": 1 },
  "leaderboardPreview": [ { "tgId": "...", "name": "...", "souls": 247 }, ... ],
  "queueEntries": [ ... ]
}
```

Interpret it:

- **`counts.users` is 0** → writes aren't landing in this DB. Your client is
  saving to a *different* backend than this one is reading. Almost always an
  **origin mismatch** (see step 2).
- **`counts.users` > 0 but the in-app leaderboard is empty** → the client isn't
  reaching `/api/leaderboard` (origin mismatch, step 2), or it's reaching a
  different server than `/api/debug`.
- **`leaderboardPreview` has the users** → the API is correct; the problem is
  purely client-side origin/caching. Rebuild the client (step 3).

## 2. Origin mismatch (the usual cause)

Writes (`login`, `syncUser`) and reads (`leaderboard`, `queue/status`) all go to
the **same base URL**. If writes work but reads don't, they're hitting different
origins — which only happens if something is rewriting some requests.

The client picks its API base like this:

- `VITE_API_URL` if set → used for **all** calls.
- empty → **same origin** as the page (relies on a proxy).

Two correct setups:

**A. One ngrok tunnel on the Vite dev server (simplest).**
`npm run dev` proxies `/api` → `localhost:3001`. Tunnel **5173**. Leave
`VITE_API_URL` empty. Everything is same-origin. ✅

**B. Built client served statically + separate API.**
There is **no proxy** for a static build, so same-origin `/api` calls hit the
static server and 404. You **must** set `VITE_API_URL` to the API's public URL
**before building**:

```
# .env (build time)
VITE_API_URL=https://your-api.ngrok-free.app
```

then `npm run build`. Without this, writes that happened to go through a proxy
work while public GETs 404 → leaderboard falls back to the mock / looks empty.

> Check the browser devtools Network tab: the `leaderboard` request should be
> `200` with JSON. If it's `404`/HTML or a CORS error, it's an origin problem.

## 3. Rebuild after changing env

`VITE_*` vars are **baked in at build time**. Changing `.env` does nothing until
you rebuild:

```bash
npm run build      # or restart `npm run dev`
```

## 4. The queue only holds players who are actively searching

This is by design, not a bug. A `QueueEntry` exists **only while that player is
on the matchmaking screen**; leaving it (or finishing/pairing) removes the entry,
and entries auto-expire after 120s. So:

- If you open **Chats** and look at the waiting count while nobody else is
  searching, it's correctly `0`.
- To see a non-zero queue: have account A tap **Поиск матча** and stay on the
  search screen, then check `/api/debug` `queueEntries` or have account B search
  too — they should pair within ~1.5s.

If two accounts search at the same time and both still fall to the bot, capture
`/api/debug` for both and check that each created a `QueueEntry` with the **same
`themeId`** (different themes never match).

## 5. The in-app TOPs screen now tells you the truth

It no longer hides an empty result behind mock data:

- API reachable, has players → shows them.
- API reachable, no players yet → "Пока пусто…".
- API unreachable → "Сервер недоступен — показан пример" + mock rows.

If you see "Сервер недоступен", it's an origin/proxy problem (step 2).
