/**
 * PriceTag  — ticket-shaped price label
 * SoulsBadge — spades-heart souls wallet badge
 *
 * PriceTag props:
 *   price     {number|string}
 *   size      {'sm'|'md'|'lg'}  default 'md'
 *   style     {object}
 *   className {string}
 *
 * SoulsBadge props:
 *   amount    {number|string}
 *   size      {'sm'|'md'|'lg'}  default 'md'
 *   style     {object}
 */

const TICKET_PATH =
  'M35,1.83A35.17,35.17,0,0,0,0,37.21L.21,72.37A11.72,11.72,0,0,0,12,84a35.16,35.16,0,1,1,.43,70.32A11.72,11.72,0,0,0,.78,166.13L1,201.3a35.16,35.16,0,0,0,35.37,34.95l304.74-1.84A35.15,35.15,0,0,0,376.05,199l-.21-35.16a11.72,11.72,0,0,0-11.79-11.65,35.17,35.17,0,0,1-.43-70.33,11.7,11.7,0,0,0,11.65-11.79L375.06,35A35.16,35.16,0,0,0,339.69,0Z'

const SPADES_PATH =
  'M119.51,106.84a20.05,20.05,0,0,1,14.91-6.61c10.77-.06,19.54,8,19.6,18.08,0,8.32-6.26,13.72-14.68,20.92-7.35,6.28-16.3,13.93-24,26.09-7.86-12.07-16.9-19.61-24.32-25.8-8.51-7.1-14.89-12.42-14.94-20.74-.06-10,8.62-18.25,19.38-18.31a20,20,0,0,1,15,6.42,102.58,102.58,0,0,0-8.9-15,2.85,2.85,0,0,1,2.41-4.42l21.83-.13a2.85,2.85,0,0,1,2.47,4.39A102.49,102.49,0,0,0,119.51,106.84Z'

/* ─── PriceTag ────────────────────────────────────────────────────────── */
const TAG_SIZES = {
  sm: { h: 30, fs: 10,  is: 9, pr: 7,  pl: 4 },
  md: { h: 30, fs: 13, is: 15, pr: 10, pl: 5 },
  lg: { h: 42, fs: 18, is: 20, pr: 14, pl: 7 },
}

export function PriceTag({ price, size = 'md', style, className = '', noIcon = false }) {
  const s = TAG_SIZES[size] || TAG_SIZES.md
  const w = Math.round(s.h * 1.594)

  return (
    <div
      className={`price-tag price-tag--${size} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: w,
        height: s.h,
        flexShrink: 0,
        filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.45))',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 376.05 236.25"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <path d={TICKET_PATH} fill="#c7a35b" />
      </svg>

      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: noIcon ? s.pr : s.pl,
        paddingRight: s.pr,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {!noIcon && (
          <svg
            viewBox="76 83 78 88"
            xmlns="http://www.w3.org/2000/svg"
            width={s.is}
            height={s.is}
            style={{ flexShrink: 0, display: 'block', marginRight: 0 }}
            aria-hidden="true"
          >
            <path d={SPADES_PATH} fill="#3a2010" />
          </svg>
        )}

        <span style={{
          fontSize: s.fs,
          fontWeight: 900,
          color: '#3a2010',
          letterSpacing: '-0.08em',
          fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
          {price}
        </span>
      </div>
    </div>
  )
}

/* ─── SoulsBadge ──────────────────────────────────────────────────────────
   Gold spades-heart containing the current souls count.
   Shape: two circular lobes + pointed bottom + flat notch at top center,
   matching the reference screenshot.                                       */
const BADGE_SIZES = {
  sm: { h: 100, fs: 20, mt: 0 },
  md: { h: 150, fs: 33, mt: 0 },
  lg: { h: 80, fs: 16, mt: 0 },
  // md: { h: 62, fs: 17, mt: 8 },
  // lg: { h: 88, fs: 24, mt: 10 },
}

/* viewBox 0 0 100 112 — heart body + top notch triangle */
const HEART_BODY =
  'M50.7201 21.7701C54.4347 17.6317 60.0131 15 66.25 15C77.4338 15 86.5 23.4618 86.5 33.9C86.5 42.5496 79.9025 48.1204 71.1107 55.544C63.4362 62.0241 54.0897 69.916 46 82.5C37.9103 69.916 28.5638 62.0241 20.8893 55.544C12.0975 48.1204 5.50002 42.5496 5.50002 33.9C5.50002 23.4618 14.5663 15 25.75 15C31.9869 15 37.5653 17.6317 41.2799 21.7701C38.112 15.0517 34.6296 9.6193 32.1241 6.07566C30.7881 4.18604 32.2361 1.50002 34.6618 1.50002L57.3382 1.50002C59.7639 1.50002 61.2119 4.18603 59.8759 6.07565C57.3705 9.61929 53.8881 15.0517 50.7201 21.7701Z'
const NOTCH =
  'M43,13 L50,5 L57,13Z'

export function SoulsBadge({ amount, size = 'md', style }) {
  const s = BADGE_SIZES[size] || BADGE_SIZES.md
  const w = Math.round(s.h * (88/92))
  // const w = Math.round(s.h * 1)

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: w,
      height: s.h,
      flexShrink: 0,
      filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.65))',
      ...style,
    }}>
      <svg
        viewBox="2 -9 88 100"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        aria-hidden="true"
      >
        <defs>

          <linearGradient id="sg-gold" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%"   stopColor="#000000" />
            {/* <stop offset="55%"  stopColor="#c49a3c" /> */}
            <stop offset="100%" stopColor="#746444" />
          </linearGradient>
          <linearGradient id="sg-sheen" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </linearGradient>
        </defs>
        {/* Base gold fill */}
        <path d={HEART_BODY} fill="none" stroke="rgba(255,220,100,0.35)" strokeWidth="5.2" />
        <path d={HEART_BODY} fill="url(#sg-gold)" />
        {/* <path d={NOTCH}      fill="url(#sg-gold)" /> */}
        {/* Sheen overlay */}
        {/* <path d={HEART_BODY} fill="url(#sg-sheen)" /> */}
        {/* <path d={NOTCH}      fill="url(#sg-sheen)" /> */}
        {/* Subtle border */}
        {/* <path d={NOTCH}      fill="none" stroke="rgba(255,220,100,0.35)" strokeWidth="1.2" /> */}
      </svg>


      <span style={{
        position: 'relative',
        zIndex: 2,
        fontSize: s.fs,
        fontWeight: 900,
        color: '#fff',
        letterSpacing: '-0.00em',
        textShadow: '0 1px 5px rgba(0,0,0,0.7)',
        // fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        fontFamily: 'Roboto Mono',
        marginTop: s.mt,
        userSelect: 'none'
      }}>
        {typeof amount === 'number' ? amount.toLocaleString() : amount}
      </span>
    </div>
  )
}
