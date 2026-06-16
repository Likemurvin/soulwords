// OnboardingScreen.jsx
// 5 slides shown once on first launch.
//   • Slide 1: full-bleed background image (onb_scr_1.png) with a centered
//     title overlay and a single CTA button at the bottom.
//   • Slides 2-5: shared composition — sw_logo at top, a step dot row,
//     big title, a per-slide illustration (onb_scr_N.png), a small grey
//     description, and a primary "Next" button.
import { useState } from 'react'
import { useUserStore } from '../store'
import { useNav, SCREENS } from '../components/Nav'
import { UI } from '../assets'

const MONO = "'Roboto Mono', monospace"
const GOLD = '#c7a35b'

const SLIDES = [
  {
    bg: UI.onboardSlide1,                        // full-bleed background
    title: 'Первый соулс-чат!',
    cta: 'Начнём',
  },
  {
    image: UI.onboardSlide2,
    title: 'Объясняй и угадывай слова',
    body:  'Все просто! Игрок получает слово и пытается его объяснить, другой должен его угадать, всего 4 раунда',
    cta:   'Дальше',
  },
  {
    image: UI.onboardSlide3,
    title: 'Щепотка случайности',
    body:  'Мы добавили в угадывание слов разные дебаффы и кубик, чтобы каждый матч был уникален, но это на сладкое…',
    cta:   'Дальше',
  },
  {
    image: UI.onboardSlide4,
    title: 'Души',
    body:  'Запомните этот значок. Души ваша валюта, поверьте, она вам пригодится всегда!',
    cta:   'Дальше',
  },
  {
    image: UI.onboardSlide5,
    title: 'Аккуратнее',
    body:  'Но не торопитесь и не забывайте восстанавливать выносливость! Она определяет количество символов, которые вы можете использовать в игре',
    cta:   'Поехали!',
  },
]

function StepDots({ count, active }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: i === active ? 24 : 8, height: 8, borderRadius: 4,
          background: i === active ? GOLD : 'rgba(255,255,255,0.18)',
          transition: 'width .25s, background .25s',
        }} />
      ))}
    </div>
  )
}

export function OnboardingScreen() {
  const { replace } = useNav()
  const completeOnboarding = useUserStore((s) => s.completeOnboarding)
  const [idx, setIdx]   = useState(0)
  const [exiting, setExiting] = useState(false)

  const slide  = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  const finish = () => { completeOnboarding?.(); replace(SCREENS.HUB) }
  const goNext = () => {
    if (isLast) return finish()
    setExiting(true)
    setTimeout(() => { setIdx(i => i + 1); setExiting(false) }, 180)
  }

  // ── Slide 1: full-bleed background variant ──
  if (idx === 0) {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: '#0a0a0a',
        backgroundImage: `url(${slide.bg})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '0 24px calc(40px + env(safe-area-inset-bottom, 16px))',
      }}>
        {/* Dim overlay for legibility */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)' }} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            fontSize: 36, fontWeight: 900, color: '#fff', textAlign: 'center',
            fontFamily: MONO, textShadow: '0 4px 24px rgba(0,0,0,0.6)',
            letterSpacing: '0.02em', lineHeight: 1.15, padding: '0 8px',
          }}>{slide.title}</div>
        </div>

        <button onClick={goNext} style={{
          position: 'relative', width: '100%', height: 56, borderRadius: 28,
          background: GOLD, border: 'none', color: '#000',
          fontSize: 16, fontWeight: 900, cursor: 'pointer', fontFamily: MONO,
          letterSpacing: '0.04em',
        }}>{slide.cta}</button>
      </div>
    )
  }

  // ── Slides 2-5: standard composition ──
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      padding: 'calc(48px + env(safe-area-inset-top,0px)) 24px calc(28px + env(safe-area-inset-bottom,16px))',
    }}>
      {/* Top: logo + step dots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <img src={UI.logoMark} alt="SoulWords"
          onError={(e) => { e.target.style.display = 'none' }}
          style={{ height: 32, objectFit: 'contain' }} />
        <StepDots count={SLIDES.length} active={idx} />
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 18, padding: '20px 0',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateY(12px)' : 'translateY(0)',
        transition: 'opacity .18s, transform .18s',
      }}>
        <div style={{
          fontSize: 26, fontWeight: 900, color: '#fff', textAlign: 'center',
          fontFamily: MONO, lineHeight: 1.2, letterSpacing: '0.01em', padding: '0 4px',
        }}>{slide.title}</div>

        <img src={slide.image} alt=""
          onError={(e) => { e.target.style.display = 'none' }}
          style={{
            maxWidth: '100%', maxHeight: '40vh', objectFit: 'contain',
            margin: '4px 0',
          }} />

        <div style={{
          fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center',
          fontFamily: MONO, lineHeight: 1.55, padding: '0 12px',
        }}>{slide.body}</div>
      </div>

      <button onClick={goNext} style={{
        width: '100%', height: 56, borderRadius: 28, background: GOLD,
        border: 'none', color: '#000', fontSize: 16, fontWeight: 900,
        cursor: 'pointer', fontFamily: MONO, letterSpacing: '0.04em',
      }}>{slide.cta}</button>
    </div>
  )
}
