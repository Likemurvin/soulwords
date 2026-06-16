// MatchmakingScreen.jsx
// Real P2P queue with manual bot fallback (P2E).
//   • Join the server queue for the selected theme.
//   • Poll every 1.5s. Show live "waiting" count for the theme.
//   • If a human is found → that opponent.
//   • Player taps "Играть с Демоном" when they're tired of waiting.
import { useEffect, useRef, useState } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useGameStore } from '../store/gameStore'
import { useUserStore, useCosmStore } from '../store'
import { PORTRAIT_CATALOG } from '../constants'
import { api } from '../utils/api'
import { hap } from '../utils/haptic'

const MONO = 'Roboto Mono, monospace'

const BOT_NAMES = ['Демон Тьмы', 'Падший', 'Бес Шёпота', 'Призрак', 'Страж Душ']

function PlayerAvatar({ name, title, level, portrait, dim, size = 120, isBot }) {
  const ini = name?.[0]?.toUpperCase() || '?'
  const p = portrait ? PORTRAIT_CATALOG.find(x => x.id === portrait) : null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: dim ? 'rgba(255,255,255,0.06)' : isBot ? 'rgba(180,30,30,0.12)' : p ? (p.css || p.bg || '#1a1a2a') : 'rgba(255,255,255,0.08)',
        border: dim ? '1px solid rgba(255,255,255,0.06)' : `2px solid ${isBot ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.15)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transition: 'all 0.5s ease',
      }}>
        {dim
          ? <span className="material-icons-round" style={{ fontSize: 44, color: 'rgba(255,255,255,0.2)' }}>person</span>
          : isBot
            ? <span style={{ fontSize: 52 }}>👹</span>
            : p?.img
              ? <img src={`/assets/portraits/avatar_${p.id}.png`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: 40, fontWeight: 900, color: '#fff', fontFamily: MONO }}>{ini}</span>}
      </div>
      {!dim ? (
        <div style={{ textAlign: 'center' }}>
          {title && <div style={{ fontSize: 12, color: '#c7a35b', fontFamily: MONO, marginBottom: 2 }}>{title}</div>}
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: MONO }}>{name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: MONO }}>Lv {level}</div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', fontFamily: MONO, letterSpacing: '0.2em' }}>· · ·</div>
      )}
    </div>
  )
}

export function MatchmakingScreen() {
  const { go, back } = useNav()
  const user = useUserStore(s => s.user)
  const cosm = useCosmStore()
  const theme = useGameStore(s => s.selectedTheme)
  const setOpponent = useGameStore(s => s.setOpponent)
  const setIsBot = useGameStore(s => s.setIsBot)
  const setMatchId = useGameStore(s => s.setMatchId)

  const [status, setStatus]   = useState('searching')   // 'searching' | 'found'
  const [opponent, setOpp]    = useState(null)
  const [isBot, setBotFlag]   = useState(false)
  const [waiting, setWaiting] = useState(0)
  const [online, setOnline]   = useState(0)

  const pollRef = useRef(null)
  const doneRef = useRef(false)

  const level = Math.floor((user?.souls || 0) / 100) + 1

  const finishWith = (opp, bot) => {
    if (doneRef.current) return
    doneRef.current = true
    clearInterval(pollRef.current)
    setOpp(opp); setBotFlag(bot); setStatus('found')
    setOpponent(opp); setIsBot(bot)
    setMatchId(bot ? null : (opp.matchId || null))   // human matches carry a live match id
    hap.ok()
    api.queueLeave()
    setTimeout(() => go(SCREENS.DICE_ROLL), 1400)
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // Joining may pair us immediately if someone is already waiting.
      const join = await api.queueJoin(theme.id, user?.name || 'Player', level)
      if (cancelled) return
      if (join?.matched && join.opponent) {
        finishWith({ id: join.opponent.tgId, name: join.opponent.name, level: join.opponent.level, title: null, matchId: join.opponent.matchId }, false)
        return
      }

      // Keep polling for a human indefinitely — no auto bot fallback.
      // The player decides when to give up via the "Играть с Демоном" button.
      pollRef.current = setInterval(async () => {
        const [poll, st] = await Promise.all([api.queuePoll(), api.queueStatus()])
        if (cancelled) return
        if (st) { setWaiting(st.byTheme?.[theme.id]?.count || 0); setOnline(st.online || 0) }
        if (poll?.status === 'found' && poll.opponent) {
          finishWith({ id: poll.opponent.tgId, name: poll.opponent.name, level: poll.opponent.level, title: null, matchId: poll.opponent.matchId }, false)
        }
      }, 700)   // tight poll — sub-second pairing feels instant with 2 accounts
    })()

    return () => { cancelled = true; clearInterval(pollRef.current); api.queueLeave() }
  }, [])

  const found = status === 'found'
  const handleLeave = () => { clearInterval(pollRef.current); api.queueLeave(); back() }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ paddingTop: 60, marginBottom: 8, fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: MONO }}>
        Поиск матча
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, marginBottom: 40 }}>
        Тема: {theme.name}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, width: '100%', padding: '0 28px' }}>
        <PlayerAvatar name={found ? opponent?.name : '?'} title={found ? opponent?.title : null}
          level={found ? opponent?.level : 0} dim={!found} isBot={isBot} size={120} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {found ? <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>vs</span>
            : <span className="material-icons-round" style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)' }}>hourglass_empty</span>}
        </div>
        <PlayerAvatar name={user?.name || 'Вы'} level={level} portrait={cosm?.portrait} dim={false} size={120} />
      </div>

      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {found ? (
          <div style={{ background: isBot ? '#dc2626' : '#00D26A', borderRadius: 99, padding: '7px 18px',
            fontSize: 13, fontWeight: 700, color: isBot ? '#fff' : '#000', fontFamily: MONO }}>
            {isBot ? 'Соперник не найден — играем с Демоном' : 'Матч найден ✓✓'}
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 99, padding: '7px 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>
            Поиск соперника…
          </div>
        )}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, textAlign: 'center', lineHeight: 1.8 }}>
          В очереди по теме: <span style={{ color: '#c7a35b', fontWeight: 700 }}>{waiting}</span><br/>
          Онлайн: <span style={{ color: '#00D26A', fontWeight: 700 }}>{online.toLocaleString('ru-RU')}</span>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 'calc(28px + env(safe-area-inset-bottom,0px))', width: '100%', padding: '0 24px',
        display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!found && (
          <button onClick={() => {
            const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
            finishWith({ id: 'bot', name, level: 60 + Math.floor(Math.random() * 400), title: 'P2E' }, true)
          }} style={{
            width: '100%', height: 56, borderRadius: 28, background: 'rgba(220,38,38,0.14)',
            border: '1px solid rgba(220,38,38,0.3)', color: '#ef9a9a', fontSize: 15, fontWeight: 800,
            cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>👹</span> Играть с Демоном
          </button>
        )}
        <button onClick={handleLeave} style={{
          width: '100%', height: 52, borderRadius: 28, background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: MONO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span className="material-icons-round" style={{ fontSize: 20 }}>reply</span> Покинуть очередь
        </button>
      </div>
    </div>
  )
}
