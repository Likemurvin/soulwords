import { useState } from 'react'
import { useNav } from '../components/Nav'
import { useUserStore, useCosmStore } from '../store'
import { DICE_CATALOG, PROFILE_BGS, BUBBLE_COLORS, CHAT_BGS, PORTRAIT_CATALOG } from '../constants'
import { getDicePreviewImg } from '../assets'
import { toast } from '../components/Toast'
import { hap } from '../utils/haptic'
import { PriceTag, SoulsBadge } from '../components/PriceTag'

/* ─── buy helper ─────────────────────────────────────────────────────────── */
function buyItem(type, item, user, spendSouls, cosmStore) {
  if (cosmStore.owns(type, item.id) || item.free || item.owned) {
    const s = { dice: cosmStore.setDice, profileBg: cosmStore.setProfileBg, bubble: cosmStore.setBubbleColor, chatBg: cosmStore.setChatBg, portrait: cosmStore.setPortrait }
    s[type]?.(item.id)
    hap.ok(); toast('Выбрано!')
    return true
  }
  if (!spendSouls(item.cost)) { hap.err(); toast('Мало душ!'); return false }
  cosmStore.unlockItem(type, item.id)
  const s = { dice: cosmStore.setDice, profileBg: cosmStore.setProfileBg, bubble: cosmStore.setBubbleColor, chatBg: cosmStore.setChatBg, portrait: cosmStore.setPortrait }
  s[type]?.(item.id)
  // Trip the cosmetics-purchase achievement flag (idempotent).
  useUserStore.getState().setAchFlag?.('boughtAnyCosm')
  hap.ok(); toast(`${item.name || item.label} куплено!`)
  return true
}

/* ─── verified badge ─────────────────────────────────────────────────────── */
function VerifiedDot({ size = 30 }) {
  return (
    <div style={{
      borderRadius: '50%',
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
    }}>
      <span className="material-icons-round" style={{ fontSize: size * 1, color: '#1976D2' }}>verified</span>
    </div>
  )
}

/* ─── Portrait thumb ─────────────────────────────────────────────────────── */
function PortraitThumb({ item, selected, owned, size, onClick }) {
  // size is optional; when omitted the thumb fills its grid cell (responsive).
  const dim = size ? { width: size, height: size } : { width: '100%', aspectRatio: '1' }
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}>
      <div style={{
        position: 'relative', ...dim, flexShrink: 0,
      }}>
        {/* Clipped circle holds the artwork */}
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: item.css || item.bg || '#1a1a2a',
          border: selected ? '2.5px solid #fff' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: selected ? '0 0 0 3px rgba(255,255,255,0.12)' : 'none',
          overflow: 'hidden', position: 'relative',
        }}>
          {item.img && (
            <img src={`/assets/portraits/avatar_${item.id}.png`}
              style={{ width: '100%', height: '100%', objectFit: 'cover'}}
              alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
          )}
          {!owned && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)',
              display: 'flex', alignItems:'end', justifyContent:'center'
            }}>
              <PriceTag price={item.cost} size="sm" />
            </div>
          )}
        </div>
        {/* Selected badge — outside the clipped circle so the full icon shows. */}
        {selected && owned && (
          <div style={{ position: 'absolute', bottom: -6, right: -6, zIndex: 2 }}>
            <VerifiedDot size={28} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name || item.label}
      </span>
    </div>
  )
}

/* ─── Background thumb ───────────────────────────────────────────────────── */
function BgThumb({ item, selected, owned, aspect = '1', onClick }) {
  return (
    <div onClick={onClick} style={{
      position: 'relative', aspectRatio: aspect, cursor: 'pointer',
    }}>
      {/* Clipped tile holds the artwork */}
      <div style={{
        width: '100%', height: '100%', borderRadius: 14,
        background: item.bg, overflow: 'hidden',
        border: selected ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.08)',
        boxShadow: selected ? '0 0 0 3px rgba(255,255,255,0.1)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        {!owned && <PriceTag price={item.cost} size="sm" />}
      </div>
      {/* Selected badge — outside the clip so the full icon shows */}
      {selected && owned && (
        <div style={{ position: 'absolute', top: -6, right: -6, zIndex: 2 }}>
          <VerifiedDot size={22} />
        </div>
      )}
    </div>
  )
}

/* ─── Dice thumb ─────────────────────────────────────────────────────────── */
function DiceThumb({ dice, selected, owned, size, onClick }) {
  const [failed, setFailed] = useState(false)
  const dim = size ? { width: size, height: size } : { width: '100%', aspectRatio: '1' }
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}>
      <div style={{ position: 'relative', ...dim }}>
        {!failed ? (
          <img src={getDicePreviewImg(dice.id)} alt={dice.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={() => setFailed(true)} />
        ) : (
          <div className="dice-shape" style={{ width: '100%', height: '100%', fontSize: 24, background: dice.bg }}>20</div>
        )}
        {!owned && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)', borderRadius: 12,
            display: 'flex', alignItems: 'end', justifyContent: 'center',
          }}>
            <PriceTag price={dice.cost} size="sm" />
          </div>
        )}
        {selected && owned && (
          <div style={{ position: 'absolute', bottom: -6, right: -6, zIndex: 2 }}>
            <VerifiedDot size={22} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dice.name}</span>
    </div>
  )
}

/* ─── Bubble thumb ───────────────────────────────────────────────────────── */
function BubbleThumb({ item, selected, owned, onClick }) {
  return (
    <div onClick={onClick} style={{ position: 'relative', cursor: 'pointer' }}>
      <div style={{
        borderRadius: 16, padding: '18px 8px',
        background: item.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 600, color: item.txt,
        border: selected ? '2.5px solid #fff' : '1.5px solid rgba(255,255,255,0.08)',
        boxSizing: 'border-box',
      }}>
        {!owned ? <PriceTag price={item.cost} size="sm" /> : item.label}
      </div>
      {selected && owned && (
        <div style={{ position: 'absolute', top: -6, right: -6, zIndex: 2 }}>
          <VerifiedDot size={20} />
        </div>
      )}
    </div>
  )
}

/* ─── Buy preview overlay ────────────────────────────────────────────────── */
function BuyOverlay({ item, type, onBack, onBuy }) {
  const [failed, setFailed] = useState(false) 
  const isBubble = type === 'bubble'
  const isPortrait = type === 'portrait'
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 300,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32,
      backdropFilter: 'blur(14px)',
    }}>
      {/* Big preview */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {isPortrait && (
          <div style={{
            width: 140, height: 140, borderRadius: '50%',
            background: item.css || item.bg || '#1a1a2a',
            border: '3px solid rgba(255,255,255,0.2)', overflow: 'hidden',
          }}>
            {item.img && <img src={`/assets/portraits/avatar_${item.id}.png`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
          </div>
        )}
          {type === 'dice' && (
            <div style={{ position: 'relative', width: 200, height: 200 }}>
              {!failed ? (
                <img
                  src={getDicePreviewImg(item.id)}
                  alt={item.name}
                  style={{ width: 200, height: 200, objectFit: 'contain' }}
                  onError={() => setFailed(true)}
                />
              ) : (
                <div className="dice-shape" style={{ width: 140, height: 140, fontSize: 42, background: item.bg }}>20</div>
              )}
            </div>
          )}
        {!isPortrait && type !== 'dice' && (
          <div style={{
            width: 180, height: isBubble ? 80 : 260, borderRadius: 20,
            background: item.bg, border: '2px solid rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: item.txt || '#fff', fontSize: 14, fontWeight: 600,
          }}>
            {item.label || item.name}
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{item.name || item.label}</div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, width: '80%' }}>
        <button onClick={onBack} style={{
          flex: 1, padding: '16px', borderRadius: 20,
          border: '1.5px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.05)', color: '#fff',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          Назад
        </button>
        <button onClick={onBuy} style={{
          flex: 1, padding: '16px', borderRadius: 20, border: 'none',
          background: '#C7A35B', color: '#000',
          fontSize: 15, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',  // ← add this
        }}>
          Приобрести
          <PriceTag price={item.cost} size="sm" style={{
            position: 'absolute',
            bottom: 33,
            right: -8,
            transform: 'rotate(-12deg'
          }} />
        </button>
      </div>
      
    </div>
  )
}

/* ─── See All overlay ────────────────────────────────────────────────────── */
function SeeAllOverlay({ label, items, type, activeId, cosm, user, spendSouls, onClose }) {
  const [buyTarget, setBuyTarget] = useState(null)

  const ownedItems = items.filter(it => cosm.owns(type, it.id) || it.free || it.owned)
  const lockedItems = items.filter(it => !cosm.owns(type, it.id) && !it.free && !it.owned)

  const handleClick = (item) => {
    const isOwned = cosm.owns(type, item.id) || item.free || item.owned
    if (isOwned) buyItem(type, item, user, spendSouls, cosm)
    else setBuyTarget(item)
  }

  const handleBuy = () => {
    if (buyItem(type, buyTarget, user, spendSouls, cosm)) setBuyTarget(null)
  }

  const renderItem = (item) => {
    const isOwned = cosm.owns(type, item.id) || item.free || item.owned
    const isSel = activeId === item.id
    const props = { key: item.id, item, selected: isSel, owned: isOwned, onClick: () => handleClick(item) }
    if (type === 'portrait') return <PortraitThumb {...props} />
    if (type === 'dice')     return <DiceThumb {...props} dice={item} />
    if (type === 'bubble')   return <BubbleThumb {...props} />
    return <BgThumb {...props} aspect={type === 'chatBg' ? '0.65' : '1'} />
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', zIndex: 200, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
        }}>
          <span className="material-icons-round" style={{ fontSize: 20 }}>arrow_back</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>{label}</div>
        <div style={{ width: 36 }} />
      </div>

      {/* Scrollable items */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 100px' }}>
        {ownedItems.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Куплено:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
              {ownedItems.map(renderItem)}
            </div>
          </>
        )}
        {lockedItems.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Все:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {lockedItems.map(renderItem)}
            </div>
          </>
        )}
      </div>

      {/* Souls bar at bottom */}
      <div style={{
        position: 'absolute', bottom: 30, left: 0, right: 0,
        padding: '0px 0px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <SoulsBadge amount={user.souls} size="md" />
        {/* <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>
          {user.souls.toLocaleString()}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>душ</span> */}
      </div>

      {buyTarget && (
        <BuyOverlay item={buyTarget} type={type} onBack={() => setBuyTarget(null)} onBuy={handleBuy} />
      )}
    </div>
  )
}

/* ─── Section row (3-item preview + See All) ─────────────────────────────── */
function SectionRow({ label, items, type, activeId, cosm, user, spendSouls }) {
  const [showAll, setShowAll] = useState(false)
  const [buyTarget, setBuyTarget] = useState(null)  // ← add
  const preview = items.slice(0, 3)

  const handlePreviewClick = (item) => {
    const isOwned = cosm.owns(type, item.id) || item.free || item.owned
    if (isOwned) buyItem(type, item, user, spendSouls, cosm)
    else setBuyTarget(item)  // ← was just a comment before
  }

  const handleBuy = () => {
    if (buyItem(type, buyTarget, user, spendSouls, cosm)) setBuyTarget(null)
  }

  const renderPreview = (item) => {
    const isOwned = cosm.owns(type, item.id) || item.free || item.owned
    const isSel = activeId === item.id
    const props = { key: item.id, item, selected: isSel, owned: isOwned, onClick: () => handlePreviewClick(item) }
    if (type === 'portrait') return <PortraitThumb {...props} />
    if (type === 'dice')     return <DiceThumb {...props} dice={item} />
    if (type === 'bubble')   return <BubbleThumb {...props} />
    return <BgThumb {...props} aspect={type === 'chatBg' ? '0.65' : '1'} />
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>My {label}:</span>
          <button onClick={() => setShowAll(true)} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            See All <span className="material-icons-round" style={{ fontSize: 14 }}>arrow_forward</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {preview.map(renderPreview)}
        </div>

        {type === 'bubble' && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 12, lineHeight: 1.6 }}>
            Отображаются во время объяснения слов. Видно вам и вашему сопернику.
            Во время угадывания слов отображаются системные баблы.
          </p>
        )}
      </div>

     {buyTarget && (
        <BuyOverlay
          item={buyTarget} type={type}
          onBack={() => setBuyTarget(null)}
          onBuy={handleBuy}
        />
      )}

      {showAll && (
        <SeeAllOverlay
          label={`My ${label}`} items={items} type={type}
          activeId={activeId} cosm={cosm} user={user} spendSouls={spendSouls}
          onClose={() => setShowAll(false)}
        />
      )}
    </>
  )
}

/* ─── Main screen ────────────────────────────────────────────────────────── */
export function CosmScreen() {
  const { back } = useNav()
  const user = useUserStore((s) => s.user)
  const spendSouls = useUserStore((s) => s.spendSouls)
  const cosm = useCosmStore()

  if (!user) return null

  const activePortrait = PORTRAIT_CATALOG.find(p => p.id === cosm.portrait) || PORTRAIT_CATALOG[0]

  return (
    <div className="screen" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={back} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%',
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff',
        }}>
          <span className="material-icons-round" style={{ fontSize: 20 }}>arrow_back</span>
        </button>

        <div style={{ fontSize: 17, fontWeight: 700 }}>Кастомизация</div>

        {/* Right slot kept for symmetry; balance moved to bottom panel. */}
        <div style={{ width: 36, height: 36 }} />
      </div>

      {/* Profile preview */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '22px 20px 18px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: activePortrait.css || '#1a1a2a',
          border: '3px solid rgba(255,255,255,0.13)', overflow: 'hidden',
        }}>
          {activePortrait.img && (
            <img src={`/assets/portraits/avatar_${activePortrait.id}.png`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>@{user.tgId || 'user'}</div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px calc(80px + env(safe-area-inset-bottom,0px))' }}>
        <SectionRow label="Portraits"    items={PORTRAIT_CATALOG} type="portrait" activeId={cosm.portrait}     cosm={cosm} user={user} spendSouls={spendSouls} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 24px' }} />

        <SectionRow label="Backgrounds"  items={PROFILE_BGS}      type="profileBg" activeId={cosm.profileBg}   cosm={cosm} user={user} spendSouls={spendSouls} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 24px' }} />

        <SectionRow label="Dices"        items={DICE_CATALOG}     type="dice"     activeId={cosm.dice}         cosm={cosm} user={user} spendSouls={spendSouls} />
        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 24px' }} />

        <SectionRow label="Text Bubbles" items={BUBBLE_COLORS}    type="bubble"   activeId={cosm.bubbleColor}  cosm={cosm} user={user} spendSouls={spendSouls} />

        {/* Spacer so the bottom balance panel doesn't cover the last row */}
        <div style={{ height: 120 }} />
      </div>

      {/* ── Bottom souls-balance panel ──────────────────────────────────────
          Uses /assets/ui/customisation_balance.png as the visual container,
          with the souls amount rendered on top. The text is positioned by
          percentage of the panel's box so it stays aligned to whatever the
          PNG layout calls for. Tweak the four constants below if the artwork
          calls for a different anchor:
            TEXT_TOP    — vertical center of the number, % of panel height
            FONT_PX     — font size in px (auto-scales fine on mobile)
            LABEL_TOP   — vertical center of the "Душ" caption
            LABEL_PX    — caption font size
       */}
      <div style={{
        position: 'absolute', left: 16, right: 16,
        bottom: 'calc(96px + env(safe-area-inset-bottom, 16px))',
        // Panel artwork is wider than tall; aspect ratio matches typical
        // banner proportions. Adjust if your PNG's ratio differs.
        height: 88,
        backgroundImage: `url(/assets/ui/customisation_balance.png)`,
        backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '46%',                         /* TEXT_TOP — vertical anchor of the souls number */
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', color: '#fff', lineHeight: 1,
          textShadow: '0 2px 6px rgba(0,0,0,0.45)',
        }}>
          <div style={{
            fontSize: 26 /* FONT_PX */, fontWeight: 900,
            fontFamily: "'Roboto Mono', monospace", letterSpacing: '-0.02em',
          }}>{user.souls?.toLocaleString('ru-RU') || 0}</div>
          <div style={{
            marginTop: 2,
            fontSize: 10 /* LABEL_PX */,
            fontWeight: 700, fontFamily: "'Roboto Mono', monospace",
            color: 'rgba(255,255,255,0.8)', letterSpacing: '0.08em',
          }}>Душ</div>
        </div>
      </div>
    </div>
  )
}