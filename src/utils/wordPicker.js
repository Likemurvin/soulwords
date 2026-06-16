// Word picker — loads words lazily by language
const cache = {}

export async function loadWords(lang = 'ru') {
  if (cache[lang]) return cache[lang]
  try {
    const mod = await import(`../data/words.${lang}.json`)
    cache[lang] = mod.default
    return cache[lang]
  } catch {
    console.warn(`Word list not found for lang: ${lang}`)
    return []
  }
}

export function pickWord(words, difficulty, usedWords = []) {
  const pool = words.filter((w) => w.d === difficulty)
  const fresh = pool.filter((w) => !usedWords.includes(w.w))
  const src = fresh.length ? fresh : pool
  if (!src.length) return null
  return { ...src[Math.floor(Math.random() * src.length)] }
}

export function hasForbidden(text, word) {
  if (!word) return false
  const t = text.toUpperCase().replace(/Ё/g, 'Е')
  const targets = [word.w, ...(word.fr || [])]
  return targets.some((r) => t.includes(r.toUpperCase().replace(/Ё/g, 'Е')))
}
