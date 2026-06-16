// src/utils/preloadAssets.js
// Fetches the dice roll animations and number-reveal videos in the background
// so they're in cache (HTTP + Service Worker) before the user actually rolls.
// Without this, the 280×280 roll.webm starts buffering only when the dice
// overlay opens, and most users see ~40% of the animation cold-loading.
//
// Strategy: fire off `fetch(url)` for each asset. The browser+SW pull the
// bytes; subsequent <video src="…"> requests are served from cache.
// Cheap (~14MB total once-per-session) and non-blocking — we never await.

import { getDiceRollVideo, getNumShowVideo, getDicePreviewImg } from '../assets'

const DICE_TYPES = ['duster', 'metal', 'slime', 'gradient']
let warmed = false

/* Fire-and-forget; safe to call multiple times. */
export function preloadGameAssets() {
  if (warmed) return
  warmed = true

  const urls = []

  // One roll.webm per dice skin
  for (const t of DICE_TYPES) urls.push(getDiceRollVideo(t))
  // Preview PNGs for shop/cosm screens
  for (const t of DICE_TYPES) urls.push(getDicePreviewImg(t))
  // Number reveal videos (1..20). Each is small (~100-300KB except 20).
  for (let i = 1; i <= 20; i++) urls.push(getNumShowVideo(i))

  // Spread the requests across a few ticks so we don't choke the connection
  // on first paint. The SW caches whatever lands; missing files just 404.
  let i = 0
  const tick = () => {
    const batch = urls.slice(i, i + 4)
    if (!batch.length) return
    for (const u of batch) {
      // GET with no-store off so the SW + browser cache can capture the body.
      fetch(u, { cache: 'default', mode: 'cors' }).catch(() => {})
    }
    i += 4
    if (i < urls.length) setTimeout(tick, 200)
  }
  tick()
}
