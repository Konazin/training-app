export class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

export const notFound = (entity: string) =>
  new DomainError('NOT_FOUND', `${entity} não encontrado.`)

export const activeSessionExists = () =>
  new DomainError('ACTIVE_SESSION_EXISTS', 'Já existe uma sessão ativa.')

export const invalidTransition = () =>
  new DomainError('INVALID_SESSION_TRANSITION', 'Transição de sessão inválida.')

export const trainingPlanInTrash = () =>
  new DomainError(
    'TRAINING_PLAN_IN_TRASH',
    'Esta ficha está na lixeira e precisa ser restaurada antes de ser alterada.',
  )

export const activeSessionUsesTrainingPlan = () =>
  new DomainError(
    'ACTIVE_SESSION_USES_TRAINING_PLAN',
    'Conclua ou abandone a sessão ativa antes de excluir esta ficha.',
  )
