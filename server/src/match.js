// server/src/match.js
// Real-time match tunnel for two paired humans.
//
// Responsibilities:
//   • Hold an authoritative match object (round, whose turn to explain, the
//     shared word sequence) so both clients stay perfectly in sync.
//   • Relay in-game events (explanations, guesses, dice rolls, skips) between
//     the two sockets via a per-match Socket.IO room.
//
// Bot (P2E) matches never touch this file — they stay fully client-side.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import crypto from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* Word pools by difficulty, loaded once. */
const WORDS = {}
for (const lang of ['ru', 'en']) {
  try {
    const arr = JSON.parse(readFileSync(join(__dirname, `words.${lang}.json`), 'utf8'))
    WORDS[lang] = arr
  } catch { WORDS[lang] = [] }
}

const ROUND_DIFF = ['easy', 'medium', 'hard', 'diabolical']  // round 1..4

function pickWord(lang, diff, used) {
  const pool = (WORDS[lang] || []).filter(w => w.d === diff && !used.includes(w.w))
  const any  = (WORDS[lang] || []).filter(w => !used.includes(w.w))
  const src  = pool.length ? pool : (any.length ? any : (WORDS[lang] || []))
  if (!src.length) return null
  return src[Math.floor(Math.random() * src.length)]
}

/* In-memory match registry. matchId -> match */
const matches = new Map()

export function createMatch(a, b, themeId, roomKey = null) {
  const matchId = crypto.randomBytes(8).toString('hex')
  // Randomly decide who explains in round 1; alternate each round.
  const aExplainsFirst = Math.random() < 0.5
  const match = {
    id: matchId,
    themeId,
    roomKey,                // null for queue-paired matches
    lang: 'ru',
    players: {
      [a.tgId]: { tgId: a.tgId, name: a.name, level: a.level, connected: false, socketId: null },
      [b.tgId]: { tgId: b.tgId, name: b.name, level: b.level, connected: false, socketId: null },
    },
    order: [a.tgId, b.tgId],
    round: 1,
    explainerId: aExplainsFirst ? a.tgId : b.tgId,
    usedWords: [],
    word: null,
    scores: { [a.tgId]: 0, [b.tgId]: 0 },
    createdAt: Date.now(),
  }
  matches.set(matchId, match)
  return match
}

export function getMatch(id) { return matches.get(id) }

/* Public view of a match for a given player (includes the current word only for
   the explainer; the guesser must not see it). The roundDeadline is an epoch
   ms timestamp — clients render `(deadline - Date.now())/1000` so both see
   exactly the same countdown regardless of when they reconnected. */
export function matchStateFor(match, tgId) {
  const oppId = match.order.find(id => id !== tgId)
  const iExplain = match.explainerId === tgId
  return {
    matchId: match.id,
    round: match.round,
    iExplain,
    me: { tgId, ...match.players[tgId], score: match.scores[tgId] },
    opponent: { tgId: oppId, ...match.players[oppId], score: match.scores[oppId] },
    word: iExplain ? match.word : null,   // guesser gets null
    wordMeta: { d: match.word?.d },
    roundDeadline: match.roundDeadline,
  }
}

const ROUND_SECONDS = 60

function startRoundClock(match) {
  match.roundDeadline = Date.now() + ROUND_SECONDS * 1000
}

/* Advance the word: pick a new shared word for the current round's difficulty. */
function nextWord(match) {
  const diff = ROUND_DIFF[match.round - 1] || 'easy'
  const w = pickWord(match.lang, diff, match.usedWords)
  if (w) { match.word = w; match.usedWords.push(w.w) }
  return w
}

/* Server-authoritative round end. Called either by a client's round:end emit
   (e.g. early timeout, surrender) or by the deadline timer. Idempotent per
   round via `_endingRound`. */
async function endRound(match, io) {
  if (match._endingRound === match.round) return
  match._endingRound = match.round
  clearTimeout(match._deadlineTimer); match._deadlineTimer = null

  const room = `match:${match.id}`
  if (match.round >= 4) {
    io.to(room).emit('match:over', { scores: match.scores })
    // If this match came from a private Room, close it so it's gone from the
    // lobby (one-shot duels per spec: "after finishing room is closing and deleting").
    if (match.roomKey) {
      try {
        const { Room } = await import('./models.js')
        await Room.updateOne({ key: match.roomKey }, { $set: { state: 'closed' } })
      } catch (e) { console.warn('[match] room close failed:', e.message) }
    }
    matches.delete(match.id)
    return
  }
  match.round += 1
  match.explainerId = match.order.find(id => id !== match.explainerId)
  match.word = null
  match._endingRound = null
  nextWord(match)
  startRoundClock(match)
  for (const id of match.order) {
    const sid = match.players[id].socketId
    if (sid) io.to(sid).emit('round:next', matchStateFor(match, id))
  }
  armDeadlineTimer(match, io)
}

/* Schedule the round-end on the server so both clients end at exactly the
   same moment. Without this, network jitter between the two clients' own
   timers caused the 10-20s desync the user reported. */
function armDeadlineTimer(match, io) {
  clearTimeout(match._deadlineTimer)
  const remain = Math.max(0, match.roundDeadline - Date.now())
  match._deadlineTimer = setTimeout(() => endRound(match, io), remain + 50)
}

// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO wiring
// ─────────────────────────────────────────────────────────────────────────────
export function attachMatchSockets(io) {
  io.on('connection', (socket) => {
    const { matchId, tgId, bubbleColor } = socket.handshake.query
    const match = matchId ? matches.get(matchId) : null

    if (!match || !match.players[tgId]) {
      socket.emit('match:error', { error: 'match not found' })
      return
    }

    const room = `match:${matchId}`
    socket.join(room)
    match.players[tgId].connected = true
    match.players[tgId].socketId = socket.id
    if (bubbleColor) match.players[tgId].bubbleColor = bubbleColor

    const opp = match.order.find(id => id !== tgId)
    const bothConnected = match.players[tgId].connected && match.players[opp].connected

    // Tell the opponent I'm here.
    socket.to(room).emit('match:peer', { tgId, connected: true })

    // When both are connected, the FIRST word is generated once (idempotent)
    // and each side is sent its own personalized state. The round clock starts
    // here so both clients see identical countdown deadlines.
    if (bothConnected) {
      if (!match.word) { nextWord(match); startRoundClock(match) }
      for (const id of match.order) {
        const sid = match.players[id].socketId
        if (sid) io.to(sid).emit('match:start', matchStateFor(match, id))
      }
      armDeadlineTimer(match, io)
    }

    /* Initial dice roll (determines who explains first). Rolled ONCE on the
       server so both clients see identical numbers. Idempotent: subsequent
       requests get the same stored result. The roll winner is also set as the
       round-1 explainer so both clients agree without a second sync. */
    socket.on('dice:request', () => {
      if (!match.initialDice) {
        let a = Math.floor(Math.random() * 20) + 1
        let b = Math.floor(Math.random() * 20) + 1
        while (a === b) b = Math.floor(Math.random() * 20) + 1
        const [idA, idB] = match.order
        match.initialDice = { [idA]: a, [idB]: b }
        // winner explains first; override the earlier random choice
        match.explainerId = a > b ? idA : idB
      }
      // emit personalized: each side gets {my, opp}
      for (const id of match.order) {
        const sid = match.players[id].socketId
        if (sid) {
          const oppId = match.order.find(x => x !== id)
          io.to(sid).emit('dice:result', {
            my: match.initialDice[id],
            opp: match.initialDice[oppId],
            iExplainFirst: match.explainerId === id,
          })
        }
      }
    })

    /* Relay an explanation. Sender already applied debuff/dice locally; we just
       forward the rendered message + roll so the opponent's chat shows it. */
    socket.on('msg:explain', (payload) => {
      socket.to(room).emit('msg:explain', { from: tgId, ...payload })
    })

    /* A guess from the guesser. The server checks correctness against the word
       (authoritative) and broadcasts the result + score deltas to both. */
    socket.on('msg:guess', ({ text }) => {
      if (match.explainerId === tgId) return   // explainer can't guess
      const target = (match.word?.w || '').replace(/Ё/g, 'Е')
      const guess = (text || '').toUpperCase().replace(/Ё/g, 'Е')
      const correct = target && guess.includes(target)

      // echo the raw guess to both chats
      io.to(room).emit('msg:guess', { from: tgId, text, correct })

      if (correct) {
        match.scores[tgId] += 20            // guesser
        match.scores[match.explainerId] += 10  // explainer
        const w = match.word?.w
        const next = nextWord(match)
        io.to(room).emit('msg:correct', {
          word: w,
          guesserId: tgId,
          scores: match.scores,
          nextWord: next ? { d: next.d } : null,
        })
        // send the new word privately to the explainer
        const exSid = match.players[match.explainerId].socketId
        if (exSid && next) io.to(exSid).emit('match:word', { word: next })
      }
    })

    /* Explainer skips the current word (costs stamina client-side). */
    socket.on('msg:skip', () => {
      if (match.explainerId !== tgId) return
      const next = nextWord(match)
      io.to(room).emit('msg:skip', { from: tgId, nextWord: next ? { d: next.d } : null })
      const exSid = match.players[match.explainerId].socketId
      if (exSid && next) io.to(exSid).emit('match:word', { word: next })
    })

    /* End of round (timer ran out or client advanced). Server flips roles,
       bumps the round, picks the next word, and re-syncs both sides. The match
       ends after round 4. */
    socket.on('round:end', () => {
      endRound(match, io)
    })

    socket.on('disconnect', () => {
      if (match.players[tgId]) {
        match.players[tgId].connected = false
        match.players[tgId].socketId = null
      }
      socket.to(room).emit('match:peer', { tgId, connected: false })
      // If both gone, drop the match after a grace period.
      const anyConnected = match.order.some(id => match.players[id].connected)
      if (!anyConnected) {
        setTimeout(() => {
          const m = matches.get(matchId)
          if (m && !m.order.some(id => m.players[id].connected)) matches.delete(matchId)
        }, 30000)
      }
    })
  })
}
