// debuffs.js
// Full debuff catalog with visual effect functions.
// Each debuff has:
//   id, name, desc, color (hex), tier ('common'|'medium'|'hard'|'hardest')
//   apply(text) → transformed string shown in the chat bubble
//   cssClass → className to add to the bubble element for CSS-driven effects

export const DEBUFF_TIERS = {
  common:  { label: 'Обычный',  color: '#a78bfa' },  // purple
  medium:  { label: 'Средний',  color: '#c7a35b' },  // light gold
  hard:    { label: 'Сложный',  color: '#ef4444' },  // red
  hardest: { label: 'Чёрный',  color: '#1a1a1a', border: '#444' }, // black
}

/* ── helpers ── */
const mirror  = (str) => str.split('').reverse().join('')
const sinCase = (str) =>
  str.split('').map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase())).join('')

export const DEBUFFS_CATALOG = [
  {
    id: 'gravitation',
    name: 'ГРАВИТАЦИЯ',
    desc: 'Каждая буква левитирует под своим углом',
    tier: 'medium',
    color: DEBUFF_TIERS.medium.color,
    cssClass: 'debuff-gravitation',
    apply: (text) => text,  // CSS handles the per-letter rotation via spans
    renderBubble: (text) =>
      text.split('').map((c, i) =>
        `<span style="display:inline-block;transform:rotate(${(Math.random()*30-15).toFixed(1)}deg)">${c}</span>`
      ).join(''),
  },
  {
    id: 'strobe',
    name: 'СТРОБ',
    desc: 'Слова быстро мигают',
    tier: 'hard',
    color: DEBUFF_TIERS.hard.color,
    cssClass: 'debuff-strobe',
    apply: (text) => text,  // CSS animation handles flicker
  },
  {
    id: 'sinus',
    name: 'СИНУС',
    desc: 'Буквы с разным регистром',
    tier: 'common',
    color: DEBUFF_TIERS.common.color,
    cssClass: 'debuff-sinus',
    apply: (text) => sinCase(text),
  },
  {
    id: 'slowmo',
    name: 'СЛОУ-МО',
    desc: 'Слова появляются медленно, по букве',
    tier: 'medium',
    color: DEBUFF_TIERS.medium.color,
    cssClass: 'debuff-slowmo',
    apply: (text) => text,
    renderBubble: (text) =>
      text.split('').map((c, i) =>
        `<span style="animation-delay:${(i * 0.06).toFixed(2)}s">${c === ' ' ? '&nbsp;' : c}</span>`
      ).join(''),
  },
  {
    id: 'mirror',
    name: 'ЗЕРКАЛО',
    desc: 'Слово или предложение полностью отражено по горизонтали',
    tier: 'hard',
    color: DEBUFF_TIERS.hard.color,
    cssClass: 'debuff-mirror',
    apply: (text) => mirror(text),
  },
  {
    id: 'glitch',
    name: 'ГЛИТЧ',
    desc: 'Слова рассыпаются в пиксели',
    tier: 'hardest',
    color: '#e2e8f0',
    cssClass: 'debuff-glitch',
    apply: (text) => text,  // CSS glitch animation
  },
  {
    id: 'whisper',
    name: 'ШЕПОТ',
    desc: 'Прозрачный текст',
    tier: 'medium',
    color: DEBUFF_TIERS.medium.color,
    cssClass: 'debuff-whisper',
    apply: (text) => text,  // CSS opacity
  },
  {
    id: 'porridge',
    name: 'КАША',
    desc: 'Слова перемешаны',
    tier: 'hard',
    color: DEBUFF_TIERS.hard.color,
    cssClass: 'debuff-porridge',
    apply: (text) => {
      const words = text.split(' ')
      return words.sort(() => Math.random() - 0.5).join(' ')
    },
  },
  {
    id: 'echo',
    name: 'ЭХО',
    desc: 'Слова сдвигаются вправо, как бегущая строка',
    tier: 'common',
    color: DEBUFF_TIERS.common.color,
    cssClass: 'debuff-echo',
    apply: (text) => text,  // CSS marquee/scroll animation
  },
  {
    id: 'fog',
    name: 'ТУМАН',
    desc: 'Блюрит случайные слова',
    tier: 'medium',
    color: DEBUFF_TIERS.medium.color,
    cssClass: 'debuff-fog',
    apply: (text) => text,  // React renders some words with blur
    renderBubble: (text) =>
      text.split(' ').map(w =>
        Math.random() < 0.4
          ? `<span style="filter:blur(4px)">${w}</span>`
          : w
      ).join(' '),
  },
  {
    id: 'hotdice',
    name: 'ГОРЯЧИЙ ДАЙС',
    desc: 'Не позволяет выбросить больше 10 на дайсе',
    tier: 'hardest',
    color: '#e2e8f0',
    cssClass: '',
    apply: (text) => text,
    // Logic: when rolling, cap result at 10
    rollCap: 10,
  },
]

// Lookup by id
export const getDebuff = (id) => DEBUFFS_CATALOG.find(d => d.id === id) || null

// Apply a debuff transform to text before displaying
export function applyDebuff(debuff, text) {
  if (!debuff) return text
  const def = typeof debuff === 'string' ? getDebuff(debuff) : debuff
  if (!def?.apply) return text
  return def.apply(text)
}

// Roll a dice respecting ГОРЯЧИЙ ДАЙС cap
export function rollWithDebuff(debuff) {
  const def = typeof debuff === 'string' ? getDebuff(debuff) : debuff
  const cap = def?.rollCap ?? 20
  return Math.floor(Math.random() * cap) + 1
}

/* ── CSS to inject once (add to App.css or call injectDebuffStyles()) ── */
export const DEBUFF_CSS = `
/* Strobe */
@keyframes db-strobe { 0%,49%{opacity:1} 50%,100%{opacity:0} }
.debuff-strobe { animation: db-strobe 0.18s steps(1) infinite; }

/* Glitch */
@keyframes db-glitch {
  0%   { transform: translate(0); }
  20%  { transform: translate(-2px, 1px); clip-path: inset(20% 0 60% 0); }
  40%  { transform: translate(2px, -1px); clip-path: inset(60% 0 20% 0); }
  60%  { transform: translate(-1px, 2px); clip-path: inset(40% 0 40% 0); }
  80%  { transform: translate(1px, 0);   clip-path: inset(10% 0 80% 0); }
  100% { transform: translate(0); }
}
.debuff-glitch { animation: db-glitch 0.3s infinite; }

/* Whisper */
.debuff-whisper { opacity: 0.35; }

/* Echo (marquee) */
@keyframes db-echo { from{transform:translateX(0)} to{transform:translateX(-60%)} }
.debuff-echo { display:inline-block; animation: db-echo 4s linear infinite; }

/* Slow-mo: each letter fades in on its own delay */
@keyframes db-letter { from{opacity:0; filter:blur(3px)} to{opacity:1; filter:blur(0)} }
.debuff-slowmo span { display:inline-block; opacity:0; animation: db-letter 0.35s ease forwards; }
`

export function injectDebuffStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById('debuff-styles')) return
  const s = document.createElement('style')
  s.id = 'debuff-styles'
  s.textContent = DEBUFF_CSS
  document.head.appendChild(s)
}
