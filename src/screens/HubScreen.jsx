import { useState, useEffect } from 'react'
import { useUserStore, useMedalStore, useCosmStore } from '../store'
import { useGameStore } from '../store/gameStore'
import { useNav, SCREENS } from '../components/Nav'
import { MEDALLIONS, PORTRAIT_CATALOG, PROFILE_BGS, DICE_CATALOG, ACHIEVEMENTS } from '../constants'
import { getDicePreviewImg, getAchievementImg } from '../assets'
import { SoulsBadge } from '../components/PriceTag'
import { TopNav } from '../components/TopNav'
import { MedalImage } from '../components/MedalImage'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { api } from '../utils/api'
import { inviteFriend } from '../utils/invite'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'

/* ─── CSS injected once ──────────────────────────────────────────────────── */
const ORBIT_STYLE = `
@keyframes orbit-float {
  0%,100% { transform: translateY(0px) scale(1); }
  50%      { transform: translateY(-7px) scale(1.06); }
}
@keyframes orbit-pulse-gold {
  0%,100% { filter: drop-shadow(0 0 0px rgba(199,163,91,0)); }
  50%      { filter: drop-shadow(0 0 8px rgba(199,163,91,0.55)); }
}
@keyframes stam-strobe {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.2; }
}
/* The orb slot wrapper — animates the whole badge */
.orb-slot {
  position: absolute;
  animation: orbit-float var(--dur,3.2s) ease-in-out infinite;
  animation-delay: var(--delay,0s);
}
/* SVG-shaped badge — clip + pulse glow */
.orb-badge-svg {
  position: relative;
  animation: orbit-pulse-gold var(--dur,3.2s) ease-in-out infinite;
  animation-delay: var(--delay,0s);
}
/* Dim empty slot */
.orb-empty {
  width: var(--sz,44px); height: var(--sz,44px);
  border-radius: 50%;
  background: rgba(255,255,255,0.03);
  border: 1px dashed rgba(255,255,255,0.08);
}
.stam-strobe { animation: stam-strobe 0.55s steps(1) infinite; }
.stam-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #ef4444; flex-shrink: 0;
  animation: stam-strobe 0.55s steps(1) infinite;
}
`
if (typeof document !== 'undefined' && !document.getElementById('orbit-styles')) {
  const s = document.createElement('style'); s.id = 'orbit-styles'; s.textContent = ORBIT_STYLE
  document.head.appendChild(s)
}

/* ─── Slot positions ─────────────────────────────────────────────────────── */
const SLOTS = [
  { top: '6%',     left: '28%',   sz: 76, dur: 3.0, delay: 0   },
  { top: '4%',     right: '24%',  sz: 66, dur: 3.6, delay: 0.4 },
  { top: '37%',    left: '18%',   sz: 60, dur: 2.8, delay: 0.8 },
  { top: '37%',    right: '18%',  sz: 60, dur: 3.3, delay: 1.2 },
  { bottom: '10%', left: '24%',   sz: 66, dur: 3.1, delay: 0.6 },
  { bottom: '10%', right: '24%',  sz: 76, dur: 2.9, delay: 1.0 },
]

/* ─── Single orbit badge — clean circle ──────────────────────────────────── */
function OrbBadge({ ach, sz }) {
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div style={{
      width: sz, height: sz, borderRadius: '50%',
      background: 'rgba(12,12,12,0.88)',
      border: '1.5px solid rgba(199,163,91,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(199,163,91,0.12)',
    }}>
      {!imgFailed ? (
        <img
          src={getAchievementImg(ach.id)}
          onError={() => setImgFailed(true)}
          style={{ width: '72%', height: '72%', objectFit: 'contain' }}
          alt={ach.name}
        />
      ) : (
        <span style={{ fontSize: sz * 0.38, lineHeight: 1 }}>{ach.icon}</span>
      )}
    </div>
  )
}

/* ─── Orbiting slots wrapper ─────────────────────────────────────────────── */
function OrbitSlots({ vitrine }) {
  return (
    <>
      {SLOTS.map((slot, i) => {
        const achId = vitrine?.[i]
        const ach   = achId ? ACHIEVEMENTS.find(a => a.id === achId) : null
        const { sz, dur, delay, ...pos } = slot
        return (
          <div key={i} className="orb-slot"
            style={{ ...pos, '--sz': `${sz}px`, '--dur': `${dur}s`, '--delay': `${delay}s`, zIndex: 4 }}>
            {ach ? (
              <div className="orb-badge-svg" style={{ '--dur': `${dur}s`, '--delay': `${delay}s` }}>
                <OrbBadge ach={ach} sz={sz} />
              </div>
            ) : (
              <div className="orb-empty" style={{ '--sz': `${sz}px`, width: sz, height: sz }} />
            )}
          </div>
        )
      })}
    </>
  )
}

/* ─── Medallion icon ─────────────────────────────────────────────────────── */
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']

function MedalIcon({ id, stack, size = 64 }) {
  const tier = ROMAN[Math.min((stack || 1) - 1, 19)]
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MedalImage id={id} stack={stack} size={size} />
      <span style={{
        position: 'absolute',
        fontWeight: 900, color: id === 'aur' ? '#fff' : '#111',
        fontFamily: "'Roboto Mono',monospace", letterSpacing: '-0.02em',
        fontSize: size * 0.19,
        // Tier label is positioned conservatively; PNG art can paint over it
        // if the asset wants to fully control labels, just drop this <span>.
        bottom: '20%',
      }}>{tier}</span>
    </div>
  )
}

/* ─── Medallion cards section ────────────────────────────────────────────── */
const MEDAL_META = {
  souls: { color: '#c7a35b', name: 'Soul Spades'      },
  stam:  { color: '#00D26A', name: 'Stamina of Clubs' },
  aur:   { color: '#4f7cf0', name: 'Diamond Aura'     },
}

function MedallionSection() {
  const medallions = useMedalStore(s => s.medallions)
  const isActive   = useMedalStore(s => s.isActive)
  const getStack   = useMedalStore(s => s.getStack)

  const active = ['souls', 'stam', 'aur'].filter(id => isActive(id))
  if (!active.length) return null

  return (
    <div style={{ padding: '0 20px 12px' }}>
      <div style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)', marginBottom: 10,
        fontFamily: "'Roboto Mono',monospace",
      }}>
        Active Medallions:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {active.map(id => {
          const stack = getStack(id)
          const med   = medallions[id]
          const hrs   = Math.max(1, Math.ceil((med.expiresAt - Date.now()) / 3600000))
          const def   = MEDALLIONS[id]
          const meta  = MEDAL_META[id]
          const bonus = stack <= 1 ? 1 : stack <= 5 ? 5 : stack <= 10 ? 10 : 20

          return (
            <div key={id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${meta.color}30`,
              borderRadius: 18, padding: '12px 10px 10px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            }}>
              {/* Name + bonus */}
              <div style={{
                fontSize: 10, fontWeight: 800, color: meta.color,
                fontFamily: "'Roboto Mono',monospace", textAlign: 'center', lineHeight: 1.4,
              }}>
                {meta.name}<br />+{bonus}%
              </div>

              {/* Icon */}
              <MedalIcon id={id} stack={stack} size={60} />

              {/* Aura progress bar */}
              {id === 'aur' && (
                <div style={{ width: '100%' }}>
                  <div style={{
                    height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2,
                    overflow: 'hidden', marginBottom: 2,
                  }}>
                    <div style={{ height: '100%', width: '55%', background: 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: "'Roboto Mono',monospace", textAlign: 'right' }}>
                    250/450
                  </div>
                </div>
              )}

              {/* Hours */}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Roboto Mono',monospace" }}>
                {hrs} ч.
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Dice section ───────────────────────────────────────────────────────── */
function HubDiceSection({ cosm, onSeeAll }) {
  const ownedDice = DICE_CATALOG.filter(d => cosm.owns('dice', d.id) || d.free || d.owned)
  const preview   = ownedDice.slice(0, 3)

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>My Dices:</div>
        <button onClick={onSeeAll} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: "'Roboto Mono',monospace", padding: 0,
        }}>
          See All <span className="material-icons-round" style={{ fontSize: 14 }}>arrow_forward</span>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {preview.map(dice => (
          <DiceTile key={dice.id} dice={dice} selected={cosm.dice === dice.id} onSelect={() => cosm.setDice(dice.id)} />
        ))}
      </div>
    </div>
  )
}

/* ─── Single dice tile (own state so it can be used inside a list) ───────── */
function DiceTile({ dice, selected, onSelect }) {
  const [failed, setFailed] = useState(false)
  return (
    <div onClick={onSelect} style={{
      aspectRatio: '1', borderRadius: 18, cursor: 'pointer',
      background: selected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
      border: selected ? '2px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 4, position: 'relative', overflow: 'hidden',
      boxShadow: selected ? '0 0 14px rgba(255,255,255,0.12)' : 'none',
    }}>
      {!failed ? (
        <img src={getDicePreviewImg(dice.id)} alt={dice.name}
          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
          onError={() => setFailed(true)} />
      ) : (
        <div className="dice-shape" style={{ width: 50, height: 50, fontSize: 14, background: dice.bg }}>20</div>
      )}
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontFamily: "'Roboto Mono',monospace" }}>
        {dice.name}
      </div>
      {selected && (
        <div style={{
          position: 'absolute', bottom: 5, right: 5,
          background: '#1976D2', borderRadius: '50%', width: 18, height: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-icons-round" style={{ fontSize: 11, color: '#fff' }}>verified</span>
        </div>
      )}
    </div>
  )
}

/* ─── Private rooms block (invited duels) ────────────────────────────────── */
function RoomsBlock() {
  const { go } = useNav()
  const setLobbyRoomKey = useGameStore(s => s.setLobbyRoomKey)
  const [rooms, setRooms] = useState([])

  useEffect(() => {
    let alive = true
    const load = () => api.myRooms().then(r => { if (alive && r?.rooms) setRooms(r.rooms) })
    load()
    const t = setInterval(load, 8000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (!rooms.length) return null

  /* Tapping a room opens its lobby. The lobby is the single place where the
     match actually starts (host taps START) — so spec-flow is consistent
     whether you got there via "Create room" or via "My rooms" on Hub. */
  const openLobby = (room) => {
    hap.m()
    setLobbyRoomKey(room.key)
    go(SCREENS.ROOM_LOBBY)
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Мои комнаты:</div>
      {rooms.map(room => {
        const ready = (room.members?.length || 0) >= 2
        return (
          <div key={room.key} onClick={() => openLobby(room)} style={{
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            background: 'rgba(199,163,91,0.06)', border: '1px solid rgba(199,163,91,0.2)',
            borderRadius: 16, padding: '12px 14px', marginBottom: 8,
            opacity: ready ? 1 : 0.6,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(199,163,91,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚔️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Roboto Mono',monospace" }}>
                Дуэль {ready ? '· готова' : '· ждём друга'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Roboto Mono',monospace" }}>
                Игроков: {room.members?.length || 1}/2
              </div>
            </div>
            <span className="material-icons-round" style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>
              {ready ? 'play_arrow' : 'hourglass_empty'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── HubScreen ──────────────────────────────────────────────────────────── */
export function HubScreen() {
  const user   = useUserStore(s => s.user)
  const { go } = useNav()
  const cosm   = useCosmStore()
  const selectedThemeId = useGameStore(s => s.selectedTheme?.id) || 'all'

  if (!user) return null

  const level    = Math.floor(user.souls / 100) + 1
  const stamPct  = Math.max(0, Math.min(100, user.stamina))
  const stamFull = stamPct >= 100
  const stamColor = stamPct < 25 ? '#ef4444'
    : stamPct < 50 ? '#f97316'
    : stamPct < 75 ? '#eab308'
    : '#00D26A'

  const activePortrait = PORTRAIT_CATALOG.find(p => p.id === cosm.portrait) || null
  const activeBg       = PROFILE_BGS.find(b => b.id === cosm.profileBg)
  const hubBgOverlay   = activeBg
    ? (activeBg.bg === 'var(--bg)' || activeBg.bg === '#000') ? 'transparent' : activeBg.bg
    : 'transparent'

  return (
    <div id="s-hub" className="screen"
      style={{ overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      <TopNav
        onBack={() => go(SCREENS.ONBOARD)}
        backIcon="info"
        onRight={() => inviteFriend(selectedThemeId)}
        rightIcon="person_add"
      />

      {/* Single scroll container for the whole hub so nothing is cut off on
          short screens. Top padding clears the floating TopNav buttons. */}
      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        paddingTop: 64,
        paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 16px))',
      }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 20px 0', justifyContent: 'center' }}>
        {[{ v: user.games, l: 'games' }, { v: user.wins, l: 'wins' }, { v: level, l: 'lvl' }].map(({ v, l }) => (
          <div key={l} style={{
            width: 80,
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: '10px 8px', textAlign: 'center', backdropFilter: 'blur(8px)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Avatar zone */}
      <div style={{ position: 'relative', margin: '16px 16px 0', borderRadius: 28, overflow: 'hidden', paddingBottom: 28 }}>
        {hubBgOverlay !== 'transparent' && (
          <div style={{ position: 'absolute', inset: 0, background: hubBgOverlay, borderRadius: 28 }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(10,10,10,1) 0%, rgba(10,10,10,0) 40%, rgba(10,10,10,0) 60%, rgba(10,10,10,0.7) 100%)',
          borderRadius: 28, zIndex: 1,
        }} />

        <OrbitSlots vitrine={user.vitrine} />

        <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 28 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <ProfileAvatar
              user={user}
              portrait={cosm.portrait}
              size={160}
              bordered
            />
            <div style={{ position: 'absolute', bottom: 0, right: -8, zIndex: 5 }}>
              <SoulsBadge amount={user.souls} size="lg" />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>Online</div>
        </div>
      </div>

      {/* Stamina */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>Stamina</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {stamPct < 10 && <div className="stam-dot" />}
            <div style={{
              flex: 1, height: 28, borderRadius: 18,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                position: 'absolute', inset: 0, width: stamPct + '%',
                background: stamColor, borderRadius: 18, transition: 'width 0.5s ease',
              }} className={stamPct === 0 ? 'stam-strobe' : ''} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, zIndex: 2,
                color: stamPct < 10 ? stamColor : '#000',
              }}>
                ♣ {String(Math.round(stamPct)).padStart(2,'0')}/100
              </div>
            </div>

            {/* Button inline with bar, same height */}
            {!stamFull ? (
              <button onClick={() => go(SCREENS.SHOP)} style={{
                background: '#00D26A', border: 'none',
                borderRadius: 14, height: 28, width: 28, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <span className="material-icons-round" style={{ fontSize: 18, color: '#000' }}>add</span>
              </button>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, height: 28, width: 28, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-icons-round" style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>done_all</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medallions */}
      <MedallionSection />

      {/* Lower content */}
      <div style={{ padding: '0 20px', marginTop: 4 }}>
        <button onClick={() => go(SCREENS.CHATS)} style={{
          width: '100%', height: 56, borderRadius: 28,
          background: '#fff', border: 'none',
          color: '#000', fontSize: 15, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginBottom: 24,
        }}>
          Начать матч
          <span className="material-icons-round" style={{ fontSize: 20 }}>arrow_right_alt</span>
        </button>

        <RoomsBlock />

        <HubDiceSection cosm={cosm} onSeeAll={() => go(SCREENS.COSM)} />
      </div>

      </div>{/* end scroll container */}
    </div>
  )
}