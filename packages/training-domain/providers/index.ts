export type ExerciseProviderId = 'WGER'

export type ExerciseProviderCapability =
  | 'SEARCH'
  | 'IMPORT'
  | 'REFRESH'
  | 'MEDIA'
  | 'ATTRIBUTION'

export interface ExerciseProviderDescriptor {
  id: ExerciseProviderId
  name: string
  capabilities: readonly ExerciseProviderCapability[]
  requiresNetwork: boolean
  automaticBootstrap: false
}

const PROVIDERS: readonly ExerciseProviderDescriptor[] = Object.freeze([
  Object.freeze({
    id: 'WGER',
    name: 'Wger',
    capabilities: Object.freeze(['SEARCH', 'IMPORT', 'REFRESH', 'MEDIA', 'ATTRIBUTION'] as const),
    requiresNetwork: true,
    automaticBootstrap: false,
  }),
])

export function listExerciseProviders() {
  return PROVIDERS
}

export function getExerciseProviderDescriptor(id: ExerciseProviderId) {
  return PROVIDERS.find((provider) => provider.id === id)
}

export function providerSupports(id: ExerciseProviderId, capability: ExerciseProviderCapability) {
  return getExerciseProviderDescriptor(id)?.capabilities.includes(capability) ?? false
}
