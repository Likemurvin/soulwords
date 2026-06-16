import { useEffect, useRef, useState, useCallback } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useGameStore } from '../store/gameStore'
import { useUserStore } from '../store'
import { useCosmStore } from '../store'
import { getDiceRollVideo, getDicePreview, getNumShowVideo } from '../assets'
import { connectMatch, getMatchSocket } from '../utils/matchSocket'
import { hap } from '../utils/haptic'

// How many seconds before the END of roll.webm to crossfade in the num video.
const NUM_SHOW_TRIGGER_SEC = 3
const CROSSFADE_MS = 333

const STATE = {
  IDLE:    'idle',
  ROLLING: 'rolling',
  RESULT:  'result',
}

export function DiceRollScreen() {
  const { replace, go } = useNav()
  const user     = useUserStore(s => s.user)
  const game     = useGameStore()
  const diceType = useCosmStore(s => s.dice)

  const isHuman = !game.isBot && !!game.matchId

  const [phase, setPhase]                   = useState(STATE.IDLE)
  const [countdown, setCountdown]           = useState(10)
  const [myRoll, setMyRoll]                 = useState(null)
  const [oppRoll, setOppRoll]               = useState(null)
  const [numShowOpacity, setNumShowOpacity] = useState(0)

  const rollVideoRef      = useRef(null)
  const numVideoRef       = useRef(null)
  const countdownRef      = useRef(null)
  const triggerIntervalRef = useRef(null)
  const rollsRef          = useRef({ my: null, opp: null })
  const iExplainFirstRef  = useRef(null)   // server's authoritative role assignment (human)
  const sockReadyRef      = useRef(false)
  const finishedRef       = useRef(false)
  const numStartedRef     = useRef(false)
  const phaseRef          = useRef(STATE.IDLE)
  const throwDiceRef      = useRef(null)

  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── finishRoll ────────────────────────────────────────────────────────────
  const finishRoll = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearInterval(triggerIntervalRef.current)
    const { my, opp } = rollsRef.current
    hap.ok()
    // Persist BOTH rolls so the result screen shows the same numbers it animated
    game.setRolls(my, opp)
    setMyRoll(my)
    setOppRoll(opp)
    setNumShowOpacity(0)
    setPhase(STATE.RESULT)
  }, [game])

  // ── countdown to auto-throw ───────────────────────────────────────────────
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownRef.current)
          throwDiceRef.current?.()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current)
  }, [])

  // ── load roll video when phase → ROLLING ─────────────────────────────────
  useEffect(() => {
    if (phase !== STATE.ROLLING) return
    finishedRef.current   = false
    numStartedRef.current = false
    const vid = rollVideoRef.current
    if (!vid) return
    vid.src = getDiceRollVideo(diceType)
    vid.load()
  }, [phase, diceType])

  // ── preload num video when roll is determined ─────────────────────────────
  useEffect(() => {
    if (phase !== STATE.ROLLING || myRoll === null) return
    const numVid = numVideoRef.current
    if (!numVid) return
    numVid.src = getNumShowVideo(myRoll)
    numVid.load()
  }, [phase, myRoll])

  useEffect(() => () => clearInterval(triggerIntervalRef.current), [])

  // ── Human match: connect socket, listen for server-rolled dice ────────────
  // The server is the single source of truth; both players see identical rolls.
  useEffect(() => {
    if (!isHuman) return
    const sock = getMatchSocket() || connectMatch(game.matchId)
    const onResult = ({ my, opp, iExplainFirst }) => {
      rollsRef.current = { my, opp }
      iExplainFirstRef.current = iExplainFirst
      sockReadyRef.current = true
      // If we already finished the local animation, push the real numbers now.
      if (phaseRef.current === STATE.RESULT) { setMyRoll(my); setOppRoll(opp) }
    }
    sock.on('dice:result', onResult)
    // The socket connect handshake is async; request once we're in.
    if (sock.connected) sock.emit('dice:request')
    else sock.once('connect', () => sock.emit('dice:request'))
    return () => { sock.off('dice:result', onResult) }
  }, [isHuman, game.matchId])

  // ── start num crossfade ───────────────────────────────────────────────────
  const startNumShow = useCallback(() => {
    if (numStartedRef.current) return
    numStartedRef.current = true
    clearInterval(triggerIntervalRef.current)
    const numVid = numVideoRef.current
    if (numVid) {
      numVid.currentTime = 0
      numVid.play().catch(() => {})
    }
    setNumShowOpacity(1)
  }, [])

  const handleCanPlay = useCallback(() => {
    if (phaseRef.current !== STATE.ROLLING) return
    const vid = rollVideoRef.current
    if (!vid) return
    vid.play().catch(() => {})

    const checkTrigger = () => {
      if (numStartedRef.current || !vid.duration) return
      if (vid.duration - vid.currentTime <= NUM_SHOW_TRIGGER_SEC) startNumShow()
    }

    if (typeof vid.requestVideoFrameCallback === 'function') {
      const loop = () => {
        checkTrigger()
        if (!numStartedRef.current) vid.requestVideoFrameCallback(loop)
      }
      vid.requestVideoFrameCallback(loop)
    } else {
      triggerIntervalRef.current = setInterval(() => {
        checkTrigger()
        if (numStartedRef.current) clearInterval(triggerIntervalRef.current)
      }, 50)
    }
  }, [startNumShow])

  const handleTimeUpdate = useCallback(() => {
    if (numStartedRef.current) return
    const vid = rollVideoRef.current
    if (!vid?.duration) return
    if (vid.duration - vid.currentTime <= NUM_SHOW_TRIGGER_SEC) startNumShow()
  }, [startNumShow])

  const handleRollEnded = useCallback(() => finishRoll(), [finishRoll])

  // ── throw dice ────────────────────────────────────────────────────────────
  const throwDice = useCallback(() => {
    if (phaseRef.current !== STATE.IDLE) return
    clearInterval(countdownRef.current)
    hap.m()

    if (isHuman) {
      // Server is authoritative. If results haven't arrived yet, wait — the
      // socket effect will populate rollsRef when dice:result lands. The
      // rolling animation runs unchanged; finishRoll reads rollsRef at the end.
      if (!sockReadyRef.current) {
        const sock = getMatchSocket()
        sock?.emit('dice:request')
      }
    } else {
      let my  = Math.floor(Math.random() * 20) + 1
      let opp = Math.floor(Math.random() * 20) + 1
      while (my === opp) opp = Math.floor(Math.random() * 20) + 1
      rollsRef.current = { my, opp }
    }
    setMyRoll(rollsRef.current.my)
    setOppRoll(rollsRef.current.opp)
    setPhase(STATE.ROLLING)
  }, [isHuman])

  useEffect(() => { throwDiceRef.current = throwDice }, [throwDice])

  // ── proceed to match after result ─────────────────────────────────────────
  const proceed = () => {
    // Human: trust the server's role assignment. Bot/offline: compare locally.
    const iExplainFirst = isHuman
      ? !!iExplainFirstRef.current
      : (myRoll !== null && oppRoll !== null && myRoll > oppRoll)
    game.initMatch(game.opponent, iExplainFirst, user?.stamina ?? 100)
    replace(SCREENS.ROUND_START)
  }

  const ini      = user?.name?.[0]?.toUpperCase() || '?'
  const oppName  = game.opponent?.name || 'Соперник'
  const iExplain = myRoll !== null && oppRoll !== null && myRoll > oppRoll

  return (
    <div className="screen" style={{
      background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', gap: 0,
      padding: '32px 24px calc(40px + env(safe-area-inset-bottom,0px))',
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
    }}>

      {/* Player chips */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 20,
        marginBottom: 32, width: '100%', justifyContent: 'center',
      }}>
        <PlayerChip
          label={user?.name?.split(' ')[0] || 'Ты'}
          ini={ini}
          score={phase === STATE.RESULT ? myRoll : null}
          isMe
        />
        <div style={{ fontSize: 18, color: 'var(--txt3)', fontWeight: 900 }}>VS</div>
        <PlayerChip
          label={oppName}
          ini={oppName[0]}
          score={phase === STATE.RESULT ? oppRoll : null}
        />
      </div>

      {/* Dice area */}
      <div
        onClick={phase === STATE.IDLE ? throwDice : undefined}
        style={{
          position: 'relative',
          cursor: phase === STATE.IDLE ? 'pointer' : 'default',
          marginBottom: 24, width: 'min(78vw, 320px)', height: 'min(78vw, 320px)',
        }}
      >
        {/* Pulse ring on idle */}
        {phase === STATE.IDLE && (
          <div style={{
            position: 'absolute', inset: -12, borderRadius: '50%',
            border: '2px solid rgba(124,58,237,.3)',
            animation: 'pulse-ring 1.8s ease-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* Idle — looping preview */}
        {phase === STATE.IDLE && (
          <video
            src={getDicePreview(diceType)}
            autoPlay muted loop playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
        )}

        {/* Rolling — roll video + num crossfade */}
        {phase === STATE.ROLLING && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <video
              ref={rollVideoRef}
              muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              onCanPlay={handleCanPlay}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleRollEnded}
              onError={() => finishRoll()}
            />
            {/* Number crossfade during the last second of the roll —
                a text overlay instead of the per-number .webm. */}
            {myRoll !== null && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: numShowOpacity,
                transition: `opacity ${CROSSFADE_MS}ms ease`,
                pointerEvents: 'none',
              }}>
                <DiceNumberText value={myRoll} animate={false} />
              </div>
            )}
          </div>
        )}

        {/* Result — big number that scales down to its resting position. */}
        {phase === STATE.RESULT && (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DiceNumberText value={myRoll} animate />
          </div>
        )}
      </div>

      {/* Bottom text / CTA */}
      {phase === STATE.IDLE && (
        <>
          <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 600, marginBottom: 8 }}>
            Кто объясняет первым?
          </div>
          <div style={{
            fontFamily: "'Roboto Mono',monospace",
            fontSize: countdown <= 3 ? 28 : 22, fontWeight: 900,
            color: countdown <= 3 ? 'var(--red)' : 'var(--txt)',
            transition: 'color .2s',
          }}>
            {countdown}
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 8 }}>
            Нажми на кубик
          </div>
        </>
      )}

      {phase === STATE.ROLLING && (
        <div style={{ fontSize: 14, color: 'var(--txt2)', fontWeight: 600 }}>
          Бросаем...
        </div>
      )}

      {phase === STATE.RESULT && (
        <>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, marginBottom: 6,
              color: iExplain ? 'var(--green)' : 'var(--red)',
            }}>
              {iExplain ? 'Объясняешь первым!' : 'Угадываешь!'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt2)' }}>
              Ты: {myRoll} · {oppName}: {oppRoll}
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>
              {iExplain ? 'Первый ход за тобой' : 'Слушай внимательно'}
            </div>
          </div>
          <button className="btn btn-p" style={{ width: 220 }} onClick={proceed}>
            Начать матч
          </button>
        </>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: .6; }
          100% { transform: scale(1.6); opacity: 0;  }
        }
      `}</style>
    </div>
  )
}

function PlayerChip({ label, ini, score, isMe }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: isMe
          ? 'linear-gradient(145deg,#1a1035,#3b1d8a,#6D28D9)'
          : 'var(--bg2)',
        border: `2px solid ${isMe ? 'rgba(124,58,237,.4)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Roboto Mono',monospace", fontSize: 20, fontWeight: 900, color: '#fff',
      }}>
        {score !== null ? score : ini}
      </div>
      <div style={{ fontSize: 11, color: 'var(--txt2)', fontWeight: 600 }}>{label}</div>
    </div>
  )
}
/* ─── DiceNumberText ─────────────────────────────────────────────────────────
   Animated number replacing the per-result .webm. Spec:
     • Crossfade variant (animate=false): just shows the number, opacity is
       controlled by the parent during the roll's last second.
     • Result variant (animate=true): starts huge near full viewport, scales
       down to the resting size in the center over ~0.6s.
   Uses keyframes injected once on mount so we don't need a CSS file. */
function DiceNumberText({ value, animate }) {
  // Inject the keyframes lazily so every consumer benefits.
  if (typeof document !== 'undefined' && !document.getElementById('dice-num-kf')) {
    const s = document.createElement('style'); s.id = 'dice-num-kf'
    s.textContent = `
      @keyframes diceNumLand {
        0%   { transform: scale(2.6); opacity: 0; }
        18%  { opacity: 1; }
        100% { transform: scale(1);   opacity: 1; }
      }`
    document.head.appendChild(s)
  }
  const color = value === 20 ? '#22c55e' : value === 1 ? '#ef4444' : '#fff'
  return (
    <div style={{
      fontFamily: "'Roboto Mono', monospace",
      fontWeight: 900,
      fontSize: 'min(48vw, 220px)',
      color,
      textShadow: value === 20
        ? '0 0 28px rgba(34,197,94,0.55), 0 4px 12px rgba(0,0,0,0.5)'
        : value === 1
          ? '0 0 28px rgba(239,68,68,0.55), 0 4px 12px rgba(0,0,0,0.5)'
          : '0 4px 18px rgba(0,0,0,0.5)',
      lineHeight: 1,
      letterSpacing: '-0.04em',
      animation: animate ? 'diceNumLand 600ms cubic-bezier(0.2,0.8,0.2,1) both' : undefined,
      willChange: 'transform, opacity',
    }}>
      {value}
    </div>
  )
}
