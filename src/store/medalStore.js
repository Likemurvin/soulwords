import { create } from 'zustand'
import { loadMedallions, saveMedallions } from '../utils/storage'

export const useMedalStore = create((set, get) => ({
  medallions: loadMedallions({
    // Default: one active Soul Spades medallion at stack 1 for 12h from now
    // (so the HubScreen shows at least one pill on first load)
    souls: { id: 'souls', stack: 1, expiresAt: Date.now() + 12 * 3600000 },
    stam:  null,
    aur:   null,
  }),

  isActive: (id) => {
    const med = get().medallions[id]
    return med && med.expiresAt && Date.now() < med.expiresAt
  },

  getStack: (id) => {
    const med = get().medallions[id]
    return get().isActive(id) ? med.stack || 1 : 0
  },

  apply: (id) => {
    const medallions = { ...get().medallions }
    const cur = medallions[id]
    const curStack = get().getStack(id)
    const DURATIONS = { souls: 12, stam: 12, aur: 24 }
    const newStack = Math.min(curStack + 1, 20)
    medallions[id] = {
      id,
      stack: newStack,
      expiresAt: Date.now() + (DURATIONS[id] || 12) * 3600000,
    }
    set({ medallions })
    saveMedallions(medallions)
  },

  getBonus: (id) => {
    const TIERS = [1, 5, 10, 20]
    const stack = get().getStack(id)
    if (!stack) return 0
    return TIERS[Math.min(stack - 1, 3)]
  },

  getSoulsMult: () => {
    const bonus = get().getBonus('souls')
    return 1 + bonus / 100
  },

  getStamMult: () => {
    const bonus = get().getBonus('stam')
    return 1 - bonus / 100
  },

  isAllMaxed: () => {
    return ['souls', 'stam', 'aur'].every((id) => {
      const med = get().medallions[id]
      return med && get().isActive(id) && med.stack >= 20
    })
  },

  clear: () => {
    set({ medallions: { souls: null, stam: null, aur: null } })
    saveMedallions({ souls: null, stam: null, aur: null })
  },
}))