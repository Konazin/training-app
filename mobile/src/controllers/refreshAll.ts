export interface RefreshPart {
  name: string
  refresh: () => Promise<unknown>
}

export interface RefreshAllResult {
  success: boolean
  failedParts: string[]
}

export async function runRefreshParts(parts: RefreshPart[]): Promise<RefreshAllResult> {
  const results = await Promise.allSettled(parts.map(({ refresh }) => refresh()))
  const failedParts = results.flatMap((result, index) => (
    result.status === 'rejected' || result.value === false ? [parts[index]!.name] : []
  ))
  return { success: failedParts.length === 0, failedParts }
}
