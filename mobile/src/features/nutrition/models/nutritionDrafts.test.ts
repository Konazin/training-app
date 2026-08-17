import { describe, expect, it } from 'vitest'
import { localDateKey } from '@training/training-domain'
import { combineLocalDateAndTime } from './nutritionDrafts'

describe('combineLocalDateAndTime', () => {
  it.each(['00:00', '09:30', '12:00', '23:59'])('accepts %s', (time) => {
    const result = new Date(combineLocalDateAndTime('2026-08-16', time))
    expect(localDateKey(result)).toBe('2026-08-16')
    expect(result.getHours()).toBe(Number(time.slice(0, 2)))
    expect(result.getMinutes()).toBe(Number(time.slice(3)))
  })

  it.each(['24:00', '23:60', '12:99', '9:30', '1:2', 'abc', '', '12', '12:', ':30'])('rejects %s', (time) => {
    expect(() => combineLocalDateAndTime('2026-08-16', time)).toThrow()
  })
})
