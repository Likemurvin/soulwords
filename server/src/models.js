// server/src/models.js
// All Mongoose schemas in one place.
import mongoose from 'mongoose'

const { Schema, model } = mongoose

/* ── User ───────────────────────────────────────────────────────────────────
   Keyed by Telegram ID. Single source of truth for everything the client
   previously kept in localStorage. */
const UserSchema = new Schema({
  tgId:        { type: String, required: true, unique: true, index: true },
  name:        { type: String, default: '' },
  username:    { type: String, default: '' },     // telegram @username
  photoUrl:    { type: String, default: '' },

  souls:       { type: Number, default: 247 },
  stamina:     { type: Number, default: 100 },
  wins:        { type: Number, default: 0 },
  games:       { type: Number, default: 0 },
  words:       { type: Number, default: 0 },

  // Consumable inventory — Прививка / Переброс дайса live here
  inventory: {
    vaccine: { type: Number, default: 0 },   // Прививка — снимает дебафф раунда
    reroll:  { type: Number, default: 0 },   // Переброс дайса — авто-переброс при провале
  },

  // Medallions picked after matches: { id, stack, expiresAt }
  medallions: {
    souls: { type: Object, default: null },
    stam:  { type: Object, default: null },
    aur:   { type: Object, default: null },
  },

  achUnlocked: { type: [String], default: [] },
  achStats: {
    gamesPlayed:  { type: Number, default: 0 },
    wordsGuessed: { type: Number, default: 0 },
    wins:         { type: Number, default: 0 },
    critRolls:    { type: Number, default: 0 },
    firstGuesses: { type: Number, default: 0 },
    soulsEarned:  { type: Number, default: 0 },
    debuffsSeen:  { type: [String], default: [] },
    dailyStreak:  { type: Number, default: 0 },
  },

  vitrine:        { type: [String], default: [] },
  aura:           { type: Number, default: 0 },
  cosm:           { type: Object, default: null },  // cosmetics blob (dice/portrait/owned*)
  onboardingDone: { type: Boolean, default: false },

  // Referral system
  invitedBy:    { type: String, default: null },     // tgId of inviter
  invitesCount: { type: Number, default: 0 },        // how many users this user invited

  lastDailyClaim: { type: Number, default: 0 },
  createdAt:      { type: Number, default: () => Date.now() },
  lastSeen:       { type: Number, default: () => Date.now() },
})

UserSchema.index({ souls: -1 })   // leaderboard

export const User = model('User', UserSchema)

/* ── Room ───────────────────────────────────────────────────────────────────
   Private duel rooms created by the Invite button. The invite deep-link
   carries the room key; whoever opens the app through it joins the room. */
const RoomSchema = new Schema({
  key:       { type: String, required: true, unique: true, index: true },
  hostTgId:  { type: String, required: true, index: true },
  hostName:  { type: String, default: '' },
  members:   { type: [{ tgId: String, name: String, joinedAt: Number }], default: [] },
  themeId:   { type: String, default: 'all' },
  state:     { type: String, enum: ['open', 'playing', 'closed'], default: 'open' },
  matchId:   { type: String, default: null },   // live in-memory match id once started
  createdAt: { type: Number, default: () => Date.now() },
})

export const Room = model('Room', RoomSchema)

/* ── QueueEntry ─────────────────────────────────────────────────────────────
   Matchmaking queue. One document per waiting player, keyed by theme.
   Entries auto-expire after 2 minutes (heartbeat refreshes them). */
const QueueEntrySchema = new Schema({
  tgId:      { type: String, required: true, index: true },
  name:      { type: String, default: '' },
  level:     { type: Number, default: 1 },
  themeId:   { type: String, required: true, index: true },
  matchedWith: { type: Schema.Types.Mixed, default: null },  // { tgId, name, level } once paired
  updatedAt: { type: Date, default: Date.now, expires: 120 },
})

export const QueueEntry = model('QueueEntry', QueueEntrySchema)

/* ── StarPayment ────────────────────────────────────────────────────────────
   Audit trail for Telegram Stars purchases (Чёрный рынок). */
const StarPaymentSchema = new Schema({
  tgId:      { type: String, required: true, index: true },
  packId:    { type: String, required: true },
  stars:     { type: Number, required: true },
  souls:     { type: Number, required: true },
  tgChargeId:{ type: String, default: '' },
  status:    { type: String, enum: ['pending', 'paid'], default: 'pending' },
  createdAt: { type: Number, default: () => Date.now() },
})

export const StarPayment = model('StarPayment', StarPaymentSchema)
