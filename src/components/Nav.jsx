import { createContext, useContext, useState } from 'react'
import { getNavIcon } from '../assets'
import { useUserStore, useCosmStore } from '../store'
import { getTgUser } from '../utils/telegram'

const NavCtx = createContext(null)

export const SCREENS = {
  LOGIN:            'login',
  ONBOARD:          'onboard',
  HUB:              'hub',
  ROOMS:            'rooms',
  ROOM_LOBBY:       'room_lobby',
  CHATS:            'chats',
  TOPIC_PICK:       'topic_pick',
  DAILY_REWARDS:    'daily_rewards',
  GAME:             'game',
  SHOP:             'shop',
  PROFILE:          'profile',
  ACHIEVEMENTS:     'achievements',
  COSM:             'cosm',
  DICE_DETAIL:      'dice_detail',
  PORTRAIT_DETAIL:  'portrait_detail',
  TALISMAN:         'talisman',
  DAILY:            'daily',
  MATCH_OVER:       'match_over',
  ROUND_START:      'round_start',
  DICE_ROLL:        'dice_roll',
  DUEL:             'duel',
  MATCHMAKING:      'matchmaking',
  TOPS:             'tops',
}

const TAB_SCREENS = [SCREENS.HUB, SCREENS.SHOP, SCREENS.CHATS, SCREENS.TOPS, SCREENS.PROFILE]

export function NavProvider({ children, initialScreen }) {
  const [screen, setScreen]   = useState(initialScreen || SCREENS.HUB)
  const [history, setHistory] = useState([])
  const [hideTabBar, setHideTabBar] = useState(false)   // toggled by full-screen modals

  const go = (s) => {
    setHistory((h) => [...h, screen])
    setScreen(s)
  }

  const back = () => {
    setHistory((h) => {
      const prev = h[h.length - 1]
      if (prev) setScreen(prev)
      return h.slice(0, -1)
    })
  }

  const replace  = (s) => setScreen(s)
  const navigate = go

  return (
    <NavCtx.Provider value={{ screen, go, navigate, back, replace, hideTabBar, setHideTabBar }}>
      {children}
    </NavCtx.Provider>
  )
}

export function useNav() {
  return useContext(NavCtx)
}

// ─── TabBar ───────────────────────────────────────────────────────────────────
// Floating pill — black bg, side margins, rounded corners, off the bottom edge.
// Matches the nav panel in the 1CHATS.svg reference.

// Per-tab icon. The Hub ("You") tab shows the user's own avatar — chosen
// portrait if they've picked one in cosmetics, otherwise their Telegram photo,
// otherwise a generic SVG/material-icon fallback. All other tabs use the SVG
// at /assets/ui/nav_<id>.svg with a Material-icons fallback.
function TabIcon({ id, fallback, active }) {
  const [failed, setFailed] = useState(false)
  const user = useUserStore(s => s.user)
  const portrait = useCosmStore(s => s.portrait)

  // Hub tab: avatar instead of nav icon.
  if (id === SCREENS.HUB) {
    // Picked portrait wins; fall back to Telegram photo; fall back to a
    // monogram circle if neither is set.
    const tgUser  = getTgUser()
    const photoUrl = user?.photoUrl || tgUser?.photo_url
    const portraitSrc = portrait && portrait !== 'default'
      ? `/assets/portraits/avatar_${portrait}.png`
      : null
    const src = portraitSrc || photoUrl
    const ring = active ? '2px solid #ffffff' : '2px solid transparent'

    if (src && !failed) {
      return (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', overflow: 'hidden',
          border: ring, transition: 'border-color .2s',
          background: '#1a1a1a',
        }}>
          <img src={src} alt=""
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )
    }
    // Monogram fallback.
    const ch = (user?.name || tgUser?.first_name || '?')[0].toUpperCase()
    return (
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: active ? '#fff' : '#2a2a2a',
        color: active ? '#000' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 900, fontFamily: "'Roboto Mono', monospace",
        border: ring, transition: 'background .2s, color .2s, border-color .2s',
      }}>{ch}</div>
    )
  }

  if (failed) {
    return (
      <span className="material-icons-round"
        style={{ fontSize: 26, color: active ? '#ffffff' : '#5a5a5a', transition: 'color .2s' }}>
        {fallback}
      </span>
    )
  }
  return (
    <img
      src={getNavIcon(id)}
      alt=""
      onError={() => setFailed(true)}
      style={{
        width: 26, height: 26, objectFit: 'contain',
        filter: active
          ? 'brightness(0) invert(1)'
          : 'brightness(0) invert(0.36)',
        opacity: active ? 1 : 0.85,
        transition: 'filter .2s, opacity .2s',
      }}
    />
  )
}

export function TabBar() {
  const { screen, replace, hideTabBar } = useNav()
  if (hideTabBar) return null
  if (!TAB_SCREENS.includes(screen)) return null

  // Each tab maps to:
  //   svg  → /assets/ui/nav_<id>.svg (preferred)
  //   icon → Material-icons name shown if the SVG isn't there yet
  const tabs = [
    { id: SCREENS.HUB,     label: 'You',       icon: 'account_circle' },
    { id: SCREENS.SHOP,    label: 'Soulstore', icon: 'storefront'     },
    { id: SCREENS.CHATS,   label: 'Chats',     icon: 'forum'          },
    { id: SCREENS.TOPS,    label: 'TOPs',      icon: 'leaderboard'    },
    { id: SCREENS.PROFILE, label: 'Profile',   icon: 'tune'           },
  ]

  return (
    <>
      {/* Spacer prevents content from hiding behind the pill */}
      <div style={{ height: 'calc(84px + env(safe-area-inset-bottom, 16px))' }} />

      <nav style={{
        position:     'fixed',
        bottom:       'calc(14px + env(safe-area-inset-bottom, 0px))',
        left:         14,
        right:        14,
        zIndex:       800,
        background:   'rgba(17,17,17,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border:       '1px solid rgba(255,255,255,.08)',
        borderRadius: 28,
        display:      'flex',
        alignItems:   'center',
        padding:      '6px 4px',
        height:       70,
        boxShadow:    '0 8px 32px rgba(0,0,0,.55)',
      }}>
        {tabs.map((t) => {
          const active = screen === t.id
          return (
            <button
              key={t.id}
              onClick={() => replace(t.id)}
              style={{
                flex:           1,
                background:     active ? 'rgba(255,255,255,.08)' : 'none',
                border:         'none',
                borderRadius:   20,
                cursor:         'pointer',
                height:         58,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            3,
                transition:     'background .2s',
              }}
            >
              <TabIcon id={t.id} fallback={t.icon} active={active} />
              <span style={{
                fontSize:      9,
                fontWeight:    700,
                color:         active ? '#ffffff' : '#5a5a5a',
                letterSpacing: '.02em',
                transition:    'color .2s',
              }}>
                {t.label}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}