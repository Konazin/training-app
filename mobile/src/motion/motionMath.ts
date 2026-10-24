import type { MotionSettings } from '../theme/motion'

/** Atraso escalonado de listas; o teto evita que o último item espere o usuário. */
export function staggerDelay(index: number, motion: MotionSettings, step = 45, cap = 8) {
  if (motion.effective !== 'FULL') return 0
  return Math.min(Math.max(index, 0), cap) * step
}

/** Duração de entrada por perfil de movimento: completo, só fade curto, ou instantâneo. */
export function enterDuration(motion: MotionSettings, full = 320) {
  if (motion.effective === 'OFF') return 0
  if (motion.effective === 'REDUCED') return motion.duration
  return full
}

/** Valor intermediário arredondado para a precisão do número final (evita "12.3000001"). */
export function tweenValue(from: number, to: number, progress: number, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round((from + (to - from) * progress) * factor) / factor
}
