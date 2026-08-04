import { MUSCLE_ALIASES, normalizeMuscleAlias } from './muscleAliases'
import type { MuscleRegion } from './muscleRegions'

export interface MuscleMapInput {
  primaryMuscleGroup: string
  secondaryMuscleGroups: string[]
}

export interface ResolvedMuscleRegions {
  primary: MuscleRegion[]
  secondary: MuscleRegion[]
  unknown: string[]
}

export function resolveMuscleRegions(input: MuscleMapInput): ResolvedMuscleRegions {
  const primary = resolveNames([input.primaryMuscleGroup])
  const secondary = resolveNames(input.secondaryMuscleGroups)
  const primarySet = new Set(primary.regions)
  return {
    primary: primary.regions,
    secondary: secondary.regions.filter((region) => !primarySet.has(region)),
    unknown: unique([...primary.unknown, ...secondary.unknown]),
  }
}

function resolveNames(values: readonly string[]) {
  const regions: MuscleRegion[] = []
  const unknown: string[] = []
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue
    const resolved = MUSCLE_ALIASES.get(normalizeMuscleAlias(value))
    if (!resolved) { unknown.push(value.trim()); continue }
    regions.push(...resolved)
  }
  return { regions: unique(regions), unknown: unique(unknown) }
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)]
}
