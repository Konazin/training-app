export async function bootstrapApp(
  refreshers: Array<() => Promise<boolean>>,
) {
  const results = await Promise.all(refreshers.map((refresh) => refresh()))
  if (results.some((result) => !result)) {
    throw new Error('Não foi possível carregar todos os dados iniciais.')
  }
}

export function singleFlight<TArgs extends unknown[], TResult>(
  operation: (...args: TArgs) => Promise<TResult>,
) {
  let active: Promise<TResult> | null = null
  return (...args: TArgs) => {
    if (active) return active
    active = operation(...args).finally(() => {
      active = null
    })
    return active
  }
}
