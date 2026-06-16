// TopicPickScreen.jsx
import { useState } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useUserStore } from '../store'
import { useGameStore } from '../store/gameStore'
import { TopNav } from '../components/TopNav'

/* ─── Theme catalog ──────────────────────────────────────────────────────── */
export const THEMES = [
  {
    id: 'all',
    name: 'Все темы',
    img: '/assets/themes/all.png',
    desc: 'Категория, где есть все слова со сложностью легко, которые могут попасться в этой игре',
    diff: 'easy', diffLabel: 'легко', diffColor: '#00D26A',
    souls: 50, daily: true,
  },
  {
    id: 'science',
    name: 'Наука',
    img: '/assets/themes/science.png',
    desc: 'Физика, биология, химия и всё остальное',
    diff: 'medium', diffLabel: 'средне', diffColor: '#FFB800',
    souls: 70, daily: false,
  },
  {
    id: 'esoterics',
    name: 'Эзотерика',
    img: '/assets/themes/esoterics.png',
    desc: 'Мистика, символы, тайные учения',
    diff: 'easy', diffLabel: 'легко', diffColor: '#00D26A',
    souls: 50, daily: true,
  },
  {
    id: 'books',
    name: 'Книги',
    img: '/assets/themes/books.png',
    desc: 'Литература, авторы, сюжеты',
    diff: 'hard', diffLabel: 'сложно', diffColor: '#FF4560',
    souls: 100, daily: false,
  },
  {
    id: 'games',
    name: 'Игры',
    img: '/assets/themes/games.png',
    desc: 'Видеоигры, настолки, механики',
    diff: 'easy', diffLabel: 'легко', diffColor: '#00D26A',
    souls: 50, daily: false,
  },
  {
    id: 'duel',
    name: 'Дуэль',
    img: '/assets/themes/duel.png',
    desc: 'Вас не вызвали на бой',
    diff: null, diffLabel: null, diffColor: null,
    souls: 50, daily: false, isDuel: true,
  },
]

/* ─── Mock leaderboard ───────────────────────────────────────────────────── */
const MOCK_LEADERS = [
  { rank: 1,  name: 'Катя М.',       souls: 300548, title: 'Lord of Souls' },
  { rank: 2,  name: 'Claude Doe',     souls: 278679 },
  { rank: 3,  name: 'gsmgarden',      souls: 278678 },
  { rank: 4,  name: 'Антонина Р.',    souls: 190423 },
  { rank: 5,  name: 'rorogetm12',     souls: 161324 },
  { rank: 6,  name: 'Timur',          souls: 160265 },
  { rank: 7,  name: 'Квартирник 80',  souls: 140545 },
  { rank: 8,  name: 'ni',             souls: 139871 },
  { rank: 9,  name: 'Durov',          souls: 123456 },
  { rank: 10, name: 'SoulHunter',     souls: 118000 },
]

const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' }

function formatSouls(n) { return n.toLocaleString('ru-RU') }

function HeartIcon({ size = 12 }) {
  return (
    <svg viewBox="6 12 88 92" width={size} height={size}>
      <path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill="#c7a35b"/>
    </svg>
  )
}

/* ─── Theme row ──────────────────────────────────────────────────────────── */
function ThemeRow({ theme, selected, onPick }) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div
      onClick={() => onPick(theme)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 0', cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: selected ? 'rgba(199,163,91,0.04)' : 'transparent',
      }}
    >
      <div style={{
        width: 60, height: 60, borderRadius: 16, flexShrink: 0,
        overflow: 'hidden', background: '#1a1a1a',
        border: selected
          ? '2px solid rgba(199,163,91,0.6)'
          : '1px solid rgba(255,255,255,0.07)',
      }}>
        {!imgFailed && theme.img ? (
          <img
            src={theme.img} alt={theme.name}
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg,#1a1a2e,#0f1f3d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>
            {theme.isDuel ? '⚔️' : '🎲'}
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: '#fff',
          marginBottom: 2, fontFamily: 'Roboto Mono, monospace',
        }}>
          {theme.name}
        </div>
        <div style={{ fontSize: 12, fontFamily: 'Roboto Mono, monospace' }}>
          {theme.isDuel ? (
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{theme.desc}</span>
          ) : (
            <>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>Сложность: </span>
              <span style={{ color: theme.diffColor, fontWeight: 600 }}>{theme.diffLabel}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#c7a35b',
            fontFamily: 'Roboto Mono, monospace',
          }}>+{theme.souls}</span>
          <HeartIcon size={13} />
        </div>
        {theme.daily ? (
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: '#e53935',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 900, color: '#fff',
          }}>1</div>
        ) : (
          <span className="material-icons-round" style={{ fontSize: 16, color: 'rgba(255,255,255,0.18)' }}>
            push_pin
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Leader row ─────────────────────────────────────────────────────────── */
function LeaderRow({ entry }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
        background: entry.rank === 1
          ? 'linear-gradient(145deg,#7a6030,#C4A46B)'
          : 'linear-gradient(145deg,#1a1a2e,#2d2d3a)',
        border: entry.rank === 1
          ? '2px solid rgba(199,163,91,0.5)'
          : '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 900, color: '#fff',
        fontFamily: 'Roboto Mono, monospace',
      }}>
        {entry.name[0]?.toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#fff',
          fontFamily: 'Roboto Mono, monospace', marginBottom: 2,
        }}>
          {entry.name}
        </div>
        <div style={{
          fontSize: 11, fontFamily: 'Roboto Mono, monospace',
          color: entry.title ? '#c7a35b' : 'rgba(255,255,255,0.35)',
        }}>
          {entry.title
            ? entry.title
            : `#${entry.rank}${RANK_MEDAL[entry.rank] ? ' ' + RANK_MEDAL[entry.rank] : ''}`
          }
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#c7a35b',
            fontFamily: 'Roboto Mono, monospace',
          }}>{formatSouls(entry.souls)}</span>
          <HeartIcon size={12} />
        </div>
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.28)',
          fontFamily: 'Roboto Mono, monospace',
        }}>profile →</span>
      </div>
    </div>
  )
}

/* ─── Main screen ────────────────────────────────────────────────────────── */
export function TopicPickScreen() {
  const { back, go } = useNav()
  const user = useUserStore(s => s.user)
  const selectedTheme = useGameStore(s => s.selectedTheme)
  const setTheme = useGameStore(s => s.setTheme)

  const handlePick = (theme) => {
    setTheme(theme)   // ← writes to gameStore, ChatsScreen reads it reactively
    back()
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
    }}>
      <TopNav onBack={back} />

      {/* Static header */}
      <div style={{ padding: '76px 20px 0', flexShrink: 0 }}>
        <div style={{
          fontSize: 22, fontWeight: 900, textAlign: 'center',
          marginBottom: 6, fontFamily: 'Roboto Mono, monospace',
        }}>Выбор темы</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center',
          marginBottom: 16, fontFamily: 'Roboto Mono, monospace' }}>
          Тема задаёт сложность и награду
        </div>

        {/* Dailies row */}
        <div
          onClick={() => go(SCREENS.DAILY)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: '12px 16px',
            marginBottom: 8, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: '50%', background: '#e53935',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
          }}>🏆</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Roboto Mono, monospace' }}>Дейлики</div>
            <div style={{
              fontSize: 11, color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Roboto Mono, monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>Ежедневные награды за активность</div>
          </div>
          <span className="material-icons-round" style={{ fontSize: 18, color: '#fff' }}>arrow_forward</span>
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{
        flex: 1, overflowY: 'scroll',
        WebkitOverflowScrolling: 'touch',
        padding: '0 20px calc(96px + env(safe-area-inset-bottom, 16px))',
      }}>
        {THEMES.map(t => (
          <ThemeRow key={t.id} theme={t} selected={selectedTheme.id === t.id} onPick={handlePick} />
        ))}
      </div>
    </div>
  )
}