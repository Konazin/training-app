import { describe, expect, it } from 'vitest'
import type { UmaCareer } from './umaCareer'
import {
  availableCareerAction,
  careerProgress,
  formatCareerPeriod,
  formatWeekday,
  visualClamp,
} from './umaCareer'

describe('regras visuais da carreira', () => {
  it('calcula progresso e formata semana e dia', () => {
    expect(careerProgress(1, 'MONDAY', 8, 'ACTIVE')).toBe(0)
    expect(careerProgress(2, 'MONDAY', 8, 'ACTIVE')).toBe(12.5)
    expect(careerProgress(8, 'SUNDAY', 8, 'COMPLETED')).toBe(100)
    expect(formatCareerPeriod(3, 12, 'WEDNESDAY')).toBe('Semana 3 de 12 · Quarta-feira')
    expect(formatWeekday('SUNDAY')).toBe('Domingo')
  })

  it('limita valores exibidos', () => {
    expect(visualClamp(-3)).toBe(0)
    expect(visualClamp(140)).toBe(100)
    expect(visualClamp(1200, 999)).toBe(999)
  })

  it('identifica a ação disponível pelo estado', () => {
    const career = {
      status: 'ACTIVE',
      currentDay: { restDay: false },
      pendingTurn: null,
    } as UmaCareer
    expect(availableCareerAction(career)).toBe('START_TRAINING')
    career.currentDay.restDay = true
    expect(availableCareerAction(career)).toBe('CHOOSE_REST')
    career.pendingTurn = { actionType: 'REST_ACTIVITY' } as UmaCareer['pendingTurn']
    expect(availableCareerAction(career)).toBe('COMPLETE_REST_ACTIVITY')
    career.pendingTurn = { actionType: 'TRAINING' } as UmaCareer['pendingTurn']
    expect(availableCareerAction(career)).toBe('CONTINUE_TRAINING')
    career.status = 'COMPLETED'
    expect(availableCareerAction(career)).toBe('FINISHED')
  })
})
