export async function bootstrapApp(
  health: () => Promise<unknown>,
  refreshers: Array<() => Promise<void>>,
) {
  await health()
  await Promise.all(refreshers.map((refresh) => refresh()))
}
