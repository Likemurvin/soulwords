import { useNav, SCREENS } from '../components/Nav'
import { useUserStore } from '../store'
import { ROOMS } from '../constants'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'

export function RoomsScreen() {
  const { go } = useNav()
  const user = useUserStore((s) => s.user)

  const handleRoom = (r) => {
    if (!user) return
    if (user.stamina < 15) { toast('Нужно минимум 15 стамины!'); hap.err(); return }
    if (r.duel) { go(SCREENS.DUEL); return }
    hap.m()
    toast('Входим...')
    setTimeout(() => go(SCREENS.DICE_ROLL), 600)
  }

  return (
    <div className="screen" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="page-hdr">
        <div className="page-title">Матчи</div>
      </div>

      <div className="tabs-row">
        <div className="tab active">Все режимы</div>
        <div className="tab" onClick={() => toast('Скоро!')}>Рейтинг</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px calc(21.5vw + 32px)' }}>
        {/* Stamina warning */}
        {user && user.stamina < 15 && (
          <div style={{
            background: 'rgba(255,69,96,.1)', border: '1px solid rgba(255,69,96,.25)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 12,
            fontSize: 12, color: 'var(--red)', lineHeight: 1.5,
          }}>
            ⚡ Мало стамины для игры. Пополни в Лавке.
          </div>
        )}

        {ROOMS.map((r) => (
          <div key={r.id} className={`room-row${r.duel ? '' : ''}`} onClick={() => handleRoom(r)}>
            <div className="room-icon" style={{
              background: r.duel ? 'rgba(255,69,96,.1)' : 'var(--bg3)',
              border: r.duel ? '1px solid rgba(255,69,96,.15)' : 'none',
            }}>
              {r.icon}
            </div>
            <div className="room-info">
              <div className="room-name">{r.name}</div>
              <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>
                {r.duel ? 'Вызови друга на бой' : r.sub}
              </div>
            </div>
            <div className="room-right">
              <div className="room-prize">{r.prize} ♠</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                {r.duel ? '1v1' : '4 раунда'}
              </div>
            </div>
          </div>
        ))}

        {/* Info card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px', marginTop: 8,
        }}>
          <div style={{ fontSize: 11, color: 'var(--txt3)', lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: 'var(--txt2)', marginBottom: 4, fontSize: 12 }}>Как играть</div>
            Один игрок объясняет слово — другой угадывает. Каждое угаданное слово приносит Души 🔥.
            Стамина тратится на каждый символ объяснения.
          </div>
        </div>
      </div>
    </div>
  )
}
