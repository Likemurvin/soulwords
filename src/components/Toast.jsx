import { useState, useCallback, useEffect, useRef } from 'react'

let _showToast = null

export function useToast() {
  return { toast: (msg) => _showToast?.(msg) }
}

export function toast(msg) {
  _showToast?.(msg)
}

export function Toast() {
  const [msg, setMsg] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  const show = useCallback((m) => {
    setMsg(m)
    setVisible(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 2600)
  }, [])

  useEffect(() => {
    _showToast = show
    return () => { _showToast = null }
  }, [show])

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(21.5vw + 52px)',
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '12px'})`,
      opacity: visible ? 1 : 0,
      transition: 'opacity .22s, transform .22s',
      background: 'rgba(255,255,255,.12)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,.15)',
      borderRadius: '20px',
      padding: '8px 18px',
      fontSize: '13px',
      fontWeight: 600,
      color: '#fff',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      {msg}
    </div>
  )
}
