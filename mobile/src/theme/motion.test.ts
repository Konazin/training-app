import { describe, expect, it } from 'vitest'
import { motionSettings, resolveMotionPreference } from './motion'

describe('preferência de movimento', () => {
  it('resolve sistema conforme reduzir movimento do SO', () => {
    expect(resolveMotionPreference('SYSTEM', false)).toBe('FULL')
    expect(resolveMotionPreference('SYSTEM', true)).toBe('REDUCED')
  })

  it.each(['FULL', 'REDUCED', 'OFF'] as const)('respeita seleção explícita %s', (preference) => {
    expect(resolveMotionPreference(preference, true)).toBe(preference)
    expect(resolveMotionPreference(preference, false)).toBe(preference)
  })

  it('remove translação e navegação animada no modo desativado', () => {
    expect(motionSettings('FULL')).toMatchObject({ translate: 8, navigationAnimation: 'slide_from_right' })
    expect(motionSettings('REDUCED')).toMatchObject({ translate: 0, navigationAnimation: 'fade' })
    expect(motionSettings('OFF')).toMatchObject({ duration: 0, translate: 0, navigationAnimation: 'none' })
  })
})
