// utils/chatStorage.js
// Manages live chat sessions and concluded match records.
// Each chat has a unique ID: `chat_${timestamp}_${p1}vs${p2}`
//
// Live chats:   localStorage key 'sw_chats_active'
// History:      localStorage key 'sw_chats_history'

const ACTIVE_KEY  = 'sw_chats_active'
const HISTORY_KEY = 'sw_chats_history'

/* ── helpers ── */
const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}
const save = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

/* ── Chat schema ─────────────────────────────────────────────────────────────
{
  id:          string,
  createdAt:   number (epoch ms),
  theme:       { id, name, diff },
  players: {
    me:  { tgId, name, level, portrait },
    opp: { id, name, level, title },
  },
  state:       'searching' | 'ongoing' | 'concluded',
  rounds: [    // 4 entries
    {
      round:    number,
      explainerId: string,  // player id who explained
      messages: [{ from, text, ts, roll?, critical? }],
      wordsGuessed: number,
      charsUsed:    number,
      mistakes:     number,
      mySouls:      number,
      oppSouls:     number,
    }
  ],
  result: {
    mySouls:      number,
    oppSouls:     number,
    bonuses:      [{ label, souls, winner }],
    winner:       'me' | 'opp' | 'draw',
    concludedAt:  number,
  } | null,
}
─────────────────────────────────────────────────────────────────────────── */

export function createChat({ me, opp, theme }) {
  const id = `chat_${Date.now()}_${me.tgId}vs${opp.id}`
  const chat = {
    id,
    createdAt: Date.now(),
    theme: { id: theme.id, name: theme.name, diff: theme.diff },
    players: { me, opp },
    state: 'ongoing',
    rounds: [],
    result: null,
  }
  const active = load(ACTIVE_KEY)
  active[id] = chat
  save(ACTIVE_KEY, active)
  return chat
}

export function getActiveChat(id) {
  return load(ACTIVE_KEY)[id] || null
}

export function getAllActiveChats() {
  return Object.values(load(ACTIVE_KEY))
}

export function updateChat(id, patch) {
  const active = load(ACTIVE_KEY)
  if (!active[id]) return
  active[id] = { ...active[id], ...patch }
  save(ACTIVE_KEY, active)
  return active[id]
}

export function appendRound(id, roundData) {
  const active = load(ACTIVE_KEY)
  if (!active[id]) return
  active[id].rounds = [...(active[id].rounds || []), roundData]
  save(ACTIVE_KEY, active)
}

export function concludeChat(id, result) {
  const active = load(ACTIVE_KEY)
  if (!active[id]) return

  const chat = { ...active[id], state: 'concluded', result: { ...result, concludedAt: Date.now() } }

  // Move to history
  const history = load(HISTORY_KEY)
  history[id] = chat
  save(HISTORY_KEY, history)

  // Remove from active
  delete active[id]
  save(ACTIVE_KEY, active)

  return chat
}

export function getChatHistory() {
  return Object.values(load(HISTORY_KEY)).sort((a, b) => b.createdAt - a.createdAt)
}

export function clearHistory() {
  save(HISTORY_KEY, {})
}
