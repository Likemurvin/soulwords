// src/components/ProfileAvatar.jsx
// Renders a circular profile picture with an optional aura frame around it.
// Frames live at /assets/ui/aura_frame_{1..4}.png. Each frame is sized 26%
// larger than the inner picture and is centered on the same point (per the
// asset spec — the artwork is pre-aligned so a straight overlay works).
//
// Frame selection by aura level:
//   aura 1  → frame 1
//   aura 2  → frame 2
//   aura 3  → frame 3
//   aura ≥4 → frame 4
// aura 0 (or undefined) → no frame.
import { useState } from 'react'
import { getTgUser } from '../utils/telegram'

const FRAME_OVERSIZE = 1.26   // frame canvas is 126% of inner picture

function frameTier(aura = 0) {
  if (aura <= 0) return 0
  return Math.min(4, Math.max(1, Math.floor(aura)))
}

export function ProfileAvatar({
  user,
  portrait,                // cosm picked portrait id, or 'default'/null
  size = 64,
  bordered = false,        // adds a subtle ring around the inner picture
}) {
  const [innerFailed, setInnerFailed] = useState(false)
  const tgUser  = getTgUser()
  const tier = frameTier(user?.aura || 0)

  const portraitSrc = portrait && portrait !== 'default'
    ? `/assets/portraits/avatar_${portrait}.png`
    : null
  const photoUrl = user?.photoUrl || tgUser?.photo_url
  const innerSrc = portraitSrc || photoUrl

  const frameSize = Math.round(size * FRAME_OVERSIZE)

  return (
    <div style={{
      position: 'relative',
      width: frameSize, height: frameSize,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {/* Inner round picture */}
      <div style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: '50%', overflow: 'hidden',
        background: '#1a1a1a',
        border: bordered ? '2px solid rgba(255,255,255,0.18)' : 'none',
        boxSizing: 'border-box',
      }}>
        {innerSrc && !innerFailed ? (
          <img
            src={innerSrc} alt=""
            onError={() => setInnerFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, #7a6030, #C4A46B)',
            color: '#fff', fontWeight: 900, fontFamily: "'Roboto Mono', monospace",
            fontSize: size * 0.42,
          }}>
            {((user?.name || tgUser?.first_name || '?')[0]).toUpperCase()}
          </div>
        )}
      </div>

      {/* Aura frame overlay — sized at 126% of inner, centered on the same point.
          The asset itself is pre-aligned, so a centered absolute box is enough.
          Missing files just fade away (no border placeholder). */}
      {tier > 0 && (
        <img
          src={`/assets/ui/aura_frame_${tier}.png`}
          alt=""
          onError={(e) => { e.target.style.display = 'none' }}
          style={{
            position: 'absolute',
            width: frameSize, height: frameSize,
            pointerEvents: 'none', userSelect: 'none',
          }}
        />
      )}
    </div>
  )
}
