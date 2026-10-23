import { motionSettings, type MotionSettings } from '../theme/motion'
import { useTheme } from '../theme'

const INSTANT = motionSettings('OFF')

/** Perfil de movimento do tema; sem provedor de tema (testes, previews) tudo é instantâneo. */
export function useMotion(): MotionSettings {
  const theme = useTheme() as { motion?: MotionSettings }
  return theme.motion ?? INSTANT
}
