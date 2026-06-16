// src/utils/invite.js
// Single source of truth for the "Invite a friend" action used by Hub & Chats.
// Creates (or reuses) a private duel room on the server, then opens the native
// Telegram friend picker with a deep link that carries the room key.
import { api } from './api'
import { shareInvite, setBotConfig } from './telegram'
import { toast } from '../components/Toast'
import { hap } from './haptic'

const INVITE_TEXT = 'Давай устроим честную интеллектуальную битву ⚔️'

export async function inviteFriend(themeId = 'all') {
  hap.m()
  // Make sure we have the real bot username before building the link.
  const cfg = await api.config()
  if (cfg) setBotConfig(cfg)

  const res = await api.createRoom(themeId)
  const roomKey = res?.room?.key || null   // null → fall back to a referral link
  shareInvite(roomKey, INVITE_TEXT)
  toast(roomKey ? 'Комната создана — зовите друга!' : 'Ссылка-приглашение готова')
  return res?.room || null
}
