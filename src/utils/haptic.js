const tg = () => window?.Telegram?.WebApp

export const hap = {
  ok:   () => tg()?.HapticFeedback?.notificationOccurred('success'),
  err:  () => tg()?.HapticFeedback?.notificationOccurred('error'),
  warn: () => tg()?.HapticFeedback?.notificationOccurred('warning'),
  l:    () => tg()?.HapticFeedback?.impactOccurred('light'),
  m:    () => tg()?.HapticFeedback?.impactOccurred('medium'),
  h:    () => tg()?.HapticFeedback?.impactOccurred('heavy'),
}
