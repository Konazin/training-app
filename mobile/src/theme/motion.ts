import type { MotionPreference } from './palette'

export type EffectiveMotion = 'FULL' | 'REDUCED' | 'OFF'

export interface MotionSettings {
  effective: EffectiveMotion
  duration: number
  translate: number
  scale: number
  navigationAnimation: 'slide_from_right' | 'fade' | 'none'
}

export function resolveMotionPreference(
  preference: MotionPreference,
  systemReduceMotion: boolean,
): EffectiveMotion {
  if (preference === 'SYSTEM') return systemReduceMotion ? 'REDUCED' : 'FULL'
  return preference
}

export function motionSettings(effective: EffectiveMotion): MotionSettings {
  if (effective === 'OFF') {
    return { effective, duration: 0, translate: 0, scale: 1, navigationAnimation: 'none' }
  }
  if (effective === 'REDUCED') {
    return { effective, duration: 100, translate: 0, scale: 1, navigationAnimation: 'fade' }
  }
  return { effective, duration: 180, translate: 8, scale: 0.98, navigationAnimation: 'slide_from_right' }
}
