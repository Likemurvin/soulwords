import { useState, useEffect, useRef } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useGameStore } from '../store/gameStore'
import { useUserStore, useCosmStore } from '../store'
import { ROUND_CONFIG, PORTRAIT_CATALOG } from '../constants'
import { DEBUFFS_CATALOG } from '../constants/debuffs'
import { createChat } from '../utils/chatStorage'
import { hap } from '../utils/haptic'

const MONO = 'Roboto Mono, monospace'

const HINTS = [
  'помните про стамину!',
  'не торопитесь',
  'объясняйте без однокоренных слов',
  'угадайте слово — получите душ',
  'дайс решает — но не всё!',
  'стамина = символы объяснения',
  'черные дебаффы самые сложные',
  'загляните в лавку душ',
]

/* ── Debuff card shown on round start ───────────────────────────────────── */
function DebuffCard({ debuff }) {
  const def = DEBUFFS_CATALOG.find(d => d.id === (debuff?.id || debuff)) || debuff
  if (!def) return null

  // tier → background tint
  const tierBg = {
    common:  'rgba(167,139,250,0.1)',
    medium:  'rgba(199,163,91,0.1)',
    hard:    'rgba(239,68,68,0.1)',
    hardest: 'rgba(30,30,30,0.8)',
  }[def.tier] || 'rgba(255,255,255,0.05)'

  const tierBorder = {
    common:  'rgba(167,139,250,0.3)',
    medium:  'rgba(199,163,91,0.3)',
    hard:    'rgba(239,68,68,0.3)',
    hardest: 'rgba(80,80,80,0.6)',
  }[def.tier] || 'rgba(255,255,255,0.1)'

  return (
    <div style={{
      width: '100%', maxWidth: 320,
      background: tierBg, border: `1px solid ${tierBorder}`,
      borderRadius: 20, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', fontFamily: MONO, textTransform: 'uppercase' }}>
          дебафф раунда
        </span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
          background: tierBorder, color: def.color || '#fff', fontFamily: MONO,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {def.tier === 'hardest' ? '★ ЧЁРНЫЙ' : def.tier === 'hard' ? '▲ СЛОЖНЫЙ' : def.tier === 'medium' ? '◆ СРЕДНИЙ' : '● ОБЫЧНЫЙ'}
        </span>
      </div>

      {/* Name */}
      <div style={{
        fontSize: 22, fontWeight: 900, letterSpacing: '0.05em',
        color: def.color || '#fff', fontFamily: MONO,
      }}>
        {def.name}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: MONO, lineHeight: 1.5 }}>
        {def.desc}
      </div>

      {/* Visual preview of the effect */}
      <div style={{
        marginTop: 4, padding: '8px 12px', borderRadius: 10,
        background: 'rgba(0,0,0,0.3)',
        fontSize: 13, fontFamily: MONO, lineHeight: 1.4,
        color: 'rgba(255,255,255,0.7)',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: 3 }}>пример:</span>
        <span className={def.cssClass || ''}>
          {def.apply ? def.apply('пример текста объяснения') : 'пример текста объяснения'}
        </span>
      </div>
    </div>
  )
}

export function RoundStartScreen() {
  const { replace, go } = useNav()
  const user   = useUserStore(s => s.user)
  const cosm   = useCosmStore()
  const game   = useGameStore()

  const cfg       = ROUND_CONFIG[game.round - 1] || ROUND_CONFIG[0]
  const hint      = HINTS[Math.floor(Math.random() * HINTS.length)]
  const isFirst   = game.round === 1
  const roleLabel = game.iExplain ? 'Объясняйте' : 'Угадывайте'
  // Previous round souls earned (shown on rounds 2+)
  const prevSouls = game._lastRoundSouls || null

  const myPortrait = PORTRAIT_CATALOG.find(p => p.id === cosm?.portrait)

  // Auto-advance: don't let players sit on this screen forever.
  const [countdown, setCountdown] = useState(15)
  const handleStartRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); handleStartRef.current?.(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const handleSurrender = () => {
    hap.warn()
    game.resetGame()
    go(SCREENS.HUB)
  }

  const handleStart = () => {
    // Debuff is assigned once in the store (initMatch / advanceRound) so the
    // round-start preview always matches the in-game debuff.
    // Create the chat record at the start of round 1.
    if (game.round === 1 && !game.chatId) {
      const chat = createChat({
        me:  { tgId: user?.tgId, name: user?.name, level: Math.floor((user?.souls||0)/100)+1, portrait: cosm?.portrait },
        opp: { id: game.opponent?.id || 'opp', name: game.opponent?.name || 'Соперник', level: game.opponent?.level || 1, title: game.opponent?.title },
        theme: game.selectedTheme,
      })
      game.setChatId(chat.id)
    }
    hap.ok()
    replace(SCREENS.GAME)
  }
  handleStartRef.current = handleStart

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto',
    }}>
      {/* ── Title ── */}
      <div style={{ paddingTop: 56, marginBottom: 6, fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: MONO, textAlign: 'center' }}>
        {isFirst ? 'Начало матча' : `Раунд ${game.round - 1} завершен`}
      </div>

      {/* ── Previous round souls ── */}
      {!isFirst && prevSouls != null && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          {/* Spades heart bg */}
          <div style={{ position: 'relative', width: 160, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 100 90" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <path d="M50,82 C50,82 8,57 8,33 C8,16 22,8 35,8 C43,8 49,12 50,17 C51,12 57,8 65,8 C78,8 92,16 92,33 C92,57 50,82 50,82Z"
                fill="rgba(199,163,91,0.1)" stroke="rgba(199,163,91,0.2)" strokeWidth="1"/>
            </svg>
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: '#c7a35b', fontFamily: MONO, lineHeight: 1 }}>
                +{prevSouls}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, marginTop: 4, textAlign: 'center' }}>
            душ заработано вами<br/>в этом раунде
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', width: '80%', margin: '16px auto 0' }} />
        </div>
      )}

      {/* ── Далее: Round + role (shown on rounds 2+) ── */}
      {!isFirst && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, marginBottom: 6 }}>Далее:</div>
      )}

      {/* ── Avatars VS ── */}
      {isFirst && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)', border: '2px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            <span className="material-icons-round" style={{ fontSize: 28, color: 'rgba(255,255,255,0.3)' }}>person</span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>vs</span>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: myPortrait ? (myPortrait.css || myPortrait.bg || '#1a1a2a') : 'rgba(255,255,255,0.07)',
            border: '2px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {myPortrait?.img
              ? <img src={`/assets/portraits/avatar_${myPortrait.id}.png`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span className="material-icons-round" style={{ fontSize: 28, color: 'rgba(255,255,255,0.3)' }}>person</span>
            }
          </div>
        </div>
      )}

      {/* ── Round N + role tag ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', fontFamily: MONO }}>
          Раунд {game.round}
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18, padding: '7px 16px',
          fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: MONO,
        }}>
          {roleLabel}
        </div>
        {/* Cloud mascot — changes per round */}
        <div style={{ fontSize: 36 }}>
          {game.round === 1 ? '☁️' : game.round === 2 ? '⛅' : game.round === 3 ? '🌩️' : '⚡'}
        </div>
      </div>

      {/* ── Debuff card ── */}
      <div style={{ padding: '0 20px', width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <DebuffCard debuff={game.debuff} />
      </div>

      {/* ── Clubs mascot + hint bubble ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: '0 32px', width: '100%', minHeight: 120,
      }}>
        <div style={{
          fontSize: 80, lineHeight: 1,
          filter: `drop-shadow(0 4px 20px ${
            game.round <= 1 ? 'rgba(0,210,106,0.4)' :
            game.round === 2 ? 'rgba(180,120,0,0.5)' :
            'rgba(0,210,106,0.3)'
          })`,
          color: game.round === 2 ? '#c7a35b' : game.round >= 3 ? 'transparent' : 'inherit',
          WebkitTextStroke: game.round >= 3 ? '2px #00D26A' : '0',
        }}>♣</div>
        <div style={{
          background: '#4FC3F7', borderRadius: '20px 20px 20px 4px',
          padding: '13px 16px', maxWidth: 180,
          fontSize: 13, fontWeight: 600, color: '#000', fontFamily: MONO,
          boxShadow: '0 4px 20px rgba(79,195,247,0.3)',
        }}>
          {hint}
        </div>
      </div>

      {/* ── Buttons ── */}
      <div style={{ width: '100%', padding: '0 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom,0px))' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <button onClick={handleSurrender} style={{
            flex: 1, height: 54, borderRadius: 28,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: MONO,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>sentiment_very_dissatisfied</span>
            Сдаться
          </button>
          <button onClick={handleStart} style={{
            flex: 1.4, height: 54, borderRadius: 28,
            background: '#fff', border: 'none',
            color: '#000', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: MONO,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {isFirst ? 'Начать матч' : `Раунд ${game.round}`}
            <span style={{
              background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '2px 8px',
              fontSize: 13, fontWeight: 900, minWidth: 26, textAlign: 'center',
            }}>{countdown}</span>
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: MONO, lineHeight: 1.6 }}>
          Соперник получит +50 душ{'\n'}Вы получите бан на 5 минут ;(
        </div>
      </div>
    </div>
  )
}