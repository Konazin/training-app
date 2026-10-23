import { describe, expect, it } from 'vitest'
import { motionSettings } from '../theme/motion'
import { enterDuration, staggerDelay, tweenValue } from './motionMath'

describe('matemática de movimento', () => {
  it('escalona com teto e some quando o movimento é reduzido', () => {
    const full = motionSettings('FULL')
    expect(staggerDelay(0, full)).toBe(0)
    expect(staggerDelay(3, full)).toBe(135)
    expect(staggerDelay(40, full)).toBe(8 * 45)
    expect(staggerDelay(3, motionSettings('REDUCED'))).toBe(0)
    expect(staggerDelay(3, motionSettings('OFF'))).toBe(0)
  })
  it('entrada: completa, curta ou instantânea', () => {
    expect(enterDuration(motionSettings('FULL'))).toBe(320)
    expect(enterDuration(motionSettings('REDUCED'))).toBe(100)
    expect(enterDuration(motionSettings('OFF'))).toBe(0)
  })
  it('interpola números com a precisão pedida', () => {
    expect(tweenValue(0, 100, 0.5)).toBe(50)
    expect(tweenValue(0, 1, 1 / 3, 1)).toBe(0.3)
    expect(tweenValue(10, 0, 1)).toBe(0)
  })
})
