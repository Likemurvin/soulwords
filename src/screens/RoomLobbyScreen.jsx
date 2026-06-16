// src/screens/RoomLobbyScreen.jsx
// Private duel lobby. Host creates a room (with a theme), shares the link.
// Friend opens the link → server adds them as a member → both see each other
// → START button enables once 2 players are in. Match start tags the room
// so the server auto-closes it when the match ends.
//
// Polling, not sockets, because this is short-lived pre-match coordination
// and the rest of the app already polls. Switching to a lobby socket is a
// future optimization, not a correctness requirement.

import { useEffect, useRef, useState } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useUserStore } from '../store'
import { useGameStore } from '../store/gameStore'
import { TopNav } from '../components/TopNav'
import { api } from '../utils/api'
import { shareInvite, setBotConfig } from '../utils/telegram'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'
import { THEMES } from './TopicPickScreen'

const MONO = "'Roboto Mono', monospace"
const GOLD = '#c7a35b'

function PlayerSlot({ player, isMe, isHost, ready }) {
  if (!player) {
    return (
      <div style={{
        flex: 1, padding: '20px 16px', borderRadius: 18,
        background: 'rgba(255,255,255,0.03)',
        border: '1.5px dashed rgba(255,255,255,0.12)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minHeight: 140,
        justifyContent: 'center',
      }}>
        <span className="material-icons-round" style={{ fontSize: 32, color: 'rgba(255,255,255,0.2)' }}>person_add</span>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: MONO }}>Ждём друга…</div>
      </div>
    )
  }
  const initial = (player.name || '?')[0].toUpperCase()
  return (
    <div style={{
      flex: 1, padding: '20px 16px', borderRadius: 18,
      background: ready ? 'rgba(0,210,106,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1.5px solid ${ready ? 'rgba(0,210,106,0.3)' : 'rgba(255,255,255,0.08)'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minHeight: 140,
      transition: 'background .2s, border-color .2s',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'linear-gradient(145deg,#7a6030,#C4A46B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: MONO,
      }}>{initial}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', fontFamily: MONO, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.name || 'Аноним'} {isMe && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>(вы)</span>}
        </div>
        <div style={{ fontSize: 11, color: isHost ? GOLD : 'rgba(255,255,255,0.4)', fontFamily: MONO, marginTop: 2 }}>
          {isHost ? '👑 хост' : 'игрок'}
        </div>
      </div>
      <div style={{
        marginTop: 4, fontSize: 11, fontWeight: 700, fontFamily: MONO,
        color: ready ? '#00D26A' : 'rgba(255,255,255,0.35)',
      }}>
        {ready ? '✓ ГОТОВ' : 'ждём…'}
      </div>
    </div>
  )
}

export function RoomLobbyScreen() {
  const { go, replace, back } = useNav()
  const user = useUserStore(s => s.user)
  const setOpponent = useGameStore(s => s.setOpponent)
  const setIsBot    = useGameStore(s => s.setIsBot)
  const setMatchId  = useGameStore(s => s.setMatchId)
  const lobbyRoomKey = useGameStore(s => s.lobbyRoomKey)
  const setLobbyRoomKey = useGameStore(s => s.setLobbyRoomKey)

  const [room, setRoom]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const pollRef = useRef(null)
  const startedRef = useRef(false)

  // Poll the room until both players are present AND the match starts.
  useEffect(() => {
    if (!lobbyRoomKey) { back(); return }
    let alive = true
    const tick = async () => {
      const res = await api.getRoom(lobbyRoomKey)
      if (!alive) return
      if (!res?.room) {
        setLoading(false)
        toast('Комната не найдена')
        setTimeout(() => back(), 800)
        return
      }
      setRoom(res.room)
      setLoading(false)
      // If the host started the match (state moved to 'playing'), follow them.
      if (res.room.state === 'playing' && res.room.matchId && !startedRef.current) {
        startedRef.current = true
        const opp = res.room.members.find(m => String(m.tgId) !== String(user?.tgId))
        if (opp) setOpponent({ id: opp.tgId, name: opp.name, level: 1, title: null, matchId: res.room.matchId })
        setIsBot(false)
        setMatchId(res.room.matchId)
        clearInterval(pollRef.current)
        replace(SCREENS.DICE_ROLL)
      }
      if (res.room.state === 'closed') {
        toast('Хост закрыл комнату')
        setTimeout(() => { setLobbyRoomKey(null); back() }, 800)
      }
    }
    tick()
    pollRef.current = setInterval(tick, 1500)
    return () => { alive = false; clearInterval(pollRef.current) }
  }, [lobbyRoomKey])

  if (loading || !room) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>
        Загрузка комнаты…
      </div>
    )
  }

  const isHost = String(room.hostTgId) === String(user?.tgId)
  const meAsMember  = room.members.find(m => String(m.tgId) === String(user?.tgId))
  const oppAsMember = room.members.find(m => String(m.tgId) !== String(user?.tgId))
  const ready = room.members.length >= 2
  const theme = THEMES.find(t => t.id === room.themeId) || { name: room.themeId, icon: '⚔️' }

  const share = async () => {
    // Make sure the bot config is loaded so the link uses the right username.
    const cfg = await api.config(); if (cfg) setBotConfig(cfg)
    hap.m()
    shareInvite(room.key, 'Жду тебя на интеллектуальную дуэль ⚔️')
  }

  const start = async () => {
    if (!ready || starting) return
    setStarting(true); hap.m()
    const res = await api.startRoom(room.key)
    if (!res?.matchId) {
      setStarting(false)
      toast(res?.error === 'waiting for second player' ? 'Ждём второго игрока' : 'Не удалось начать')
      hap.err()
      return
    }
    // The poll will pick up state=playing and route both players to DICE_ROLL.
    // Host gets there one tick faster, so route manually too.
    if (oppAsMember) setOpponent({ id: oppAsMember.tgId, name: oppAsMember.name, level: 1, title: null, matchId: res.matchId })
    setIsBot(false)
    setMatchId(res.matchId)
    startedRef.current = true
    clearInterval(pollRef.current)
    replace(SCREENS.DICE_ROLL)
  }

  const leave = async () => {
    hap.m()
    if (isHost) await api.closeRoom(room.key)
    else        await api.leaveRoom(room.key)
    setLobbyRoomKey(null)
    back()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a',
      display: 'flex', flexDirection: 'column' }}>
      <TopNav onBack={leave} />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '72px 20px calc(140px + env(safe-area-inset-bottom, 16px))' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: MONO, marginBottom: 4 }}>
            Приватная дуэль
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>
            {ready ? 'Оба игрока на месте — можно начинать' : 'Поделитесь ссылкой, чтобы пригласить друга'}
          </div>
        </div>

        {/* Theme chip */}
        <div style={{
          margin: '0 auto 20px', display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: 14,
          background: 'rgba(199,163,91,0.08)', border: '1px solid rgba(199,163,91,0.25)',
          width: 'fit-content',
        }}>
          <span style={{ fontSize: 16 }}>{theme.icon || '⚔️'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, fontFamily: MONO }}>{theme.name}</span>
        </div>

        {/* Player slots */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
          <PlayerSlot player={meAsMember}  isMe isHost={isHost}  ready={!!meAsMember} />
          <PlayerSlot player={oppAsMember} isMe={false} isHost={!isHost && !!oppAsMember} ready={!!oppAsMember} />
        </div>

        {/* Invite link block */}
        {!ready && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 18, padding: 16, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MONO, marginBottom: 10, textAlign: 'center' }}>
              Код комнаты: <span style={{ color: '#fff', fontWeight: 800, letterSpacing: '0.1em' }}>{room.key}</span>
            </div>
            <button onClick={share} style={{
              width: '100%', height: 50, borderRadius: 25,
              background: '#3b82f6', border: 'none', color: '#fff',
              fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: MONO,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span className="material-icons-round" style={{ fontSize: 18 }}>share</span>
              Пригласить друга
            </button>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{ position: 'absolute', bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        left: 0, right: 0, padding: '0 20px', display: 'flex', gap: 10 }}>
        <button onClick={leave} style={{
          flex: 1, height: 54, borderRadius: 27,
          background: 'rgba(220,38,38,0.14)', border: '1px solid rgba(220,38,38,0.3)',
          color: '#ef9a9a', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: MONO,
        }}>
          {isHost ? 'Закрыть комнату' : 'Покинуть'}
        </button>
        {isHost && (
          <button onClick={start} disabled={!ready || starting} style={{
            flex: 1.6, height: 54, borderRadius: 27,
            background: ready ? '#00D26A' : 'rgba(255,255,255,0.07)',
            border: 'none', color: ready ? '#000' : 'rgba(255,255,255,0.3)',
            fontSize: 15, fontWeight: 900, cursor: ready && !starting ? 'pointer' : 'not-allowed',
            fontFamily: MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background .2s',
          }}>
            {starting ? 'Запуск…' : ready ? 'СТАРТ' : 'Ждём друга'}
            {ready && !starting && <span className="material-icons-round" style={{ fontSize: 20 }}>arrow_right_alt</span>}
          </button>
        )}
      </div>
    </div>
  )
}
