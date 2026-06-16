// server/src/index.js
// SoulWords API — auth by Telegram ID, user persistence, matchmaking queue,
// private rooms (invites), leaderboard, Telegram Stars black market.
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { createServer } from 'node:http'
import mongoose from 'mongoose'
import { Server as SocketServer } from 'socket.io'
import { User, Room, QueueEntry, StarPayment } from './models.js'
import { validateInitData, createStarsInvoice, answerPreCheckoutQuery, hasBotToken, getBotUsername } from './telegram.js'
import { createMatch, getMatch, attachMatchSockets } from './match.js'

const PORT      = process.env.PORT || 3001
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/soulwords'
const DEV_AUTH  = process.env.ALLOW_DEV_AUTH === '1'   // allow ?tgId= login without initData

/* Black market packs — souls for Telegram Stars */
const STAR_PACKS = {
  pack_200:  { id: 'pack_200',  souls: 200,  stars: 50  },
  pack_750:  { id: 'pack_750',  souls: 750,  stars: 150, discount: 20 },
  pack_1800: { id: 'pack_1800', souls: 1800, stars: 300, discount: 20 },
}

const app = express()
app.use(cors())
app.use(express.json())

/* Wrap async route handlers so a thrown error becomes a clean 500 instead of a
   hung socket ("socket hang up" in the dev proxy). */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

/* ── helpers ── */
const userPublic = (u) => ({
  tgId: u.tgId, name: u.name, username: u.username, photoUrl: u.photoUrl,
  souls: u.souls, stamina: u.stamina, wins: u.wins, games: u.games, words: u.words,
  inventory: u.inventory, medallions: u.medallions,
  achUnlocked: u.achUnlocked, achStats: u.achStats, achFlags: u.achFlags,
  vitrine: u.vitrine, aura: u.aura, cosm: u.cosm,
  onboardingDone: u.onboardingDone,
  invitesCount: u.invitesCount, lastDailyClaim: u.lastDailyClaim,
  createdAt: u.createdAt,
})

/* Auth middleware: reads X-Tg-Init-Data header (or dev tgId). Attaches req.tgUser. */
function auth(req, res, next) {
  try {
    const initData = req.headers['x-tg-init-data']
    if (initData) {
      const parsed = validateInitData(initData)
      if (!parsed) return res.status(401).json({ error: 'invalid initData' })
      req.tgUser = parsed.user
      req.startParam = parsed.startParam
      return next()
    }
    if (DEV_AUTH && req.headers['x-dev-tg-id']) {
      req.tgUser = { id: req.headers['x-dev-tg-id'], first_name: `Dev_${req.headers['x-dev-tg-id']}` }
      return next()
    }
    return res.status(401).json({ error: 'missing auth' })
  } catch (e) {
    return res.status(401).json({ error: 'auth failed: ' + e.message })
  }
}

/* ── Auth / login ──────────────────────────────────────────────────────────
   Upserts the user from Telegram identity. Handles start_param payloads:
     room_<KEY>  → join private room, returns room
     ref_<TGID>  → record referral (first login only) */
app.post('/api/auth/login', auth, ah(async (req, res) => {
  const tg = req.tgUser
  const tgId = String(tg.id)
  const displayName = [tg.first_name, tg.last_name].filter(Boolean).join(' ') || `Player_${tgId}`

  let user = await User.findOne({ tgId })
  const isNew = !user
  if (!user) {
    user = new User({ tgId, name: displayName, username: tg.username || '', photoUrl: tg.photo_url || '' })
  } else {
    user.name = displayName
    user.username = tg.username || user.username
    user.photoUrl = tg.photo_url || user.photoUrl
  }
  user.lastSeen = Date.now()

  // start_param: referral / room invite
  const sp = req.startParam || req.body?.startParam || null
  let joinedRoom = null
  if (sp) {
    if (sp.startsWith('ref_') && isNew) {
      const refId = sp.slice(4)
      if (refId !== tgId) {
        user.invitedBy = refId
        await User.updateOne({ tgId: refId }, { $inc: { invitesCount: 1 } })
      }
    }
    if (sp.startsWith('room_')) {
      const key = sp.slice(5)
      const room = await Room.findOne({ key, state: 'open' })
      if (room && !room.members.some(m => m.tgId === tgId)) {
        room.members.push({ tgId, name: displayName, joinedAt: Date.now() })
        await room.save()
      }
      joinedRoom = room
      // joining via a room link also counts as referral for the host
      if (isNew && room && room.hostTgId !== tgId) {
        user.invitedBy = room.hostTgId
        await User.updateOne({ tgId: room.hostTgId }, { $inc: { invitesCount: 1 } })
      }
    }
  }

  await user.save()
  res.json({ user: userPublic(user), joinedRoom })
}))

/* ── User sync ── */
app.get('/api/users/me', auth, ah(async (req, res) => {
  const user = await User.findOne({ tgId: String(req.tgUser.id) })
  if (!user) return res.status(404).json({ error: 'not found' })
  res.json({ user: userPublic(user) })
}))

/* Client pushes its state after meaningful events (match end, purchase…).
   v1 trust model: whitelisted fields only. Move match logic server-side later. */
const SYNCABLE = ['souls','stamina','wins','games','words','inventory','medallions',
  'achUnlocked','achStats','achFlags','vitrine','aura','cosm','onboardingDone','lastDailyClaim']
app.patch('/api/users/me', auth, ah(async (req, res) => {
  const patch = {}
  for (const k of SYNCABLE) if (k in req.body) patch[k] = req.body[k]
  patch.lastSeen = Date.now()
  const user = await User.findOneAndUpdate({ tgId: String(req.tgUser.id) }, { $set: patch }, { new: true })
  if (!user) return res.status(404).json({ error: 'not found' })
  res.json({ user: userPublic(user) })
}))

/* ── Leaderboard (TOPs) ── */
app.get('/api/leaderboard', ah(async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100)
    const top = await User.find({}, 'tgId name username souls wins games vitrine')
      .sort({ souls: -1 }).limit(limit).lean()
    res.json({
      leaders: top.map((u, i) => ({
        rank: i + 1, tgId: u.tgId, name: u.name || u.username || 'Аноним',
        souls: u.souls, wins: u.wins, games: u.games,
      })),
    })
  } catch (e) {
    console.error('[leaderboard]', e.message)
    res.status(500).json({ error: e.message })
  }
}))

/* My rank */
app.get('/api/leaderboard/me', auth, ah(async (req, res) => {
  const me = await User.findOne({ tgId: String(req.tgUser.id) })
  if (!me) return res.status(404).json({ error: 'not found' })
  const rank = await User.countDocuments({ souls: { $gt: me.souls } }) + 1
  res.json({ rank, souls: me.souls })
}))

/* ── Matchmaking queue ─────────────────────────────────────────────────────
   join → upsert entry; poll → check pairing; status → waiting counts per theme.
   Pairing: when joining/polling, look for another unmatched player in the
   same theme and pair atomically. */
app.post('/api/queue/join', auth, ah(async (req, res) => {
  const tgId = String(req.tgUser.id)
  const { themeId = 'all', name = '', level = 1 } = req.body || {}
  // Reset to a clean searching state on (re)join
  await QueueEntry.findOneAndUpdate(
    { tgId },
    { $set: { tgId, name, level, themeId, matchedWith: null, updatedAt: new Date() } },
    { upsert: true },
  )
  const partner = await tryPair(tgId, themeId)
  res.json({ ok: true, matched: !!partner, opponent: partner || null })
}))

async function tryPair(tgId, themeId) {
  // Single atomic step: claim the oldest OTHER free player by writing my info
  // into their slot. Because findOneAndUpdate is atomic, only one driver can
  // win a given partner even under simultaneous joins.
  const me = await QueueEntry.findOne({ tgId })
  if (!me || (me.matchedWith && me.matchedWith.tgId)) {
    return me?.matchedWith?.tgId ? me.matchedWith : null
  }

  // Reserve a partner with a temporary lock (no matchId yet).
  const partner = await QueueEntry.findOneAndUpdate(
    { themeId, tgId: { $ne: tgId }, $or: [{ matchedWith: null }, { matchedWith: { $exists: false } }] },
    { $set: { matchedWith: { tgId: me.tgId, name: me.name, level: me.level, pending: true } } },
    { sort: { updatedAt: 1 }, new: true },
  )
  if (!partner) return null

  // Claim my own slot. If a concurrent call already matched me, back out.
  const updatedMe = await QueueEntry.findOneAndUpdate(
    { tgId, $or: [{ matchedWith: null }, { matchedWith: { $exists: false } }] },
    { $set: { matchedWith: { tgId: partner.tgId, name: partner.name, level: partner.level, pending: true } } },
    { new: true },
  )
  if (!updatedMe) {
    await QueueEntry.updateOne(
      { _id: partner._id, 'matchedWith.tgId': me.tgId },
      { $set: { matchedWith: null } },
    )
    const fresh = await QueueEntry.findOne({ tgId })
    return fresh?.matchedWith?.tgId ? fresh.matchedWith : null
  }

  // Both slots reserved — create the authoritative live match and write its id
  // into both entries so each client learns the same matchId via poll/join.
  const match = createMatch(
    { tgId: me.tgId, name: me.name, level: me.level },
    { tgId: partner.tgId, name: partner.name, level: partner.level },
    themeId,
  )
  const meInfo  = { tgId: partner.tgId, name: partner.name, level: partner.level, matchId: match.id }
  const oppInfo = { tgId: me.tgId,      name: me.name,      level: me.level,      matchId: match.id }
  await QueueEntry.updateOne({ tgId },          { $set: { matchedWith: meInfo } })
  await QueueEntry.updateOne({ tgId: partner.tgId }, { $set: { matchedWith: oppInfo } })

  return meInfo
}

app.get('/api/queue/poll', auth, ah(async (req, res) => {
  const tgId = String(req.tgUser.id)
  // Heartbeat WITHOUT touching matchedWith (atomic $set only updates updatedAt),
  // then read the fresh doc so we never clobber a match set by the partner.
  const me = await QueueEntry.findOneAndUpdate(
    { tgId },
    { $set: { updatedAt: new Date() } },
    { new: true },
  )
  if (!me) return res.json({ status: 'idle' })

  // Already matched (and finalized, not just a pending lock)?
  if (me.matchedWith && me.matchedWith.tgId) {
    return res.json({ status: 'found', opponent: me.matchedWith })
  }
  // Still alone — try to pair again (someone may have joined since).
  const partner = await tryPair(tgId, me.themeId)
  if (partner) return res.json({ status: 'found', opponent: partner })
  res.json({ status: 'searching' })
}))

app.post('/api/queue/leave', auth, ah(async (req, res) => {
  await QueueEntry.deleteOne({ tgId: String(req.tgUser.id) })
  res.json({ ok: true })
}))

/* Waiting-room table: counts + names per theme */
app.get('/api/queue/status', ah(async (req, res) => {
  const entries = await QueueEntry.find({ matchedWith: null }).lean()
  const byTheme = {}
  for (const e of entries) {
    byTheme[e.themeId] ??= { count: 0, players: [] }
    byTheme[e.themeId].count++
    if (byTheme[e.themeId].players.length < 8) {
      byTheme[e.themeId].players.push({ name: e.name, level: e.level })
    }
  }
  const online = await User.countDocuments({ lastSeen: { $gt: Date.now() - 15 * 60_000 } })
  res.json({ byTheme, totalWaiting: entries.length, online })
}))

/* ── Private rooms (Invite flow) ── */
app.post('/api/rooms', auth, ah(async (req, res) => {
  const tgId = String(req.tgUser.id)
  const me = await User.findOne({ tgId })
  // Reuse an existing open room hosted by me so spamming Create doesn't litter.
  // If the host changes the theme, update it.
  let room = await Room.findOne({ hostTgId: tgId, state: 'open' })
  if (!room) {
    const key = crypto.randomBytes(6).toString('base64url')
    room = await Room.create({
      key, hostTgId: tgId, hostName: me?.name || '',
      members: [{ tgId, name: me?.name || '', joinedAt: Date.now() }],
      themeId: req.body?.themeId || 'all',
    })
  } else if (req.body?.themeId && req.body.themeId !== room.themeId) {
    room.themeId = req.body.themeId
    await room.save()
  }
  res.json({ room })
}))

/* Fetch one room by key — used by the lobby screen to poll member updates. */
app.get('/api/rooms/:key', auth, ah(async (req, res) => {
  const room = await Room.findOne({ key: req.params.key })
  if (!room) return res.status(404).json({ error: 'room not found' })
  res.json({ room })
}))

/* Leave a room — for members who aren't the host. The host should /close instead. */
app.post('/api/rooms/:key/leave', auth, ah(async (req, res) => {
  const tgId = String(req.tgUser.id)
  await Room.updateOne(
    { key: req.params.key, state: 'open' },
    { $pull: { members: { tgId } } },
  )
  res.json({ ok: true })
}))

/* Manual join by code — paired with the "Enter room code" UI. Same effect
   as opening an invite link, but works without needing to relaunch the app. */
app.post('/api/rooms/:key/join', auth, ah(async (req, res) => {
  const tgId = String(req.tgUser.id)
  const me = await User.findOne({ tgId })
  const room = await Room.findOne({ key: req.params.key, state: 'open' })
  if (!room) return res.status(404).json({ error: 'room not found' })
  if (String(room.hostTgId) === tgId) return res.json({ room })   // already host
  if (!room.members.some(m => String(m.tgId) === tgId)) {
    if (room.members.length >= 2) return res.status(409).json({ error: 'room full' })
    room.members.push({ tgId, name: me?.name || `Player_${tgId}`, joinedAt: Date.now() })
    await room.save()
  }
  res.json({ room })
}))

app.get('/api/rooms/mine', auth, ah(async (req, res) => {
  const tgId = String(req.tgUser.id)
  const rooms = await Room.find({
    state: 'open',
    $or: [{ hostTgId: tgId }, { 'members.tgId': tgId }],
  }).sort({ createdAt: -1 }).limit(20).lean()
  res.json({ rooms })
}))

app.post('/api/rooms/:key/close', auth, ah(async (req, res) => {
  await Room.updateOne(
    { key: req.params.key, hostTgId: String(req.tgUser.id) },
    { $set: { state: 'closed' } },
  )
  res.json({ ok: true })
}))

/* Start (or join) a live match for a room. Both members hit this; the second
   call returns the same matchId so they both connect to one socket room.
   The match is stored on the room doc as `matchId` for idempotency. */
app.post('/api/rooms/:key/start', auth, ah(async (req, res) => {
  const tgId = String(req.tgUser.id)
  const room = await Room.findOne({ key: req.params.key, state: 'open' })
  if (!room) return res.status(404).json({ error: 'room not found' })
  const isMember = room.hostTgId === tgId || room.members.some(m => m.tgId === tgId)
  if (!isMember) return res.status(403).json({ error: 'not a member' })
  if (room.members.length < 2) return res.status(400).json({ error: 'waiting for second player' })

  // Reuse an already-started match if present.
  if (room.matchId && getMatch(room.matchId)) {
    const m = getMatch(room.matchId)
    const opp = m.order.find(id => id !== tgId)
    return res.json({ matchId: m.id, opponent: { tgId: opp, name: m.players[opp].name, level: m.players[opp].level } })
  }

  const [a, b] = room.members.slice(0, 2)
  const match = createMatch(
    { tgId: a.tgId, name: a.name, level: 1 },
    { tgId: b.tgId, name: b.name, level: 1 },
    room.themeId || 'all',
    room.key,   // tagged so endRound auto-closes the room
  )
  room.matchId = match.id
  room.state = 'playing'
  await room.save()

  const opp = match.order.find(id => id !== tgId)
  res.json({ matchId: match.id, opponent: { tgId: opp, name: match.players[opp].name, level: match.players[opp].level } })
}))

/* ── Black market — Telegram Stars ─────────────────────────────────────────
   1) client POSTs /api/stars/invoice {packId} → invoice link
   2) client calls tg.openInvoice(link)
   3) Telegram hits our webhook: pre_checkout_query → answer ok,
      successful_payment → credit souls */
app.get('/api/stars/packs', (req, res) => res.json({ packs: Object.values(STAR_PACKS) }))

app.post('/api/stars/invoice', auth, ah(async (req, res) => {
  const pack = STAR_PACKS[req.body?.packId]
  if (!pack) return res.status(400).json({ error: 'unknown pack' })
  const tgId = String(req.tgUser.id)

  if (!hasBotToken()) {
    // Dev fallback: credit instantly so the flow can be tested without a bot
    const user = await User.findOneAndUpdate({ tgId }, { $inc: { souls: pack.souls } }, { new: true })
    return res.json({ devCredited: true, user: userPublic(user) })
  }

  const payment = await StarPayment.create({ tgId, packId: pack.id, stars: pack.stars, souls: pack.souls })
  const link = await createStarsInvoice({
    title: `${pack.souls} душ`,
    description: 'Чёрный рынок SoulWords. Только тсс!',
    payload: String(payment._id),
    stars: pack.stars,
  })
  res.json({ invoiceLink: link })
}))

/* Telegram bot webhook — set with:
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<ngrok>/api/telegram/webhook" */
app.post('/api/telegram/webhook', ah(async (req, res) => {
  const upd = req.body || {}
  try {
    if (upd.pre_checkout_query) {
      await answerPreCheckoutQuery(upd.pre_checkout_query.id, true)
    }
    if (upd.message?.successful_payment) {
      const sp = upd.message.successful_payment
      const payment = await StarPayment.findById(sp.invoice_payload)
      if (payment && payment.status === 'pending') {
        payment.status = 'paid'
        payment.tgChargeId = sp.telegram_payment_charge_id
        await payment.save()
        await User.updateOne({ tgId: payment.tgId }, { $inc: { souls: payment.souls } })
        console.log(`[stars] credited ${payment.souls} souls to ${payment.tgId}`)
      }
    }
  } catch (e) {
    console.error('[webhook]', e.message)
  }
  res.json({ ok: true })
}))

app.get('/api/health', (req, res) => res.json({ ok: true, mongo: mongoose.connection.readyState === 1 }))

/* Debug snapshot — open /api/debug in a browser to see what the DB actually
   holds and what the public reads return. Remove or gate in production. */
app.get('/api/debug', ah(async (req, res) => {
  try {
    const conn = mongoose.connection
    const userCount  = await User.countDocuments({})
    const queueCount = await QueueEntry.countDocuments({})
    const roomCount  = await Room.countDocuments({})
    const sampleUsers = await User.find({}, 'tgId name souls wins games').sort({ souls: -1 }).limit(10).lean()
    const queue = await QueueEntry.find({}, 'tgId name themeId matchedWith updatedAt').lean()
    res.json({
      mongoState: conn.readyState,          // 1 = connected
      dbName: conn.name,                    // which database we're actually using
      collection: User.collection.name,     // which collection users live in
      counts: { users: userCount, queue: queueCount, rooms: roomCount },
      leaderboardPreview: sampleUsers,
      queueEntries: queue,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}))

/* Public client config — bot username resolved from the token via getMe, so the
   client builds correct invite links without any manually-typed env var. */
app.get('/api/config', ah(async (req, res) => {
  const botUsername = await getBotUsername()   // cached; null if no token
  res.json({
    botUsername,
    appName: process.env.MINI_APP_NAME || '',   // optional named Mini App slug
  })
}))

/* Global error handler — any error passed to next() (incl. async throws caught
   by ah()) returns clean JSON instead of hanging the socket. */
app.use((err, req, res, next) => {
  console.error('[route error]', req.method, req.path, '-', err?.message)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: err?.message || 'internal error' })
})

/* Never let an unhandled rejection/exception kill the server silently
   (that was the "socket hang up" — a dead upstream). */
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason))
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err?.message))

/* ── boot ── */
const httpServer = createServer(app)
const io = new SocketServer(httpServer, {
  cors: { origin: '*' },
  path: '/socket.io',
})
attachMatchSockets(io)

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('[db] connected:', MONGO_URL)
    httpServer.listen(PORT, () => console.log(`[api] listening on :${PORT} (http + socket.io)`))
  })
  .catch((e) => { console.error('[db] connection failed:', e.message); process.exit(1) })
