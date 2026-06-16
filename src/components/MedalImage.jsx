// src/components/MedalImage.jsx
// Renders a medallion PNG from /assets/medallions/medalion_{type}_{stack}.png,
// falling back to the original SVG shape if the file isn't there. Used in
// MatchOver, Hub, and Talisman so the artwork is consistent.
import { useState } from 'react'
import { getMedallionImg } from '../assets'

const COLORS = {
  souls: '#c7a35b',
  stam:  '#00D26A',
  aur:   '#4f7cf0',
}

export function MedalImage({ id, stack = 1, size = 64 }) {
  const [failed, setFailed] = useState(false)
  if (!failed) {
    return (
      <img
        src={getMedallionImg(id, stack)}
        alt=""
        onError={() => setFailed(true)}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    )
  }
  // SVG fallback — heart for souls, ♣ for stam, ♦ for aur.
  const color = COLORS[id] || '#fff'
  if (id === 'souls') {
    return (
      <svg viewBox="6 12 88 92" width={size} height={size}>
        <path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill={color}/>
      </svg>
    )
  }
  if (id === 'stam') {
    return <span style={{ fontSize: size * 0.9, color, lineHeight: 1 }}>♣</span>
  }
  return <span style={{ fontSize: size * 0.9, color, lineHeight: 1, display: 'inline-block', transform: 'rotate(45deg)' }}>◆</span>
}
