import { useEffect, useRef } from 'react'
import { NavProvider, useNav, SCREENS, TabBar } from './components/Nav'
import { Toast }        from './components/Toast'
import { useUserStore } from './store'
import { useGameStore } from './store/gameStore'
import { preloadGameAssets } from './utils/preloadAssets'

// ── Screens ───────────────────────────────────────────────────────────────────
import { HubScreen }          from './screens/HubScreen'
import { RoomsScreen }        from './screens/RoomsScreen'
import { RoomLobbyScreen }    from './screens/RoomLobbyScreen'
import { ShopScreen }         from './screens/ShopScreen'
import { ProfileScreen }      from './screens/ProfileScreen'
import { AchievementsScreen } from './screens/AchievementsScreen'
import { CosmScreen }         from './screens/CosmScreen'
import { DiceRollScreen }     from './screens/DiceRollScreen'
import { RoundStartScreen }   from './screens/RoundStartScreen'
import { GameScreen }         from './screens/GameScreen'
import { TalismanScreen }     from './screens/TalismanScreen'
import { MatchOverScreen }    from './screens/MatchOverScreen'
import { DailyRewardsScreen } from './screens/DailyScreen'
import { OnboardingScreen }   from './screens/OnboardingScreen'
import { ChatsScreen }        from './screens/ChatsScreen'
import { TopicPickScreen }    from './screens/TopicPickScreen'
import { MatchmakingScreen }  from './screens/MatchmakingScreen'
import { TopsScreen }         from './screens/TopsScreen'

const Placeholder = ({ name }) => (
  <div className="screen" style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column', gap: 12,
  }}>
    <div style={{ fontSize: 13, color: 'var(--txt2)' }}>{name}</div>
    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>coming soon</div>
  </div>
)

function Router() {
  const { screen } = useNav()

  const map = {
    [SCREENS.ONBOARD]:         <OnboardingScreen />,
    [SCREENS.HUB]:             <HubScreen />,
    [SCREENS.ROOMS]:           <RoomsScreen />,
    [SCREENS.ROOM_LOBBY]:      <RoomLobbyScreen />,
    [SCREENS.CHATS]:           <ChatsScreen />,
    [SCREENS.TOPIC_PICK]:      <TopicPickScreen />,
    [SCREENS.DAILY_REWARDS]:   <DailyRewardsScreen />,
    [SCREENS.DAILY]:           <DailyRewardsScreen />,
    [SCREENS.GAME]:            <GameScreen />,
    [SCREENS.SHOP]:            <ShopScreen />,
    [SCREENS.PROFILE]:         <ProfileScreen />,
    [SCREENS.ACHIEVEMENTS]:    <AchievementsScreen />,
    [SCREENS.COSM]:            <CosmScreen />,
    [SCREENS.TALISMAN]:        <TalismanScreen />,
    [SCREENS.MATCH_OVER]:      <MatchOverScreen />,
    [SCREENS.ROUND_START]:     <RoundStartScreen />,
    [SCREENS.DICE_ROLL]:       <DiceRollScreen />,
    [SCREENS.MATCHMAKING]:     <MatchmakingScreen />,
    [SCREENS.TOPS]:            <TopsScreen />,
    [SCREENS.DUEL]:            <Placeholder name="Duel" />,
    [SCREENS.DICE_DETAIL]:     <Placeholder name="Dice detail" />,
    [SCREENS.PORTRAIT_DETAIL]: <Placeholder name="Portrait detail" />,
  }

  return (
    <>
      {map[screen] ?? <Placeholder name={screen} />}
      <TabBar />
      <Toast />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Flow:
//   loading                       → splash
//   logged in, onboarding not done → OnboardingScreen
//   logged in, onboarding done     → HubScreen
// Identity is resolved from Telegram automatically — no login screen.
// ─────────────────────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0A0A0A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
    }}>
      <div style={{
        fontFamily: "'Roboto Mono', monospace", fontSize: 34, fontWeight: 900,
        letterSpacing: '.04em', color: '#fff',
      }}>
        Soul<span style={{ color: 'var(--accent)' }}>Words</span>
      </div>
      <div style={{ width: 28, height: 28, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.12)', borderTopColor: 'var(--accent)',
        animation: 'sw-spin 0.8s linear infinite' }} />
      <style>{`@keyframes sw-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function AppContent() {
  const { replace }      = useNav()
  const init             = useUserStore(s => s.init)
  const loading          = useUserStore(s => s.loading)
  const isLoggedIn       = useUserStore(s => s.isLoggedIn)
  const onboardingDone   = useUserStore(s => s.user?.onboardingDone)
  const joinedRoom       = useUserStore(s => s.joinedRoom)
  const setLobbyRoomKey  = useGameStore(s => s.setLobbyRoomKey)
  const routedRef        = useRef(false)

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (loading) return
    if (!isLoggedIn) return
    // Warm the dice/num video cache in the background so the in-game roll
    // animation doesn't stutter the first time it plays.
    preloadGameAssets()

    if (routedRef.current) return       // initial route already done once; user navigates freely after

    // Stash any pending room key in localStorage so brand-new users keep it
    // across the onboarding detour.
    if (joinedRoom?.key) localStorage.setItem('sw_pending_room', joinedRoom.key)
    const pendingKey = joinedRoom?.key || localStorage.getItem('sw_pending_room')

    if (!onboardingDone) { replace(SCREENS.ONBOARD); return }   // don't mark routed — let it re-run after onboarding

    routedRef.current = true             // mark routed BEFORE clearing state so the effect doesn't fight itself
    if (pendingKey) {
      console.log('[route] → lobby (room', pendingKey + ')')
      setLobbyRoomKey(pendingKey)
      replace(SCREENS.ROOM_LOBBY)
      localStorage.removeItem('sw_pending_room')
      useUserStore.setState({ joinedRoom: null })
      return
    }
    console.log('[route] → hub')
    replace(SCREENS.HUB)
  }, [loading, isLoggedIn, onboardingDone, joinedRoom])

  if (loading) return <Splash />
  return <Router />
}

export default function App() {
  useEffect(() => {
    const tg = window?.Telegram?.WebApp

    // Keep --app-h in sync with the real visible viewport. Telegram exposes
    // viewportStableHeight; on the web we use the visual viewport / innerHeight.
    const setH = () => {
      let h = null
      if (tg?.viewportStableHeight) h = tg.viewportStableHeight
      else if (window.visualViewport?.height) h = window.visualViewport.height
      else h = window.innerHeight
      if (h) document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`)
    }

    if (tg) {
      tg.ready(); tg.expand()
      try { tg.disableVerticalSwipes?.() } catch { /* older clients */ }
      tg.onEvent?.('viewportChanged', setH)
    }
    setH()
    window.addEventListener('resize', setH)
    window.visualViewport?.addEventListener('resize', setH)

    return () => {
      tg?.offEvent?.('viewportChanged', setH)
      window.removeEventListener('resize', setH)
      window.visualViewport?.removeEventListener('resize', setH)
    }
  }, [])

  return (
    <NavProvider initialScreen={SCREENS.HUB}>
      <AppContent />
    </NavProvider>
  )
}
