// ChatsScreen.jsx
import { useState, useEffect } from 'react'
import { useNav, SCREENS } from '../components/Nav'
import { useUserStore } from '../store'
import { useGameStore } from '../store/gameStore'
import { TopNav } from '../components/TopNav'
import { api } from '../utils/api'
import { toast } from '../components/Toast'

const DIFF_COLOR = { easy: '#00D26A', medium: '#FFB800', hard: '#FF4560' }

export function ChatsScreen() {
  const { go, back } = useNav()
  const theme = useGameStore(s => s.selectedTheme)
  const setLobbyRoomKey = useGameStore(s => s.setLobbyRoomKey)
  const [waiting, setWaiting] = useState(0)
  const [codeModal, setCodeModal] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeBusy, setCodeBusy]   = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => api.queueStatus().then(r => { if (alive && r) setWaiting(r.byTheme?.[theme.id]?.count || 0) })
    load()
    const t = setInterval(load, 5000)
    return () => { alive = false; clearInterval(t) }
  }, [theme.id])

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
    }}>
      <TopNav onBack={back} />

      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '76px 20px 0',
      }}>

        {/* Title */}
        <div style={{
          fontSize: 22, fontWeight: 900, textAlign: 'center',
          marginBottom: 24, fontFamily: 'Roboto Mono, monospace',
        }}>
          Chats
        </div>

        {/* Hero card — tap to pick theme */}
        <button
          onClick={() => go(SCREENS.TOPIC_PICK)}
          style={{
            width: '100%', borderRadius: 24, overflow: 'hidden',
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', textAlign: 'left', padding: 0,
            display: 'block', marginBottom: 24,
          }}
        >
          <HeroImage src={theme.img} name={theme.name} />

          <div style={{ padding: '16px 20px 20px' }}>
            <div style={{
              display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', marginBottom: 8,
            }}>
              <div style={{
                fontSize: 20, fontWeight: 900, color: '#fff',
                fontFamily: 'Roboto Mono, monospace',
              }}>
                {theme.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 12 }}>
                <span style={{
                  fontSize: 16, fontWeight: 900, color: '#c7a35b',
                  fontFamily: 'Roboto Mono, monospace',
                }}>
                  +{theme.souls}
                </span>
                <HeartIcon />
              </div>
            </div>

            <div style={{
              fontSize: 13, color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.6, marginBottom: 16,
              fontFamily: 'Roboto Mono, monospace',
            }}>
              {theme.desc}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                fontSize: 12, color: 'rgba(255,255,255,0.35)',
                fontFamily: 'Roboto Mono, monospace',
              }}>
                {theme.diff && (
                  <>
                    Сложность:{' '}
                    <span style={{ color: DIFF_COLOR[theme.diff] || '#fff', fontWeight: 700 }}>
                      {theme.diffLabel?.toUpperCase()}
                    </span>
                  </>
                )}
              </div>
              {theme.daily && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'Roboto Mono, monospace',
                  }}>
                    Дейлик
                  </span>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#e53935',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 900, color: '#fff',
                  }}>1</div>
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Action buttons */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 16px))',
        }}>
          {/* Public matchmaking — primary path */}
          <button
            onClick={() => go(SCREENS.MATCHMAKING)}
            style={{
              height: 56, borderRadius: 28,
              background: '#fff', border: 'none',
              color: '#000', fontSize: 14, fontWeight: 900, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'Roboto Mono, monospace',
            }}
          >
            Поиск матча
            {waiting > 0 && (
              <span style={{ background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '2px 8px', fontSize: 12, fontWeight: 900 }}>
                {waiting}
              </span>
            )}
            <span className="material-icons-round" style={{ fontSize: 20 }}>arrow_right_alt</span>
          </button>

          {/* Private rooms row: create OR join by code */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={async () => {
                const res = await api.createRoom(theme.id)
                if (!res?.room) { toast('Не удалось создать комнату'); return }
                setLobbyRoomKey(res.room.key)
                go(SCREENS.ROOM_LOBBY)
              }}
              style={{
                flex: 1, height: 52, borderRadius: 26,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: 'Roboto Mono, monospace',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 18 }}>group_add</span>
              Создать комнату
            </button>

            <button
              onClick={() => { setCodeInput(''); setCodeModal(true) }}
              style={{
                flex: 1, height: 52, borderRadius: 26,
                background: 'rgba(199,163,91,0.1)', border: '1px solid rgba(199,163,91,0.25)',
                color: '#c7a35b', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: 'Roboto Mono, monospace',
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 18 }}>login</span>
              Ввести код
            </button>
          </div>
        </div>
      </div>

      {/* In-app code-entry sheet. Telegram WebView blocks window.prompt, so we
          render our own. Tap-outside or Cancel dismisses. */}
      {codeModal && (
        <div
          onClick={() => !codeBusy && setCodeModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 1000, animation: 'fadeIn .15s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#15151a', width: '100%', maxWidth: 520,
              borderRadius: '24px 24px 0 0',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 16px))',
              display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.15)', margin: '0 auto 4px' }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff',
              fontFamily: "'Roboto Mono', monospace", textAlign: 'center' }}>
              Введите код комнаты
            </div>
            <input
              type="text"
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.trim())}
              onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('sw-join-go')?.click() }}
              placeholder="например, eFscAdml"
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 16, fontWeight: 700,
                padding: '0 16px', outline: 'none',
                fontFamily: "'Roboto Mono', monospace",
                letterSpacing: '0.08em', textAlign: 'center',
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setCodeModal(false)}
                disabled={codeBusy}
                style={{
                  flex: 1, height: 50, borderRadius: 25,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Roboto Mono', monospace",
                }}
              >
                Отмена
              </button>
              <button
                id="sw-join-go"
                onClick={async () => {
                  const code = codeInput.trim()
                  if (!code || codeBusy) return
                  setCodeBusy(true)
                  const res = await api.joinRoom(code)
                  setCodeBusy(false)
                  if (!res?.room) {
                    toast(res?.error === 'room full' ? 'Комната заполнена' : 'Комната не найдена')
                    return
                  }
                  setCodeModal(false)
                  setLobbyRoomKey(res.room.key)
                  go(SCREENS.ROOM_LOBBY)
                }}
                disabled={!codeInput.trim() || codeBusy}
                style={{
                  flex: 1.4, height: 50, borderRadius: 25,
                  background: codeInput.trim() && !codeBusy ? '#c7a35b' : 'rgba(199,163,91,0.25)',
                  border: 'none',
                  color: codeInput.trim() && !codeBusy ? '#000' : 'rgba(255,255,255,0.4)',
                  fontSize: 14, fontWeight: 900,
                  cursor: codeInput.trim() && !codeBusy ? 'pointer' : 'not-allowed',
                  fontFamily: "'Roboto Mono', monospace",
                }}
              >
                {codeBusy ? 'Вход…' : 'Войти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HeroImage({ src, name }) {
  const [failed, setFailed] = useState(false)
  if (!failed && src) {
    return (
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
        <img
          src={src} alt={name}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }
  return (
    <div style={{
      width: '100%', aspectRatio: '16/9',
      background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f1f3d 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {[160, 110, 60].map((s, i) => (
        <div key={i} style={{
          position: 'absolute', width: s, height: s, borderRadius: '50%',
          border: '1px solid rgba(199,163,91,0.12)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        }} />
      ))}
      <span style={{
        fontSize: 13, color: 'rgba(199,163,91,0.5)',
        fontFamily: 'Roboto Mono, monospace', fontWeight: 700,
      }}>{name}</span>
    </div>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="6 12 88 92" width="16" height="16">
      <path d="M50,104 C50,104 6,73 6,41 C6,23 20,12 34,12 C42,12 48,16 50,22 C52,16 58,12 66,12 C80,12 94,23 94,41 C94,73 50,104 50,104Z" fill="#c7a35b"/>
    </svg>
  )
}