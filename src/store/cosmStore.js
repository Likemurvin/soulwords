import { create } from 'zustand'
import { loadCosm, saveCosm } from '../utils/storage'

const DEFAULTS = {
  dice: 'duster',
  portrait: 'p_default',
  profileBg: 'pb_default',
  bubbleColor: 'bc_default',
  chatBg: 'cbg_dark',
  ownedPortraits: ['p_default', 'p_void'],
  ownedDice: ['duster', 'gradient', 'metal'],
  ownedBubbles: ['bc_default'],
  ownedChatBgs: ['cbg_dark'],
  ownedProfileBgs: ['pb_default', 'pb_black'],
}

export const useCosmStore = create((set, get) => ({
  ...loadCosm(DEFAULTS),

  setDice: (id) => {
    set({ dice: id })
    saveCosm(get())
  },

  setPortrait: (id) => {
    set({ portrait: id })
    saveCosm(get())
  },

  setProfileBg: (id) => {
    set({ profileBg: id })
    saveCosm(get())
  },

  setBubbleColor: (id) => {
    set({ bubbleColor: id })
    saveCosm(get())
  },

  setChatBg: (id) => {
    set({ chatBg: id })
    saveCosm(get())
  },

  unlockItem: (type, id) => {
    const key = {
      dice: 'ownedDice',
      portrait: 'ownedPortraits',
      bubble: 'ownedBubbles',
      chatBg: 'ownedChatBgs',
      profileBg: 'ownedProfileBgs',
    }[type]
    if (!key) return
    set((s) => {
      const updated = { [key]: [...new Set([...s[key], id])] }
      saveCosm({ ...s, ...updated })
      return updated
    })
  },

  owns: (type, id) => {
    const key = {
      dice: 'ownedDice',
      portrait: 'ownedPortraits',
      bubble: 'ownedBubbles',
      chatBg: 'ownedChatBgs',
      profileBg: 'ownedProfileBgs',
    }[type]
    return key ? get()[key].includes(id) : false
  },
}))