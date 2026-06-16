const KEY = (k) => `sw_${k}`

// ─── Generic localStorage helpers ────────────────────────────────────────────

export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(KEY(key))
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(KEY(key), JSON.stringify(value))
  } catch {
    console.warn('localStorage write failed', key)
  }
}

export function lsDel(key) {
  localStorage.removeItem(KEY(key))
}

// ─── Users JSON (local flat-file DB, keyed by TG ID) ─────────────────────────
// In v1 we persist in localStorage under sw_users.
// When migrating to Supabase, only these two functions change.

export function loadUsers() {
  return lsGet('users', {})
}

export function saveUsers(users) {
  lsSet('users', users)
}

// ─── Cosmetics ────────────────────────────────────────────────────────────────

export function loadCosm(defaults) {
  return lsGet('cosm', defaults)
}

export function saveCosm(cosm) {
  lsSet('cosm', cosm)
}

// ─── Medallions ───────────────────────────────────────────────────────────────

export function loadMedallions(defaults) {
  return lsGet('medallions', defaults)
}

export function saveMedallions(m) {
  lsSet('medallions', m)
}

// ─── Daily streak ─────────────────────────────────────────────────────────────

export function loadDailyState() {
  return lsGet('daily_state', { streak: 0, lastClaim: null })
}

export function saveDailyState(s) {
  lsSet('daily_state', s)
}

// ─── Aura ─────────────────────────────────────────────────────────────────────

export function loadAura() {
  return lsGet('aura', 0)
}

export function saveAura(n) {
  lsSet('aura', n)
}

// ─── Vitrine (achievement showcase) ──────────────────────────────────────────

export function loadVitrine() {
  return lsGet('vitrine', [])
}

export function saveVitrine(v) {
  lsSet('vitrine', v)
}

// ─── Nuke everything (self-destruct) ─────────────────────────────────────────

export function resetAll() {
  const keys = ['users', 'cosm', 'medallions', 'daily_state', 'aura', 'vitrine']
  keys.forEach(lsDel)
}
