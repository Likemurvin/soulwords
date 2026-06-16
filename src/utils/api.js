// src/utils/api.js
// Thin API client. Sends Telegram initData with every request so the server
// can authenticate by Telegram ID. Falls back to offline mode when the
// backend is unreachable — the app keeps working off localStorage.

import { getInitData, getDevTgId } from './telegram.js'

const BASE = import.meta.env.VITE_API_URL || ''   // '' → same origin (vite proxy in dev)

if (typeof window !== 'undefined') {
  console.info('[soulwords] API base:', BASE || '(same origin)')
}

let _online = null   // null = unknown, true/false after first request

export const isApiOnline = () => _online === true

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const initData = getInitData()
  if (initData) headers['X-Tg-Init-Data'] = initData
  else headers['X-Dev-Tg-Id'] = getDevTgId()

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API ${res.status}`)
  }
  return res.json()
}

/* Wrap: mark online/offline, swallow network errors into null */
async function tryRequest(path, opts) {
  try {
    const data = await request(path, opts)
    _online = true
    return data
  } catch (e) {
    if (e instanceof TypeError) _online = false   // network failure
    console.warn('[api]', path, e.message)
    return null
  }
}

export const api = {
  config:       ()           => tryRequest('/api/config'),
  login:        (startParam) => tryRequest('/api/auth/login', { method: 'POST', body: { startParam } }),
  me:           ()           => tryRequest('/api/users/me'),
  syncUser:     (patch)      => tryRequest('/api/users/me', { method: 'PATCH', body: patch }),

  leaderboard:  (limit = 50) => tryRequest(`/api/leaderboard?limit=${limit}`),
  myRank:       ()           => tryRequest('/api/leaderboard/me'),

  queueJoin:    (themeId, name, level) =>
    tryRequest('/api/queue/join', { method: 'POST', body: { themeId, name, level } }),
  queuePoll:    ()           => tryRequest('/api/queue/poll'),
  queueLeave:   ()           => tryRequest('/api/queue/leave', { method: 'POST' }),
  queueStatus:  ()           => tryRequest('/api/queue/status'),

  createRoom:   (themeId)    => tryRequest('/api/rooms', { method: 'POST', body: { themeId } }),
  getRoom:      (key)        => tryRequest(`/api/rooms/${key}`),
  joinRoom:     (key)        => tryRequest(`/api/rooms/${key}/join`, { method: 'POST' }),
  leaveRoom:    (key)        => tryRequest(`/api/rooms/${key}/leave`, { method: 'POST' }),
  closeRoom:    (key)        => tryRequest(`/api/rooms/${key}/close`, { method: 'POST' }),
  startRoom:    (key)        => tryRequest(`/api/rooms/${key}/start`, { method: 'POST' }),
  myRooms:      ()           => tryRequest('/api/rooms/mine'),

  starPacks:    ()           => tryRequest('/api/stars/packs'),
  starsInvoice: (packId)     => tryRequest('/api/stars/invoice', { method: 'POST', body: { packId } }),
}
