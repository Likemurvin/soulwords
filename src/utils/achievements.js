// src/utils/achievements.js
// Pure achievement evaluator. Given a user, returns the list of achievement
// ids that should now be unlocked. Idempotent — callers diff against
// `user.achUnlocked` to find newly earned ones.
//
// Why client-side: the rules read fields the client already manages
// (achStats, souls/games totals, vitrine, owned cosmetics). The evaluator is
// called after every meaningful event (match end, daily claim, purchase…)
// and the unlocked set is synced to Mongo via the existing user PATCH route,
// so it's persistent without needing a parallel server implementation.
//
// Each rule returns true|false. Rules MUST be cheap and pure — no I/O, no
// random — because we call them on every relevant update.

import {
  ACHIEVEMENTS,
  DICE_CATALOG,
  PORTRAIT_CATALOG,
  PROFILE_BGS,
} from '../constants'
import { DEBUFFS_CATALOG } from '../constants/debuffs'

const ownsAll = (u, type) => {
  const owned = u.cosm?.[`owned${type[0].toUpperCase()+type.slice(1)}s`] || []
  const catalog = CATALOGS[type] || []
  return catalog.length > 0 && catalog.every(id => owned.includes(id))
}

const CATALOGS = {
  dice:     DICE_CATALOG.map(x => x.id),
  portrait: PORTRAIT_CATALOG.map(x => x.id),
  bg:       PROFILE_BGS.map(x => x.id),
  bubble:   [],  // no catalog yet — achievement stays locked, that's fine
}

const TOTAL_DEBUFF_COUNT = DEBUFFS_CATALOG.length

/* ── Per-id rules ──────────────────────────────────────────────────────── */
const RULES = {
  // ─── Starter ─────────────────────────────────────────────────────────
  first_game:   (u) => (u.achStats?.gamesPlayed   || 0) >= 1,
  first_win:    (u) => (u.achStats?.wins          || 0) >= 1,
  first_word:   (u) => (u.achStats?.wordsGuessed  || 0) >= 1,
  first_souls:  (u) => (u.achStats?.soulsEarned   || 0) >= 50,
  first_shop:   (u) => !!u.achFlags?.boughtAnyGameItem,
  first_friend: (u) => (u.invitesCount || 0) >= 1 && (u.achStats?.gamesPlayed || 0) >= 1,

  // ─── Normal ──────────────────────────────────────────────────────────
  no_stamina:   (u) => !!u.achFlags?.finishedAtZeroStamina,
  last_breath:  (u) => !!u.achFlags?.wonWithoutStaminaBuy,
  lucky_fail:   (u) => (u.achStats?.luckyFailWins || 0) >= 5,
  amateur:      (u) => (u.achStats?.soulsEarned   || 0) >= 1000,
  good_duel:    (u) => (u.achStats?.bestMatchSouls || 0) >= 200,
  overweight:   (u) => (u.achStats?.matchesWithLead || 0) >= 10,
  diplomat:     (u) => (u.achStats?.wordsExplained || 0) >= 50,
  bling:        (u) => !!u.achFlags?.boughtAnyCosm,
  debuff_all:   (u) => (u.achStats?.debuffsSeen?.length || 0) >= TOTAL_DEBUFF_COUNT,
  mousetrap:    (u) => !!u.achFlags?.fiveOppMistakesOnOneWord,
  diligent:     (u) => (u.achStats?.dailyStreak || 0) >= 7,

  // ─── Hardcore ────────────────────────────────────────────────────────
  hc_crit:      (u) => (u.achStats?.critRolls    || 0) >= 500,
  hc_oracle:    (u) => (u.achStats?.firstGuesses || 0) >= 500,
  hc_survivor:  (u) => !!u.achFlags?.wonAtOneStamina,
  hc_ancient:   (u) => {
    // "Get all achievements" — count all OTHER unlocked achievements.
    const total = ACHIEVEMENTS.filter(a => a.id !== 'hc_ancient').length
    return (u.achUnlocked?.length || 0) >= total
  },
  hc_lord:      (u) => !!u.achFlags?.heldRankOne,
  hc_duelist:   (u) => !!u.achFlags?.duelHighSouls,
  hc_aura:      (u) => (u.aura || 0) >= 4,

  // ─── Donate ──────────────────────────────────────────────────────────
  all_dice:      (u) => ownsAll(u, 'dice'),
  all_portraits: (u) => ownsAll(u, 'portrait'),
  all_bgs:       (u) => ownsAll(u, 'bg'),
  all_bubbles:   (u) => ownsAll(u, 'bubble'),
  shopaholic:    (u) =>
    ownsAll(u, 'dice') && ownsAll(u, 'portrait') &&
    ownsAll(u, 'bg')   && ownsAll(u, 'bubble'),
  black_market:  (u) => !!u.achFlags?.boughtStarsPack,
}

/* Cumulative tier achievements: unlocked when stat ≥ FIRST tier; later tiers
   are reflected in the catalog's `tiers` array (UI can show "II/V" etc). */
const cumulUnlocked = (ach, u) =>
  ach.tiers?.length && (u.achStats?.[ach.stat] || 0) >= ach.tiers[0]

/* ── Public API ────────────────────────────────────────────────────────── */

/* All currently-satisfied achievement ids. */
export function evaluateAchievements(user) {
  const unlocked = []
  for (const ach of ACHIEVEMENTS) {
    const rule = RULES[ach.id]
    const ok = rule ? rule(user) : (ach.tiers ? cumulUnlocked(ach, user) : false)
    if (ok) unlocked.push(ach.id)
  }
  return unlocked
}

/* Newly-unlocked ids vs the user's stored set. */
export function newlyUnlocked(user) {
  const now = new Set(evaluateAchievements(user))
  const prev = new Set(user.achUnlocked || [])
  const fresh = []
  for (const id of now) if (!prev.has(id)) fresh.push(id)
  return fresh
}

/* Tier index for a cumulative achievement, 0-based, or -1 if locked. */
export function tierIndex(ach, user) {
  if (!ach.tiers?.length) return -1
  const v = user.achStats?.[ach.stat] || 0
  let idx = -1
  for (let i = 0; i < ach.tiers.length; i++) if (v >= ach.tiers[i]) idx = i
  return idx
}
