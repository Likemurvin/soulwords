// server/src/telegram.js
// Telegram WebApp auth + Bot API helpers (invoice links for Stars).
import crypto from 'node:crypto'

const BOT_TOKEN = process.env.BOT_TOKEN || ''

/* ── initData validation ────────────────────────────────────────────────────
   https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   Returns the parsed user object on success, null on failure.
   If BOT_TOKEN is not configured (local dev), validation is skipped and the
   payload is trusted — NEVER run production without BOT_TOKEN. */
export function validateInitData(initDataRaw) {
  if (!initDataRaw) return null
  const params = new URLSearchParams(initDataRaw)
  const hash = params.get('hash')
  const userJson = params.get('user')
  let user = null
  try { user = userJson ? JSON.parse(userJson) : null } catch { /* noop */ }
  if (!user?.id) return null

  const startParam = params.get('start_param') || null

  if (!BOT_TOKEN) {
    console.warn('[auth] BOT_TOKEN not set — skipping initData hash check (dev mode)')
    return { user, startParam }
  }
  if (!hash) return null

  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const calcHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (calcHash !== hash) return null

  // Reject stale auth (older than 24h)
  const authDate = Number(params.get('auth_date') || 0)
  if (authDate && Date.now() / 1000 - authDate > 86400) return null

  return { user, startParam }
}

/* ── Bot API ── */
async function botApi(method, body) {
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN is not configured')
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(`Telegram API ${method}: ${json.description}`)
  return json.result
}

/* Create a Telegram Stars invoice link (currency XTR, no provider token). */
export async function createStarsInvoice({ title, description, payload, stars }) {
  return botApi('createInvoiceLink', {
    title,
    description,
    payload,
    currency: 'XTR',
    prices: [{ label: title, amount: stars }],
  })
}

export async function answerPreCheckoutQuery(id, ok = true, errorMessage) {
  return botApi('answerPreCheckoutQuery', {
    pre_checkout_query_id: id,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  })
}

export const hasBotToken = () => !!BOT_TOKEN

/* Resolve the bot's @username from the token (cached). Returns null without a token. */
let _botUsername = null
export async function getBotUsername() {
  if (_botUsername !== null) return _botUsername || null
  if (!BOT_TOKEN) { _botUsername = ''; return null }
  try {
    const me = await botApi('getMe', {})
    _botUsername = me?.username || ''
  } catch (e) {
    console.warn('[bot] getMe failed:', e.message)
    _botUsername = ''
  }
  return _botUsername || null
}
