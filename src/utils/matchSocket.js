// src/utils/matchSocket.js
// Thin wrapper over socket.io-client for live human matches. Bot matches never
// use this. Connects to the same origin as the API (or VITE_API_URL).
import { io } from 'socket.io-client'
import { getTgUser, getDevTgId } from './telegram'

const BASE = import.meta.env.VITE_API_URL || ''   // '' = same origin

let socket = null

export function connectMatch(matchId, opts = {}) {
  disconnectMatch()
  const tgId = String(getTgUser()?.id || getDevTgId())
  socket = io(BASE || undefined, {
    path: '/socket.io',
    // bubbleColor is sent along so the server can broadcast cosmetic info
    // to the opponent (text-bubble color is the only cosmetic the opponent
    // sees, and they need it to render the correct bubble color on their
    // side for incoming messages).
    query: { matchId, tgId, bubbleColor: opts.bubbleColor || 'bc_default' },
    transports: ['websocket', 'polling'],
    reconnection: true,
  })
  return socket
}

export function getMatchSocket() { return socket }

export function disconnectMatch() {
  if (socket) { socket.removeAllListeners(); socket.disconnect(); socket = null }
}
