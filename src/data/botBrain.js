// src/data/botBrain.js
// P2E opponent ("Демон"). Two jobs:
//
// 1. EXPLAINING (we guess): the bot owns 10 scripted words, each with a
//    hint ladder — hints get more revealing every step, so the round is
//    actually winnable and feels intentional.
//
// 2. GUESSING (we explain): the bot accumulates "knowledge" from our
//    messages. Every word we type is matched against the target word's
//    keyword cloud (built from desc + forbidden roots + hand-written
//    associations). Knowledge also grows slowly with message length and the
//    dice roll quality, so good explanations get rewarded. When knowledge
//    crosses a difficulty-dependent threshold, the bot guesses correctly;
//    before that it fires plausible near-miss guesses from the word's
//    distractor list.

/* ── 1. Bot's own words + hint ladders ───────────────────────────────────── */
export const BOT_WORDS = [
  {
    w: 'ЗЕРКАЛО', d: 'easy',
    hints: [
      'Этот предмет есть почти в каждой ванной',
      'В него смотрят каждое утро',
      'Оно показывает тебя, но наоборот',
      'Стеклянное, отражает свет',
      'Разбить его — семь лет несчастья',
    ],
  },
  {
    w: 'ОГОНЬ', d: 'easy',
    hints: [
      'Это очень горячее',
      'Появляется от спички',
      'На нём готовят еду в походе',
      'Его боятся все животные',
      'Красно-оранжевое, танцует и греет',
    ],
  },
  {
    w: 'ЧАСЫ', d: 'easy',
    hints: [
      'Этот предмет носят на руке',
      'Он тикает',
      'Показывает то, что нельзя остановить',
      'Есть стрелки, но это не лук',
      'По нему узнают, когда вставать',
    ],
  },
  {
    w: 'БИБЛИОТЕКА', d: 'medium',
    hints: [
      'Это место, здание',
      'Там нужно вести себя тихо',
      'Туда ходят за знаниями, но это не школа',
      'Там тысячи историй на полках',
      'Берёшь домой, потом возвращаешь',
    ],
  },
  {
    w: 'КОМПАС', d: 'medium',
    hints: [
      'Маленький предмет, помещается в карман',
      'Незаменим в лесу и в море',
      'У него есть стрелка, но не часы',
      'Он всегда знает, где север',
      'Работает благодаря магнитному полю',
    ],
  },
  {
    w: 'ЭХО', d: 'medium',
    hints: [
      'Это явление, его нельзя потрогать',
      'Встречается в горах и пещерах',
      'Оно повторяет за тобой',
      'Крикни — и услышишь его',
      'Звук, который вернулся обратно',
    ],
  },
  {
    w: 'ГОРИЗОНТ', d: 'hard',
    hints: [
      'Это можно увидеть, но нельзя достичь',
      'Линия, где встречаются две стихии',
      'Моряки смотрят на него часами',
      'За ним прячется солнце вечером',
      'Граница неба и земли',
    ],
  },
  {
    w: 'ЛАБИРИНТ', d: 'hard',
    hints: [
      'В нём легко потеряться',
      'Связан с древнегреческим мифом',
      'Там жил Минотавр',
      'Много коридоров и тупиков',
      'Из него искал выход Тесей с нитью',
    ],
  },
  {
    w: 'ПАРАДОКС', d: 'diabolical',
    hints: [
      'Это абстрактное понятие из логики',
      'Когда правда противоречит сама себе',
      'Пример: «это предложение — ложь»',
      'Любимая игрушка философов',
      'Ситуация, которая не должна существовать, но существует',
    ],
  },
  {
    w: 'ИЛЛЮЗИЯ', d: 'diabolical',
    hints: [
      'Это обман, но никто не виноват',
      'Фокусники создают её на сцене',
      'Глаза видят, но мозг ошибается',
      'Мираж в пустыне — её пример',
      'Кажется реальным, но это не так',
    ],
  },
]

export const pickBotWord = (difficulty, used = []) => {
  const pool  = BOT_WORDS.filter(w => w.d === difficulty && !used.includes(w.w))
  const any   = BOT_WORDS.filter(w => !used.includes(w.w))
  const src   = pool.length ? pool : (any.length ? any : BOT_WORDS)
  return src[Math.floor(Math.random() * src.length)]
}

/* ── 2. Guessing engine ──────────────────────────────────────────────────── */

/* Keyword clouds + distractor guesses for the PLAYER's word list.
   Keys match words in data/words.ru.json. Unknown words fall back to
   generic behavior (desc-keyword matching). */
const WORD_KNOWLEDGE = {
  'КОШКА':    { keys: ['мяу', 'усы', 'хвост', 'мурлы', 'питомец', 'живот', 'дом', 'мыш', 'молок', 'пушист', 'лап'], guesses: ['собака', 'хомяк', 'тигр'] },
  'СОБАКА':   { keys: ['гав', 'лает', 'хвост', 'питомец', 'друг', 'повод', 'будк', 'кост', 'охран'], guesses: ['кошка', 'волк', 'лиса'] },
  'ДОМ':      { keys: ['жив', 'крыш', 'стен', 'окн', 'двер', 'семь', 'кварт', 'здан'], guesses: ['квартира', 'дача', 'замок'] },
  'СОЛНЦЕ':   { keys: ['свет', 'неб', 'жёлт', 'желт', 'тепл', 'звезд', 'день', 'ярк', 'лето', 'загар'], guesses: ['луна', 'звезда', 'лампа'] },
  'ВОДА':     { keys: ['пить', 'жидк', 'мокр', 'река', 'море', 'океан', 'дожд', 'кран', 'прозрачн'], guesses: ['сок', 'море', 'дождь'] },
  'ОКЕАН':    { keys: ['вод', 'солён', 'солен', 'огромн', 'рыб', 'волн', 'глубок', 'тихий', 'атлант'], guesses: ['море', 'озеро', 'река'] },
  'ГИТАРА':   { keys: ['струн', 'музык', 'играть', 'аккорд', 'песн', 'дерев', 'шесть', 'рок', 'бард'], guesses: ['скрипка', 'пианино', 'балалайка'] },
  'ЗОНТИК':   { keys: ['дожд', 'мокр', 'раскры', 'ручк', 'купол', 'погод', 'осен'], guesses: ['плащ', 'шляпа', 'трость'] },
}

const norm = (s) => s.toUpperCase().replace(/Ё/g, 'Е')

/* Create per-round bot memory */
export function createBotGuesser(word) {
  const target = word?.w ? norm(word.w) : ''
  const manual = WORD_KNOWLEDGE[target] || {}
  // keyword cloud: manual keys + desc tokens + forbidden roots
  const descTokens = (word?.desc || '')
    .toUpperCase().replace(/Ё/g, 'Е')
    .split(/[^А-ЯA-Z]+/)
    .filter(t => t.length >= 4 && !target.includes(t) && !t.includes(target))
  const keys = [...(manual.keys || []).map(norm), ...descTokens]
  const distractors = manual.guesses || ['кошка', 'дом', 'машина', 'книга', 'дерево', 'река', 'солнце']

  // threshold by difficulty: easier words → bot guesses sooner
  const THRESHOLDS = { easy: 5, medium: 7, hard: 9, diabolical: 11 }
  const threshold = THRESHOLDS[word?.d] || 7

  let knowledge = 0
  let askedDistractors = []

  return {
    /* feed one explanation message; returns updated knowledge */
    learn(text, roll = 10) {
      const t = norm(text)
      const tokens = t.split(/[^А-ЯA-Z]+/).filter(Boolean)
      let gain = 0
      // keyword hits are the main signal
      for (const tok of tokens) {
        if (keys.some(k => tok.includes(k) || k.includes(tok) && tok.length >= 4)) gain += 2.2
      }
      // effort: longer meaningful explanations help a little
      gain += Math.min(2, tokens.length * 0.25)
      // dice quality: crit = clear explanation got through, fail = garbled
      if (roll >= 16) gain *= 1.4
      else if (roll <= 5) gain *= 0.35
      knowledge += gain
      return knowledge
    },

    shouldGuessCorrect() { return knowledge >= threshold },

    nextWrongGuess() {
      const fresh = distractors.filter(g => !askedDistractors.includes(g))
      const pick = (fresh.length ? fresh : distractors)[Math.floor(Math.random() * (fresh.length ? fresh.length : distractors.length))]
      askedDistractors.push(pick)
      return pick + '?'
    },

    get knowledge() { return knowledge },
    get threshold() { return threshold },
  }
}
