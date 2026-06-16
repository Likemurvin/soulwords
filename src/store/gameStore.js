// store/gameStore.js
// Merged store: theme selection + matchmaking + in-game state
// Used by: ChatsScreen, TopicPickScreen, MatchmakingScreen,
//          DiceRollScreen, RoundStartScreen, GameScreen

import { create } from 'zustand'
import { DEBUFFS_CATALOG } from '../constants/debuffs'

const DEFAULT_THEME = {
  id: 'all',
  name: 'Все темы',
  img: '/assets/themes/all.png',
  desc: 'Категория, где есть все слова со сложностью легко, которые могут попасться в этой игре',
  diff: 'easy', diffLabel: 'легко', diffColor: '#00D26A',
  souls: 50, daily: true,
}

export const useGameStore = create((set, get) => ({

  /* ── Theme ── */
  selectedTheme: DEFAULT_THEME,
  setTheme: (theme) => set({ selectedTheme: theme }),

  /* ── Matchmaking ── */
  opponent: null,         // { id, name, level, title }
  isBot: false,           // true → P2E (play against the bot)
  matchId: null,          // live match id for human P2P (socket room)
  lobbyRoomKey: null,     // private room key while in the lobby (pre-match)
  setOpponent: (opp) => set({ opponent: opp }),
  setIsBot: (v) => set({ isBot: v }),
  setMatchId: (id) => set({ matchId: id }),
  setLobbyRoomKey: (key) => set({ lobbyRoomKey: key }),

  /* ── Dice roll (who goes first) ── */
  myRoll: null,       // 1-20
  oppRoll: null,      // 1-20
  rollDone: false,

  setMyRoll: (n) => {
    const oppRoll = Math.floor(Math.random() * 20) + 1
    set({ myRoll: n, oppRoll, rollDone: true })
  },

  setRolls: (my, opp) => set({ myRoll: my, oppRoll: opp, rollDone: true }),

  resetRolls: () => set({ myRoll: null, oppRoll: null, rollDone: false }),

  /* ── In-game state (used by RoundStartScreen + GameScreen) ── */
  round: 1,
  iExplain: false,
  oppName: 'Соперник',
  debuff: null,
  curWord: null,
  usedWords: [],
  myMatchSouls: 0,
  oppMatchSouls: 0,
  myStamina: 100,
  stamCostMult: 1,

  setRound:   (r)  => set({ round: r }),
  setExplain: (v)  => set({ iExplain: v }),
  setOppName: (n)  => set({ oppName: n }),
  setDebuff:  (d)  => set({ debuff: d }),
  setWord:    (w)  => set({ curWord: w }),
  addUsedWord:(w)  => set(s => ({ usedWords: [...s.usedWords, w] })),

  addMyRoundSouls:  (n) => set(s => ({ myMatchSouls:  s.myMatchSouls  + n })),
  addOppRoundSouls: (n) => set(s => ({ oppMatchSouls: s.oppMatchSouls + n })),

  // Authoritative setters used by live human matches (server-driven)
  setRoundRole: (round, iExplain) => set(s => ({
    round,
    iExplain,
    debuff: DEBUFFS_CATALOG[Math.floor(Math.random() * DEBUFFS_CATALOG.length)],
  })),
  setMatchScores: (mine, opp) => set({ myMatchSouls: mine, oppMatchSouls: opp }),

  drainMatchStamina: (n) => set(s => ({ myStamina: Math.max(0, s.myStamina - n) })),

  // Per-match bonus tracking
  _myMistakes: 0, _oppMistakes: 0,
  _myGuessed:  0, _oppGuessed:  0,
  _myChars:    0, _oppChars:    0,
  // Achievement-tracking counters (reset each match)
  _myOnes: 0,                       // how many "1" rolls I got (lucky_fail)
  _oppMistakesPeak: 0,              // consecutive opp mistakes on the current word
  _oppMistakesPeak5: false,         // tripped once peak hits 5 (mousetrap)
  _boughtStaminaThisMatch: false,   // tracks last_breath
  chatId: null,
  setChatId:      (id) => set({ chatId: id }),
  incMyMistakes:  ()   => set(s => ({ _myMistakes:  s._myMistakes  + 1 })),
  incOppMistakes: ()   => set(s => {
    const peak = s._oppMistakesPeak + 1
    return {
      _oppMistakes: s._oppMistakes + 1,
      _oppMistakesPeak: peak,
      _oppMistakesPeak5: s._oppMistakesPeak5 || peak >= 5,
    }
  }),
  resetOppMistakeStreak: () => set({ _oppMistakesPeak: 0 }),
  incMyGuessed:   ()   => set(s => ({ _myGuessed:   s._myGuessed   + 1 })),
  incOppGuessed:  ()   => set(s => ({ _oppGuessed:  s._oppGuessed  + 1 })),
  addMyChars:  (n)     => set(s => ({ _myChars:  s._myChars  + n })),
  addOppChars: (n)     => set(s => ({ _oppChars: s._oppChars + n })),
  incMyOnes:   ()      => set(s => ({ _myOnes: s._myOnes + 1 })),
  markBoughtStaminaThisMatch: () => set({ _boughtStaminaThisMatch: true }),

  rerollToken: false,
  setRerollToken: (v) => set({ rerollToken: v }),

  // one-shot inventory flags per match (round 1)
  vaccineUsed: false,
  rerollUsed: false,
  markVaccineUsed: () => set({ vaccineUsed: true }),
  markRerollUsed:  () => set({ rerollUsed: true }),

  _lastRoundSouls: null,
  _setLastRoundSouls: (v) => set({ _lastRoundSouls: v }),

  /* ── Start a fresh match — called when leaving DiceRollScreen → RoundStartScreen ── */
  initMatch: (opponent, iExplainFirst, startStamina = 100) => {
    const debuff = DEBUFFS_CATALOG[Math.floor(Math.random() * DEBUFFS_CATALOG.length)]
    set({
      round: 1,
      iExplain: iExplainFirst,
      oppName: opponent?.name || 'Соперник',
      debuff,
      curWord: null,
      usedWords: [],
      myMatchSouls: 0,
      oppMatchSouls: 0,
      myStamina: startStamina,
      stamCostMult: 1,
      _myMistakes: 0, _oppMistakes: 0,
      _myGuessed: 0,  _oppGuessed: 0,
      _myChars: 0,    _oppChars: 0,
      _myOnes: 0,
      _oppMistakesPeak: 0, _oppMistakesPeak5: false,
      _boughtStaminaThisMatch: false,
      vaccineUsed: false, rerollUsed: false,
    })
  },

  /* Advance to the next round: flip role, pick the next debuff once. */
  advanceRound: () => set(s => ({
    round: s.round + 1,
    iExplain: !s.iExplain,
    debuff: DEBUFFS_CATALOG[Math.floor(Math.random() * DEBUFFS_CATALOG.length)],
  })),

  resetGame: () => set({
    opponent: null, isBot: false, matchId: null,
    myRoll: null, oppRoll: null, rollDone: false,
    round: 1, iExplain: false, oppName: 'Соперник',
    debuff: null, curWord: null, usedWords: [],
    myMatchSouls: 0, oppMatchSouls: 0, myStamina: 100,
    _myMistakes: 0, _oppMistakes: 0,
    _myGuessed: 0,  _oppGuessed: 0,
    _myChars: 0,    _oppChars: 0,
    _myOnes: 0,
    _oppMistakesPeak: 0, _oppMistakesPeak5: false,
    _boughtStaminaThisMatch: false,
    chatId: null,
  }),
}))