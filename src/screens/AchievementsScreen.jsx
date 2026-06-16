import { inviteFriend } from '../utils/invite'
import { useState } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useUserStore } from '../store'
import { ACHIEVEMENTS } from '../constants'
import { getAchievementImg } from '../assets'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'
import { saveVitrine } from '../utils/storage'
import { TopNav } from '../components/TopNav'

/* ─── helpers ────────────────────────────────────────────────────────────── */
function getCumulTier(ach, achStats) {
  const val = achStats?.[ach.stat] || 0
  let tier = 0
  for (let i = 0; i < (ach.tiers || []).length; i++) {
    if (val >= ach.tiers[i]) tier = i + 1
  }
  return tier
}

function isUnlocked(ach, user) {
  if (ach.cat === 'cumul') return getCumulTier(ach, user.achStats) > 0
  return (user.achUnlocked || []).includes(ach.id)
}

/* ─── Achievement image with emoji fallback ──────────────────────────────── */
function AchImg({ ach, size = '95%', grayscale = false }) {
  const [failed, setFailed] = useState(false)
  const filter = grayscale ? 'grayscale(1) brightness(0.2)' : 'none'
  if (failed) return <span style={{ fontSize: 26, filter, lineHeight: 1 }}>{ach.icon}</span>
  return (
    <img
      src={getAchievementImg(ach.id)}
      alt={ach.name}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', filter }}
    />
  )
}

/* ─── Single achievement card ────────────────────────────────────────────── */
function AchCard({ ach, unlocked, inVitrine, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '1',
        borderRadius: 20,
        background: unlocked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
        border: inVitrine
          ? '1.5px solid rgba(199,163,91,0.55)'
          : unlocked
            ? '1px solid rgba(255,255,255,0.09)'
            : '1px solid rgba(255,255,255,0.035)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', position: 'relative',
        boxShadow: inVitrine ? '0 0 10px rgba(199,163,91,0.18)' : 'none',
      }}
    >
      <AchImg ach={ach} grayscale={!unlocked} />
      {inVitrine && (
        <div style={{
          position: 'absolute', top: 5, right: 5,
          width: 7, height: 7, borderRadius: '50%',
          background: '#c7a35b', border: '1.5px solid #0a0a0a',
        }} />
      )}
    </div>
  )
}

/* ─── Detail bottom sheet ────────────────────────────────────────────────── */
function AchDetail({ ach, unlocked, inVitrine, onClose, onToggleVitrine }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 2, background: '#111',
          borderRadius: '28px 28px 0 0', padding: '24px 24px 48px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}
      >
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: unlocked ? '#c7a35b' : 'rgba(255,255,255,0.3)' }}>
            {unlocked ? 'Получено' : 'В процессе'}
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
          }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Bookmark badge */}
        {/* <div style={{ width: 100, height: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}> */}
          {/* <svg viewBox="0 0 100 120" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
            <path
              d="M10,0 L90,0 Q100,0 100,10 L100,120 L50,90 L0,120 L0,10 Q0,0 10,0Z"
              fill={unlocked ? 'rgba(199,163,91,0.13)' : 'rgba(255,255,255,0.05)'}
              stroke={unlocked ? 'rgba(199,163,91,0.28)' : 'rgba(255,255,255,0.07)'}
              strokeWidth="1"
            />
          </svg> */}
          <div style={{ position: 'relative', zIndex: 1, marginTop: 8 }}>
            <AchImg ach={ach} grayscale={!unlocked} size="95%" />
          </div>
        {/* </div> */}

        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em' }}>
          {ach.name}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.55, marginBottom: 16 }}>
          {ach.desc || (ach.tiers ? `Уровни: ${ach.tiers.join(' / ')}` : '')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 24 }}>
          Есть у 1,8% игроков
        </div>

        {unlocked && (
          <button onClick={onToggleVitrine} style={{
            width: '100%', padding: '14px', borderRadius: 18,
            background: inVitrine ? 'rgba(199,163,91,0.13)' : 'rgba(255,255,255,0.07)',
            border: `1.5px solid ${inVitrine ? 'rgba(199,163,91,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: inVitrine ? '#c7a35b' : '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>
              {inVitrine ? 'bookmark_remove' : 'bookmark_add'}
            </span>
            {inVitrine ? 'Убрать из витрины' : 'Добавить в витрину'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Pick overlay ───────────────────────────────────────────────────────── */
function PickOverlay({ user, vitrine, onPick, onClose }) {
  const unlocked = ACHIEVEMENTS.filter(a => isUnlocked(a, user))
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative', zIndex: 2, background: '#111',
          borderRadius: '28px 28px 0 0',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          padding: '24px 24px 0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
          }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: 8 }}>
          Выберете достижение<br />себе на витрину!
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
          Вы можете вставить в ячейку любую из<br />ниже доступных вам достижений
        </div>
        {/* scrollable grid inside the sheet */}
        <div style={{
          overflowY: 'auto', flex: 1,
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
          paddingBottom: 48,
        }}>
          {unlocked.map(ach => (
            <div
              key={ach.id}
              onClick={() => onPick(ach.id)}
              style={{
                aspectRatio: '1', borderRadius: 18,
                background: vitrine.includes(ach.id) ? 'rgba(199,163,91,0.1)' : 'rgba(255,255,255,0.06)',
                border: vitrine.includes(ach.id) ? '1.5px solid rgba(199,163,91,0.45)' : '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <AchImg ach={ach} size="95%" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main screen ────────────────────────────────────────────────────────── */
export function AchievementsScreen() {
  const { back } = useNav()
  const { go } = useNav()
  const user = useUserStore(s => s.user)
  const updateUser = useUserStore(s => s.updateUser)

  const [vitrine, setVitrine] = useState(() => user?.vitrine || [])
  const [detail, setDetail] = useState(null)
  const [pickSlot, setPickSlot] = useState(null)

  if (!user) return null

  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a, user)).length

  const applyVitrine = (next) => {
    setVitrine(next)
    saveVitrine(next)
    updateUser({ vitrine: next })
  }

  const toggleVitrine = (achId) => {
    const idx = vitrine.indexOf(achId)
    let next
    if (idx >= 0) {
      next = vitrine.filter(v => v !== achId)
      toast('Убрано из витрины')
    } else {
      next = vitrine.length >= 6 ? [...vitrine.slice(1), achId] : [...vitrine, achId]
      toast('Добавлено в витрину!')
    }
    applyVitrine(next)
    hap.ok()
  }

  const handleSlotClick = (i) => {
    const achId = vitrine[i]
    if (achId) {
      const ach = ACHIEVEMENTS.find(a => a.id === achId)
      if (ach) setDetail(ach)
    } else {
      setPickSlot(i)
    }
  }

  const handlePick = (achId) => {
    if (pickSlot !== null) {
      const next = [...vitrine]
      // remove the id if it's already somewhere else
      const existingIdx = next.indexOf(achId)
      if (existingIdx >= 0) next.splice(existingIdx, 1)
      next[pickSlot] = achId
      applyVitrine(next.slice(0, 6))
    }
    setPickSlot(null)
    hap.ok()
    toast('Добавлено в витрину!')
  }

  return (
    /* Single scroll container — outer holds all overflow directly so it works
       in every webview (some older Telegram webviews don't honor nested
       flex:1 + overflow well). */
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0a0a0a',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      <TopNav onBack={back} onRight={() => inviteFriend()} rightIcon="person_add" />

      <div style={{
        padding: '72px 20px calc(96px + env(safe-area-inset-bottom, 16px))',
      }}>

        {/* Title + counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900 }}>Мои Достижения</div>
          <div style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '4px 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)',
          }}>
            <span style={{ fontWeight: 800, color: '#fff' }}>{unlockedCount}</span>/{ACHIEVEMENTS.length}
          </div>
        </div>

        {/* Vitrine label */}
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Витрина:</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginBottom: 14, lineHeight: 1.5 }}>
          Выберите до 6 штук для отображения в профиле (вокруг аватара)
        </div>

        {/* Vitrine 6-slot grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const achId = vitrine[i]
            const ach = achId ? ACHIEVEMENTS.find(a => a.id === achId) : null
            return (
              <div
                key={i}
                onClick={() => handleSlotClick(i)}
                style={{
                  aspectRatio: '1', borderRadius: 20, cursor: 'pointer',
                  background: ach ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: ach
                    ? '1px solid rgba(199,163,91,0.35)'
                    : '1.5px dashed rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {ach
                  ? <AchImg ach={ach} size="95%" />
                  : <span className="material-icons-round" style={{ fontSize: 22, color: 'rgba(255,255,255,0.15)' }}>add</span>
                }
              </div>
            )
          })}
        </div>

        {/* "All" label */}
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Все:</div>

        {/* Achievements grid — scrolls with the page, no nested overflow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {ACHIEVEMENTS.map(ach => (
            <AchCard
              key={ach.id}
              ach={ach}
              unlocked={isUnlocked(ach, user)}
              inVitrine={vitrine.includes(ach.id)}
              onClick={() => setDetail(ach)}
            />
          ))}
        </div>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      {detail && (
        <AchDetail
          ach={detail}
          unlocked={isUnlocked(detail, user)}
          inVitrine={vitrine.includes(detail.id)}
          onClose={() => setDetail(null)}
          onToggleVitrine={() => { toggleVitrine(detail.id); setDetail(null) }}
        />
      )}

      {pickSlot !== null && (
        <PickOverlay
          user={user}
          vitrine={vitrine}
          onPick={handlePick}
          onClose={() => setPickSlot(null)}
        />
      )}
    </div>
  )
}