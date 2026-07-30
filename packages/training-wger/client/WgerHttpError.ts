export type WgerErrorCode =
  | 'ABORTED' | 'OFFLINE' | 'TIMEOUT' | 'HTTP' | 'RATE_LIMIT'
  | 'INVALID_JSON' | 'INVALID_SCHEMA' | 'INVALID_URL' | 'RESPONSE_TOO_LARGE'

export class WgerHttpError extends Error {
  constructor(
    public readonly code: WgerErrorCode,
    message: string,
    public readonly status?: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'WgerHttpError'
  }
}
