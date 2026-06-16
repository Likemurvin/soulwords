/**
 * TopNav — floating top navigation bar
 *
 * Two pill buttons absolutely positioned at the top of any screen.
 * Styled like the cosmetic screen notification pills — frosted glass,
 * subtle border, backdrop blur.
 *
 * Props:
 *   onBack      {fn}      — left button handler (omit to hide)
 *   onRight     {fn}      — right button handler (omit to hide)
 *   rightIcon   {string}  — material icon name for right btn (default: 'person_add')
 *   rightBadge  {number}  — red dot badge count on right button (omit to hide)
 *   style       {object}  — extra styles on the wrapper
 */
export function TopNav({ onBack, backIcon, onRight, rightIcon = 'person_add', rightBadge, style }) {
  const btnBase = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: '50%',
    width: 65,
    height: 65,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#fff',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    flexShrink: 0,
    position: 'relative',
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      pointerEvents: 'none',   // let touches pass through the gap
      ...style,
    }}>
      {/* Left — back */}
      {onBack ? (
        <button onClick={onBack} style={{ ...btnBase, pointerEvents: 'all' }}>
          <span className="material-icons-round" style={{ fontSize: 22 }}>{backIcon || 'arrow_back'}</span>
        </button>
      ) : (
        <div style={{ width: 44 }} />   // spacer so right btn stays flush-right
      )}

      {/* Right — action */}
      {onRight ? (
        <button onClick={onRight} style={{ ...btnBase, pointerEvents: 'all' }}>
          <span className="material-icons-round" style={{ fontSize: 22 }}>{rightIcon}</span>
          {!!rightBadge && (
            <div style={{
              position: 'absolute',
              top: -2, right: -2,
              minWidth: 17, height: 17,
              background: '#e53935',
              borderRadius: 99,
              border: '1.5px solid #0a0a0a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 900, color: '#fff',
              padding: '0 4px',
              lineHeight: 1,
            }}>
              {rightBadge}
            </div>
          )}
        </button>
      ) : (
        <div style={{ width: 44 }} />
      )}
    </div>
  )
}
