import { describe, expect, it } from 'vitest'
import type { UmaCareer } from './umaCareer'
import {
  availableCareerAction,
  careerProgress,
  formatCareerPeriod,
  formatWeekday,
  isUmaCareerSession,
  selectInitialCareerId,
  sessionOrigin,
  turnsForCareer,
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

  it('detecta a origem apenas pelo ID do treino pendente', () => {
    const career = {
      id: 1,
      status: 'ACTIVE',
      pendingTurn: {
        actionType: 'TRAINING',
        status: 'IN_PROGRESS',
        workoutSessionId: 42,
      },
    } as UmaCareer
    expect(isUmaCareerSession(career, 42)).toBe(true)
    expect(sessionOrigin(career, 42)).toBe('UMAMUSUME')
    expect(isUmaCareerSession(career, 99)).toBe(false)
    expect(sessionOrigin(career, 99)).toBe('NORMAL')
    career.pendingTurn!.workoutSessionId = null
    expect(isUmaCareerSession(career, 42)).toBe(false)
  })

  it('seleciona carreira ativa, seleção anterior ou a mais recente', () => {
    const completed = { id: 1, status: 'COMPLETED' } as UmaCareer
    const abandoned = { id: 2, status: 'ABANDONED' } as UmaCareer
    const active = { id: 3, status: 'ACTIVE' } as UmaCareer
    expect(selectInitialCareerId([completed, active], 1)).toBe(3)
    expect(selectInitialCareerId([completed, abandoned], 2)).toBe(2)
    expect(selectInitialCareerId([completed, abandoned], 99)).toBe(1)
    expect(selectInitialCareerId([], 1)).toBeNull()
  })

  it('não reutiliza turnos carregados para outra carreira', () => {
    const turns = [{ id: 10 }] as UmaCareer['lastResults']
    expect(turnsForCareer(turns, 1, 1)).toBe(turns)
    expect(turnsForCareer(turns, 1, 2)).toEqual([])
  })
})
