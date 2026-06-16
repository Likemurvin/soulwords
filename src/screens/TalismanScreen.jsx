import { useState } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useGameStore } from '../store'
import { useMedalStore } from '../store'
import { MEDALLIONS, MED_STACK_TIERS, MED_AURA_MAX, ROMAN } from '../constants'
import { hap } from '../utils/haptic'
import { toast } from '../components/Toast'
import { loadAura, saveAura } from '../utils/storage'

export function TalismanScreen() {
  const { replace } = useNav()
  const game = useGameStore()
  const medalStore = useMedalStore()
  const [picked, setPicked] = useState(null)

  const allMaxed = medalStore.isAllMaxed()

  const confirm = () => {
    if (!picked) return
    hap.ok()
    medalStore.apply(picked)
    // Aura special case
    if (picked === 'aur') {
      const aura = Math.min(loadAura() + 10, MED_AURA_MAX)
      saveAura(aura)
    }
    const def = MEDALLIONS[picked]
    const stack = medalStore.getStack(picked) + 1
    toast(`${def.name} ${ROMAN[Math.min(stack, 19)]} активирован!`)
    game.nextRound()
    replace(SCREENS.ROUND_START)
  }

  const skip = () => {
    toast('Пропущено')
    game.nextRound()
    replace(SCREENS.ROUND_START)
  }

  if (allMaxed) {
    return (
      <div className="screen" style={{
        background: '#0a0a10', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '32px 24px', gap: 16, textAlign: 'center',
      }}>
        <div style={{ fontFamily: "'Roboto Mono',monospace", fontSize: 26, fontWeight: 900 }}>
          Снимаем Шляпу!
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', lineHeight: 1.6, maxWidth: 260 }}>
          Невероятно! У вас есть все медальоны на максимуме!
        </div>
        <div style={{ fontSize: 36 }}>♠ ♣ ♦</div>
        <button className="btn" style={{ background: '#fff', color: '#000', fontWeight: 700, maxWidth: 280, marginTop: 12 }} onClick={() => { game.nextRound(); replace(SCREENS.ROUND_START) }}>
          Продолжить
        </button>
      </div>
    )
  }

  return (
    <div className="screen" style={{ background: '#0a0a10', display: 'flex', flexDirection: 'column' }}>
      <div className="med-header">
        <div className="med-title">Конец раунда</div>
        <div className="med-subtitle">Выберите медальон</div>
        <div className="med-sub2">и получите бонус в следующих раундах</div>
      </div>

      <div className="med-list" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
        {Object.values(MEDALLIONS).map((def) => {
          const curStack = medalStore.getStack(def.id)
          const nextStack = curStack + 1
          const isPicked = picked === def.id
          const aura = def.id === 'aur' ? loadAura() : 0

          return (
            <div
              key={def.id}
              className={`med-card${isPicked ? ' med-picked' : ''}`}
              onClick={() => { setPicked(def.id); hap.l() }}
            >
              {/* Shape */}
              <MedShape type={def.id} level={nextStack} />

              {/* Info */}
              <div className="med-info">
                <div className={`med-name med-name-${def.id === 'souls' ? 'spade' : def.id === 'stam' ? 'clubs' : 'aura'}`}>
                  {def.name} +{nextStack >= 4 ? 20 : MED_STACK_TIERS[nextStack - 1]}%
                </div>
                <div className="med-effect">{def.getDesc(nextStack)}</div>
                {def.id === 'aur' && (
                  <>
                    <div className="med-aura-bar">
                      <div className="med-aura-fill" style={{ width: `${Math.min(aura / MED_AURA_MAX * 100, 100)}%` }} />
                    </div>
                    <div className="med-aura-lbl">{aura}/{MED_AURA_MAX}</div>
                  </>
                )}
                <div className="med-dur">на {def.dur} ч.</div>
              </div>

              {isPicked && (
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>✓</div>
              )}
            </div>
          )
        })}
      </div>

      <div className="med-footer">
        <div className="med-note">
          Медальоны складываются после каждого раунда: 1% → 5% → 10% → 20%
        </div>
        <button
          className="btn"
          style={{ background: '#fff', color: '#000', fontWeight: 700, opacity: picked ? 1 : .3, pointerEvents: picked ? 'all' : 'none' }}
          onClick={confirm}
        >
          Выбрать медальон
        </button>
        <button className="btn btn-s" onClick={skip}>Пропустить</button>
      </div>
    </div>
  )
}

function MedShape({ type, level }) {
  const label = ROMAN[Math.min(level - 1, 19)]
  if (type === 'souls') {
    return (
      <div className="med-shape">
        <div className="med-shape-spade">
          <div className="med-hole" />
          <span className="med-level">{label}</span>
        </div>
      </div>
    )
  }
  if (type === 'stam') {
    return (
      <div className="med-shape">
        <div className="med-shape-clubs">
          <div className="med-clubs-inner">
            <div className="med-hole" />
            <span className="med-level" style={{ position: 'relative', zIndex: 2 }}>{label}</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="med-shape">
      <div className="med-shape-diamond">
        <div className="med-hole" style={{ clipPath: 'none', top: -2, borderRadius: '50%' }} />
        <span className="med-level">{label}</span>
      </div>
    </div>
  )
}
