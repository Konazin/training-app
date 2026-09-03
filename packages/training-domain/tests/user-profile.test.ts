import { describe, expect, it } from 'vitest'
import { EMPTY_USER_PROFILE, validateUserProfile } from '..'

describe('user profile training days', () => {
  it('converts legacy text to unique Monday-first weekdays', () => {
    const profile = validateUserProfile({ ...EMPTY_USER_PROFILE, trainingDays: 'quinta, segunda, quinta, sábado' as never })
    expect(profile.trainingDays).toEqual(['MONDAY', 'THURSDAY', 'SATURDAY'])
  })

  it('keeps structured weekday values stable', () => {
    const profile = validateUserProfile({ ...EMPTY_USER_PROFILE, trainingDays: ['FRIDAY', 'MONDAY', 'FRIDAY'] })
    expect(profile.trainingDays).toEqual(['MONDAY', 'FRIDAY'])
  })
})
