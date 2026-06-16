import { create } from 'zustand'
import { loadUsers, saveUsers } from '../utils/storage'
import { api } from '../utils/api'
import { getTgUser, getDevTgId, getStartParam, setBotConfig } from '../utils/telegram'
import { newlyUnlocked } from '../utils/achievements'
import { toast } from '../components/Toast'
import { ACHIEVEMENTS } from '../constants'

const DEFAULT_USER = (tgId, name) => ({
  tgId,
  name: name || `Player_${tgId}`,
  souls: 247,
  stamina: 100,
  wins: 0,
  games: 0,
  words: 0,
  // Прививка / Переброс дайса — purchasable consumables
  inventory: { vaccine: 0, reroll: 0 },
  medallions: { souls: null, stam: null, aur: null },
  achUnlocked: [],
  achStats: {
    gamesPlayed: 0,
    wordsGuessed: 0,
    wordsExplained: 0,
    wins: 0,
    critRolls: 0,
    firstGuesses: 0,
    soulsEarned: 0,
    bestMatchSouls: 0,
    matchesWithLead: 0,
    luckyFailWins: 0,
    debuffsSeen: [],
    dailyStreak: 0,
  },
  // One-shot deed flags (set once, never decremented). Cheap to track.
  achFlags: {
    boughtAnyGameItem: false,
    boughtAnyCosm: false,
    boughtStarsPack: false,
    finishedAtZeroStamina: false,
    wonWithoutStaminaBuy: false,
    wonAtOneStamina: false,
    fiveOppMistakesOnOneWord: false,
    heldRankOne: false,
    duelHighSouls: false,
  },
  vitrine: [],
  aura: 0,
  invitesCount: 0,
  onboardingDone: false,
  lastDailyClaim: 0,
  createdAt: Date.now(),
  lastSeen: Date.now(),
})

/* Fields pushed to the server on every updateUser */
const SYNC_FIELDS = ['souls','stamina','wins','games','words','inventory','medallions',
  'achUnlocked','achStats','achFlags','vitrine','aura','onboardingDone','lastDailyClaim']

let syncTimer = null
function scheduleSync(user) {
  // Debounce: collapse rapid updates (per-keystroke stamina drain etc.)
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const patch = {}
    for (const k of SYNC_FIELDS) patch[k] = user[k]
    api.syncUser(patch)
  }, 800)
}

export const useUserStore = create((set, get) => ({
  user: null,
  isLoggedIn: false,
  loading: true,
  joinedRoom: null,   // room the user entered via an invite deep link

  /* ── Telegram auto-login ──────────────────────────────────────────────────
     No login screen: identity comes from Telegram initData (validated
     server-side). Outside Telegram a stable dev id is used. If the backend
     is down we fall back to localStorage so the game still runs. */
  init: async () => {
    // Pull the bot username from the server so invite links are always correct.
    api.config().then(cfg => { if (cfg) setBotConfig(cfg) })

    const tgUser = getTgUser()
    const tgId   = String(tgUser?.id || getDevTgId())
    const tgName = tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') : null

    const res = await api.login(getStartParam())
    if (res?.user) {
      set({ user: res.user, isLoggedIn: true, loading: false, joinedRoom: res.joinedRoom || null })
      // mirror to localStorage as offline cache
      const users = loadUsers(); users[tgId] = res.user; saveUsers(users)
      return
    }

    // Offline fallback — keyed by the real tg id
    const users = loadUsers()
    let user = users[tgId]
    if (!user) {
      user = DEFAULT_USER(tgId, tgName)
      users[tgId] = user
      saveUsers(users)
    } else if (tgName) {
      user.name = tgName
    }
    // migrate older saves
    user.inventory  = { vaccine: 0, reroll: 0, ...(user.inventory || {}) }
    user.medallions = user.medallions || { souls: null, stam: null, aur: null }
    user.lastSeen = Date.now()
    saveUsers(users)
    set({ user, isLoggedIn: true, loading: false })
  },

  completeOnboarding: () => get().updateUser({ onboardingDone: true }),

  logout: () => set({ user: null, isLoggedIn: false }),

  updateUser: (patch) => {
    let user = { ...get().user, ...patch }

    // Evaluate achievements after every update. The evaluator is pure and
    // cheap (~35 rules); diffing finds anything newly satisfied.
    const fresh = newlyUnlocked(user)
    if (fresh.length) {
      console.log('[ach] unlocked:', fresh, '| stats:', user.achStats, '| flags:', user.achFlags)
      user = { ...user, achUnlocked: [...(user.achUnlocked || []), ...fresh] }
      for (const id of fresh) {
        const ach = ACHIEVEMENTS.find(a => a.id === id)
        if (ach) toast(`${ach.icon || '🏆'} ${ach.name}`)
      }
    }

    set({ user })
    const users = loadUsers()
    users[user.tgId] = user
    saveUsers(users)
    scheduleSync(user)
  },

  /* Mark a one-shot deed flag (e.g. 'wonAtOneStamina'). Idempotent. */
  setAchFlag: (flag) => {
    const user = get().user
    if (!user || user.achFlags?.[flag]) return
    get().updateUser({ achFlags: { ...(user.achFlags || {}), [flag]: true } })
  },

  /* Bump a stat counter. value is added (default 1). Bound-checked. */
  bumpAchStat: (stat, value = 1) => {
    const user = get().user
    if (!user) return
    const cur = user.achStats?.[stat] || 0
    get().updateUser({ achStats: { ...(user.achStats || {}), [stat]: cur + value } })
  },

  /* Refresh from server (e.g. after a Stars payment credited souls) */
  refresh: async () => {
    const res = await api.me()
    if (res?.user) {
      set({ user: res.user })
      const users = loadUsers(); users[res.user.tgId] = res.user; saveUsers(users)
    }
  },

  addSouls: (amount) => {
    const user = get().user
    get().updateUser({ souls: Math.max(0, user.souls + amount) })
  },

  spendSouls: (amount) => {
    const user = get().user
    if (user.souls < amount) return false
    get().updateUser({ souls: user.souls - amount })
    return true
  },

  /* Consumables */
  addItem: (id, n = 1) => {
    const inv = { ...get().user.inventory }
    inv[id] = (inv[id] || 0) + n
    get().updateUser({ inventory: inv })
  },
  useItem: (id) => {
    const inv = { ...get().user.inventory }
    if (!inv[id]) return false
    inv[id] -= 1
    get().updateUser({ inventory: inv })
    return true
  },

  drainStamina: (amount) => {
    const user = get().user
    get().updateUser({ stamina: Math.max(0, user.stamina - amount) })
  },

  restoreStamina: (amount) => {
    const user = get().user
    get().updateUser({ stamina: Math.min(100, user.stamina + amount) })
  },

  resetProgress: () => {
    const user = get().user
    const fresh = DEFAULT_USER(user.tgId, user.name)
    fresh.onboardingDone = true
    const users = loadUsers()
    users[user.tgId] = fresh
    saveUsers(users)
    set({ user: fresh })
    scheduleSync(fresh)
  },
}))
