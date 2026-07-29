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
