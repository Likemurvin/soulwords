// src/components/LazyVideo.jsx
// Video element that defers `src` assignment until it scrolls into view.
// Without this, every dice tile downloads its preview webm on mount even if
// the user never sees it (Hub auto-plays 3, Cosmetics has 4+). With the SW
// in front of it, the first scroll pays the cost; everything after is instant.
import { useEffect, useRef, useState } from 'react'

export function LazyVideo({ src, poster, onError, style, ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (visible) return
    const el = ref.current
    if (!el) return
    // If IntersectionObserver isn't available (older WebViews), just load.
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const obs = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setVisible(true)
        obs.disconnect()
      }
    }, { rootMargin: '200px' })   // start fetching slightly before it enters
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible])

  return (
    <video
      ref={ref}
      src={visible ? src : undefined}
      poster={poster}
      preload={visible ? 'auto' : 'none'}
      autoPlay
      muted
      loop
      playsInline
      onError={onError}
      style={style}
      {...rest}
    />
  )
}
