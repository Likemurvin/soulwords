// DailyRewardsScreen.jsx
// Visual: zigzag path of hexagon day nodes connecting up to a big spades-heart jackpot
// Data:   reads/writes user.achStats.dailyStreak + user.lastDailyClaim via userStore

import { inviteFriend } from '../utils/invite'
import { useState } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useUserStore } from '../store'
import { hap } from '../utils/haptic'
import { toast } from '../components/Toast'
import { TopNav } from '../components/TopNav'
import { SoulsBadge } from '../components/PriceTag'

/* ─── Config ─────────────────────────────────────────────────────────────── */
const DAYS = [
  { day: 1, souls: 50  },
  { day: 2, souls: 60  },
  { day: 3, souls: 70  },
  { day: 4, souls: 80  },
  { day: 5, souls: 90  },
  { day: 6, souls: 1200, jackpot: true },
]

// X positions as fraction of container width, bottom-to-top (day1..day5)
// Alternates right/left matching the reference zigzag
const X_FRAC = [0.62, 0.18, 0.62, 0.18, 0.62]

/* ─── Time helpers ───────────────────────────────────────────────────────── */
function getMidnightToday() {
  const d = new Date(); d.setHours(0,0,0,0); return d.getTime()
}
function canClaimToday(lastClaim) {
  return !lastClaim || lastClaim < getMidnightToday()
}

/* ─── Hexagon node ───────────────────────────────────────────────────────── */
function HexNode({ day, souls, claimed, active }) {
  const size = active ? 90 : 74

  const bg = claimed
    ? 'linear-gradient(145deg,#7a6030,#C4A46B,#9a7838)'
    : active
      ? 'linear-gradient(145deg,#8B7340,#D4B470,#A08040)'
      : 'linear-gradient(145deg,#222,#1a1a1a)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        fontSize: 10, color: 'rgba(255,255,255,0.32)',
        fontFamily: 'Roboto Mono, monospace', letterSpacing: '0.1em',
      }}>
        день {day}
      </div>
      <div style={{
        width: size, height: size,
        clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)',
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        filter: (claimed || active)
          ? 'drop-shadow(0 4px 14px rgba(196,164,107,0.45))'
          : 'none',
        animation: active ? 'daily-pulse 2s ease-in-out infinite' : 'none',
      }}>
        <span style={{
          fontFamily: 'Roboto Mono, monospace',
          fontSize: active ? 20 : 16,
          fontWeight: 900,
          color: (claimed || active) ? '#fff' : 'rgba(255,255,255,0.2)',
          letterSpacing: '-0.02em',
        }}>
          +{souls}
        </span>
        {claimed && (
          <div style={{
            position: 'absolute', top: -3, right: -3,
            width: 18, height: 18, borderRadius: '50%',
            background: '#00D26A', border: '2px solid #0a0a0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: '#fff', fontWeight: 900,
          }}>✓</div>
        )}
      </div>
    </div>
  )
}

/* ─── SVG beam connecting two node centers ───────────────────────────────── */
function BeamSVG({ x1, y1, x2, y2, lit }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={lit ? 'rgba(196,164,107,0.75)' : 'rgba(196,164,107,0.15)'}
      strokeWidth={lit ? 6 : 4}
      strokeLinecap="round"
    />
  )
}

/* ─── Main screen ────────────────────────────────────────────────────────── */
export function DailyRewardsScreen() {
  const { back } = useNav()
  const { go }   = useNav()
  const user      = useUserStore(s => s.user)
  const updateUser = useUserStore(s => s.updateUser)
  const addSouls   = useUserStore(s => s.addSouls)

  const streak    = user?.achStats?.dailyStreak || 0
  const lastClaim = user?.lastDailyClaim || 0
  const canClaim  = canClaimToday(lastClaim)

  const todayIdx  = streak % 6          // 0-based index into DAYS
  const todayDay  = DAYS[todayIdx]

  const [justClaimed, setJustClaimed] = useState(false)

  const handleClaim = () => {
    if (!canClaim || justClaimed) return
    addSouls(todayDay.souls)
    updateUser({
      lastDailyClaim: Date.now(),
      achStats: { ...user.achStats, dailyStreak: streak + 1 },
    })
    setJustClaimed(true)
    hap.ok()
    toast(`+${todayDay.souls} душ! 🔥`)
  }

  /* ── Layout math ──────────────────────────────────────────────────────── */
  // Virtual coordinate space: 340 wide, rows of 110px each, 5 day nodes bottom→top
  const CW   = 340   // container virtual width
  const ROW  = 110   // px per row
  const TPAD = 50    // top padding inside SVG (space for label above top node)
  const BPAD = 50    // bottom padding
  const NH   = 5 * ROW + TPAD + BPAD  // total SVG height for the node map

  // Node centers [x, y] — day1 at bottom, day5 at top
  const centers = X_FRAC.map((xf, i) => ({
    x: Math.round(xf * CW),
    y: Math.round(TPAD + (4 - i) * ROW),
  }))

  // Jackpot center at top-center
  const jackpotCenter = { x: CW / 2, y: TPAD - 36 }

  // Which nodes are lit (claimed or active)
  const litUpTo = justClaimed ? todayIdx + 1 : todayIdx

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <TopNav onBack={back} onRight={() => inviteFriend()} rightIcon="person_add" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: '76px 24px 0' }}>

          {/* Title */}
          <div style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', marginBottom: 10, fontFamily: 'Roboto Mono, monospace' }}>
            Дейлики
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', textAlign: 'center', lineHeight: 1.8, marginBottom: 28, fontFamily: 'Roboto Mono, monospace' }}>
            Ежедневно участвуя в чатах/матчах{'\n'}
            с отметкой{' '}
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 17, height: 17, borderRadius: '50%',
              background: '#e53935', fontSize: 9, fontWeight: 900, color: '#fff',
              verticalAlign: 'middle',
            }}>1</span>
            {' '}вы приближаетесь{'\n'}
            к недельному супер бонусу:
          </div>

          {/* ── Jackpot badge ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 0 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Roboto Mono, monospace', letterSpacing: '0.1em', marginBottom: 6 }}>
              день 6
            </div>
            <div style={{ opacity: streak >= 5 ? 1 : 0.25, transition: 'opacity .3s' }}>
              <SoulsBadge amount={1200} size="lg" />
            </div>
          </div>

          {/* ── Node map (SVG beams + positioned hex nodes) ────────────── */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 380, margin: '0 auto', height: NH }}>

            {/* SVG layer for beams only */}
            <svg
              viewBox={`0 0 ${CW} ${NH}`}
              width="100%" height={NH}
              style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
            >
              {/* day-to-day beams */}
              {centers.map((c, i) => {
                if (i === 0) return null
                const prev = centers[i - 1]
                return (
                  <BeamSVG
                    key={`b${i}`}
                    x1={prev.x} y1={prev.y}
                    x2={c.x}   y2={c.y}
                    lit={i < litUpTo}
                  />
                )
              })}
              {/* beam from day5 up to jackpot */}
              <BeamSVG
                x1={centers[4].x} y1={centers[4].y}
                x2={jackpotCenter.x} y2={jackpotCenter.y}
                lit={litUpTo >= 5}
              />
            </svg>

            {/* Hex nodes */}
            {DAYS.slice(0, 5).map((d, i) => {
              const c = centers[i]
              const isClaimed = i < litUpTo
              const isActive  = i === todayIdx && canClaim && !justClaimed
              const nodeW = isActive ? 90 : 74

              return (
                <div
                  key={d.day}
                  style={{
                    position: 'absolute',
                    left: `${(c.x / CW) * 100}%`,
                    top: c.y,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <HexNode
                    day={d.day}
                    souls={d.souls}
                    claimed={isClaimed}
                    active={isActive}
                  />
                </div>
              )
            })}
          </div>

          {/* ── Claim / Already claimed ────────────────────────────────── */}
          <div style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom,16px))', marginTop: 24 }}>
            {canClaim && !justClaimed ? (
              <button onClick={handleClaim} style={{
                width: '100%', padding: '16px', borderRadius: 20, border: 'none',
                background: 'linear-gradient(135deg,#c7a35b,#8B7340)',
                color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer',
                fontFamily: 'Roboto Mono, monospace',
                boxShadow: '0 4px 20px rgba(199,163,91,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <span className="material-icons-round" style={{ fontSize: 20 }}>celebration</span>
                Получить +{todayDay.souls} душ
              </button>
            ) : (
              <div style={{
                width: '100%', padding: '16px', borderRadius: 20,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.28)', fontSize: 13, fontWeight: 700,
                fontFamily: 'Roboto Mono, monospace', textAlign: 'center',
              }}>
                ✓ Получено сегодня
              </div>
            )}

            {/* Streak counter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              <span className="material-icons-round" style={{ fontSize: 15, color: '#c7a35b' }}>local_fire_department</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'Roboto Mono, monospace' }}>
                Серия: {streak % 6} / 6 дней
              </span>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes daily-pulse {
          0%,100% { filter: drop-shadow(0 4px 14px rgba(196,164,107,0.45)); transform: scale(1); }
          50%      { filter: drop-shadow(0 6px 22px rgba(196,164,107,0.8)); transform: scale(1.07); }
        }
      `}</style>
    </div>
  )
}