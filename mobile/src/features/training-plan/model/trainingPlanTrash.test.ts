// @ts-expect-error Os testes rodam em Node; o bundle Expo não inclui tipos Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { TrainingPlan } from '@training/training-domain'
import {
  EMPTY_TRASH_DESCRIPTION,
  EMPTY_TRASH_TITLE,
  TRASH_RETENTION_DESCRIPTION,
  emptyTrashCountLabel,
  permanentDeleteCopy,
  trainingPlanTrashAccessibilityLabel,
  trainingPlanTrashUrgency,
  trashBadgeAccessibilityLabel,
  trashBadgeText,
} from './trainingPlan'

const now = new Date('2026-07-30T12:00:00.000Z')

describe('contratos visuais da lixeira', () => {
  it('expõe urgência normal, warning e expired sem depender da cor', () => {
    expect(trainingPlanTrashUrgency('2026-08-02T12:00:01.000Z', now)).toBe('normal')
    expect(trainingPlanTrashUrgency('2026-08-01T12:00:00.000Z', now)).toBe('warning')
    expect(trainingPlanTrashUrgency('2026-07-30T12:00:00.000Z', now)).toBe('expired')
  })

  it('inclui nome, categoria, dificuldade, prazo e confirmação permanente completa', () => {
    const plan = trashPlan()
    expect(trainingPlanTrashAccessibilityLabel(plan, now)).toBe(
      'Calistenia A, categoria Calistenia, dificuldade Intermediário, será apagada em 7 dias.',
    )
    expect(permanentDeleteCopy(plan.name)).toEqual({
      title: 'Excluir “Calistenia A” permanentemente?',
      description: 'A programação desta ficha não poderá ser recuperada. Seu histórico de sessões será preservado.',
      action: 'Excluir permanentemente',
    })
  })

  it('mostra quantidade singular/plural e esconde badge zero', () => {
    expect(emptyTrashCountLabel(1)).toBe('1 ficha será excluída permanentemente.')
    expect(emptyTrashCountLabel(3)).toBe('3 fichas serão excluídas permanentemente.')
    expect(trashBadgeText(0)).toBeNull()
    expect(trashBadgeText(3)).toBe('3')
    expect(trashBadgeText(100)).toBe('99+')
    expect(trashBadgeAccessibilityLabel(1)).toBe('Lixeira de fichas, 1 item')
  })

  it('mantém semântica de expurgo e usa ThemedTextInput no modal', () => {
    expect(TRASH_RETENTION_DESCRIPTION).toContain('próxima abertura do app ou atualização desta tela')
    expect(EMPTY_TRASH_TITLE).toBe('Não há fichas na lixeira.')
    expect(EMPTY_TRASH_DESCRIPTION).toContain('restauradas durante sete dias')
    const source = readFileSync(
      new URL('../views/TrainingPlanTrashScreen.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain('<ThemedTextInput')
    expect(source).not.toContain('<TextInput')
  })
})

function trashPlan(): TrainingPlan {
  return {
    id: 1,
    name: 'Calistenia A',
    description: '',
    category: 'Calistenia',
    difficulty: 'Intermediário',
    startDate: null,
    endDate: null,
    active: false,
    archived: false,
    deletedAt: '2026-07-30T12:00:00.000Z',
    purgeAt: '2026-08-06T12:00:00.000Z',
    days: [],
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-30T12:00:00.000Z',
  }
}
