export type {
  DayExerciseConfigInput,
  DayExerciseInput,
  RestActivity,
  RestActivityInput,
  SetType,
  TrainingDayExercise as DayExercise,
  TrainingPlan,
  TrainingPlanDay,
  TrainingPlanDayInput,
  TrainingPlanInput,
  Weekday,
} from '@training/training-domain'

import {
  trainingPlanTrashStatusLabel,
  type TrainingPlan,
} from '@training/training-domain'

export type TrashUrgency = 'normal' | 'warning' | 'expired'

export const TRASH_RETENTION_DESCRIPTION =
  'As fichas ficam na lixeira por sete dias. Depois do prazo, são removidas na próxima abertura do app ou atualização desta tela.'
export const EMPTY_TRASH_TITLE = 'Não há fichas na lixeira.'
export const EMPTY_TRASH_DESCRIPTION =
  'As fichas excluídas podem ser restauradas durante sete dias.'

export function trainingPlanTrashUrgency(purgeAt: string, now = new Date()): TrashUrgency {
  const remaining = Date.parse(purgeAt) - now.getTime()
  if (remaining <= 0) return 'expired'
  return remaining <= 2 * 24 * 60 * 60 * 1000 ? 'warning' : 'normal'
}

export function trainingPlanTrashAccessibilityLabel(plan: TrainingPlan, now = new Date()) {
  const status = trainingPlanTrashStatusLabel(plan.purgeAt!, now)
  return `${plan.name}, categoria ${plan.category}, dificuldade ${plan.difficulty}, ${status.charAt(0).toLowerCase()}${status.slice(1)}.`
}

export function permanentDeleteCopy(planName: string) {
  return {
    title: `Excluir “${planName}” permanentemente?`,
    description: 'A programação desta ficha não poderá ser recuperada. Seu histórico de sessões será preservado.',
    action: 'Excluir permanentemente',
  }
}

export function emptyTrashCountLabel(count: number) {
  return `${count} ${count === 1 ? 'ficha será excluída' : 'fichas serão excluídas'} permanentemente.`
}

export function trashBadgeText(count: number) {
  return count <= 0 ? null : count > 99 ? '99+' : String(count)
}

export function trashBadgeAccessibilityLabel(count: number) {
  return `Lixeira de fichas, ${count} ${count === 1 ? 'item' : 'itens'}`
}
