// ShopScreen.jsx — "Soulstore"
// Composition (matches STORE.png):
//   • Welcome message + spades-styled souls balance
//   • Восстановить стамину  (click → restore, price tag, stamina bar)
//   • Прививка / Переброс дайса (inventory consumables, stored in user.inventory)
//   • Чёрный рынок → bottom sheet, buy souls with Telegram Stars
import { useState, useEffect } from 'react'
import { useUserStore } from '../store'
import { TopNav } from '../components/TopNav'
import { useNav, SCREENS } from '../components/Nav'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'
import { api } from '../utils/api'
import { openInvoice, isInTelegram } from '../utils/telegram'
import { UI } from '../assets'
import { PriceTag } from '../components/PriceTag'

const MONO = "'Roboto Mono', monospace"
const GOLD = '#c7a35b'

/* Prices in souls */
const PRICES = { stamina: 15, vaccine: 20, reroll: 15 }

/* ── Spade-shaped souls balance ── */
function SpadeBalance({ souls }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg viewBox="0 0 100 110" width="26" height="28">
        <defs>
          <linearGradient id="bal-gold" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#e8c56e"/><stop offset="100%" stopColor="#9a7020"/>
          </linearGradient>
        </defs>
        <path d="M50,8 C50,8 90,40 90,62 C90,78 78,86 66,86 C60,86 54,83 50,78 C46,83 40,86 34,86 C22,86 10,78 10,62 C10,40 50,8 50,8Z M40,82 L50,100 L60,82Z" fill="url(#bal-gold)"/>
      </svg>
      <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontFamily: MONO }}>
        {souls.toLocaleString('ru-RU')}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>душ</span>
    </div>
  )
}

/* ── Ticket-shaped price tag — shared with Customization (see components/PriceTag) ── */
// (local stub removed; we now use the gold ticket-shape `PriceTag` from the
// shared component for visual consistency across the app.)

/* ── Black Market bottom sheet ── */
function BlackMarket({ user, onClose, onBought }) {
  const [packs, setPacks] = useState([
    { id: 'pack_200',  souls: 200,  stars: 50  },
    { id: 'pack_750',  souls: 750,  stars: 150, discount: 20 },
    { id: 'pack_1800', souls: 1800, stars: 300, discount: 20 },
  ])
  const [busy, setBusy] = useState(null)

  useEffect(() => { api.starPacks().then(r => { if (r?.packs?.length) setPacks(r.packs) }) }, [])

  const buy = async (pack) => {
    setBusy(pack.id); hap.m()
    const res = await api.starsInvoice(pack.id)
    if (!res) { toast('Рынок недоступен'); setBusy(null); hap.err(); return }
    if (res.devCredited) {                       // backend dev-fallback credited instantly
      useUserStore.getState().setAchFlag('boughtStarsPack')
      onBought(res.user); toast(`+${pack.souls} душ!`); hap.ok(); setBusy(null); onClose(); return
    }
    if (res.invoiceLink) {
      const status = await openInvoice(res.invoiceLink)
      if (status === 'paid') {
        useUserStore.getState().setAchFlag('boughtStarsPack')
        toast(`+${pack.souls} душ!`); hap.ok()
        setTimeout(() => useUserStore.getState().refresh(), 1500)
        onClose()
      } else if (status === 'cancelled') {
        toast('Оплата отменена')
      } else {
        toast('Не удалось оплатить'); hap.err()
      }
    }
    setBusy(null)
  }

  const SIZES   = { pack_200: 56, pack_750: 76, pack_1800: 96 }
  const SPADE_IMG = { pack_200: UI.spades1, pack_750: UI.spades2, pack_1800: UI.spades3 }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', background: '#0d0d0d', borderRadius: '28px 28px 0 0',
        border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
        padding: '0 20px calc(28px + env(safe-area-inset-bottom,0px))',
      }}>
        {/* header: balance + logo + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 8px' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>Баланс</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ color: GOLD, fontSize: 16 }}>★</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: MONO }}>
                {user.souls.toLocaleString('ru-RU')}
              </span>
            </div>
          </div>
          <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={UI.logoMark} alt="SoulWords"
              onError={(e) => {
                const fb = document.createElement('div')
                fb.textContent = 'SoulWords'
                fb.style.cssText = `font-size:16px;font-weight:900;color:${GOLD};font-family:'Roboto Mono',monospace;letter-spacing:0.04em`
                e.target.replaceWith(fb)
              }}
              style={{ height: 32, objectFit: 'contain' }} />
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
            border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div style={{ textAlign: 'center', margin: '12px 0 6px' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: MONO, letterSpacing: '0.06em' }}>
            Чёрный Рынок
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MONO, lineHeight: 1.6, marginTop: 8 }}>
            Не хватает душ? Можно обменять их<br/>на звёзды Telegram. Только тсс!
          </div>
        </div>

        {/* packs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 18 }}>
          {packs.map(pack => {
            const sz = SIZES[pack.id] || 64
            return (
              <button key={pack.id} disabled={busy} onClick={() => buy(pack)} style={{
                position: 'relative', background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 18, padding: '20px 8px 14px', cursor: busy ? 'wait' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: busy && busy !== pack.id ? 0.5 : 1,
              }}>
                {pack.discount && (
                  <div style={{ position: 'absolute', top: -10, right: 6 }}>
                    <PriceTag price={`-${pack.discount}%`} size="sm" noIcon />
                  </div>
                )}
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: sz * 1.1, height: sz * 1.1 }}>
                    <img src={SPADE_IMG[pack.id]} alt=""
                      onError={(e) => {
                        // Fallback to the original SVG spade when the PNG isn't there yet.
                        const svgNS = 'http://www.w3.org/2000/svg'
                        const svg = document.createElementNS(svgNS, 'svg')
                        svg.setAttribute('viewBox','0 0 100 110')
                        svg.setAttribute('width', sz); svg.setAttribute('height', sz * 1.1)
                        const p = document.createElementNS(svgNS, 'path')
                        p.setAttribute('d','M50,8 C50,8 90,40 90,62 C90,78 78,86 66,86 C60,86 54,83 50,78 C46,83 40,86 34,86 C22,86 10,78 10,62 C10,40 50,8 50,8Z M40,82 L50,100 L60,82Z')
                        p.setAttribute('fill', '#c7a35b')
                        svg.appendChild(p); e.target.replaceWith(svg)
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 900, color: '#2a1808', fontFamily: MONO, paddingBottom: sz * 0.12, textShadow:'0 1px 0 rgba(255,255,255,0.3)' }}>
                      +{pack.souls}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: MONO }}>{pack.souls} душ</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)',
                  borderRadius: 8, padding: '4px 10px' }}>
                  <span style={{ color: GOLD, fontSize: 12 }}>★</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: MONO }}>{pack.stars}</span>
                </div>
              </button>
            )
          })}
        </div>

        {!isInTelegram() && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: MONO, textAlign: 'center', marginTop: 14 }}>
            Вне Telegram души начисляются сразу (демо-режим).
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Main ── */
export function ShopScreen() {
  const user       = useUserStore(s => s.user)
  const updateUser = useUserStore(s => s.updateUser)
  const spendSouls = useUserStore(s => s.spendSouls)
  const addItem    = useUserStore(s => s.addItem)
  const setAchFlag = useUserStore(s => s.setAchFlag)
  const { go, setHideTabBar }     = useNav()
  const [market, setMarket] = useState(false)

  // While the Black Market bottom sheet is open, hide the tab bar so the
  // bottom of the sheet isn't covered by the floating nav pill.
  useEffect(() => {
    setHideTabBar(market)
    return () => setHideTabBar(false)
  }, [market])

  if (!user) return null

  const stamPct   = Math.max(0, Math.min(100, user.stamina))
  const stamColor = stamPct < 25 ? '#ef4444' : stamPct < 50 ? '#f59e0b' : '#00D26A'

  const buyStamina = () => {
    if (user.stamina >= 100) { toast('Стамина полная!'); hap.err(); return }
    if (!spendSouls(PRICES.stamina)) { toast('Мало душ'); hap.err(); return }
    updateUser({ stamina: Math.min(100, user.stamina + 20) })
    setAchFlag('boughtAnyGameItem')
    toast('+20 стамины'); hap.ok()
  }

  const buyItem = (id) => {
    if (!spendSouls(PRICES[id])) { toast('Мало душ'); hap.err(); return }
    addItem(id, 1)
    setAchFlag('boughtAnyGameItem')
    toast(id === 'vaccine' ? 'Прививка куплена' : 'Переброс куплен'); hap.ok()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <TopNav onBack={() => go(SCREENS.HUB)} backIcon="arrow_back" onRight={() => go(SCREENS.HUB)} rightIcon="person_add" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '0 0 calc(96px + env(safe-area-inset-bottom,16px))' }}>

        {/* Top illustration with souls amount overlaid.
            Source PNG is 780×558; aspect-ratio preserves the anchor math.
            The text is positioned at the spec point (x=312, y=176 of the 780×558
            canvas) as percentages, so it stays aligned at any device width.
            Font size also scales with image width (≈ 6.5% of width). */}
        <div style={{
          position: 'relative', width: '100%',
          aspectRatio: '780 / 558',
          backgroundImage: `url(${UI.shopHeader})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <div style={{
            position: 'absolute',
            // Centering at (312, 176): translate -50% to center the text block at the anchor
            // left: `${(312 / 780) * 100}%`,
            left: `79.5%`,
            // top:  `${(176 / 558) * 100}%`,
            top:  `63%`,
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', lineHeight: 1, color: '#fff',
            textShadow: '0 2px 12px rgba(0,0,0,0.55), 0 0 24px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}>
            <div style={{
              fontSize: 'clamp(28px, 6.5vw, 56px)',
              fontWeight: 900, fontFamily: MONO,
              letterSpacing: '-0.02em',
            }}>{user.souls?.toLocaleString('ru-RU') || 0}</div>
            <div style={{
              marginTop: 4,
              fontSize: 'clamp(11px, 1.8vw, 16px)',
              fontWeight: 700, fontFamily: MONO,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.08em',
            }}>Душ</div>
          </div>
        </div>

        <div style={{ padding: '18px 20px 0' }}>

          {/* Welcome message inside the storeframe.png artwork. The PNG is the
              visual frame; the text sits on top. If the asset is missing we
              fall back to a plain border so the layout still works. */}
          <div style={{
            position: 'relative', marginBottom: 22,
            backgroundImage: `url(${UI.shopFrame})`,
            backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat',
            padding: '22px 26px', minHeight: 72,
            border: '1px solid rgba(255,255,255,0.04)', borderRadius: 16,
          }}>
            <div style={{
              textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.7)',
              fontFamily: MONO, lineHeight: 1.6,
            }}>
              Добро пожаловать в мой магазин, смертный.<br/>Осмотрись, располагайся…
            </div>
          </div>

          {/* Restore stamina */}
          <div onClick={buyStamina} style={{
            position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
            background: '#141414', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: 16, marginBottom: 12, cursor: 'pointer',
          }}>
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <PriceTag price={PRICES.stamina} size="sm" />
            </div>
            <div style={{ width: 64, height: 64, borderRadius: 16, flexShrink: 0, background: 'rgba(0,210,106,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={UI.shopStamina} alt=""
                onError={(e) => { const fb = document.createElement('span'); fb.textContent='♣'; fb.style.cssText='font-size:36px;color:#00D26A'; e.target.replaceWith(fb) }}
                style={{ width: 48, height: 48, objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1, paddingRight: 56 /* room for price tag */ }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: MONO }}>Восстановить стамину</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontFamily: MONO, marginBottom: 8 }}>+20 стамины</div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${stamPct}%`, background: stamColor, borderRadius: 4, transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: MONO, textAlign: 'right', marginTop: 3 }}>
              {Math.round(stamPct)}/100
            </div>
          </div>
        </div>

        {/* Vaccine + Reroll — centered content, no icon glyphs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { id: 'vaccine', icon: '💉', name: 'Прививка',       desc: 'Убрать дебафф 1-го раунда' },
            { id: 'reroll',  icon: '🎲', name: 'Переброс Дайса', desc: 'Авто переброс при провале в 1-ом раунде' },
          ].map(item => {
            const count = user.inventory?.[item.id] || 0
            return (
              <div key={item.id} onClick={() => buyItem(item.id)} style={{
                position: 'relative', background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: '28px 14px 20px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                textAlign: 'center', minHeight: 160,
              }}>
                <div style={{ position: 'absolute', top: 8, right: 8 }}>
                  <PriceTag price={PRICES[item.id]} size="sm" />
                </div>
                {count > 0 && (
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,210,106,0.12)',
                    color: '#00D26A', border: '1px solid rgba(0,210,106,0.25)', borderRadius: 6,
                    padding: '2px 7px', fontSize: 10, fontWeight: 800, fontFamily: MONO }}>×{count}</div>
                )}
                <div style={{ fontSize: 36, lineHeight: 1 }}>{item.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: MONO }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: MONO, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            )
          })}
        </div>

        {/* Black market entry */}
        <div onClick={() => setMarket(true)} style={{
          position: 'relative', background: '#141414', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20, padding: '22px 16px', cursor: 'pointer', textAlign: 'center',
        }}>
          <div style={{ position: 'absolute', top: -8, right: 14, background: '#1a1a1a', border: '1px solid #444',
            borderRadius: 6, padding: '3px 9px', fontSize: 12 }}>☠</div>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🏴</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: MONO }}>Чёрный Рынок</div>
          <div style={{ fontSize: 12, color: '#3b82f6', fontFamily: MONO, marginTop: 4 }}>Войти →</div>
        </div>
        </div>{/* /padding 0 20px */}
      </div>

      {market && <BlackMarket user={user} onClose={() => setMarket(false)} onBought={(u) => useUserStore.setState({ user: u })} />}
    </div>
  )
}
