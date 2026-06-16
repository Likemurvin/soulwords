// TopsScreen.jsx
// Standalone leaderboard ("TOPs" tab). Shows ONLY real players from the database.
import { useEffect, useState } from 'react'
import { useUserStore } from '../store'
import { api } from '../utils/api'

const MONO = 'Roboto Mono, monospace'

const RANK_GLYPH = { 1: '🥇', 2: '🥈', 3: '🥉' }
const fmt = (n) => n.toLocaleString('ru-RU')

function HeartIcon({ size = 13 }) {
  return (
    <svg viewBox="6 12 88 92" width={size} height={size}>
      <path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill="#c7a35b"/>
    </svg>
  )
}

export function TopsScreen() {
  const user = useUserStore(s => s.user)
  const [leaders, setLeaders] = useState(null)
  const [myRank, setMyRank]   = useState(null)
  const [apiUp, setApiUp]     = useState(null)   // null=loading, true/false

  useEffect(() => {
    let cancelled = false
    api.leaderboard(50).then(res => {
      if (cancelled) return
      if (res?.leaders) {            // API reachable — show the real list (even if empty)
        setApiUp(true)
        setLeaders(res.leaders)
      } else {                        // network/offline
        setApiUp(false)
        setLeaders([])
      }
    })
    api.myRank().then(res => { if (!cancelled && res) setMyRank(res.rank) })
    return () => { cancelled = true }
  }, [])

  const rows = leaders || []
  const meRank = myRank ?? (rows.findIndex(r => r.tgId === user?.tgId) + 1 || '—')

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: MONO, letterSpacing: '0.02em' }}>
          Лорды Душ
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, marginTop: 4 }}>
          Лучшие коллекционеры душ
        </div>
      </div>

      {/* My standing */}
      <div style={{
        margin: '0 16px 12px', borderRadius: 18,
        background: 'linear-gradient(135deg, rgba(199,163,91,0.14), rgba(199,163,91,0.04))',
        border: '1px solid rgba(199,163,91,0.25)',
        padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#c7a35b', fontFamily: MONO, minWidth: 36 }}>
            #{meRank}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: MONO }}>{user?.name || 'Вы'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>Ваше место</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: '#c7a35b', fontFamily: MONO }}>{fmt(user?.souls || 0)}</span>
          <HeartIcon size={15} />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px',
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 16px))' }}>
        {apiUp === false && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontFamily: MONO, fontSize: 12, padding: '40px 20px' }}>
            Сервер недоступен. Проверьте соединение.
          </div>
        )}
        {apiUp === true && rows.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: MONO, fontSize: 13, padding: '40px 20px' }}>
            Пока пусто. Сыграйте матч — и займёте первое место!
          </div>
        )}
        {rows.map(entry => {
          const isMe = entry.tgId && entry.tgId === user?.tgId
          return (
            <div key={entry.rank} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 14px', marginBottom: 8, borderRadius: 16,
              background: isMe ? 'rgba(199,163,91,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isMe ? 'rgba(199,163,91,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ minWidth: 30, textAlign: 'center', fontSize: entry.rank <= 3 ? 20 : 15,
                fontWeight: 900, color: entry.rank <= 3 ? '#fff' : 'rgba(255,255,255,0.45)', fontFamily: MONO }}>
                {RANK_GLYPH[entry.rank] || entry.rank}
              </div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: MONO,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
                {entry.rank === 1 && (
                  <span style={{ fontSize: 10, color: '#c7a35b', marginLeft: 8, fontWeight: 500 }}>Lord of the Souls</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#c7a35b', fontFamily: MONO }}>{fmt(entry.souls)}</span>
                <HeartIcon />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
