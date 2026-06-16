// MatchOverScreen.jsx
// Flow: Бонусы! screen → Выберите медальон screen → HUB
// All visual matching the reference screenshots

import { useState } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useGameStore } from '../store/gameStore'
import { useUserStore, useMedalStore } from '../store'
import { useCosmStore } from '../store'
import { PORTRAIT_CATALOG, MEDALLIONS, MED_STACK_TIERS, ROMAN } from '../constants'
import { concludeChat } from '../utils/chatStorage'
import { hap } from '../utils/haptic'
import { MedalImage } from '../components/MedalImage'

const MONO = 'Roboto Mono, monospace'

/* ── Medallion visual ── */
const MEDAL_SHAPES = {
  souls: { shape: 'heart',   color: '#c7a35b', bg: 'rgba(199,163,91,0.15)',  label: 'Soul Spades'     },
  stam:  { shape: 'clubs',   color: '#00D26A', bg: 'rgba(0,210,106,0.12)',   label: 'Stamina of Clubs' },
  aur:   { shape: 'diamond', color: '#4f7cf0', bg: 'rgba(79,124,240,0.12)',  label: 'Diamond Aura'    },
}

function MedalIcon({ id, stack, size = 64 }) {
  const m = MEDAL_SHAPES[id]
  const tier = ROMAN[Math.min((stack || 1) - 1, ROMAN.length - 1)]

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MedalImage id={id} stack={stack} size={size} />
      <span style={{
        position: 'absolute',
        fontSize: size * 0.22, fontWeight: 900, color: id === 'aur' ? '#fff' : '#000',
        fontFamily: MONO,
      }}>{tier}</span>
    </div>
  )
}

/* ── Bonus row ── */
function BonusRow({ label, souls, portrait, isMe }) {
  const p = portrait ? PORTRAIT_CATALOG.find(x => x.id === portrait) : null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 20, padding: '12px 16px',
      marginBottom: 10,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
        background: p ? (p.css || p.bg || '#1a1a2a') : 'rgba(255,255,255,0.08)',
        border: '1.5px solid rgba(255,255,255,0.12)',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {p?.img ? (
          <img src={`/assets/portraits/avatar_${p.id}.png`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
        ) : (
          <span className="material-icons-round" style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)' }}>person</span>
        )}
      </div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#fff', fontFamily: MONO }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color: '#c7a35b', fontFamily: MONO }}>
        +{souls}
      </div>
    </div>
  )
}

/* ── Bonuses screen ── */
function BonusesScreen({ bonuses, game, user, cosm, won, total, onNext }) {
  const myPortrait = cosm?.portrait
  const oppPortrait = null // opponent portrait not tracked yet

  const myLevel  = Math.floor((user?.souls || 0) / 100) + 1
  const oppLevel = Math.floor((game.opponent?.level || 1))

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      padding: '56px 24px 0', overflowY: 'auto',
    }}>
      {/* Result banner */}
      <div style={{
        alignSelf: 'center', marginBottom: 14, padding: '6px 18px', borderRadius: 99,
        background: won ? 'rgba(0,210,106,0.14)' : 'rgba(239,68,68,0.12)',
        border: `1px solid ${won ? 'rgba(0,210,106,0.35)' : 'rgba(239,68,68,0.3)'}`,
        fontSize: 13, fontWeight: 900, fontFamily: MONO, color: won ? '#00D26A' : '#ef4444',
        letterSpacing: '0.04em',
      }}>
        {won ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', textAlign: 'center', fontFamily: MONO, marginBottom: 6 }}>
        Бонусы!
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 22, lineHeight: 1.6, fontFamily: MONO }}>
        Доп. бонусы за уникальные условия матча
      </div>

      {/* Total earned */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginBottom: 20, padding: '12px', borderRadius: 16,
        background: 'rgba(199,163,91,0.08)', border: '1px solid rgba(199,163,91,0.2)',
      }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>Всего за матч:</span>
        <span style={{ fontSize: 22, fontWeight: 900, color: '#c7a35b', fontFamily: MONO }}>+{total}</span>
        <svg viewBox="6 12 88 92" width="18" height="18"><path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill="#c7a35b"/></svg>
      </div>

      {bonuses.map((b, i) => (
        <BonusRow key={i} label={b.label} souls={b.souls} portrait={b.isMe ? myPortrait : oppPortrait} isMe={b.isMe} />
      ))}

      {/* Score comparison */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Opponent */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <span className="material-icons-round" style={{ fontSize: 36, color: 'rgba(255,255,255,0.3)' }}>person</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <svg viewBox="6 12 88 92" width="18" height="18" style={{ display: 'block', margin: '0 auto 2px' }}>
                  <path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill="#c7a35b"/>
                </svg>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#c7a35b', fontFamily: MONO }}>
                  {game.oppMatchSouls}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 18, color: '#00D26A', marginBottom: 2 }}>♣</span>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#00D26A', fontFamily: MONO }}>
                  {Math.round(game.myStamina)}
                </div>
              </div>
            </div>
            {game.opponent?.title && (
              <div style={{ fontSize: 10, color: '#c7a35b', fontFamily: MONO }}>{game.opponent.title}</div>
            )}
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: MONO }}>{game.opponent?.name || 'Соперник'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: MONO }}>Lv {oppLevel}</div>
          </div>

          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontFamily: MONO }}>Итоги</div>

          {/* Me */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <span className="material-icons-round" style={{ fontSize: 36, color: 'rgba(255,255,255,0.3)' }}>person</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                <svg viewBox="6 12 88 92" width="18" height="18" style={{ display: 'block', margin: '0 auto 2px' }}>
                  <path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill="#c7a35b"/>
                </svg>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#c7a35b', fontFamily: MONO }}>
                  {game.myMatchSouls}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: 18, color: '#00D26A', marginBottom: 2 }}>♣</span>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#00D26A', fontFamily: MONO }}>
                  {Math.round(game.myStamina)}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: MONO }}>{user?.name || 'Вы'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: MONO }}>Lv {myLevel}</div>
          </div>
        </div>
      </div>

      <button onClick={onNext} style={{
        width: '100%', height: 56, borderRadius: 28, background: '#fff', border: 'none',
        color: '#000', fontSize: 15, fontWeight: 900, cursor: 'pointer',
        fontFamily: MONO, marginBottom: 32,
      }}>End Game</button>
    </div>
  )
}

/* ── Medallion pick screen ── */
function MedallionScreen({ picked, setPicked, onEnd }) {
  const medals = Object.values(MEDALLIONS)
  const getStack = useMedalStore(s => s.getStack)

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      padding: '64px 24px 0', overflowY: 'auto',
    }}>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontFamily: MONO, marginBottom: 4 }}>
        Конец матча
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', textAlign: 'center', fontFamily: MONO, marginBottom: 6 }}>
        Выберите медальон
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 28, fontFamily: MONO }}>
        и получите бонус в следующих матчах
      </div>

      {medals.map((def) => {
        const curStack = getStack(def.id)
        const stack = Math.min(curStack + 1, 20)   // stack after picking
        const isActive = picked === def.id
        const m = MEDAL_SHAPES[def.id]

        return (
          <div
            key={def.id}
            onClick={() => setPicked(isActive ? null : def.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: isActive ? m.bg : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isActive ? m.color : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 20, padding: '16px', marginBottom: 12, cursor: 'pointer',
              transition: 'all .2s',
            }}
          >
            <MedalIcon id={def.id} stack={stack} size={72} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: m.color, fontFamily: MONO, marginBottom: 4 }}>
                {def.name} {isActive ? '+' + (stack * 1) + '%' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: MONO, marginBottom: 6, lineHeight: 1.4 }}>
                {def.getDesc(stack)}
              </div>
              {def.id === 'aur' && (
                <div style={{ marginBottom: 4 }}>
                  <div style={{
                    height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', inset: 0, width: '50%', background: '#ef4444', borderRadius: 3 }} />
                    <span style={{ position: 'absolute', right: 4, top: -1, fontSize: 9, color: '#fff', fontFamily: MONO }}>
                      125/250
                    </span>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>
                на {def.dur} ч.
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', fontFamily: MONO, marginBottom: 20, lineHeight: 1.7 }}>
        Медальоны складываются после каждого матча: 1% → 5% → 10% → 20%
      </div>

      <button onClick={onEnd} style={{
        width: '100%', height: 56, borderRadius: 28, background: '#fff', border: 'none',
        color: '#000', fontSize: 15, fontWeight: 900, cursor: 'pointer',
        fontFamily: MONO, marginBottom: 32,
      }}>End Game</button>
    </div>
  )
}

/* ── Root ── */
export function MatchOverScreen() {
  const { replace } = useNav()
  const user    = useUserStore(s => s.user)
  const updateUser = useUserStore(s => s.updateUser)
  const cosm    = useCosmStore()
  const game    = useGameStore()
  const applyMedal = useMedalStore(s => s.apply)
  const [step, setStep] = useState('bonuses')  // 'bonuses' | 'medal'
  const [picked, setPicked] = useState(null)

  const won = game.myMatchSouls > game.oppMatchSouls

  const myMistakes  = game._myMistakes  || 0
  const oppMistakes = game._oppMistakes || 0
  const myGuessed   = game._myGuessed   || 0
  const oppGuessed  = game._oppGuessed  || 0
  const myChars     = game._myChars     || 0
  const oppChars    = game._oppChars    || 0

  const bonuses = [
    myMistakes <= oppMistakes && { label: 'Меньше всего ошибок', souls: 15, isMe: true  },
    myGuessed  >= oppGuessed  && { label: 'Больше угадано слов', souls: 10, isMe: true  },
    myChars    >= oppChars    && { label: 'Использовано больше символов', souls: 10, isMe: true },
    myMistakes >  oppMistakes && { label: 'Меньше всего ошибок', souls: 15, isMe: false },
    myGuessed  <  oppGuessed  && { label: 'Больше угадано слов', souls: 10, isMe: false },
    myChars    <  oppChars    && { label: 'Использовано больше символов', souls: 10, isMe: false },
  ].filter(Boolean)

  const bonusSouls = bonuses.filter(b => b.isMe).reduce((s, b) => s + b.souls, 0)
  const winBonus   = won ? 50 : 0
  const total      = game.myMatchSouls + bonusSouls + winBonus

  const handleBonusNext = () => {
    // Compose all stat + flag updates from match results in ONE patch so the
    // unlock evaluator runs once with the final state.
    const myStaminaEnd = Math.max(0, game.myStamina || 0)
    const debuffsSeenSet = new Set(user.achStats?.debuffsSeen || [])
    if (game.debuff?.id) debuffsSeenSet.add(game.debuff.id)

    updateUser({
      souls: (user?.souls || 0) + total,
      wins:  (user?.wins || 0) + (won ? 1 : 0),
      games: (user?.games || 0) + 1,
      achStats: {
        ...user.achStats,
        gamesPlayed:    (user.achStats?.gamesPlayed    || 0) + 1,
        wins:           (user.achStats?.wins           || 0) + (won ? 1 : 0),
        soulsEarned:    (user.achStats?.soulsEarned    || 0) + total,
        wordsGuessed:   (user.achStats?.wordsGuessed   || 0) + myGuessed,
        wordsExplained: (user.achStats?.wordsExplained || 0) + (oppGuessed || 0),
        bestMatchSouls: Math.max(user.achStats?.bestMatchSouls || 0, total),
        matchesWithLead: (user.achStats?.matchesWithLead || 0) + (won ? 1 : 0),
        luckyFailWins:  (user.achStats?.luckyFailWins || 0) + (won && (game._myOnes || 0) >= 5 ? 1 : 0),
        debuffsSeen:    Array.from(debuffsSeenSet),
      },
      achFlags: {
        ...(user.achFlags || {}),
        // "Заверши матч с 0 стаминой"
        finishedAtZeroStamina: (user.achFlags?.finishedAtZeroStamina) || myStaminaEnd === 0,
        // "Заверши матч без покупки стамины" (won + never bought stamina this match)
        wonWithoutStaminaBuy: (user.achFlags?.wonWithoutStaminaBuy) || (won && !game._boughtStaminaThisMatch),
        // "Победи матч с 1 стаминой"
        wonAtOneStamina: (user.achFlags?.wonAtOneStamina) || (won && myStaminaEnd === 1),
        // "Загадал слово — соперник ошибся 5 раз" — flag tripped during match
        fiveOppMistakesOnOneWord: (user.achFlags?.fiveOppMistakesOnOneWord) || !!game._oppMistakesPeak5,
        // "Сыграй матч, где у обоих игроков 200+ душ"
        duelHighSouls: (user.achFlags?.duelHighSouls) || (total >= 200 && game.oppMatchSouls >= 200),
      },
    })
    setStep('medal')
  }

  const handleEnd = () => {
    hap.ok()
    if (picked) applyMedal(picked)   // stack the chosen medallion
    concludeChat(game.chatId, {
      mySouls: total, oppSouls: game.oppMatchSouls,
      winner: won ? 'me' : 'opp',
    })
    game.resetGame()
    replace(SCREENS.HUB)
  }

  if (step === 'bonuses') {
    return <BonusesScreen bonuses={bonuses} game={game} user={user} cosm={cosm} won={won} total={total} onNext={handleBonusNext} />
  }
  return <MedallionScreen picked={picked} setPicked={setPicked} onEnd={handleEnd} />
}