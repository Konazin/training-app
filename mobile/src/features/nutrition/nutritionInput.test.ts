import { describe, expect, it } from 'vitest'
import { consumedAtForDate, formatNumberInput, parseNumberInput } from './nutritionInput'

describe('entrada numérica da nutrição', () => {
  it('aceita ponto ou vírgula e preserva texto parcial como número válido', () => {
    expect(parseNumberInput('1,5', 0)).toBe(1.5)
    expect(parseNumberInput('1.', 0)).toBe(1)
    expect(parseNumberInput('  ', 0)).toBe(0)
    expect(parseNumberInput('', null)).toBeNull()
    expect(Number.isNaN(parseNumberInput('1.2.3', 0))).toBe(true)
  })
  it('formata null como vazio', () => {
    expect(formatNumberInput(null)).toBe('')
    expect(formatNumberInput(0)).toBe('0')
  })
})

describe('consumedAtForDate', () => {
  it('usa o instante atual no dia de hoje', () => {
    const now = new Date(2026, 9, 22, 8, 30)
    expect(consumedAtForDate('2026-10-22', now)).toBe(now.toISOString())
  })
  it('usa meio-dia local em outros dias', () => {
    const iso = consumedAtForDate('2026-10-20', new Date(2026, 9, 22, 8, 30))
    const d = new Date(iso)
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 20, 12])
  })
})
