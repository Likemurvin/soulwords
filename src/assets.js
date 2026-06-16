// ─────────────────────────────────────────────────────────────────────────────
// ASSET REGISTRY
//
// All external asset URLs live here. Components import from this file,
// never hardcode URLs directly.
//
// In development: put files in /public/assets/ and use relative paths below.
// In production:  replace any URL with your CDN/storage URL, e.g.:
//   const CDN = 'https://your-r2-bucket.example.com'
//   or  'https://xxxx.supabase.co/storage/v1/object/public/assets'
// ─────────────────────────────────────────────────────────────────────────────

const BASE = ''  // ← swap to your CDN root when ready, e.g. 'https://cdn.soulwords.app'

const url = (path) => `${BASE}${path}`

// ─── Dice WebM animations ────────────────────────────────────────────────────
// One roll.webm per dice type (no per-face variants).
// Filename convention: /assets/dice/{type}/roll.webm

export function getDiceRollVideo(type = 'duster') {
  return url(`/assets/dice/${type}/roll.webm`)
}

// ─── Number reveal animations ────────────────────────────────────────────────
// Universal set shared across ALL dice types — lives in its own folder.
// 20 files, one per face value.
// Filename convention: /assets/nums/num_roll_{value}.webm
// e.g. /assets/nums/num_roll_1.webm … /assets/nums/num_roll_20.webm

export function getNumShowVideo(value) {
  return url(`/assets/nums/${value}.webm`)
}

// ─── Idle / preview animations ───────────────────────────────────────────────
// Looping idle animation shown before a throw.
// Filename convention: /assets/dice/{type}/preview.webm

export function getDicePreview(type = 'duster') {
  return url(`/assets/dice/${type}/preview.webm`)
}

export function getDicePreviewImg(type = 'duster') {
  return url(`/assets/dice/${type}/preview.png`)
}

export function getDicePreviewShop(type) {
  return url(`/assets/dice/${type}/shop_preview.webm`)
}

// ─── Portraits ───────────────────────────────────────────────────────────────
// Portrait frames: /assets/portraits/frame_{id}.png
// Portrait avatars: /assets/portraits/avatar_{id}.png

export function getPortraitFrame(id) {
  return url(`/assets/portraits/frame_${id}.png`)
}

export function getPortraitAvatar(id) {
  return url(`/assets/portraits/avatar_${id}.png`)
}

// ─── Achievements ────────────────────────────────────────────────────────────
// Each achievement can have an optional graphic.
// Filename convention: /assets/achievements/{id}.png
// Falls back to the emoji icon if the file doesn't exist.

export function getAchievementImg(id) {
  return url(`/assets/achievements/${id}.png`)
}

// ─── UI graphics / PNGs ──────────────────────────────────────────────────────
// Misc UI elements — tab bar image, onboarding slides, etc.

export const UI = {
  tabBar:           url('/assets/ui/tab_bar.png'),
  onboardSlide1:    url('/assets/ui/onb_scr_1.png'),
  onboardSlide2:    url('/assets/ui/onb_scr_2.png'),
  onboardSlide3:    url('/assets/ui/onb_scr_3.png'),
  onboardSlide4:    url('/assets/ui/onb_scr_4.png'),
  onboardSlide5:    url('/assets/ui/onb_scr_5.png'),
  logoMark:         url('/assets/ui/sw_logo.png'),
  dailyIcon:        url('/assets/ui/daily_icon.png'),
  // Shop graphics
  shopHeader:       url('/assets/ui/Header.png'),
  shopFrame:        url('/assets/ui/storeframe.png'),
  shopStamina:      url('/assets/ui/stamina.png'),
  // Black market pack icons (three spade tiers)
  spades1:          url('/assets/ui/spades_1.png'),
  spades2:          url('/assets/ui/spades_2.png'),
  spades3:          url('/assets/ui/spades_3.png'),
}

// ─── Medallions ──────────────────────────────────────────────────────────────
// Filename convention: /assets/medallions/medalion_{type}_{stack}.png
// Types: dimond (aura), spades (souls), clubs (stamina). Stacks 1..4.
// Falls back to the SVG shape rendered in code if the file is missing.

export function getMedallionImg(type, stack = 1) {
  // Type aliases used in the catalog ('aur', 'souls', 'stam') → asset prefixes.
  const map = { aur: 'dimond', souls: 'spades', stam: 'clubs' }
  const prefix = map[type] || type
  const lvl = Math.min(Math.max(stack || 1, 1), 4)
  return url(`/assets/medallions/medalion_${prefix}_${lvl}.png`)
}

// ─── Nav bar icons ───────────────────────────────────────────────────────────
// One SVG per tab: /assets/ui/nav_{tab}.svg
// Tab ids must match the SCREENS values used in TabBar (hub/shop/chats/tops/profile).

export function getNavIcon(tabId) {
  return url(`/assets/ui/nav_${tabId}.svg`)
}

// ─── Music / SFX ─────────────────────────────────────────────────────────────

export const AUDIO = {
  bgLoop:     url('/assets/music/bg_loop.mp3'),
  diceRoll:   url('/assets/music/dice_roll.mp3'),
  correct:    url('/assets/music/correct.mp3'),
  wrong:      url('/assets/music/wrong.mp3'),
  matchWin:   url('/assets/music/match_win.mp3'),
  matchLose:  url('/assets/music/match_lose.mp3'),
  achUnlock:  url('/assets/music/achievement.mp3'),
}