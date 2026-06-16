import { useEffect, useRef, useState, useCallback } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useGameStore } from '../store/gameStore'
import { useUserStore, useCosmStore } from '../store'
import { ROUND_CONFIG, BUBBLE_COLORS } from '../constants'
import { DEBUFFS_CATALOG, injectDebuffStyles } from '../constants/debuffs'
import { loadWords, pickWord, hasForbidden } from '../utils/wordPicker'
import { appendRound } from '../utils/chatStorage'
import { createBotGuesser, pickBotWord } from '../data/botBrain'
import { connectMatch, getMatchSocket, disconnectMatch } from '../utils/matchSocket'
import { getDiceRollVideo, getNumShowVideo } from '../assets'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'

injectDebuffStyles()

const MONO = "'Roboto Mono',monospace"

/* ── Opponent AI pools ──────────────────────────────────────────────────── */
// Used ONLY when opponent is explaining (we guess) — these are their hints to us
const OPP_EXPLAIN_HINTS = [
  'Это живое существо', 'Используется в быту', 'Можно найти в природе',
  'Связано с движением', 'Бывает разных размеров', 'Все знают это слово',
  'Сделано из металла', 'Связано с едой', 'Встречается дома',
  'Это абстрактное понятие', 'Бывает разных цветов', 'Связано с природой',
]
// Used ONLY when we explain — these are opponent's guess attempts
const OPP_GUESS_ATTEMPTS = [
  'кошка?', 'стол?', 'книга?', 'машина?',
  'вода?', 'дерево?', 'телефон?', 'солнце?', 'собака?', 'дом?',
]

/* ── In-chat shop items ──────────────────────────────────────────────────── */
const SHOP_ITEMS = [
  {
    id: 'stamina', icon: '♣', iconColor: '#00D26A',
    name: 'Восстановить стамину', desc: '+20 стамины',
    cost: 15, perk: 'stamina',
  },
  {
    id: 'vaccine', icon: '💉', iconColor: '#4FC3F7',
    name: 'Прививка', desc: 'Убрать дебафф раунда',
    cost: 20, perk: 'vaccine',
  },
  {
    id: 'reroll', icon: '🎲', iconColor: '#a78bfa',
    name: 'Переброс дайса', desc: 'Игнорирует 1 провал без затраты стамины',
    cost: 15, perk: 'reroll',
  },
]

/* ── In-chat shop overlay ────────────────────────────────────────────────── */
function InChatShop({ user, game, updateUser, onClose }) {
  const handleBuy = (item) => {
    if (user.souls < item.cost) { toast('Мало душ!'); hap.err(); return }
    updateUser({ souls: user.souls - item.cost })
    if (item.perk === 'stamina') {
      game.drainMatchStamina(-20) // negative drain = restore
      game.markBoughtStaminaThisMatch?.()   // disqualifies the "last_breath" achievement
      toast('+20 стамины!')
    } else if (item.perk === 'vaccine') {
      game.setDebuff(null)
      toast('Дебафф снят!')
    } else if (item.perk === 'reroll') {
      game.setRerollToken(true)
      toast('Переброс готов!')
    }
    hap.ok()
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      {/* Backdrop — game still visible through blur */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} />

      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 2,
        background: '#0f0f0f',
        borderRadius: '28px 28px 0 0',
        padding: '0 0 calc(20px + env(safe-area-inset-bottom,0px))',
        overflow: 'hidden',
      }}>
        {/* SoulStore branding header */}
        <div style={{
          position: 'relative', height: 100, overflow: 'hidden',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '0 20px 12px',
        }}>
          {/* Dark green texture bg */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 40% 60%, rgba(0,80,30,0.6) 0%, rgba(0,0,0,0.9) 70%)',
          }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>Баланс</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg viewBox="6 12 88 92" width="14" height="14">
                <path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill="#c7a35b"/>
              </svg>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#c7a35b', fontFamily: MONO }}>
                {user.souls >= 1000 ? (user.souls / 1000).toFixed(1) + 'k' : user.souls}
              </span>
            </div>
          </div>
          {/* SoulStore logo — image (assets/ui/soulstore_ingame.png) */}
          <div style={{ position: 'relative', zIndex: 2, height: 40, display: 'flex', alignItems: 'center' }}>
            <img src="/assets/ui/soulstore_ingame.png" alt="SoulStore"
              onError={(e) => {
                const fb = document.createElement('div')
                fb.textContent = 'SoulStore'
                fb.style.cssText = `font-size:24px;font-weight:900;font-family:'Roboto Mono',monospace;color:#c7a35b;letter-spacing:0.02em;text-shadow:0 2px 10px rgba(199,163,91,0.5)`
                e.target.replaceWith(fb)
              }}
              style={{ height: 40, objectFit: 'contain' }} />
          </div>
          {/* Close */}
          <button onClick={onClose} style={{
            position: 'relative', zIndex: 2,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
          }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Items */}
        <div style={{ padding: '0 16px' }}>
          {/* Stamina restore — full width */}
          <div
            onClick={() => handleBuy(SHOP_ITEMS[0])}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20, padding: '16px', marginBottom: 10, cursor: 'pointer',
              position: 'relative',
            }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: 14, flexShrink: 0,
              background: 'rgba(0,210,106,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: '#00D26A',
            }}>♣</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: MONO, marginBottom: 3 }}>
                {SHOP_ITEMS[0].name}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>
                {SHOP_ITEMS[0].desc}
              </div>
              {/* Stamina bar */}
              <div style={{ marginTop: 8, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${game.myStamina}%`, background: game.myStamina < 25 ? '#ef4444' : '#00D26A', borderRadius: 3 }} />
                <span style={{ position: 'absolute', right: 4, top: -2, fontSize: 9, color: '#fff', fontFamily: MONO }}>
                  {Math.round(game.myStamina)}/100
                </span>
              </div>
            </div>
            {/* Price tag */}
            <TicketPrice cost={SHOP_ITEMS[0].cost} />
          </div>

          {/* Vaccine + Reroll — 2-column */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {SHOP_ITEMS.slice(1).map(item => (
              <div
                key={item.id}
                onClick={() => handleBuy(item)}
                style={{
                  background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18, padding: '14px 12px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  position: 'relative', textAlign: 'center',
                }}
              >
                <TicketPrice cost={item.cost} small />
                <div style={{ fontSize: 30 }}>{item.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: MONO }}>{item.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: MONO, lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TicketPrice({ cost, small }) {
  const h = small ? 22 : 26
  const w = Math.round(h * 1.6)
  const fs = small ? 9 : 11
  return (
    <div style={{
      position: 'absolute', top: small ? -6 : -8, right: small ? -6 : -8,
      width: w, height: h, flexShrink: 0,
      filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
    }}>
      <svg viewBox="0 0 376 236" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M35,1.83A35.17,35.17,0,0,0,0,37.21L.21,72.37A11.72,11.72,0,0,0,12,84a35.16,35.16,0,1,1,.43,70.32A11.72,11.72,0,0,0,.78,166.13L1,201.3a35.16,35.16,0,0,0,35.37,34.95l304.74-1.84A35.15,35.15,0,0,0,376.05,199l-.21-35.16a11.72,11.72,0,0,0-11.79-11.65,35.17,35.17,0,0,1-.43-70.33,11.7,11.7,0,0,0,11.65-11.79L375.06,35A35.16,35.16,0,0,0,339.69,0Z" fill="#c7a35b"/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: fs, fontWeight: 900, color: '#3a2010', fontFamily: MONO,
        gap: 1,
      }}>
        <svg viewBox="76 83 78 88" width={fs} height={fs}>
          <path d="M119.51,106.84a20.05,20.05,0,0,1,14.91-6.61c10.77-.06,19.54,8,19.6,18.08,0,8.32-6.26,13.72-14.68,20.92-7.35,6.28-16.3,13.93-24,26.09-7.86-12.07-16.9-19.61-24.32-25.8-8.51-7.1-14.89-12.42-14.94-20.74-.06-10,8.62-18.25,19.38-18.31a20,20,0,0,1,15,6.42,102.58,102.58,0,0,0-8.9-15,2.85,2.85,0,0,1,2.41-4.42l21.83-.13a2.85,2.85,0,0,1,2.47,4.39A102.49,102.49,0,0,0,119.51,106.84Z" fill="#3a2010"/>
        </svg>
        {cost}
      </div>
    </div>
  )
}

/* ── Dice video overlay (same as DiceRollScreen) ─────────────────────────── */
const NUM_TRIGGER = 3
const CROSSFADE   = 333

function DiceVideoOverlay({ diceType, onResult }) {
  const rollVidRef = useRef(null)
  const numVidRef  = useRef(null)
  const [numOpacity, setNumOpacity] = useState(0)
  const [roll, setRoll]             = useState(null)
  const [label, setLabel]           = useState('')
  const numStarted = useRef(false)
  const finished   = useRef(false)
  const intervalRef = useRef(null)

  const rollVal = useRef(null)

  useEffect(() => {
    // Pick result immediately so num video can be preloaded
    const r = Math.floor(Math.random() * 20) + 1
    rollVal.current = r
    setRoll(r)

    // Load roll video
    const vid = rollVidRef.current
    if (vid) { vid.src = getDiceRollVideo(diceType); vid.load() }

    // Load num video
    const nv = numVidRef.current
    if (nv) { nv.src = getNumShowVideo(r); nv.load() }

    return () => clearInterval(intervalRef.current)
  }, [])

  const startNum = useCallback(() => {
    if (numStarted.current) return
    numStarted.current = true
    clearInterval(intervalRef.current)
    const nv = numVidRef.current
    if (nv) { nv.currentTime = 0; nv.play().catch(() => {}) }
    setNumOpacity(1)
  }, [])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    clearInterval(intervalRef.current)
    setNumOpacity(0)

    // Compute label and call back
    const r = rollVal.current
    let rollLabel = '', rollColor = 'rgba(255,255,255,0.4)'
    if (r <= 5)       { rollLabel = 'переброс'; rollColor = 'var(--red)'   }
    else if (r <= 15) { rollLabel = 'замена';   rollColor = 'var(--gold)'  }
    else if (r === 20){ rollLabel = 'крит!';    rollColor = '#FFD700'      }
    else              { rollLabel = 'успех';    rollColor = 'var(--green)' }

    setTimeout(() => onResult(r, rollLabel, rollColor), 200)
  }, [onResult])

  const handleCanPlay = useCallback(() => {
    const vid = rollVidRef.current
    if (!vid) return
    vid.play().catch(() => {})

    const check = () => {
      if (numStarted.current || !vid.duration) return
      if (vid.duration - vid.currentTime <= NUM_TRIGGER) startNum()
    }
    if (typeof vid.requestVideoFrameCallback === 'function') {
      const loop = () => { check(); if (!numStarted.current) vid.requestVideoFrameCallback(loop) }
      vid.requestVideoFrameCallback(loop)
    } else {
      intervalRef.current = setInterval(() => {
        check()
        if (numStarted.current) clearInterval(intervalRef.current)
      }, 50)
    }
  }, [startNum])

  const handleTimeUpdate = useCallback(() => {
    const vid = rollVidRef.current
    if (!vid?.duration || numStarted.current) return
    if (vid.duration - vid.currentTime <= NUM_TRIGGER) startNum()
  }, [startNum])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'relative', width: 280, height: 280 }}>
        {/* Roll video */}
        <video ref={rollVidRef} muted playsInline
          style={{ width: 280, height: 280, objectFit: 'contain', display: 'block' }}
          onCanPlay={handleCanPlay}
          onTimeUpdate={handleTimeUpdate}
          onEnded={finish}
          onError={finish}
        />
        {/* Num crossfade video */}
        <video ref={numVidRef} muted playsInline
          style={{
            position: 'absolute', inset: 0, width: 280, height: 280,
            objectFit: 'contain', display: 'block',
            opacity: numOpacity, transition: `opacity ${CROSSFADE}ms ease`,
            pointerEvents: 'none',
          }}
          onError={() => {}}
        />
      </div>
      {roll && (
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontFamily: MONO, marginTop: 8 }}>
          Бросок: <span style={{ fontWeight: 900, color: '#fff' }}>{roll}</span>
        </div>
      )}
    </div>
  )
}

/* ── Debuff text renderer ─────────────────────────────────────────────────── */
function DebuffText({ text, debuffId }) {
  const def = DEBUFFS_CATALOG.find(d => d.id === debuffId)
  if (!def) return <>{text}</>
  // Debuffs that emit HTML (per-letter rotation, selective blur) use renderBubble
  if (def.renderBubble) {
    return <span className={def.cssClass || ''} dangerouslySetInnerHTML={{ __html: def.renderBubble(text) }} />
  }
  const transformed = def.apply ? def.apply(text) : text
  return <span className={def.cssClass || ''}>{transformed}</span>
}

/* ── Message bubble ──────────────────────────────────────────────────────── */
function Bubble({ msg, debuffId, iExplain, myBubble, oppBubble }) {
  if (msg.type === 'correct') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, margin: '8px 0' }}>
      <div style={{ background: '#00D26A', color: '#000', borderRadius: 99, padding: '5px 14px', fontSize: 13, fontWeight: 800, fontFamily: MONO }}>
        {msg.word} ✓✓
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>{msg.text}</div>
    </div>
  )
  if (msg.type === 'next') return (
    <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.22)', margin: '8px 0', fontFamily: MONO }}>
      — следующее слово —
    </div>
  )
  if (msg.type === 'sys') return (
    <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.28)', margin: '5px 0', fontFamily: MONO }}>
      {msg.text}
    </div>
  )

  const isMe  = msg.type === 'me'
  const applyDef = debuffId && !isMe && !iExplain

  // Picked text-bubble colors. Each cosmetic provides `bg` (color/gradient)
  // and `txt` (foreground colour). For the "wrong guess" red flash on my own
  // messages we still want the danger color, so we only apply the cosmetic
  // when msg.wrong is not set.
  const skin = isMe ? myBubble : oppBubble
  const bg   = isMe && msg.wrong
    ? 'rgba(180,20,20,0.5)'
    : (skin?.bg || (isMe ? '#1e1e2a' : '#2a2a2a'))
  const fg   = isMe && msg.wrong ? '#fff' : (skin?.txt || '#fff')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      <div style={{
        maxWidth: '78%',
        background: bg,
        color: fg,
        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '10px 14px', fontSize: 14, fontFamily: MONO,
      }}>
        {applyDef
          ? <DebuffText text={msg.text} debuffId={debuffId} />
          : msg.text
        }
      </div>
      {msg.roll != null && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, marginTop: 2, display: 'flex', gap: 4 }}>
          <span>🎲 {msg.roll}</span>
          {msg.rollLabel && <span style={{ color: msg.rollColor }}>{msg.rollLabel}</span>}
          {msg.critical && <span style={{ color: '#FFD700', fontWeight: 700 }}>крит! +10 душ</span>}
        </div>
      )}
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function GameScreen() {
  const { replace } = useNav()
  const user       = useUserStore(s => s.user)
  const updateUser = useUserStore(s => s.updateUser)
  const consumeItem = useUserStore(s => s.useItem)
  const cosm       = useCosmStore()
  const game       = useGameStore()

  const [words, setWords]             = useState([])
  const [messages, setMessages]       = useState([])
  const [inputVal, setInputVal]       = useState('')
  const [stamCost, setStamCost]       = useState(0)
  const [showDiceOverlay, setShowDice]= useState(false)
  const [pendingText, setPendingText] = useState(null)
  const [rerollPending, setReroll]    = useState(false)
  const [showTupnyak, setShowTupnyak] = useState(false)
  const [showExit, setShowExit]       = useState(false)
  const [showShop, setShowShop]       = useState(false)
  const [roundEnded, setRoundEnded]   = useState(false)
  const [lowStam, setLowStam]         = useState(false)
  const [timerDisplay, setTimerDisplay] = useState(60)
  const [timerColor, setTimerColor]     = useState('#00D26A')
  const [oppBubbleColor, setOppBubbleColor] = useState('bc_default')

  // Resolve bubble cosmetics. The player always sees their own picked bubble.
  // The opponent's bubble color arrives via match:start (set in applyState).
  const myBubble   = BUBBLE_COLORS.find(b => b.id === cosm.bubbleColor) || BUBBLE_COLORS[0]
  const oppBubble  = BUBBLE_COLORS.find(b => b.id === oppBubbleColor)   || BUBBLE_COLORS[0]

  const statsRef  = useRef({ mistakes: 0, wordsGuessed: 0, charsUsed: 0 })
  const chatRef   = useRef(null)
  const inputRef  = useRef(null)
  const timerRef  = useRef(null)
  const oppTO     = useRef(null)
  const timerOn   = useRef(false)
  const totalSecs = useRef(60)
  const roundEndedRef = useRef(false)
  const botRef    = useRef(null)   // bot guesser instance for the current round (when WE explain)
  const sockRef   = useRef(null)   // live socket for human matches

  // Human P2P match if we have a matchId and it's not a bot game.
  const isHuman = !game.isBot && !!game.matchId

  const cfg = ROUND_CONFIG[game.round - 1] || ROUND_CONFIG[0]
  const debuffId = game.debuff?.id || (typeof game.debuff === 'string' ? game.debuff : null)
  const debuffDef = debuffId ? DEBUFFS_CATALOG.find(d => d.id === debuffId) : null

  /* ── Load words ──
     Bot match: pick words locally. Human match: the server drives the word
     sequence, so we don't pick locally — we wait for socket events. */
  useEffect(() => { loadWords('ru').then(setWords) }, [])
  useEffect(() => {
    if (!words.length) return
    if (isHuman) beginRoundHuman()
    else beginRound(words)
  }, [words])

  const scrollChat = () => setTimeout(() => {
    if (chatRef.current) chatRef.current.scrollTop = 99999
  }, 50)

  const addMsg = useCallback((type, text, extra = {}) => {
    setMessages(m => [...m, { type, text, id: Date.now() + Math.random(), ...extra }])
    scrollChat()
  }, [])

  /* roll label helper */
  const rollMeta = (r) => {
    if (r <= 5)        return { label: 'провал',  color: '#ef4444' }
    if (r <= 15)       return { label: 'замена',  color: '#f59e0b' }
    if (r === 20)      return { label: 'крит!',   color: '#FFD700' }
    return { label: 'успех', color: '#00D26A' }
  }

  /* ── Begin round ── */
  const beginRound = (wordList) => {
    // Apply Прививка automatically on round 1 if the player owns one
    if (game.round === 1 && !game.vaccineUsed && (user?.inventory?.vaccine || 0) > 0 && game.debuff) {
      if (consumeItem('vaccine')) { game.setDebuff(null); game.markVaccineUsed?.(); toast('Прививка: дебафф 1-го раунда снят') }
    }

    // Pick a word. When WE explain, take from player word list; when the BOT
    // explains, take from the bot's scripted set so it can actually hint.
    let word
    if (game.iExplain) {
      word = pickWord(wordList, cfg.diff, game.usedWords)
    } else {
      word = pickBotWord(cfg.diff, game.usedWords)
    }
    if (word) { game.setWord(word); game.addUsedWord(word.w) }

    setMessages([])
    setRoundEnded(false)
    roundEndedRef.current = false
    totalSecs.current = 60
    deadlineRef.current = Date.now() + 60_000   // fresh wall-clock deadline
    timerOn.current = true
    statsRef.current = { mistakes: 0, wordsGuessed: 0, charsUsed: 0 }
    setTimerDisplay(60)
    setTimerColor('#00D26A')

    if (game.iExplain) {
      botRef.current = createBotGuesser(word)
      if (debuffDef) addMsg('sys', `дебафф ${debuffDef.name}: ${debuffDef.desc}`)
      addMsg('sys', 'Объясни слово не называя его. Стамина = символы.')
    } else {
      botRef.current = null
      addMsg('sys', `${game.oppName} начинает объяснять…`)
      oppTO.current = setTimeout(() => oppExplain(0), 1800)
    }
    startTimer()
  }

  // For human matches the server sends `roundDeadline` (epoch ms). Computing
  // remaining time from that timestamp keeps both clients showing exactly the
  // same countdown regardless of when they connected or how laggy each is.
  // For bot matches we use a local 60s counter (no peer to sync with).
  const deadlineRef = useRef(null)

  const startTimer = () => {
    // Both bot and human matches now use a real wall-clock deadline. The
    // interval fires 4×/sec just for smooth display updates; the actual
    // remaining time is computed from (deadline - Date.now()).
    if (!deadlineRef.current) deadlineRef.current = Date.now() + 60_000
    timerRef.current = setInterval(() => {
      const t = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      totalSecs.current = t
      setTimerDisplay(t)
      setTimerColor(t <= 10 ? '#ef4444' : t <= 30 ? '#f59e0b' : '#00D26A')
      if (t <= 10 && t > 0) hap.l()
      if (t <= 0) {
        clearInterval(timerRef.current)
        timerOn.current = false
        // Human match: server endRound runs from the deadline; don't double-emit.
        if (!isHuman) endRound()
      }
    }, 250)
  }

  const killTimers = () => {
    clearInterval(timerRef.current)
    clearTimeout(oppTO.current)
    timerOn.current = false
  }

  /* ── End round ── */
  const endRound = useCallback(() => {
    if (roundEndedRef.current) return
    roundEndedRef.current = true
    setRoundEnded(true)
    killTimers()
    hap.m()

    // commit round stats to the chat record AND the match totals
    game.addMyChars?.(statsRef.current.charsUsed)

    appendRound(game.chatId, {
      round: game.round,
      explainerId: game.iExplain ? 'me' : 'opp',
      wordsGuessed: statsRef.current.wordsGuessed,
      charsUsed: statsRef.current.charsUsed,
      mistakes: statsRef.current.mistakes,
      mySouls: game.myMatchSouls,
      oppSouls: game.oppMatchSouls,
    })

    game._setLastRoundSouls?.(game.myMatchSouls)

    // Human match: the SERVER owns round/role/word progression. Tell it the
    // round ended; it replies with round:next (or match:over) which we handle
    // in the socket effect. Don't transition locally.
    if (isHuman) {
      sockRef.current?.emit('round:end')
      return
    }

    if (game.round + 1 > 4) {
      setTimeout(() => replace(SCREENS.MATCH_OVER), 800)
    } else {
      game.advanceRound()   // flips role + assigns the next debuff once
      setTimeout(() => replace(SCREENS.ROUND_START), 800)
    }
  }, [game, isHuman])

  /* ── Human match: socket wiring ───────────────────────────────────────────
     Connects to the live match room and relays events with the real opponent.
     The server is authoritative for round/role/word. */
  const beginRoundHuman = () => {
    setMessages([])
    setRoundEnded(false)
    roundEndedRef.current = false
    totalSecs.current = 60
    timerOn.current = false   // timer starts when the server says match:start
    statsRef.current = { mistakes: 0, wordsGuessed: 0, charsUsed: 0 }
    setTimerDisplay(60)
    setTimerColor('#00D26A')
    botRef.current = null
    addMsg('sys', 'Соединение с соперником…')
  }

  useEffect(() => {
    if (!isHuman) return
    const sock = connectMatch(game.matchId, { bubbleColor: cosm.bubbleColor })
    sockRef.current = sock

    const applyState = (st) => {
      // Sync authoritative role/word/round/deadline from the server.
      game.setRoundRole?.(st.round, st.iExplain)
      if (st.iExplain && st.word) { game.setWord(st.word); }
      else game.setWord(null)
      deadlineRef.current = st.roundDeadline || (Date.now() + 60000)
      // Opponent's bubble color is broadcast in the player snapshot.
      if (st.opponent?.bubbleColor) setOppBubbleColor(st.opponent.bubbleColor)
      setMessages([])
      roundEndedRef.current = false
      const initialRemain = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      totalSecs.current = initialRemain
      setTimerDisplay(initialRemain)
      setTimerColor('#00D26A')
      timerOn.current = true
      startTimer()
      addMsg('sys', st.iExplain ? 'Объясните слово сопернику' : `${game.oppName} объясняет — угадывайте`)
    }

    sock.on('match:start', applyState)
    sock.on('round:next', (st) => { killTimers(); applyState(st) })
    sock.on('match:word',  ({ word }) => game.setWord(word))

    sock.on('msg:explain', ({ text, roll, rollLabel, rollColor, critical }) => {
      addMsg('opp', text, { roll, rollLabel, rollColor, critical, debuffCorrupt: true })
    })
    sock.on('msg:guess', ({ from, text, correct }) => {
      const mine = String(from) === String(user?.tgId)
      if (!mine) addMsg('opp', text, { wrong: !correct })
    })
    sock.on('msg:correct', ({ word, guesserId, scores }) => {
      const iGuessed = String(guesserId) === String(user?.tgId)
      addMsg('correct', iGuessed ? 'Вы угадали! +20 душ' : 'Соперник угадал! Вы +10 душ', { word })
      // sync scores from server (authoritative)
      const myId = String(user?.tgId)
      const oppId = Object.keys(scores).find(k => k !== myId)
      game.setMatchScores?.(scores[myId] || 0, scores[oppId] || 0)
      if (iGuessed) { statsRef.current.wordsGuessed++; updateUser({ words: (user.words||0)+1 }) }
      hap.ok()
    })
    sock.on('msg:skip', ({ from }) => {
      const mine = String(from) === String(user?.tgId)
      addMsg('sys', mine ? 'Вы пропустили слово' : 'Соперник пропустил слово')
    })
    sock.on('match:over', ({ scores }) => {
      const myId = String(user?.tgId)
      const oppId = Object.keys(scores).find(k => k !== myId)
      game.setMatchScores?.(scores[myId] || 0, scores[oppId] || 0)
      killTimers()
      setTimeout(() => replace(SCREENS.MATCH_OVER), 600)
    })
    sock.on('match:peer', ({ connected }) => {
      if (!connected) addMsg('sys', 'Соперник отключился…')
    })
    sock.on('match:error', () => {
      addMsg('sys', 'Ошибка матча. Возврат в меню.')
      setTimeout(() => { game.resetGame(); replace(SCREENS.HUB) }, 1500)
    })

    return () => { disconnectMatch(); sockRef.current = null }
  }, [isHuman])


  /* ── Bot EXPLAIN mode (bot explains → we guess) ──
     Walks the bot word's hint ladder. Each hint is shown with the bot's own
     dice roll (affects clarity), and corrupted by the active debuff. */
  const oppExplain = (idx) => {
    if (!timerOn.current) return
    const w = game.curWord
    const ladder = w?.hints || []
    const hint = ladder[Math.min(idx, ladder.length - 1)] || 'Думай…'
    const oppRoll = Math.floor(Math.random() * 20) + 1
    const { label, color } = rollMeta(oppRoll)

    // Дайс quality degrades the hint a bit on low rolls
    let shown = hint
    if (oppRoll <= 5) shown = hint.split(' ').map(x => Math.random() < 0.5 ? '▪▪▪' : x).join(' ')

    addMsg('opp', shown, { roll: oppRoll, rollLabel: label, rollColor: color, critical: oppRoll === 20, debuffCorrupt: true })
    if (oppRoll === 20) { game.addOppRoundSouls(10) }

    if (idx + 1 < ladder.length) {
      oppTO.current = setTimeout(() => oppExplain(idx + 1), 4500 + Math.random() * 1500)
    }
  }

  /* ── Input tracking ── */
  const onInput = (e) => {
    const v = e.target.value
    setInputVal(v)
    const raw  = v.replace(/\s/g, '').length
    const cost = game.iExplain ? Math.max(1, Math.round(raw * (game.stamCostMult || 1))) : Math.max(1, raw)
    setStamCost(cost)
    setLowStam(game.myStamina - cost < 15)
  }

  /* ── Send ── */
  const sendMsg = () => {
    const text = inputVal.trim()
    if (!text || !timerOn.current) return
    if (game.iExplain) sendExplain(text)
    else sendGuess(text)
    setInputVal('')
    setStamCost(0)
    setLowStam(false)
  }

  /* ── Explain ── */
  const sendExplain = (text) => {
    const chars = Math.max(1, Math.round(text.replace(/\s/g, '').length * (game.stamCostMult || 1)))
    if (game.myStamina < chars) { hap.err(); toast('Нет стамины!'); return }
    if (hasForbidden(text, game.curWord)) {
      hap.err(); setShowTupnyak(true); statsRef.current.mistakes++; game.incMyMistakes?.()
      setTimeout(() => setShowTupnyak(false), 2500)
      return
    }
    game.drainMatchStamina(chars)
    updateUser({ stamina: Math.max(0, user.stamina - chars) })
    statsRef.current.charsUsed += chars
    setPendingText(text)
    setReroll(false)
    setShowDice(true)
  }

  /* ── After dice video finishes (explain mode) ── */
  const onDiceResult = useCallback((roll, rollLabel, rollColor) => {
    setShowDice(false)
    const text = pendingText

    // 1-5 = fail. Auto re-roll once if the player owns/used a Переброс token,
    // otherwise the message goes through garbled.
    if (roll <= 5 && !rerollPending) {
      const hasToken = game.rerollToken || (game.round === 1 && !game.rerollUsed && (user?.inventory?.reroll || 0) > 0)
      if (hasToken) {
        if (game.rerollToken) game.setRerollToken(false)
        else { consumeItem('reroll'); game.markRerollUsed?.() }
        addMsg('sys', `Бросок ${roll} — провал! Переброс…`)
        setReroll(true)
        setTimeout(() => setShowDice(true), 300)
        return
      }
    }
    setReroll(false)

    let finalText = text
    let critical  = false
    if (roll === 1) {
      game.incMyOnes?.()   // counts toward "lucky_fail" achievement
    }
    if (roll <= 5) {
      const rep = ['нечто', 'штука', 'вещь', 'объект', '???']
      finalText = text.split(' ').map(w => Math.random() < 0.5 ? rep[Math.floor(Math.random()*rep.length)] : w).join(' ')
    } else if (roll <= 15) {
      const rep = ['нечто', 'штука', 'вещь', 'объект']
      finalText = text.split(' ').map(w => Math.random() < 0.3 ? rep[Math.floor(Math.random()*rep.length)] : w).join(' ')
    } else if (roll === 20) {
      critical = true
      game.addMyRoundSouls(10)
      // One updateUser so the achievement evaluator runs against the final state.
      updateUser({
        souls: user.souls + 10,
        achStats: { ...user.achStats, critRolls: (user.achStats?.critRolls || 0) + 1 },
      })
    }

    addMsg('me', finalText, { roll, rollLabel, rollColor, critical })

    // Human match: relay the rendered explanation to the real opponent.
    if (isHuman) {
      sockRef.current?.emit('msg:explain', { text: finalText, roll, rollLabel, rollColor, critical })
      return
    }

    // Bot match: bot guesses based on accumulated knowledge from THIS explanation
    if (botRef.current) {
      botRef.current.learn(text, roll)
      oppTO.current = setTimeout(() => {
        if (!timerOn.current) return
        if (botRef.current.shouldGuessCorrect() && game.curWord) {
          addMsg('opp', game.curWord.w + '?')
          setTimeout(() => {
            addMsg('correct', 'Соперник угадал! Вы +10 душ', { word: game.curWord.w })
            addMsg('next', '')
            game.addMyRoundSouls(10); game.addOppRoundSouls(20)
            game.incOppGuessed?.()
            game.resetOppMistakeStreak?.()   // streak is per-word
            updateUser({ souls: user.souls + (critical ? 10 : 0) + 10, words: (user.words||0)+1 })
            statsRef.current.wordsGuessed++
            hap.ok()
            // next word
            loadWords('ru').then(ws => {
              const next = pickWord(ws, cfg.diff, game.usedWords)
              if (next) { game.setWord(next); game.addUsedWord(next.w); botRef.current = createBotGuesser(next) }
            })
          }, 600)
        } else {
          addMsg('opp', botRef.current.nextWrongGuess())
          game.incOppMistakes?.()
        }
      }, 1100 + Math.random() * 700)
    }
  }, [pendingText, rerollPending, game, user, cfg, isHuman])

  /* ── Guess ── */
  const sendGuess = (text) => {
    const chars = Math.max(1, text.replace(/\s/g, '').length)
    game.drainMatchStamina(chars)
    updateUser({ stamina: Math.max(0, user.stamina - chars) })

    // Human match: the server validates the guess and broadcasts the result.
    if (isHuman) {
      sockRef.current?.emit('msg:guess', { text })
      return
    }

    addMsg('me', text, { wrong: !game.curWord })
    if (!game.curWord) return

    const correct = text.toUpperCase().replace(/Ё/g, 'Е')
      .includes(game.curWord.w.replace(/Ё/g, 'Е'))

    if (correct) {
      addMsg('correct', 'Вы угадали! +20 душ', { word: game.curWord.w })
      addMsg('next', '')
      hap.ok()
      game.addMyRoundSouls(20); game.addOppRoundSouls(10)
      game.incMyGuessed?.()
      game.resetOppMistakeStreak?.()   // word done — opp's mistake streak ends
      updateUser({ souls: user.souls + 20, words: (user.words||0)+1 })
      statsRef.current.wordsGuessed++
      // next bot word + restart its hint ladder
      const next = pickBotWord(cfg.diff, game.usedWords)
      if (next) {
        game.setWord(next); game.addUsedWord(next.w)
        addMsg('sys', `${game.oppName} объясняет новое слово…`)
        oppTO.current = setTimeout(() => oppExplain(0), 1500)
      }
    } else {
      statsRef.current.mistakes++
      game.incMyMistakes?.()
    }
  }

  const skipWord = () => {
    if (!timerOn.current) return
    game.drainMatchStamina(15)
    updateUser({ stamina: Math.max(0, user.stamina - 15) })
    game.resetOppMistakeStreak?.()   // word abandoned — streak doesn't carry over
    addMsg('sys', 'Слово пропущено (−15 стамины)')
    if (isHuman) { sockRef.current?.emit('msg:skip'); return }
    if (game.iExplain) {
      loadWords('ru').then(ws => {
        const next = pickWord(ws, cfg.diff, game.usedWords)
        if (next) { game.setWord(next); game.addUsedWord(next.w); botRef.current = createBotGuesser(next) }
      })
    } else {
      const next = pickBotWord(cfg.diff, game.usedWords)
      if (next) { game.setWord(next); game.addUsedWord(next.w); oppTO.current = setTimeout(() => oppExplain(0), 1200) }
    }
  }

  const exitMatch = () => {
    killTimers()
    updateUser({ souls: Math.max(0, user.souls - 5) })
    game.resetGame()
    replace(SCREENS.HUB)
  }

  useEffect(() => () => killTimers(), [])

  const stamPct   = Math.max(0, game.myStamina)
  const stamColor = stamPct < 25 ? '#ef4444' : stamPct < 50 ? '#f59e0b' : '#00D26A'

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px', flexShrink: 0 }}>
        <button onClick={() => setShowExit(true)} style={{
          background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 14, padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 6,
          color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: MONO, flexShrink: 0,
        }}>
          <span className="material-icons-round" style={{ fontSize: 14 }}>meeting_room</span>
          Выход
        </button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 6 }}>
          {['Объясняйте', 'Угадывайте'].map(label => {
            const active = label === (game.iExplain ? 'Объясняйте' : 'Угадывайте')
            return (
              <div key={label} style={{
                padding: '6px 14px', borderRadius: 18,
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: active ? '1px solid rgba(255,255,255,0.15)' : 'none',
                fontSize: 13, fontWeight: active ? 700 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.3)', fontFamily: MONO,
              }}>{label}</div>
            )
          })}
        </div>
        {/* Round pips */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {[1,2,3,4].map(r => (
            <div key={r} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: r < game.round ? '#00D26A' : r === game.round ? '#fff' : 'rgba(255,255,255,0.18)',
            }} />
          ))}
        </div>
      </div>

      {/* ── Live score strip ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '0 14px 6px', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>
          Вы <b style={{ color: '#c7a35b' }}>{game.myMatchSouls}</b>
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>•</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>
          {game.oppName} <b style={{ color: '#c7a35b' }}>{game.oppMatchSouls}</b>
        </span>
      </div>

      {/* ── Word card (explainer only) ── */}
      {game.iExplain && game.curWord && (
        <div style={{
          margin: '0 14px 8px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '10px 14px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: '#00D26A', fontFamily: MONO, fontWeight: 700 }}>
              Раунд {game.round}/4: {cfg.diff}
            </div>
            <button onClick={skipWord} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: MONO,
            }}>
              ⇄ SKIP <span style={{ color: '#c7a35b' }}>−15♥</span>
            </button>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: MONO }}>{game.curWord.w}</div>
          {game.curWord.desc && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2, fontFamily: MONO }}>{game.curWord.desc}</div>
          )}
        </div>
      )}

      {/* ── Timer ── */}
      <div style={{ textAlign: 'center', flexShrink: 0, marginBottom: 6 }}>
        <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, color: timerColor, fontFamily: MONO, transition: 'color .3s' }}>
          {timerDisplay}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>секунд</div>
      </div>

      {/* ── Debuff strip ── */}
      {debuffDef && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          margin: '0 14px 6px', background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '7px 12px', flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>дебафф</span>
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.05em', color: debuffDef.color, fontFamily: MONO }}>
            {debuffDef.name}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>
            {game.iExplain ? 'на ваших словах' : 'на словах соперника'}
          </span>
        </div>
      )}

      {/* ── Chat ── */}
      <div ref={chatRef} style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '4px 14px 8px', display: 'flex', flexDirection: 'column',
      }}>
        {messages.map(m => (
          <Bubble key={m.id} msg={m} debuffId={debuffId} iExplain={game.iExplain}
            myBubble={myBubble} oppBubble={oppBubble} />
        ))}
      </div>

      {/* ── Low stamina warning ── */}
      {lowStam && (
        <div style={{
          margin: '0 14px 6px', flexShrink: 0,
          background: 'rgba(180,80,0,0.2)', border: '1px solid rgba(255,140,0,0.3)',
          borderRadius: 12, padding: '7px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: '#f97316', fontFamily: MONO, fontWeight: 600 }}>Стамина заканчивается!</span>
          <button onClick={() => setShowShop(true)} style={{
            background: '#f97316', border: 'none', borderRadius: 10,
            padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer',
          }}>+ Пополнить</button>
        </div>
      )}

      {/* ── Stamina bar ── */}
      <div style={{ padding: '4px 14px 4px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: MONO }}>Stamina</div>
        <div style={{ flex: 1, height: 28, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, width: stamPct + '%', background: stamColor, borderRadius: 14, transition: 'width .3s, background .3s' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000', fontFamily: MONO, zIndex: 2 }}>
            ♣ {String(Math.round(stamPct)).padStart(2,'0')}/100
          </div>
        </div>
        <button onClick={() => setShowShop(true)} style={{
          width: 32, height: 32, borderRadius: '50%', background: '#00D26A', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          <span className="material-icons-round" style={{ fontSize: 18, color: '#000' }}>add</span>
        </button>
      </div>

      {/* ── Input row ── */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 12px calc(16px + env(safe-area-inset-bottom,0px))', flexShrink: 0, alignItems: 'center' }}>
        <button onClick={() => setShowShop(true)} style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <span className="material-icons-round" style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)' }}>shopping_cart</span>
        </button>
        <input
          ref={inputRef}
          value={inputVal}
          onChange={onInput}
          onKeyDown={e => e.key === 'Enter' && sendMsg()}
          placeholder={game.iExplain ? 'Объясните слово…' : 'Ваш вариант…'}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 22, padding: '11px 16px', fontSize: 14, fontFamily: MONO, color: '#fff',
            outline: 'none', WebkitAppearance: 'none',
          }}
        />
        <button onClick={sendMsg} style={{
          height: 44, borderRadius: 22, flexShrink: 0,
          background: inputVal.trim() ? (game.iExplain ? '#3b82f6' : '#00D26A') : 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          cursor: 'pointer', padding: '0 16px', fontSize: 13, fontWeight: 700,
          color: game.iExplain ? '#fff' : '#000', fontFamily: MONO, transition: 'background .15s',
        }}>
          {game.iExplain
            ? <><span>Бросок</span>{stamCost > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>−{stamCost}</span>}<span className="material-icons-round" style={{ fontSize: 16 }}>casino</span></>
            : <><span>Ответ</span><span className="material-icons-round" style={{ fontSize: 16 }}>send</span></>}
        </button>
      </div>

      {/* ── Dice video overlay ── */}
      {showDiceOverlay && (
        <DiceVideoOverlay diceType={cosm?.dice || 'duster'} onResult={onDiceResult} />
      )}

      {/* ── Tupnyak ── */}
      {showTupnyak && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 290 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid rgba(255,69,96,.35)', borderRadius: 16, padding: '24px 28px', textAlign: 'center', maxWidth: 280 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚫</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Тупняк!</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>Нельзя называть слово или однокоренные. Попробуй иначе!</div>
          </div>
        </div>
      )}

      {/* ── Exit modal ── */}
      {showExit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '20px 18px 40px' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 10 }}>Выйти из матча?</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6, textAlign: 'center' }}>
              Штраф: <span style={{ color: '#ef4444', fontWeight: 700 }}>−5 душ</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, height: 50, borderRadius: 20, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={() => setShowExit(false)}>Остаться</button>
              <button style={{ flex: 1, height: 50, borderRadius: 20, background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.4)', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={exitMatch}>Выйти</button>
            </div>
          </div>
        </div>
      )}

      {/* ── In-chat shop ── */}
      {showShop && (
        <InChatShop user={user} game={game} updateUser={updateUser} onClose={() => setShowShop(false)} />
      )}
    </div>
  )
}
