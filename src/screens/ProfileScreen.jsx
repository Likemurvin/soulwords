import { useNav, SCREENS } from '../components/Nav'
import { useUserStore } from '../store'
import { useCosmStore } from '../store'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'

import { PORTRAIT_CATALOG, PROFILE_BGS } from '../constants'
import { SoulsBadge } from '../components/PriceTag'
import { TopNav } from '../components/TopNav'

export function ProfileScreen() {
  const { go, back } = useNav()
  const user = useUserStore((s) => s.user)
  const resetProgress = useUserStore((s) => s.resetProgress)
  const cosm = useCosmStore()

  if (!user) return null

  const level = Math.floor(user.souls / 100) + 1
  const stamPct = Math.max(0, Math.min(100, user.stamina))
  const stamColor = stamPct < 25 ? 'var(--red)' : stamPct < 50 ? 'var(--gold)' : 'var(--green)'

  const activePortrait = PORTRAIT_CATALOG.find(p => p.id === cosm.portrait) || null
  const activeBg = PROFILE_BGS.find(b => b.id === cosm.profileBg)
  const hubBgOverlay = activeBg
    ? activeBg.bg === 'var(--bg)' ? 'transparent'
      : activeBg.bg === '#000' ? 'transparent'
      : activeBg.bg
    : 'transparent'

  const confirmReset = () => {
    if (window.confirm('Сбросить ВЕСЬ прогресс? Это необратимо!')) {
      resetProgress(); hap.warn(); toast('Прогресс сброшен')
    }
  }

  const menuItems = [
    {
      label: 'Достижения',
      icon: 'emoji_events',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.12)',
      action: () => go(SCREENS.ACHIEVEMENTS),
    },
    {
      label: 'Оформление',
      icon: 'palette',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,.12)',
      action: () => go(SCREENS.COSM),
    },
    {
      label: 'Ежедневная награда',
      icon: 'calendar_today',
      color: '#34d399',
      bg: 'rgba(52,211,153,.12)',
      action: () => go(SCREENS.DAILY),
    },
    {
      label: 'Обратная связь',
      icon: 'chat_bubble_outline',
      color: '#60a5fa',
      bg: 'rgba(96,165,250,.12)',
      action: () => toast('Обратная связь — скоро!'),
    },
  ]

  return (
    <div
      className="screen"
      style={{ background: '#0a0a0a', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* ── Floating top nav ─────────────────────────────────────────────── */}
      <TopNav
        onBack={back}
        onRight={() => go(SCREENS.HUB)}
        rightIcon="close"
      />

      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 16px))',
      }}>

        {/* ── Avatar zone — identical to HubScreen ─────────────────────── */}
        <div style={{
          position: 'relative',
          margin: '0 0 0',
          borderRadius: '0 0 28px 28px',
          overflow: 'hidden',
          paddingBottom: 28,
        }}>
          {/* Tinted profile bg overlay */}
          {hubBgOverlay !== 'transparent' && (
            <div style={{
              position: 'absolute', inset: 0,
              background: hubBgOverlay,
              opacity: 1,
              borderRadius: '0 0 28px 28px',
            }} />
          )}
          {/* Gradient fade */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(10,10,10,1) 0%, rgba(10,10,10,0) 35%, rgba(10,10,10,0) 60%, rgba(10,10,10,0.75) 100%)',
            borderRadius: '0 0 28px 28px',
            zIndex: 1,
          }} />

          {/* Orbiting dots */}
          {/* {[
            { top: '15%', left: '8%',  size: 36 },
            { top: '10%', right: '12%', size: 28 },
            { top: '42%', left: '4%',  size: 22 },
            { top: '42%', right: '4%', size: 22 },
            { bottom: '18%', left: '10%',  size: 28 },
            { bottom: '18%', right: '10%', size: 28 },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute', ...pos,
              width: pos.size, height: pos.size, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)',
              zIndex: 2,
            }} />
          ))} */}

          {/* Content */}
          <div style={{
            position: 'relative', zIndex: 3,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 80,   // room for TopNav
          }}>
            {/* Avatar */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{
                width: 170, height: 170, borderRadius: '50%',
                background: activePortrait ? (activePortrait.css || activePortrait.bg || '#1a1a2a') : 'rgba(255,255,255,0.06)',
                border: '3px solid rgba(255,255,255,0.12)',
                overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activePortrait?.img ? (
                  <img src={`/assets/portraits/avatar_${activePortrait.id}.png`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                ) : (
                  <span className="material-icons-round" style={{ fontSize: 48, color: 'rgba(255,255,255,0.25)' }}>person</span>
                )}
              </div>
            </div>

            {/* Dots */}
            {/* <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.35)' }} />
              ))}
            </div> */}

            {/* Name + status */}
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>Online</div>
          </div>
        </div>

        {/* ── Menu items ────────────────────────────────────────────────── */}
        <div className="prf-card" style={{ margin: '16px 16px 0' }}>
          {menuItems.map((item) => (
            <div key={item.label} className="prf-item" onClick={() => { hap.l(); item.action() }}>
              <div style={{
                width: 60, height: 60, borderRadius: 12, flexShrink: 0,
                background: item.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-icons-round" style={{ fontSize: 30, color: item.color }}>{item.icon}</span>
              </div>
              <div className="prf-item-label">{item.label}</div>
              <span className="material-icons-round" style={{ fontSize: 18, opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
            </div>
          ))}
        </div>

        {/* ── Danger zone ───────────────────────────────────────────────── */}
        <div className="prf-card" style={{ margin: '12px 16px 0' }}>
          <div className="prf-item" onClick={confirmReset}>
            <div style={{
              width: 60, height: 60, borderRadius: 12, flexShrink: 0,
              background: 'rgba(244,58,51,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-icons-round" style={{ fontSize: 30, color: 'var(--red)' }}>delete_forever</span>
            </div>
            <div className="prf-item-label" style={{ color: 'var(--red)' }}>Самоуничтожение</div>
            <span className="material-icons-round" style={{ fontSize: 18, opacity: 0.3, flexShrink: 0 }}>chevron_right</span>
          </div>
        </div>

      </div>
    </div>
  )
}