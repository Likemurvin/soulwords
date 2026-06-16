// ─── Portrait catalog ─────────────────────────────────────────────────────────
// img: uses getPortraitAvatar(id) from assets.js — drop a PNG at
//      /assets/portraits/avatar_{id}.png and it renders automatically.
// frame: uses getPortraitFrame(id) — /assets/portraits/frame_{id}.png
// css/art: fallback if no image file exists (same as current behavior)

export const PORTRAIT_CATALOG = [
  { id: 'p_default',  name: 'Стандарт', free: true,  css: 'background:#1a1a2a' },
  { id: 'p_5232',     name: 'Дымный Скелет',  free: true,  img: true },
  { id: 'p_61353',     name: 'Изумрудная Красотка',   cost: 300,   img:true },
  { id: 'p_3513',    name: 'Изумрудный Гангстер',  cost: 300,   img:true },
  { id: 'p_8232',   name: 'Морской Джентельмен',  cost: 300,   img:true },
  { id: 'p_3232',     name: 'Алый Джокер',  cost: 500,   img: true },
  { id: 'p_61354', name: 'Морской Бродяга',   cost: 800,   img: true },
  
  { id: 'p_blueclown', name: 'Морской Весельчак',   cost: 800,   img: true },
  { id: 'p_bluegambler', name: 'Морской Картежник',   cost: 800,   img: true },
  { id: 'p_blueman1', name: 'Морской Законник',   cost: 800,   img: true },
  { id: 'p_blueman2', name: 'Морской Праведник',   cost: 800,   img: true },
  { id: 'p_blueman3', name: 'Морской Шпион',   cost: 800,   img: true },
  { id: 'p_brownmask', name: 'Песчаный Фантомас',   cost: 800,   img: true },
  { id: 'p_brownspy', name: 'Песчаный Шпион',   cost: 800,   img: true },
  { id: 'p_browntwins', name: 'Песчаные Близнецы',   cost: 800,   img: true },
  { id: 'p_brownugly', name: 'Песчаный Уродец',   cost: 800,   img: true },
  { id: 'p_bwbandos', name: 'Дымный Бандос',   cost: 800,   img: true },
  { id: 'p_bwclown', name: 'Дымный Джокер',   cost: 800,   img: true },
  { id: 'p_bwmystic', name: 'Дымный Мистик',   cost: 800,   img: true },
  { id: 'p_grbandit', name: 'Изумрудный Бандос',   cost: 800,   img: true },
  { id: 'p_grbandos', name: 'Изумрудный Хитрец',   cost: 800,   img: true },
  { id: 'p_grgambler', name: 'Изумрудный Картежник',   cost: 800,   img: true },
  { id: 'p_grgirl', name: 'Изумрудная Лиса',   cost: 800,   img: true },
  { id: 'p_grmagic', name: 'Изумрудный Законник',   cost: 800,   img: true },
  { id: 'p_mime', name: 'Дымный Мим',   cost: 800,   img: true },
]

// ─── Round config ─────────────────────────────────────────────────────────────
export const ROUND_CONFIG = [
  { round: 1, diff: 'easy',       label: '🟢 EASY',       souls: 5  },
  { round: 2, diff: 'medium',     label: '🟡 MEDIUM',     souls: 10 },
  { round: 3, diff: 'hard',       label: '🔴 HARD',       souls: 15 },
  { round: 4, diff: 'diabolical', label: '💀 DIABOLICAL', souls: 20 },
]

// ─── Shop items ───────────────────────────────────────────────────────────────
export const SHOP_ITEMS = [
  { id: 'stamina', icon: '⚡', name: 'Стамина',    desc: '+20 стамины',           cost: 50  },
  { id: 'x2',      icon: '×2', name: 'Двойная',    desc: '×2 к душам в матче',   cost: 120 },
]

// ─── Dice catalog ─────────────────────────────────────────────────────────────
export const DICE_CATALOG = [
  { id: 'duster',   name: 'Duster',   bg: 'linear-gradient(145deg,#4a5e2a,#8a9a3a,#6b7c30)', free: true },
  { id: 'slime',    name: 'Slime',    bg: 'linear-gradient(145deg,#1a6b2a,#4adb6a,#2d9b45)', cost: 777 },
  { id: 'gradient', name: 'Gradient', bg: 'linear-gradient(145deg,#e91e8c,#7c3aed,#3b82f6)', free: false, owned: true },
  { id: 'metal',    name: 'Metal',    bg: 'linear-gradient(145deg,#555,#aaa,#777)',            free: false, owned: true },
  { id: 'moxxie',   name: 'Moxxie',   bg: 'linear-gradient(145deg,#7c2d12,#dc6b2a,#f59e0b)', cost: 466 },
  { id: 'void',     name: 'Void',     bg: 'linear-gradient(145deg,#0f0f1a,#1e1b4b,#312e81)', cost: 277 },
  { id: 'rad',      name: 'Rad',      bg: 'linear-gradient(145deg,#14532d,#16a34a,#bbf7d0)', cost: 468 },
  { id: 'gear',     name: 'Gear',     bg: 'linear-gradient(145deg,#374151,#6b7280,#d1d5db)', cost: 294 },
  { id: 'matrix',   name: 'Matrix',   bg: 'linear-gradient(145deg,#052e16,#16a34a,#4ade80)', cost: 500 },
  { id: 'gzel',     name: 'Gzel',     bg: 'linear-gradient(145deg,#1e3a5f,#2563eb,#93c5fd)', cost: 858 },
]

// ─── Profile backgrounds ──────────────────────────────────────────────────────
export const PROFILE_BGS = [
  { id: 'pb_default', bg: 'var(--bg)',                              free: true },
  { id: 'pb_black',   bg: 'linear-gradient(180deg, #0B0B0B, #121E2C)',free: true },
  { id: 'pb_orange',  bg: 'linear-gradient(180deg, #0B0B0B, #122C16)', cost: 158 },
  { id: 'pb_mint',    bg: 'linear-gradient(180deg, #0B0B0B, #2C1D12)', cost: 158 },
  { id: 'pb_cyan',    bg: 'linear-gradient(180deg, #0B0B0B, #2a2a2a)', cost: 158 },
  { id: 'pb_pink',    bg: 'linear-gradient(180deg, #0B0B0B, #2C122C)', cost: 158 },
  { id: 'pb_purple',  bg: 'linear-gradient(180deg, #0B0B0B, #1D2C12)', cost: 158 },
]

// ─── Bubble colors ────────────────────────────────────────────────────────────
export const BUBBLE_COLORS = [
  { id: 'bc_default', bg: 'linear-gradient(135deg,#6D28D9,#A78BFA)', txt: '#fff',    free: true,  label: 'Стандарт' },
  { id: 'bc_beige',   bg: '#E8DCC8', txt: '#1a1a1a', cost: 290, label: 'Пустыня' },
  { id: 'bc_sky',     bg: '#BAE6FD', txt: '#075985', cost: 290, label: 'Небо'    },
  { id: 'bc_rose',    bg: '#FBCFE8', txt: '#9d174d', cost: 290, label: 'Роза'    },
  { id: 'bc_dark',    bg: '#1f2937', txt: '#f9fafb', cost: 480, label: 'Ночь'    },
  { id: 'bc_blue',    bg: '#2563EB', txt: '#ffffff', cost: 590, label: 'Синий'   },
  { id: 'bc_yellow',  bg: '#FEF08A', txt: '#713f12', cost: 290, label: 'Лимон'   },
  { id: 'bc_pink2',   bg: '#F9A8D4', txt: '#831843', cost: 290, label: 'Сакура'  },
  { id: 'bc_white',   bg: '#F8FAFC', txt: '#0f172a', cost: 290, label: 'Белый'   },
]

// ─── Chat backgrounds ─────────────────────────────────────────────────────────
export const CHAT_BGS = [
  { id: 'cbg_dark',     bg: '#07070F',                               free: true, label: 'Тёмный'  },
  { id: 'cbg_red',      bg: 'linear-gradient(160deg,#7f1d1d,#c2410c)', cost: 490, label: 'Алый'   },
  { id: 'cbg_purple',   bg: 'linear-gradient(160deg,#3b0764,#6d28d9)', cost: 490, label: 'Туман'  },
  { id: 'cbg_forest',   bg: 'linear-gradient(160deg,#052e16,#065f46)', cost: 490, label: 'Лес'    },
  { id: 'cbg_ocean',    bg: 'linear-gradient(160deg,#0c4a6e,#0284c7)', cost: 490, label: 'Океан'  },
  { id: 'cbg_midnight', bg: 'linear-gradient(160deg,#0f0f23,#1e1b4b)', cost: 490, label: 'Полночь'},
]

// ─── Daily rewards ────────────────────────────────────────────────────────────
export const DAILY_REWARDS = [
  { day: 1, bonus: 30,  label: 'Пн' },
  { day: 2, bonus: 50,  label: 'Вт' },
  { day: 3, bonus: 40,  label: 'Ср' },
  { day: 4, bonus: 60,  label: 'Чт' },
  { day: 5, bonus: 80,  label: 'Пт' },
  { day: 6, bonus: 200, label: 'Сб', jackpot: true },
]

// ─── Medallions ───────────────────────────────────────────────────────────────
export const MED_STACK_TIERS = [1, 5, 10, 20]
export const MED_AURA_MAX = 1000

export const MEDALLIONS = {
  souls: {
    id: 'souls', name: 'Soul Spades', dur: 12,
    effect: '+% к получению душ',
    getDesc: (stack) => `+${MED_STACK_TIERS[Math.min(stack - 1, 3)]}% к получению душ`,
  },
  stam: {
    id: 'stam', name: 'Stamina of Clubs', dur: 12,
    effect: '-% затрат стамины',
    getDesc: (stack) => `-${MED_STACK_TIERS[Math.min(stack - 1, 3)]}% затрат стамины`,
  },
  aur: {
    id: 'aur', name: 'Diamond Aura', dur: 24,
    effect: '+10 ауры',
    getDesc: () => '+10 ауры (рамка для аватара)',
  },
}

// ─── Rooms ────────────────────────────────────────────────────────────────────
export const ROOMS = [
  { id: 'quick',  icon: '⚡', name: 'Быстрый матч',  sub: 'Режим: 4 раунда',     prize: 100 },
  { id: 'ranked', icon: '🏆', name: 'Рейтинговый',   sub: 'Режим: рейтинг',      prize: 200 },
  { id: 'duel',   icon: '⚔️', name: 'Дуэль',         duel: true,                 prize: 50  },
]

// ─── Debuffs ──────────────────────────────────────────────────────────────────
export const DEBUFFS = [
  { id: 'тишина',  name: 'Тишина',  icon: '🤫', color: '#a78bfa', effect: 'Нельзя использовать буквы А, Е, О, И' },
  { id: 'спешка',  name: 'Спешка',  icon: '⏰', color: '#f59e0b', effect: 'Таймер ×0.75' },
  { id: 'эхо',     name: 'Эхо',     icon: '🔁', color: '#60a5fa', effect: 'Каждое слово дублируется через 3 сек' },
  { id: 'туман',   name: 'Туман',   icon: '🌫️', color: '#94a3b8', effect: 'Слово скрыто на 5 сек' },
  { id: 'зеркало', name: 'Зеркало', icon: '🪞', color: '#f472b6', effect: 'Всё написанное отображается зеркально' },
]

// ─── Achievements ─────────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
 
  // ─── Starter ──────────────────────────────────────────────────────────────
  { id: 'first_game',     cat: 'starter',  icon: '📌', name: 'Первые шаги',        desc: 'Сыграй первый матч'                              },
  { id: 'first_win',      cat: 'starter',  icon: '🏆', name: 'Первая победа',       desc: 'Победи в первом матче'                           },
  { id: 'first_word',     cat: 'starter',  icon: '📝', name: 'Первое слово',        desc: 'Угадай первое слово'                             },
  { id: 'first_souls',    cat: 'starter',  icon: '🫧', name: 'Звенит в карманах',   desc: 'Заработай первые 50 душ'                         },
  { id: 'first_shop',     cat: 'starter',  icon: '🛒', name: 'Продать душу',        desc: 'Соверши первую покупку в игровом магазине'       },
  { id: 'first_friend',   cat: 'starter',  icon: '👯', name: 'Вместе веселее',      desc: 'Пригласи и сыграй с другом'                      },
 
  // ─── Normal ───────────────────────────────────────────────────────────────
  { id: 'no_stamina',     cat: 'normal',   icon: '🕳', name: 'На нуле',             desc: 'Заверши матч с 0 стаминой'                       },
  { id: 'last_breath',    cat: 'normal',   icon: '💔', name: 'Последний вздох',     desc: 'Заверши матч без покупки стамины'                },
  { id: 'lucky_fail',     cat: 'normal',   icon: '🍌', name: 'Неудачная удача',     desc: 'Выброси 1 на дайсе 5 раз и победи'              },
  { id: 'amateur',        cat: 'normal',   icon: '💰', name: 'Любитель',            desc: 'Накопи 1000 душ за карьеру'                      },
  { id: 'good_duel',      cat: 'normal',   icon: '⚡', name: 'Неплохая дуэль',      desc: 'Заработай 200+ душ за один матч'                 },
  { id: 'overweight',     cat: 'normal',   icon: '⚖️', name: 'Перевес',             desc: 'Сыграй 10 матчей с душами больше, чем у соперника' },
  { id: 'diplomat',       cat: 'normal',   icon: '🕊️', name: 'Дипломатия',          desc: 'Загадай 50 слов другим игрокам'                  },
  { id: 'bling',          cat: 'normal',   icon: '✨', name: 'Блестяшки',           desc: 'Соверши первую покупку в магазине кастомизации'  },
  { id: 'debuff_all',     cat: 'normal',   icon: '🦠', name: 'Иммунитет',           desc: 'Испытай все виды дебаффов хотя бы раз'           },
  { id: 'mousetrap',      cat: 'normal',   icon: '🪤', name: 'Мышеловка',           desc: 'Загадай слово — соперник ошибся 5 раз'           },
  { id: 'diligent',       cat: 'normal',   icon: '🪨', name: 'Усидчивый',           desc: 'Выполни 7 ежедневных заданий подряд',            title: 'Diligent' },
 
  // ─── Cumulative ───────────────────────────────────────────────────────────
  { id: 'crit_lucky',     cat: 'cumul',    icon: '🎲', name: 'Критический везунчик', stat: 'critRolls',    tiers: [1, 10, 50, 100, 500],  title: 'Critical' },
  { id: 'erudition',      cat: 'cumul',    icon: '👁', name: 'Эрудиция',             stat: 'firstGuesses', tiers: [1, 10, 50, 100, 500],  title: 'Oracle'   },
  { id: 'games_played',   cat: 'cumul',    icon: '🚩', name: 'Это конец?',           stat: 'gamesPlayed',  tiers: [10, 50, 100, 500],     title: 'Endless'  },
  { id: 'words_guessed',  cat: 'cumul',    icon: '📖', name: 'Словарь',              stat: 'wordsGuessed', tiers: [10, 50, 100, 250, 500]                   },
  { id: 'souls_earned',   cat: 'cumul',    icon: '🔥', name: 'Коллектор душ',        stat: 'soulsEarned',  tiers: [500, 2000, 5000, 10000, 50000]            },
 
  // ─── Hardcore ─────────────────────────────────────────────────────────────
  { id: 'hc_crit',        cat: 'hardcore', icon: '🎰', name: 'Критический',         desc: 'Выброси 20 на дайсе 500 раз',                   title: 'Critical'        },
  { id: 'hc_oracle',      cat: 'hardcore', icon: '🪬', name: 'Оракул',              desc: 'Угадай слово с первого раза 500 раз',            title: 'Oracle'          },
  { id: 'hc_survivor',    cat: 'hardcore', icon: '🩸', name: 'Выживший',            desc: 'Победи матч, имея 1 единицу стамины',            title: 'Survivor'        },
  { id: 'hc_ancient',     cat: 'hardcore', icon: '👹', name: 'Древний',             desc: 'Получи все достижения',                          title: 'Old One'         },
  { id: 'hc_lord',        cat: 'hardcore', icon: '🏆', name: 'Лорд Душ',            desc: 'Займи 1 место в таблице лидеров',                title: 'Lord of the Souls' },
  { id: 'hc_duelist',     cat: 'hardcore', icon: '⚔️', name: 'Дуэлянт',             desc: 'Сыграй матч, где у обоих игроков 200+ душ',      title: 'Duelist'         },
  { id: 'hc_aura',        cat: 'hardcore', icon: '♦️', name: 'Аура фарм',           desc: 'Достигни ранга Diamond Aura 4',                  title: 'Diamond'         },
 
  // ─── Donate ───────────────────────────────────────────────────────────────
  { id: 'all_dice',       cat: 'donate',   icon: '🎲', name: 'Все дайсы',           desc: 'Купи все предметы категории Дайс'                },
  { id: 'all_portraits',  cat: 'donate',   icon: '🖼', name: 'Все аватарки',        desc: 'Купи все предметы категории Аватарки'            },
  { id: 'all_bgs',        cat: 'donate',   icon: '🃏', name: 'Все фоны',            desc: 'Купи все предметы категории Фоны'                },
  { id: 'all_bubbles',    cat: 'donate',   icon: '💬', name: 'Все баблы',           desc: 'Купи все предметы категории Текстовые баблы'     },
  { id: 'shopaholic',     cat: 'donate',   icon: '🏪', name: 'Шопоголик',           desc: 'Купи все предметы в магазине',                   title: 'Shopaholic'      },
  { id: 'black_market',   cat: 'donate',   icon: '🎒', name: 'Не пойман не вор',    desc: 'Приобрети души на чёрном рынке'                  },
]
export const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
