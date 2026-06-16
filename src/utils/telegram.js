// src/utils/telegram.js
// Everything Telegram-WebApp-specific lives here.

const tg = () => window?.Telegram?.WebApp || null

export const isInTelegram = () => {
  const t = tg()
  return !!(t && t.initData && t.initData.length > 0)
}

export const getInitData = () => tg()?.initData || ''

/* Telegram user object (unverified, for instant UI; server verifies hash) */
export const getTgUser = () => tg()?.initDataUnsafe?.user || null

/* start_param from deep links: t.me/<bot>/<app>?startapp=room_KEY */
export const getStartParam = () =>
  tg()?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('tgWebAppStartParam') || null

/* Stable dev id outside Telegram so localStorage/dev-server data persists */
export const getDevTgId = () => {
  let id = localStorage.getItem('sw_dev_tgid')
  if (!id) {
    id = String(100000000 + Math.floor(Math.random() * 900000000))
    localStorage.setItem('sw_dev_tgid', id)
  }
  return id
}

/* Bot username + Mini App slug for deep links.
   Resolution order: server /api/config (authoritative) → build-time env → none.
   The server reads the username from the bot token, so links are always
   correct without anyone hand-typing an env var. */
let _bot = (import.meta.env.VITE_BOT_USERNAME || '')
  .replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '').replace(/\/.*$/, '').trim()
let _app = (import.meta.env.VITE_APP_NAME || '').replace(/^@/, '').trim()

export function setBotConfig({ botUsername, appName } = {}) {
  if (botUsername) _bot = String(botUsername).replace(/^@/, '').trim()
  if (appName != null) _app = String(appName).replace(/^@/, '').trim()
}

/* Deep link carrying a startapp payload.
   - Named Mini App:  https://t.me/<bot>/<app>?startapp=<param>
   - Bot menu button: https://t.me/<bot>?startapp=<param>  (safe default) */
export const appLink = (startParam) => {
  const base = _app ? `https://t.me/${_bot}/${_app}` : `https://t.me/${_bot}`
  return startParam ? `${base}?startapp=${startParam}` : base
}

/* Open the native Telegram share UI (friend picker) with our invite link.
   The link carries the private-room key so we can count invites and put the
   new player straight into the host's room. */
export function shareInvite(roomKey, text = 'Давай устроим честную интеллектуальную битву ⚔️') {
  const link = appLink(roomKey ? `room_${roomKey}` : `ref_${getTgUser()?.id || getDevTgId()}`)
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
  const t = tg()
  if (t?.openTelegramLink) t.openTelegramLink(shareUrl)
  else window.open(shareUrl, '_blank')
  return link
}

/* Telegram Stars invoice. Returns a promise resolving to 'paid'|'cancelled'|'failed' */
export function openInvoice(link) {
  return new Promise((resolve) => {
    const t = tg()
    if (!t?.openInvoice) return resolve('failed')
    t.openInvoice(link, (status) => resolve(status))
  })
}
